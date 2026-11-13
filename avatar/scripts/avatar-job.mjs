import { access, copyFile, mkdir, readFile, rename, rm } from 'node:fs/promises';
import { basename, extname, parse, resolve } from 'node:path';

const usage = `
Avatar video job

Recording:
  npm run avatar-job -- --audio "voice.wav" --avatar ayan --output my-video

Edge TTS:
  npm run avatar-job -- --script-file "script.txt" --edge-voice ja-JP-NanamiNeural --avatar noor --output my-video

Options:
  --video FILE       Companion footage
  --aspect RATIO     1:1, 9:16, or 16:9 (default: 1:1)
  --layout MODE      solo or split (default: split with video, otherwise solo)
  --background ID    default: white-grid
  --language CODE    recording: auto; Edge: inferred from voice
  --format FORMAT    mp4 or webm (default: mp4)
  --output-dir DIR   final folder (default: workspace root)
  --ai-cues          Use OpenRouter semantic cues when configured
  --avatars          List every curated avatar id and exit
`;

const valueFlags = new Set(['audio', 'script-file', 'edge-voice', 'video', 'avatar', 'output', 'output-dir', 'aspect', 'layout', 'background', 'language', 'format']);
const booleanFlags = new Set(['ai-cues', 'help', 'avatars']);
const options = {};

for (let index = 2; index < process.argv.length; index++) {
  const argument = process.argv[index];
  if (!argument.startsWith('--')) throw new Error(`Unexpected argument: ${argument}`);
  const name = argument.slice(2);
  if (booleanFlags.has(name)) options[name] = true;
  else if (valueFlags.has(name)) {
    const value = process.argv[++index];
    if (!value || value.startsWith('--')) throw new Error(`--${name} requires a value.`);
    options[name] = value;
  } else throw new Error(`Unknown option: --${name}`);
}

if (options.help) {
  console.log(usage.trim());
  process.exit(0);
}

const curatedAvatars = new Set(['sana', 'ayan', 'zain', 'noor', 'squircle', 'css-person', 'king', 'guard', 'inquisitor', 'heart', 'mouse', 'kawaii-cat', 'aarav', 'forma-zara', 'forma-barnaby', 'forma-tariq', 'forma-kabir', 'forma-devon', 'forma-elena', 'forma-marcus', 'forma-mina', 'forma-kenji', 'forma-mei', 'forma-jinwoo', 'forma-priya', 'forma-haruto', 'forma-zainab', 'forma-arthur', 'forma-liam', 'forma-oliver', 'forma-noah', 'forma-chloe', 'forma-malik', 'forma-harper', 'forma-maya', 'forma-amara']);
const legacyAvatars = ['sana', 'ayan', 'zain', 'noor', 'squircle', 'css-person', 'king', 'guard', 'inquisitor', 'heart', 'mouse', 'kawaii-cat', 'aarav'];
const formaAvatars = [...curatedAvatars].filter(id => !legacyAvatars.includes(id));

if (options.avatars) {
  console.log(`Legacy (${legacyAvatars.length}): ${legacyAvatars.join(', ')}`);
  console.log(`Forma2D (${formaAvatars.length}): ${formaAvatars.join(', ')}`);
  process.exit(0);
}
const aspects = new Set(['1:1', '9:16', '16:9']);
const backgrounds = new Set(['white-grid', 'cream-grid', 'sky-grid', 'night-grid', 'solid-white', 'solid-black', 'chroma-green', 'transparent']);
const formats = new Set(['mp4', 'webm']);
const baseURL = 'http://127.0.0.1:3010';

options.avatar ??= 'ayan';
options.aspect ??= '1:1';
options.background ??= 'white-grid';
options.format ??= 'mp4';
options.layout ??= options.video ? 'split' : 'solo';

if (Boolean(options.audio) === Boolean(options['script-file'])) throw new Error('Provide exactly one of --audio or --script-file.');
if (options['script-file'] && !options['edge-voice']) throw new Error('--script-file requires --edge-voice.');
if (!options.output || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,70}$/.test(options.output)) throw new Error('--output must use only letters, numbers, underscores, or hyphens.');
if (!curatedAvatars.has(options.avatar)) throw new Error(`Unknown curated avatar: ${options.avatar}\nRun with --avatars to list every id.`);
if (!aspects.has(options.aspect)) throw new Error('--aspect must be 1:1, 9:16, or 16:9.');
if (!['solo', 'split'].includes(options.layout)) throw new Error('--layout must be solo or split.');
if (!backgrounds.has(options.background)) throw new Error(`Unsupported background: ${options.background}`);
if (!formats.has(options.format)) throw new Error('--format must be mp4 or webm.');
if (options.format === 'webm' && (options.video || options.layout !== 'solo' || options.background !== 'transparent')) {
  throw new Error('WebM requires --layout solo --background transparent and no --video.');
}

async function api(path, init = {}) {
  const response = await fetch(baseURL + path, init);
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error(`Local avatar server returned invalid data for ${path}.`); }
  if (!response.ok) throw new Error(payload.error || `Avatar server failed with HTTP ${response.status}.`);
  return payload;
}

async function upload(kind, filePath) {
  const absolute = resolve(filePath);
  const bytes = await readFile(absolute);
  return api(`/api/upload?kind=${kind}&name=${encodeURIComponent(basename(absolute))}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: bytes,
  });
}

async function moveFinalOutput(sourcePath, outputDirectory, requestedName) {
  await mkdir(outputDirectory, { recursive: true });
  const extension = extname(sourcePath);
  const baseName = parse(requestedName).name;
  let target = resolve(outputDirectory, `${baseName}${extension}`);
  for (let version = 2; ; version++) {
    try { await access(target); target = resolve(outputDirectory, `${baseName}-${version}${extension}`); }
    catch (error) { if (error.code === 'ENOENT') break; throw error; }
  }
  try { await rename(sourcePath, target); }
  catch (error) {
    if (error.code !== 'EXDEV') throw error;
    await copyFile(sourcePath, target);
    await rm(sourcePath);
  }
  return target;
}

try {
  await api('/api/status');
} catch {
  throw new Error('Avatar server is not running. Start `npm run library` in avatar/ and retry.');
}

if (options.video) await upload('video', options.video);

await api('/api/settings', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    avatar: options.avatar,
    aspectRatio: options.aspect,
    layout: options.layout,
    background: options.background,
    gesture: 'auto',
    emotion: 'auto',
  }),
});

if (options.audio) {
  await upload('audio', options.audio);
  await api('/api/build', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      script: '', recognizer: 'phonetic', useVideoAudio: false, autoTranscribe: true,
      language: options.language || 'auto', useAiCues: options['ai-cues'] === true,
    }),
  });
} else {
  const script = (await readFile(resolve(options['script-file']), 'utf8')).trim();
  if (!script) throw new Error('The script file is empty.');
  const voice = options['edge-voice'];
  const language = options.language || voice.split('-', 1)[0].toLowerCase();
  await api('/api/voice/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'edge', script, language, voice, maxPause: 0.2, useAiCues: options['ai-cues'] === true }),
  });
}

const result = await api('/api/render', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: options.output, format: options.format }),
});
const finalOutput = await moveFinalOutput(resolve(result.outputPath), resolve(options['output-dir'] || '..'), result.fileName);

console.log(JSON.stringify({
  avatar: options.avatar,
  voiceSource: options.audio ? 'recording' : `Edge TTS / ${options['edge-voice']}`,
  automaticGestures: true,
  automaticEmotions: true,
  output: finalOutput,
}, null, 2));
