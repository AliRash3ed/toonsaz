import { spawnSync } from 'node:child_process';
import {
  copyFileSync, existsSync, mkdtempSync, readFileSync, realpathSync,
  renameSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createGesturePlan } from './gesture-plan.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const numericDuration = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

export function validateCues(duration, mouthCues) {
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error('Rhubarb duration must be a positive finite number.');
  }
  if (!Array.isArray(mouthCues)) {
    throw new Error('Rhubarb mouthCues must be an array.');
  }

  const tolerance = 8 * Number.EPSILON * Math.max(1, duration);
  let previousEnd = 0;
  return Array.from(mouthCues, (cue, index) => {
    if (!cue || typeof cue !== 'object' || Array.isArray(cue)) {
      throw new Error(`Mouth cue ${index} must be an object.`);
    }
    let { start, end, value } = cue;
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      throw new Error(`Mouth cue ${index} times must be finite numbers.`);
    }
    if (typeof value !== 'string' || !/^[A-HX]$/.test(value)) {
      throw new Error(`Mouth cue ${index} has an unknown shape; expected A-H or X.`);
    }
    if (start < 0 || end < 0 || end <= start) {
      throw new Error(`Mouth cue ${index} needs non-negative times and end > start.`);
    }
    if (previousEnd - start > tolerance) {
      throw new Error(`Mouth cue ${index} is out of order or overlaps the previous cue.`);
    }
    if (end - duration > tolerance) {
      throw new Error(`Mouth cue ${index} ends beyond the audio duration.`);
    }

    // Snap only floating-point noise, so the returned cues never overlap or overrun.
    start = Math.max(start, previousEnd);
    end = Math.min(end, duration);
    if (end <= start) {
      throw new Error(`Mouth cue ${index} has no positive span within the audio duration.`);
    }
    previousEnd = end;
    return { start, end, value };
  });
}

export function updateDurationMarkup(html, duration, renderDuration, scene = false) {
  if (typeof html !== 'string') throw new TypeError('HTML must be a string.');
  if (![duration, renderDuration].every(value => Number.isFinite(value) && value > 0)) {
    throw new Error('Audio and render durations must be positive finite numbers.');
  }
  const targets = new Map(scene
    ? [['root', renderDuration], ['presenter-art', renderDuration]]
    : [['root', renderDuration], ['presenter', renderDuration], ['narrator', duration]]);
  const seen = new Set();

  // Preserve HTML verbatim except numeric values; skip comments and raw-text contents.
  const tags = /<!--[\s\S]*?-->|<(script|style|textarea|title)\b(?:[^"'<>]|"[^"]*"|'[^']*')*>[\s\S]*?<\/\1\s*>|<[a-z][\w:-]*(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi;
  const patched = html.replace(tags, (tag, rawText) => {
    if (rawText || tag.startsWith('<!--')) return tag;
    const attributes = [...tag.matchAll(/\s+([^\s=/>]+)\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>`]+)/g)]
      .map(match => {
        const raw = match[2];
        const quoted = raw[0] === '"' || raw[0] === "'";
        return { match, quoted, name: match[1].toLowerCase(), value: quoted ? raw.slice(1, -1) : raw };
      });
    const id = attributes.find(attribute => attribute.name === 'id')?.value;
    if (!scene && id === 'source-video') targets.set(id, renderDuration);
    if (!targets.has(id)) return tag;
    if (seen.has(id) || attributes.filter(attribute => attribute.name === 'id').length !== 1) {
      throw new Error(`Duplicate duration target or id attribute: #${id}.`);
    }
    if (scene && id === 'root') {
      const composition = attributes.filter(attribute => attribute.name === 'data-composition-id');
      if (composition.length !== 1 || composition[0].value !== 'presenter') {
        throw new Error('Scene #root must have data-composition-id="presenter".');
      }
    }
    if (id === 'narrator' && !/^<audio\b/i.test(tag)) {
      throw new Error('#narrator must be an audio element.');
    }
    const durations = attributes.filter(attribute => attribute.name === 'data-duration');
    if (durations.length !== 1) {
      throw new Error(`#${id} needs exactly one numeric data-duration attribute.`);
    }
    const attribute = durations[0];
    const oldNumber = attribute.value.trim();
    if (!numericDuration.test(oldNumber) || !Number.isFinite(Number(oldNumber))) {
      throw new Error(`#${id} data-duration must be numeric.`);
    }
    seen.add(id);
    const offset = attribute.match.index + attribute.match[0].length
      - attribute.match[2].length + Number(attribute.quoted) + attribute.value.indexOf(oldNumber);
    return tag.slice(0, offset) + String(targets.get(id)) + tag.slice(offset + oldNumber.length);
  });
  const missing = [...targets.keys()].filter(id => !seen.has(id));
  if (missing.length) {
    throw new Error(`Missing duration target(s): ${missing.map(id => `#${id}`).join(', ')}.`);
  }
  return patched;
}

function requireFile(path, label) {
  try {
    if (!statSync(path).isFile()) throw new Error(`${label} must be a file: ${path}`);
    return realpathSync(path);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      throw new Error(`${label} not found: ${path}`);
    }
    throw error;
  }
}

function run(executable, args, label) {
  const result = spawnSync(executable, args, {
    cwd: projectRoot, encoding: 'utf8', shell: false, windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) {
    const detail = result.error.code === 'ENOENT'
      ? `executable not found: ${executable}` : result.error.message;
    throw new Error(`${label}: ${detail}`);
  }
  if (result.status !== 0) {
    const detail = result.stderr?.trim() || result.stdout?.trim()
      || `exit ${result.status ?? result.signal}`;
    throw new Error(`${label} failed: ${detail}`);
  }
}

function main() {
  const { values } = parseArgs({
    options: {
      audio: { type: 'string' },
      dialog: { type: 'string' },
      words: { type: 'string' },
      recognizer: { type: 'string', default: 'pocketSphinx' },
      rhubarb: { type: 'string', default: '../tools/rhubarb/rhubarb.exe' },
      help: { type: 'boolean' },
    },
    allowPositionals: false,
    strict: true,
  });
  if (values.help) {
    console.log(`Usage: node scripts/lipsync.mjs --audio <file> [options]

  --audio <file>          Required source audio; converted locally with ffmpeg.
  --dialog <file>         Optional transcript passed to Rhubarb as --dialogFile.
  --words <file>          Word/segment JSON, SRT, VTT, or timed word lines for gestures.
  --recognizer <name>     pocketSphinx (default, English) or phonetic.
  --rhubarb <executable>  Default: ../tools/rhubarb/rhubarb.exe (1.14.0).
  --help                 Show this help without processing files.

Relative paths resolve from the avatar project, not the current directory.
Writes assets/narration.wav, narration.rhubarb.json, and lipsync-data.js,
then updates only the required index.html and compositions/presenter.html durations.`);
    return;
  }
  if (!values.audio) throw new Error('--audio is required. Use --help for usage.');
  if (!['pocketSphinx', 'phonetic'].includes(values.recognizer)) {
    throw new Error('--recognizer must be pocketSphinx or phonetic.');
  }
  if (values.dialog === '' || values.rhubarb === '') {
    throw new Error('--dialog and --rhubarb must not be empty when supplied.');
  }

  const audio = requireFile(resolve(projectRoot, values.audio), 'Audio file');
  const dialog = values.dialog ? requireFile(resolve(projectRoot, values.dialog), 'Dialog file') : null;
  const wordFile = values.words ? requireFile(resolve(projectRoot, values.words), 'Timed transcript') : null;
  const rhubarb = requireFile(resolve(projectRoot, values.rhubarb), 'Rhubarb executable');
  const relativeFiles = [
    'assets/narration.wav', 'assets/narration.rhubarb.json', 'assets/lipsync-data.js',
    'index.html', 'compositions/presenter.html',
  ];
  const destinations = relativeFiles.map(path => join(projectRoot, path));
  requireFile(destinations[3], 'Index HTML');
  requireFile(destinations[4], 'Presenter HTML');
  for (const destination of destinations) {
    if (!existsSync(destination)) continue;
    const current = requireFile(destination, 'Output path');
    const key = path => process.platform === 'win32' ? path.toLowerCase() : path;
    if ([audio, dialog, wordFile, rhubarb].some(input => input && key(input) === key(current))) {
      throw new Error(`An input file cannot also be an output: ${destination}`);
    }
  }

  const stage = mkdtempSync(join(projectRoot, 'assets', '.lipsync-'));
  let preserveStage = false;
  try {
    const stagedFiles = destinations.map(path => join(stage, basename(path)));
    run('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-i', audio,
      '-map', '0:a:0', '-vn', '-ac', '1', '-ar', '24000', '-c:a', 'pcm_s16le', stagedFiles[0],
    ], 'ffmpeg audio conversion');
    run(rhubarb, [
      '-f', 'json', '-r', values.recognizer, '--extendedShapes', 'GHX', '-o', stagedFiles[1],
      ...(dialog ? ['--dialogFile', dialog] : []), stagedFiles[0],
    ], 'Rhubarb recognition');

    let recognized;
    try {
      recognized = JSON.parse(readFileSync(stagedFiles[1], 'utf8'));
    } catch (error) {
      throw new Error(`Rhubarb did not produce valid JSON: ${error.message}`);
    }
    const duration = recognized?.metadata?.duration;
    const mouthCues = validateCues(duration, recognized?.mouthCues);
    const renderDuration = Math.ceil((duration + 1.25) * 30) / 30;
    const index = updateDurationMarkup(readFileSync(destinations[3], 'utf8'), duration, renderDuration);
    const presenter = updateDurationMarkup(readFileSync(destinations[4], 'utf8'), duration, renderDuration, true);
    const text = dialog ? readFileSync(dialog, 'utf8') : '';
    const plan = text || wordFile ? createGesturePlan({ text, words: wordFile ? readFileSync(wordFile, 'utf8') : undefined, duration }) : { gestureCues: [], emotionCues: [], timingBasis: 'none', transcript: '' };
    const speech = { audio: 'assets/narration.wav', metadata: { duration }, mouthCues, renderDuration, ...plan };
    const javascript = JSON.stringify(speech, null, 2)
      .replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    writeFileSync(stagedFiles[1], `${JSON.stringify({
      ...recognized, metadata: { ...recognized.metadata, soundFile: speech.audio }, mouthCues,
    }, null, 2)}\n`);
    writeFileSync(stagedFiles[2], `globalThis.AvatarSpeech = ${javascript};\n`);
    writeFileSync(stagedFiles[3], index);
    writeFileSync(stagedFiles[4], presenter);

    const publications = destinations.map((destination, index) => ({
      destination, staged: stagedFiles[index], existed: existsSync(destination),
      backup: join(stage, `backup-${index}`),
    }));
    for (const item of publications) {
      if (item.existed) copyFileSync(item.destination, item.backup);
    }
    const published = [];
    try {
      for (const item of publications) {
        renameSync(item.staged, item.destination);
        published.push(item);
      }
    } catch (error) {
      const rollbackErrors = [];
      for (const item of published.reverse()) {
        try {
          if (item.existed) renameSync(item.backup, item.destination);
          else rmSync(item.destination, { force: true });
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError.message);
        }
      }
      preserveStage = rollbackErrors.length > 0;
      throw new Error(`Publishing failed: ${error.message}. ${preserveStage
        ? `Rollback incomplete; backups retained in ${stage}: ${rollbackErrors.join('; ')}`
        : 'Previous outputs restored.'}`);
    }
    console.log(`Lip-sync ready: audio ${duration}s; render ${renderDuration}s.\n${relativeFiles.join('\n')}`);
  } finally {
    if (!preserveStage) rmSync(stage, { recursive: true, force: true });
  }
}

const entry = process.argv[1] ? resolve(process.argv[1]) : '';
const modulePath = fileURLToPath(import.meta.url);
if (entry === modulePath || (process.platform === 'win32' && entry.toLowerCase() === modulePath.toLowerCase())) {
  try {
    main();
  } catch (error) {
    console.error(`lipsync: ${error.message}`);
    process.exitCode = 1;
  }
}
