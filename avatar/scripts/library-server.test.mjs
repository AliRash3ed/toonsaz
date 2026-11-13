import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import { extname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  createLibraryServer,
  normalizeUploadName,
  parseAssignedJSON,
  parseRange,
  patchCanvasMarkup,
  validateCredentials,
  validateSettings,
} from './library-server.mjs';

const avatarIds = ['sana', 'ayan', 'zain', 'noor', 'squircle', 'css-person', 'bearded-man', 'curly-boy', 'cap-guy', 'pompadour-guy', 'soft-bust', 'blond-swept', 'clay', 'homer', 'bart', 'king', 'guard', 'inquisitor', 'heart', 'mouse', 'kawaii-cat', 'neo', 'luna', 'koda', 'ayan-copy', 'aarav', 'forma-zara', 'forma-barnaby', 'forma-tariq', 'forma-kabir', 'forma-devon', 'forma-elena', 'forma-marcus', 'forma-mina', 'forma-kenji', 'forma-mei', 'forma-jinwoo', 'forma-priya', 'forma-haruto', 'forma-zainab', 'forma-arthur', 'forma-liam', 'forma-oliver', 'forma-noah', 'forma-chloe', 'forma-malik', 'forma-harper', 'forma-maya', 'forma-amara'];
const backgroundIds = ['white-grid', 'cream-grid', 'sky-grid', 'night-grid', 'solid-white', 'solid-black', 'chroma-green', 'transparent', 'custom'];

test('upload names and settings enforce the complete strict contract', () => {
  assert.equal(normalizeUploadName('video', 'My Video.MP4'), 'My-Video.mp4');
  assert.equal(normalizeUploadName('image', 'Resume photo.JPEG'), 'Resume-photo.jpeg');
  assert.equal(normalizeUploadName('audio', 'Browser recording.webm'), 'Browser-recording.webm');
  assert.equal(normalizeUploadName('audio', 'Windows recording.wma'), 'Windows-recording.wma');
  for (const name of ['../video.mp4', 'C:\\video.mp4', '.hidden.mp4', 'bad.exe']) assert.throws(() => normalizeUploadName('video', name));
  for (const name of ['../image.png', 'data:image/png;base64,image.png', 'data:image.png', 'vector.svg']) assert.throws(() => normalizeUploadName('image', name));

  for (const avatar of avatarIds) assert.equal(validateSettings({ avatar }).avatar, avatar);
  for (const background of backgroundIds) assert.equal(validateSettings({ background }).background, background);
  for (const aspectRatio of ['1:1', '9:16', '16:9']) assert.equal(validateSettings({ aspectRatio }).aspectRatio, aspectRatio);
  const customized = validateSettings({
    placement: { x: -100, y: 100, scale: 1.8 }, outfit: 'armor', glasses: 'round', hat: 'helmet', earrings: 'drops', neckwear: 'tie',
    customBackground: 'assets/uploads/image-123e4567-e89b-12d3-a456-426614174000-safe-name.webp',
  });
  assert.deepEqual(customized.placement, { x: -100, y: 100, scale: 1.8 });
  assert.equal(customized.outfit, 'armor');
  for (const patch of [
    { avatar: 'unknown' }, { background: 'url' }, { aspectRatio: '4:3' }, { outfit: 'dress' }, { glasses: 'oval' },
    { hat: 'fedora' }, { earrings: 'chains' }, { neckwear: 'scarf' }, { placement: { x: 101 } },
    { placement: { scale: 0.49 } }, { placement: { y: Number.NaN } }, { arbitraryPath: 'outside' }, { fps: 60 },
    { video: { src: '../secret.mp4' } }, { customBackground: '../secret.png' },
    { customBackground: 'assets/uploads/image-123e4567-e89b-12d3-a456-426614174000-vector.svg' },
  ]) assert.throws(() => validateSettings(patch));
});

test('credentials accept real tokens, allow removal, and reject injection', () => {
  assert.deepEqual(validateCredentials({ openrouter: 'sk-or-v1-abc_123.def' }), { openrouter: 'sk-or-v1-abc_123.def' });
  assert.deepEqual(validateCredentials({ omnivoice: ' hf_abcdefghijklmnop ' }), { omnivoice: 'hf_abcdefghijklmnop' });
  assert.deepEqual(validateCredentials({ openrouter: null }), { openrouter: null });
  assert.deepEqual(validateCredentials({ openrouter: '' }), { openrouter: null });
  for (const patch of [
    {}, { unknown: 'x' }, { openrouter: 42 }, { openrouter: 'abc\nOPENROUTER_API_KEY=other' },
    { openrouter: 'abc def' }, { openrouter: 'x'.repeat(401) }, { openrouter: '../secret' },
  ]) assert.throws(() => validateCredentials(patch));
});

test('canvas markup patching changes every required target for all aspects', () => {
  const index = '<div id="root" data-width="1" data-height="2" data-fps="24"><div id="presenter" data-width="3" data-height="4"></div><video id="source-video" data-hidden="false"></video></div>';
  const presenter = '<template><div id="root" data-width="1" data-height="2"><svg id="female-illustration" viewBox="0 0 1 2"><rect id="avatar-background" width="1" height="2"/><image id="avatar-custom-image" width="1" height="2"/></svg></div></template>';
  for (const [aspectRatio, width, height] of [['1:1', 1080, 1080], ['9:16', 1080, 1920], ['16:9', 1920, 1080]]) {
    const patchedIndex = patchCanvasMarkup(index, aspectRatio, 'index');
    const root = patchedIndex.match(/<div id="root"[^>]*>/)[0];
    const host = patchedIndex.match(/<div id="presenter"[^>]*>/)[0];
    assert.match(root, new RegExp(`data-width="${width}"`));
    assert.match(root, new RegExp(`data-height="${height}"`));
    assert.match(root, /data-fps="30"/);
    assert.match(root, new RegExp(`data-aspect-ratio="${aspectRatio}"`));
    assert.match(host, new RegExp(`data-width="${width}"`));
    assert.match(host, new RegExp(`data-height="${height}"`));
    assert.match(patchedIndex, /id="source-video" data-hidden="false"/);

    const patchedPresenter = patchCanvasMarkup(presenter, aspectRatio, 'presenter');
    assert.match(patchedPresenter, new RegExp(`viewBox="0 0 ${width} ${height}"`));
    for (const id of ['avatar-background', 'avatar-custom-image']) {
      const tag = patchedPresenter.match(new RegExp(`<[^>]+id="${id}"[^>]*>`))[0];
      assert.match(tag, new RegExp(`width="${width}"`));
      assert.match(tag, new RegExp(`height="${height}"`));
    }
    assert.match(patchedPresenter.match(/<div id="root"[^>]*>/)[0], new RegExp(`data-aspect-ratio="${aspectRatio}"`));
  }
});

test('JSON global reading never evaluates script and range parsing handles seeking', () => {
  assert.deepEqual(parseAssignedJSON('globalThis.AvatarSpeech = {"metadata":{"duration":2}};', 'AvatarSpeech'), { metadata: { duration: 2 } });
  assert.throws(() => parseAssignedJSON('globalThis.AvatarSpeech = {}; process.exit(1);', 'AvatarSpeech'));
  assert.deepEqual(parseRange('bytes=0-3', 8), { start: 0, end: 3 });
  assert.deepEqual(parseRange('bytes=-3', 8), { start: 5, end: 7 });
  assert.throws(() => parseRange('bytes=12-15', 8));
});

async function fixture(t, options = {}) {
  const temporaryParent = fileURLToPath(new URL('../.hyperframes/', import.meta.url));
  await mkdir(temporaryParent, { recursive: true });
  const root = await mkdtemp(join(temporaryParent, 'library-test-'));
  await Promise.all([mkdir(join(root, 'assets')), mkdir(join(root, 'compositions')), mkdir(join(root, 'scripts'))]);
  const settings = {
    avatar: 'sana', background: 'white-grid', customBackground: null, layout: 'solo', aspectRatio: '1:1',
    placement: { x: 0, y: 0, scale: 1 }, outfit: 'profile', glasses: 'none', hat: 'none', earrings: 'profile', neckwear: 'profile',
    gesture: 'auto', emotion: 'auto', video: { enabled: false, src: 'assets/source-video.mp4', duration: 0 }, actionCues: [],
  };
  const initialSpeech = { metadata: { duration: 2 }, renderDuration: 3.25, mouthCues: [{ start: 0, end: 2, value: 'X' }], gestureCues: [], emotionCues: [], transcript: 'Hi, I am your presenter.' };
  await Promise.all([
    writeFile(join(root, 'assets/avatar-settings.json'), JSON.stringify(settings)),
    writeFile(join(root, 'assets/avatar-settings.js'), `globalThis.AvatarSettings = ${JSON.stringify(settings)};`),
    writeFile(join(root, 'assets/narration.rhubarb.json'), JSON.stringify(initialSpeech)),
    writeFile(join(root, 'assets/lipsync-data.js'), `globalThis.AvatarSpeech = ${JSON.stringify(initialSpeech)};`),
    writeFile(join(root, 'assets/avatar_guide.txt'), 'Hi, I am your presenter.'),
    writeFile(join(root, 'assets/avatar_guide.wav'), 'RIFFguide'),
    writeFile(join(root, 'assets/narration.wav'), 'RIFFdemo'),
    writeFile(join(root, 'compositions/presenter.html'), '<template><div id="root" data-composition-id="presenter" data-width="1080" data-height="1080" data-fps="30"><svg id="female-illustration" viewBox="0 0 1080 1080"><rect id="avatar-background" width="1080" height="1080"/><image id="avatar-custom-image" width="1080" height="1080"/></svg></div></template>'),
    writeFile(join(root, 'index.html'), '<div id="root" data-composition-id="main" data-width="1080" data-height="1080" data-fps="30"><div id="presenter" data-width="1080" data-height="1080"></div><video id="source-video" data-hidden="true"></video></div>'),
    writeFile(join(root, 'library.html'), '<!doctype html><title>Fixture</title>'),
    writeFile(join(root, 'package.json'), JSON.stringify({ type: 'module', scripts: { render: 'npx --yes hyperframes@0.9.30 render' } })),
    writeFile(join(root, 'scripts/lipsync.mjs'), '// mocked process boundary'),
    writeFile(join(root, 'scripts/transcribe-audio.py'), '# mocked process boundary\n'),
    writeFile(join(root, 'scripts/generate-voice.py'), '# mocked process boundary\n'),
    writeFile(join(root, 'scripts/list-edge-voices.py'), '# mocked process boundary\n'),
    writeFile(join(root, 'scripts/npx-cli.js'), '// mocked process boundary'),
  ]);

  const calls = [];
  const builds = [];
  const providerInputs = [];
  const controls = {
    width: 1080, height: 1920, fps: '30/1', alpha: true,
    referenceDuration: 4, referenceHasAudio: true, referenceSilent: false, providerFailure: false,
  };
  const runCommand = async (executable, args, label, timeout, commandOptions = {}) => {
    calls.push({ executable, args: [...args], label, timeout, env: commandOptions.env ? { ...commandOptions.env } : undefined });
    if (executable === 'ffprobe') {
      const target = String(args.at(-1));
      if (/[\\/]renders[\\/].+\.(?:mp4|webm)$/.test(target)) {
        return { stdout: JSON.stringify({ streams: [{ codec_type: 'video', codec_name: extname(target) === '.webm' ? 'vp9' : 'h264', width: controls.width, height: controls.height, avg_frame_rate: controls.fps, r_frame_rate: controls.fps, pix_fmt: 'yuv420p', ...(controls.alpha ? { tags: { alpha_mode: '1' } } : {}) }] }), stderr: '' };
      }
      if (/image-[a-f0-9-]+-/.test(target)) {
        const codec_name = extname(target).toLowerCase() === '.png' ? 'png' : extname(target).toLowerCase() === '.webp' ? 'webp' : 'mjpeg';
        return { stdout: JSON.stringify({ streams: [{ codec_type: 'video', codec_name, width: 640, height: 360 }] }), stderr: '' };
      }
      if (/audio-[a-f0-9-]+-/.test(target)) return { stdout: JSON.stringify({ format: { duration: '2' }, streams: [{ codec_type: 'audio', codec_name: 'pcm_s16le' }] }), stderr: '' };
      if (/video-[a-f0-9-]+-|\.converted-/.test(target)) return { stdout: JSON.stringify({ format: { duration: '2' }, streams: [{ codec_type: 'video', codec_name: 'h264', width: 640, height: 360 }, { codec_type: 'audio', codec_name: 'aac' }] }), stderr: '' };
      if (/\.reference-upload-[a-f0-9-]+\.part$/.test(target)) return {
        stdout: JSON.stringify({ format: { duration: String(controls.referenceDuration) }, streams: controls.referenceHasAudio ? [{ codec_type: 'audio', codec_name: 'pcm_s16le' }] : [{ codec_type: 'video', codec_name: 'h264' }] }), stderr: '',
      };
      if (/reference-[a-f0-9-]+\.wav$/.test(target)) return { stdout: JSON.stringify({ format: { duration: String(controls.referenceDuration) }, streams: [{ codec_type: 'audio', codec_name: 'pcm_s16le' }] }), stderr: '' };
      if (/[\\/]job-[^\\/]+[\\/]generated\.wav$/.test(target)) return { stdout: JSON.stringify({ format: { duration: '2' }, streams: [{ codec_type: 'audio', codec_name: 'pcm_s16le' }] }), stderr: '' };
      throw new Error(`Unexpected ffprobe target: ${target}`);
    }
    if (executable === 'ffmpeg') {
      if (label === 'Voice reference inspection') return { stdout: '', stderr: `[Parsed_volumedetect] max_volume: ${controls.referenceSilent ? '-inf' : '-12.0'} dB` };
      await writeFile(args.at(-1), 'converted video');
      return { stdout: '', stderr: '' };
    }
    if (args.some(value => /generate-voice\.py$/.test(value))) {
      const scriptPath = args[args.indexOf('--script-file') + 1];
      const referenceTextPath = args.includes('--reference-text-file') ? args[args.indexOf('--reference-text-file') + 1] : null;
      providerInputs.push({
        engine: args[args.indexOf('--engine') + 1],
        script: await readFile(scriptPath, 'utf8'),
        referenceText: referenceTextPath ? await readFile(referenceTextPath, 'utf8') : null,
      });
      if (controls.providerFailure) throw new Error('raw provider https://secret.invalid token-value private-path');
      await writeFile(args[args.indexOf('--output') + 1], `generated ${providerInputs.at(-1).engine}`);
      return { stdout: '', stderr: '' };
    }
    if (args.some(value => /list-edge-voices\.py$/.test(value))) return { stdout: JSON.stringify([
      { name: 'ar-SA-HamedNeural', locale: 'ar-SA', language: 'ar', gender: 'male', label: 'Arabic Hamed' },
      { name: 'en-US-JennyNeural', locale: 'en-US', language: 'en', gender: 'female', label: 'English Jenny' },
      { name: 'es-ES-ElviraNeural', locale: 'es-ES', language: 'es', gender: 'female', label: 'Spanish Elvira' },
      { name: 'fr-FR-DeniseNeural', locale: 'fr-FR', language: 'fr', gender: 'female', label: 'French Denise' },
      { name: 'hi-IN-SwaraNeural', locale: 'hi-IN', language: 'hi', gender: 'female', label: 'Hindi Swara' },
      { name: 'ja-JP-NanamiNeural', locale: 'ja-JP', language: 'ja', gender: 'female', label: 'Japanese Nanami' },
      { name: 'ko-KR-SunHiNeural', locale: 'ko-KR', language: 'ko', gender: 'female', label: 'Korean SunHi' },
      { name: 'pt-BR-FranciscaNeural', locale: 'pt-BR', language: 'pt', gender: 'female', label: 'Portuguese Francisca' },
      { name: 'ur-PK-UzmaNeural', locale: 'ur-PK', language: 'ur', gender: 'female', label: 'Urdu Uzma' },
      { name: 'zh-CN-XiaoxiaoNeural', locale: 'zh-CN', language: 'zh', gender: 'female', label: 'Chinese Xiaoxiao' },
    ]), stderr: '' };
    if (args.some(value => /transcribe-audio\.py$/.test(value))) {
      const output = args[args.indexOf('--output') + 1];
      const language = args[args.indexOf('--language') + 1];
      await writeFile(output, JSON.stringify({
        text: 'Hello mother stopped.', language: language === 'auto' ? 'en' : language,
        words: [{ word: 'Hello', start: 0, end: 0.25 }, { word: 'mother', start: 0.3, end: 0.6 }, { word: 'stopped.', start: 0.65, end: 0.95 }],
      }));
      return { stdout: '', stderr: '' };
    }
    if (args.some(value => /scripts[\\/]lipsync\.mjs$/.test(value))) {
      const dialog = await readFile(join(root, args[args.indexOf('--dialog') + 1]), 'utf8');
      const wordsArgument = args.includes('--words') ? args[args.indexOf('--words') + 1] : null;
      const words = wordsArgument ? await readFile(join(root, wordsArgument), 'utf8') : null;
      builds.push({ args: [...args], dialog, words });
      const speech = { ...initialSpeech, transcript: dialog.trim(), timingBasis: words ? 'word-timestamps' : 'estimated' };
      const audioArgument = args[args.indexOf('--audio') + 1];
      const audioPath = isAbsolute(audioArgument) ? audioArgument : join(root, audioArgument);
      await Promise.all([
        writeFile(join(root, 'assets/narration.wav'), await readFile(audioPath)),
        writeFile(join(root, 'assets/narration.rhubarb.json'), JSON.stringify(speech)),
        writeFile(join(root, 'assets/lipsync-data.js'), `globalThis.AvatarSpeech = ${JSON.stringify(speech)};`),
      ]);
      return { stdout: '', stderr: '' };
    }
    if (args.includes('render')) {
      const output = args[args.indexOf('--output') + 1];
      await writeFile(join(root, output), `rendered ${extname(output)}`);
      return { stdout: '', stderr: '' };
    }
    return { stdout: '', stderr: '' };
  };

  const testEnv = options.env || { PATH: process.env.PATH || '', Path: process.env.Path || '' };
  const server = createLibraryServer({
    root, maxUploadBytes: 64, runCommand, npxCli: 'scripts/npx-cli.js', env: testEnv,
    capabilities: options.capabilities, voiceReferenceTtlMs: options.voiceReferenceTtlMs, fetchImpl: options.fetchImpl,
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    if (server.listening) {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
    await rm(root, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, extra = {}) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(body) });
  const upload = (kind, name, body, contentType = 'application/octet-stream') => fetch(`${base}/api/upload?kind=${kind}&name=${encodeURIComponent(name)}`, { method: 'PUT', headers: { 'Content-Type': contentType }, body });
  const uploadReference = (name, body, suffix = '') => fetch(`${base}/api/voice-reference?name=${encodeURIComponent(name)}${suffix}`, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body });
  return { root, base, post, upload, uploadReference, calls, builds, providerInputs, controls, server };
}

test('local API automates uploads, transcription, publication, and verified MP4/WebM export', async t => {
  const { root, base, post, upload, calls, builds, controls } = await fixture(t);
  const initial = await (await fetch(base + '/api/state')).json();
  assert.equal(initial.settings.avatar, 'sana');
  assert.equal(initial.uploads.image, null);
  assert.deepEqual(initial.capabilities, { edge: true, omni: false, aiCues: false });

  const planned = await (await post('/api/plan', { text: 'The upper video you are seeing is an emotional video of a baby who is going with his mother, and then he stopped.', duration: 10 })).json();
  assert.deepEqual(planned.gestureCues.map(cue => cue.gesture), ['point-up', 'empathy', 'directional', 'stop']);

  const roman = await (await post('/api/transliterate', { text: 'assalamualaikum dosto' })).json();
  assert.equal(roman.script, 'latin');
  assert.equal(roman.result, 'अस्सलामुअलैकुम दोस्तो');
  assert.equal(roman.recommendedVoice, 'hi-IN');
  const urdu = await (await post('/api/transliterate', { text: 'السلام علیکم' })).json();
  assert.equal(urdu.script, 'arabic');
  assert.equal(urdu.result, 'अस्सलाम अलैकुम');
  assert.equal((await post('/api/transliterate', { text: 'hello', force: 'klingon' })).status, 400);
  assert.equal((await post('/api/transliterate', { text: 'hello', extra: true })).status, 400);
  assert.equal((await post('/api/transliterate', {})).status, 400);

  assert.equal((await post('/api/settings', { avatar: 'ayan' }, { Origin: 'https://foreign.example' })).status, 403);
  const saved = await post('/api/settings', { avatar: 'ayan', background: 'cream-grid', aspectRatio: '9:16', placement: { x: 12, y: -8, scale: 1.25 }, outfit: 'blazer', glasses: 'square', hat: 'beanie', earrings: 'studs', neckwear: 'chain' });
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).settings.aspectRatio, '9:16');
  assert.match(await readFile(join(root, 'index.html'), 'utf8'), /id="root"[^>]*data-height="1920"/);
  assert.match(await readFile(join(root, 'index.html'), 'utf8'), /id="presenter"[^>]*data-height="1920"/);
  assert.match(await readFile(join(root, 'compositions/presenter.html'), 'utf8'), /viewBox="0 0 1080 1920"/);

  const range = await fetch(base + '/assets/narration.wav', { headers: { Range: 'bytes=0-3' } });
  assert.equal(range.status, 206);
  assert.equal(await range.text(), 'RIFF');
  assert.equal((await fetch(base + '/scripts/lipsync.mjs')).status, 404);
  assert.equal((await post('/api/build', { script: 'A different recording' })).status, 409);
  const demoBuild = await post('/api/build', { script: 'Hi, I am your presenter.' });
  assert.equal(demoBuild.status, 200);
  assert.equal(calls.some(call => call.args.some(value => /transcribe-audio\.py$/.test(value))), false);

  const uploadedVideo = await upload('video', 'clip.mp4', 'clip');
  assert.equal(uploadedVideo.status, 200);
  assert.equal((await uploadedVideo.json()).settings.layout, 'split');
  assert.match(await readFile(join(root, 'index.html'), 'utf8'), /data-hidden="false"/);
  const uploadedAudio = await upload('audio', 'voice.wav', 'voice');
  assert.equal(uploadedAudio.status, 200);
  const firstAudioState = await uploadedAudio.json();
  const firstAudioPath = join(root, firstAudioState.uploads.audio.src);
  const replacementAudio = await upload('audio', 'replacement.webm', 'replacement voice', 'audio/webm');
  assert.equal(replacementAudio.status, 200);
  await assert.rejects(readFile(firstAudioPath), error => error.code === 'ENOENT');
  const videoBuild = await post('/api/build', { script: 'Hi, video.', useVideoAudio: true });
  assert.equal(videoBuild.status, 200);
  assert.match(builds.at(-1).args[builds.at(-1).args.indexOf('--audio') + 1], /^assets\/uploads\/video-/);

  const automatic = await post('/api/build', { autoTranscribe: true, language: 'ur' });
  assert.equal(automatic.status, 200);
  assert.equal((await automatic.json()).speech.transcript, 'Hello mother stopped.');
  const transcription = calls.findLast(call => call.args.some(value => /transcribe-audio\.py$/.test(value)));
  assert.equal(transcription.executable, process.platform === 'win32' ? 'py' : 'python3');
  if (process.platform === 'win32') assert.equal(transcription.args[0], '-3.13');
  assert.equal(transcription.args[transcription.args.indexOf('--language') + 1], 'ur');
  assert.equal(builds.at(-1).dialog, 'Hello mother stopped.\n');
  assert.deepEqual(JSON.parse(builds.at(-1).words).map(item => item.word), ['Hello', 'mother', 'stopped.']);
  const transcriptionCount = calls.filter(call => call.args.some(value => /transcribe-audio\.py$/.test(value))).length;
  assert.equal((await post('/api/build', { autoTranscribe: false, language: 'en' })).status, 200);
  assert.equal(calls.filter(call => call.args.some(value => /transcribe-audio\.py$/.test(value))).length, transcriptionCount + 1);
  const uploadFiles = await readdir(join(root, 'assets', 'uploads'));
  assert.equal(uploadFiles.some(name => /^\.(?:dialog|words|transcript)-/.test(name)), false);
  assert.equal((await post('/api/build', { autoTranscribe: 'yes' })).status, 400);
  assert.equal((await post('/api/build', { language: 'french' })).status, 400);

  assert.equal((await upload('image', '../escape.png', 'bad')).status, 400);
  assert.equal((await upload('image', 'vector.svg', '<svg/>', 'image/svg+xml')).status, 415);
  assert.equal((await upload('image', 'data:image/png;base64,AAAA.png', 'bad')).status, 400);
  assert.equal((await post('/api/settings', { customBackground: '../outside.png' })).status, 400);
  const imageResponse = await upload('image', 'Backdrop photo.PNG', 'fakepng', 'image/png');
  assert.equal(imageResponse.status, 200);
  const imageState = await imageResponse.json();
  assert.equal(imageState.settings.background, 'custom');
  assert.match(imageState.settings.customBackground, /^assets\/uploads\/image-[a-f0-9-]+-Backdrop-photo\.png$/);
  assert.equal(imageState.uploads.image.width, 640);
  const storedInputs = JSON.parse(await readFile(join(root, 'assets', 'uploads', '.library-inputs.json'), 'utf8'));
  assert.deepEqual({ width: storedInputs.image.width, height: storedInputs.image.height, codec: storedInputs.image.codec }, { width: 640, height: 360, codec: 'png' });
  const servedImage = await fetch(`${base}/${imageState.settings.customBackground}`);
  assert.equal(servedImage.status, 200);
  assert.equal(servedImage.headers.get('content-type'), 'image/png');
  assert.equal(await servedImage.text(), 'fakepng');
  assert.equal((await upload('audio', 'huge.wav', 'x'.repeat(128))).status, 413);

  assert.equal((await post('/api/render', { name: '../bad' })).status, 400);
  assert.equal((await post('/api/render', { format: 'mov' })).status, 400);
  assert.equal((await post('/api/render', { extra: true })).status, 400);
  const mp4Response = await post('/api/render', { name: 'portrait', format: 'mp4' });
  assert.equal(mp4Response.status, 200);
  const mp4 = await mp4Response.json();
  assert.equal(mp4.fileURL, '/renders/portrait.mp4');
  assert.equal(mp4.fileName, 'portrait.mp4');
  assert.equal(mp4.outputPath, 'renders/portrait.mp4');
  assert.deepEqual(mp4.metadata, { width: 1080, height: 1920, fps: 30, format: 'mp4' });
  const mp4Call = calls.findLast(call => call.args.includes('render'));
  assert.equal(mp4Call.args[mp4Call.args.indexOf('--format') + 1], 'mp4');
  assert.equal(mp4Call.args[mp4Call.args.indexOf('--fps') + 1], '30');
  assert.equal(mp4Call.args[mp4Call.args.indexOf('--quality') + 1], 'draft');
  assert.equal(mp4Call.args.includes('--vp9-cpu-used'), false);
  assert.equal((await fetch(base + mp4.fileURL)).status, 200);
  const secondMp4 = await (await post('/api/render', { name: 'portrait', format: 'mp4' })).json();
  assert.equal(secondMp4.fileURL, '/renders/portrait-2.mp4');

  assert.equal((await post('/api/render', { format: 'webm' })).status, 409);
  assert.equal((await post('/api/settings', { background: 'transparent' })).status, 200);
  assert.equal((await post('/api/render', { format: 'webm' })).status, 409);
  assert.equal((await post('/api/settings', { layout: 'solo' })).status, 200);
  assert.equal((await post('/api/render', { format: 'webm' })).status, 409);
  assert.equal((await post('/api/settings', { video: { enabled: false } })).status, 200);
  const webmResponse = await post('/api/render', { name: 'alpha', format: 'webm' });
  assert.equal(webmResponse.status, 200);
  const webm = await webmResponse.json();
  assert.equal(webm.fileURL, '/renders/alpha.webm');
  assert.deepEqual(webm.metadata, { width: 1080, height: 1920, fps: 30, format: 'webm' });
  const webmCall = calls.findLast(call => call.args.includes('render'));
  assert.equal(webmCall.args[webmCall.args.indexOf('--format') + 1], 'webm');
  assert.equal(webmCall.args[webmCall.args.indexOf('--vp9-cpu-used') + 1], '8');
  const servedWebm = await fetch(base + webm.fileURL);
  assert.equal(servedWebm.status, 200);
  assert.equal(servedWebm.headers.get('content-type'), 'video/webm');

  controls.width = 1920;
  assert.equal((await post('/api/render', { format: 'mp4' })).status, 422);
  controls.width = 1080;
  controls.fps = '24/1';
  assert.equal((await post('/api/render', { format: 'mp4' })).status, 422);
  controls.fps = '30/1';
  controls.alpha = false;
  assert.equal((await post('/api/render', { format: 'webm' })).status, 422);
});

test('voice capabilities are environment-derived and may be disabled by injection', async t => {
  const enabled = await fixture(t, { env: { PATH: process.env.PATH || '', OMNIVOICE_HF_TOKEN: 'test-credential', OPENROUTER_API_KEY: 'separate-test-credential' } });
  const enabledState = await (await fetch(enabled.base + '/api/state')).json();
  assert.deepEqual(enabledState.capabilities, { edge: true, omni: true, aiCues: true });
  const catalog = await (await fetch(enabled.base + '/api/voices/edge')).json();
  assert.equal(catalog.voices.some(voice => voice.language === 'ja'), true);
  assert.equal(catalog.voices.some(voice => voice.language === 'ar'), true);

  const disabled = await fixture(t, {
    env: { PATH: process.env.PATH || '', OMNIVOICE_HF_TOKEN: 'test-credential', OPENROUTER_API_KEY: 'separate-test-credential' },
    capabilities: { edge: false, omni: false, aiCues: false },
  });
  const disabledState = await (await fetch(disabled.base + '/api/state')).json();
  assert.deepEqual(disabledState.capabilities, { edge: false, omni: false, aiCues: false });
});

test('the settings panel writes .env.local and activates providers without a restart', async t => {
  const { root, base, post } = await fixture(t, { env: { PATH: process.env.PATH || '' } });
  assert.equal((await (await fetch(base + '/api/state')).json()).capabilities.aiCues, false);

  const saved = await post('/api/credentials', { openrouter: 'sk-or-v1-test-token', omnivoice: 'hf_test-token' });
  assert.equal(saved.status, 200);
  const body = await saved.json();
  assert.deepEqual(body.capabilities, { edge: true, omni: true, aiCues: true });
  assert.deepEqual(body.saved, ['openrouter', 'omnivoice']);
  assert.equal(body.providers.omni.ready, true);
  assert.equal(body.providers.aiCues.ready, true);
  assert.ok(!JSON.stringify(body).includes('sk-or-v1-test-token'), 'the key must never be echoed back');

  let envFile = await readFile(join(root, '.env.local'), 'utf8');
  assert.match(envFile, /^OPENROUTER_API_KEY=sk-or-v1-test-token$/m);
  assert.match(envFile, /^OMNIVOICE_HF_TOKEN=hf_test-token$/m);

  // Unrelated variables survive and only the patched key changes.
  await writeFile(join(root, '.env.local'), 'KEEP=me\nOPENROUTER_API_KEY=old\nOMNIVOICE_HF_TOKEN=old\n');
  const replaced = await (await post('/api/credentials', { openrouter: 'sk-or-v1-new' })).json();
  assert.equal(replaced.capabilities.aiCues, true);
  envFile = await readFile(join(root, '.env.local'), 'utf8');
  assert.match(envFile, /^KEEP=me$/m);
  assert.match(envFile, /^OPENROUTER_API_KEY=sk-or-v1-new$/m);
  assert.match(envFile, /^OMNIVOICE_HF_TOKEN=old$/m);

  const removed = await (await post('/api/credentials', { openrouter: null })).json();
  assert.equal(removed.capabilities.aiCues, false);
  assert.doesNotMatch(await readFile(join(root, '.env.local'), 'utf8'), /OPENROUTER_API_KEY/);

  assert.equal((await post('/api/credentials', { openrouter: 'bad token' })).status, 400);
  assert.equal((await post('/api/credentials', {})).status, 400);
  assert.equal((await post('/api/credentials', { openrouter: 'x' }, { Origin: 'https://foreign.example' })).status, 403);
});

test('voice generation API rejects unknown fields, unsafe inputs, invalid enums and ranges', async t => {
  const { post } = await fixture(t, { capabilities: { edge: false } });
  const edge = { source: 'edge', script: 'Safe script.', language: 'en', voice: 'en-US-GuyNeural', maxPause: 0.2 };
  assert.equal((await post('/api/voice/generate', edge)).status, 503);
  for (const patch of [
    { token: 'browser-token' }, { path: 'C:\\secret.wav' }, { endpoint: 'https://provider.invalid' }, { model: 'other' },
  ]) assert.equal((await post('/api/voice/generate', { ...edge, ...patch })).status, 400);
  for (const patch of [
    { source: 'other' }, { script: '' }, { script: 'x'.repeat(20001) }, { language: 'fr' }, { voice: 'unknown' },
    { language: 'es' }, { maxPause: 0.09 }, { maxPause: 0.31 }, { maxPause: '0.2' },
  ]) assert.equal((await post('/api/voice/generate', { ...edge, ...patch })).status, 400);

  const omni = {
    source: 'omni', script: 'Safe script.', language: 'es',
    referenceId: '123e4567-e89b-12d3-a456-426614174000', referenceText: 'Reference words.', speed: 1, consent: true,
  };
  assert.equal((await post('/api/voice/generate', omni)).status, 503);
  for (const patch of [
    { consent: false }, { consent: 'true' }, { speed: 0.49 }, { speed: 1.51 }, { speed: '1' },
    { referenceText: '' }, { referenceText: 'x'.repeat(10001) }, { referenceId: '../reference.wav' },
    { referenceAudio: 'C:\\secret.wav' }, { token: 'browser-token' }, { provider: 'custom' },
  ]) assert.equal((await post('/api/voice/generate', { ...omni, ...patch })).status, 400);
});

function requestWithDeclaredLength(url, length) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const request = http.request({
      hostname: target.hostname,
      port: target.port,
      path: target.pathname + target.search,
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(length) },
    }, response => {
      response.resume();
      response.on('end', () => resolve(response.statusCode));
    });
    request.on('error', reject);
    request.end();
  });
}

test('voice references are opaque, private, normalized, bounded, audible, and strict', async t => {
  const { root, base, uploadReference, controls } = await fixture(t, { env: { PATH: process.env.PATH || '', OMNIVOICE_HF_TOKEN: 'test-credential' } });
  assert.equal((await uploadReference('../escape.wav', 'voice')).status, 400);
  assert.equal((await uploadReference('voice.wav', 'voice', '&extra=true')).status, 400);
  assert.equal((await uploadReference('voice.exe', 'voice')).status, 415);
  assert.equal(await requestWithDeclaredLength(`${base}/api/voice-reference?name=large.wav`, 25 * 1024 * 1024 + 1), 413);

  controls.referenceDuration = 2.99;
  assert.equal((await uploadReference('short.wav', 'voice')).status, 422);
  controls.referenceDuration = 60.01;
  assert.equal((await uploadReference('long.wav', 'voice')).status, 422);
  controls.referenceDuration = 4;
  controls.referenceHasAudio = false;
  assert.equal((await uploadReference('video-only.wav', 'voice')).status, 422);
  controls.referenceHasAudio = true;
  controls.referenceSilent = true;
  assert.equal((await uploadReference('silent.wav', 'voice')).status, 422);
  controls.referenceSilent = false;

  const response = await uploadReference('My Reference.WAV', 'audible voice');
  assert.equal(response.status, 200);
  const reference = await response.json();
  assert.deepEqual(Object.keys(reference).sort(), ['duration', 'id', 'name']);
  assert.match(reference.id, /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/);
  assert.equal(reference.name, 'My-Reference.wav');
  assert.equal(reference.duration, 4);
  assert.equal((await fetch(`${base}/.voice-private/reference-${reference.id}.wav`)).status, 404);
  assert.equal((await fetch(`${base}/assets/reference-${reference.id}.wav`)).status, 404);
  const privateFiles = await readdir(join(root, '.voice-private'));
  assert.equal(privateFiles.some(name => name.startsWith('.reference-upload-')), false);
  assert.equal(privateFiles.includes(`reference-${reference.id}.wav`), true);

  controls.referenceDuration = 3;
  assert.equal((await uploadReference('minimum.wav', 'voice')).status, 200);
  controls.referenceDuration = 60;
  assert.equal((await uploadReference('maximum.wav', 'voice')).status, 200);
});

test('Edge and Omni generation use private file arguments and feed the shared automatic pipeline', async t => {
  const env = { PATH: process.env.PATH || '', OMNIVOICE_HF_TOKEN: 'test-omni-credential' };
  const { root, post, uploadReference, calls, builds, providerInputs } = await fixture(t, { env });
  assert.equal((await post('/api/settings', { actionCues: [{ start: 0, end: 1, gesture: 'wave', emotion: 'warm' }] })).status, 200);

  const edgeScript = 'Edge generated narration.';
  const edgeResponse = await post('/api/voice/generate', { source: 'edge', script: edgeScript, language: 'en', voice: 'en-US-JennyNeural', maxPause: 0.2 });
  assert.equal(edgeResponse.status, 200);
  const edgeState = await edgeResponse.json();
  assert.equal(edgeState.speech.transcript, edgeScript);
  assert.deepEqual(edgeState.settings.actionCues, []);
  assert.equal(await readFile(join(root, 'assets/narration.wav'), 'utf8'), 'generated edge');
  const edgeCall = calls.find(call => call.args.includes('--engine') && call.args[call.args.indexOf('--engine') + 1] === 'edge');
  assert.ok(edgeCall);
  assert.equal(edgeCall.args.includes('--text'), false);
  assert.equal(edgeCall.args.includes('--token'), false);
  assert.equal(edgeCall.args.includes(edgeScript), false);
  assert.match(edgeCall.args[edgeCall.args.indexOf('--script-file') + 1], /[\\/]\.voice-private[\\/]job-/);
  assert.equal(edgeCall.env.OMNIVOICE_HF_TOKEN, undefined);
  assert.equal(providerInputs[0].script, `${edgeScript}\n`);
  assert.ok(calls.some(call => call.args.some(value => /transcribe-audio\.py$/.test(value))));
  assert.equal(builds.at(-1).dialog, `${edgeScript}\n`);
  assert.deepEqual(JSON.parse(builds.at(-1).words).map(item => item.word), ['Hello', 'mother', 'stopped.']);
  assert.equal((await readdir(join(root, '.voice-private'))).some(name => name.startsWith('job-')), false);

  const uploaded = await uploadReference('clone.wav', 'reference voice');
  assert.equal(uploaded.status, 200);
  const reference = await uploaded.json();
  const omniScript = 'Omni generated narration.';
  const referenceText = 'These are the spoken reference words.';
  const omniBody = { source: 'omni', script: omniScript, language: 'es', referenceId: reference.id, referenceText, speed: 1.1, consent: true };
  const omniResponse = await post('/api/voice/generate', omniBody);
  assert.equal(omniResponse.status, 200);
  const omniState = await omniResponse.json();
  assert.equal(omniState.speech.transcript, omniScript);
  assert.equal(await readFile(join(root, 'assets/narration.wav'), 'utf8'), 'generated omni');
  const omniCall = calls.find(call => call.args.includes('--engine') && call.args[call.args.indexOf('--engine') + 1] === 'omni');
  assert.ok(omniCall);
  assert.equal(omniCall.args.includes(omniScript), false);
  assert.equal(omniCall.args.includes(referenceText), false);
  assert.equal(omniCall.args.includes('--reference-audio'), true);
  assert.equal(omniCall.args.includes('--reference-text-file'), true);
  assert.equal(omniCall.env.OMNIVOICE_HF_TOKEN, 'test-omni-credential');
  assert.equal(providerInputs.at(-1).referenceText, `${referenceText}\n`);
  assert.equal((await post('/api/voice/generate', omniBody)).status, 404);
  const remaining = await readdir(join(root, '.voice-private'));
  assert.equal(remaining.includes(`reference-${reference.id}.wav`), false);
  assert.equal(remaining.some(name => name.startsWith('job-')), false);
});

test('provider failures are sanitized, preserve narration, clean jobs, and do not consume Omni references', async t => {
  const env = { PATH: process.env.PATH || '', OMNIVOICE_HF_TOKEN: 'test-omni-credential' };
  const { root, post, uploadReference, controls } = await fixture(t, { env });
  const before = await readFile(join(root, 'assets/narration.wav'), 'utf8');
  const uploaded = await uploadReference('retry.wav', 'reference voice');
  const reference = await uploaded.json();
  const body = {
    source: 'omni', script: 'A failed generation must not publish.', language: 'en',
    referenceId: reference.id, referenceText: 'Reference transcript.', speed: 1, consent: true,
  };
  controls.providerFailure = true;
  const failed = await post('/api/voice/generate', body);
  assert.equal(failed.status, 502);
  const failure = await failed.json();
  assert.doesNotMatch(failure.error, /secret|token-value|private-path|https?:/i);
  assert.equal(await readFile(join(root, 'assets/narration.wav'), 'utf8'), before);
  let privateFiles = await readdir(join(root, '.voice-private'));
  assert.equal(privateFiles.some(name => name.startsWith('job-')), false);
  assert.equal(privateFiles.includes(`reference-${reference.id}.wav`), true);

  controls.providerFailure = false;
  assert.equal((await post('/api/voice/generate', body)).status, 200);
  privateFiles = await readdir(join(root, '.voice-private'));
  assert.equal(privateFiles.includes(`reference-${reference.id}.wav`), false);
});

test('expired references and server close remove private voice files', async t => {
  const env = { PATH: process.env.PATH || '', OMNIVOICE_HF_TOKEN: 'test-credential' };
  const { root, post, uploadReference, server } = await fixture(t, { env, voiceReferenceTtlMs: 15 });
  const reference = await (await uploadReference('expires.wav', 'voice')).json();
  await new Promise(resolve => setTimeout(resolve, 30));
  const response = await post('/api/voice/generate', {
    source: 'omni', script: 'Expired.', language: 'en', referenceId: reference.id,
    referenceText: 'Reference.', speed: 1, consent: true,
  });
  assert.equal(response.status, 404);
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  await new Promise(resolve => setTimeout(resolve, 10));
  await assert.rejects(readdir(join(root, '.voice-private')), error => error.code === 'ENOENT');
});

test('OpenRouter semantic cues use the fixed free model, strict prompt, and local fallback', async t => {
  let invalid = false;
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: invalid
        ? 'provider prose is not accepted'
        : JSON.stringify({ cues: [{ start: 0, end: 0.95, gesture: 'stop', emotion: 'shock', text: 'Hello mother stopped.' }] }) } }] }),
    };
  };
  const env = { PATH: process.env.PATH || '', OPENROUTER_API_KEY: 'test-openrouter-credential' };
  const { post, upload } = await fixture(t, { env, fetchImpl });
  assert.equal((await upload('audio', 'semantic.wav', 'audio')).status, 200);
  const body = { script: '', recognizer: 'phonetic', useVideoAudio: false, autoTranscribe: true, language: 'en', useAiCues: true };
  const built = await post('/api/build', body);
  assert.equal(built.status, 200);
  assert.deepEqual((await built.json()).settings.actionCues, [{ start: 0, end: 0.95, gesture: 'stop', emotion: 'shock', text: 'Hello mother stopped.' }]);
  assert.equal(requests[0].url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer test-openrouter-credential');
  const payload = JSON.parse(requests[0].options.body);
  assert.equal(payload.model, 'openrouter/free');
  assert.equal(payload.temperature, 0);
  assert.match(payload.messages[1].content, /Return JSON only/);
  assert.doesNotMatch(requests[0].options.body, /test-openrouter-credential/);

  invalid = true;
  const fallback = await post('/api/build', body);
  assert.equal(fallback.status, 200);
  assert.deepEqual((await fallback.json()).settings.actionCues, []);
});

test('Python adapter keeps sensitive inputs file-only and pins both providers', async () => {
  const source = await readFile(fileURLToPath(new URL('./generate-voice.py', import.meta.url)), 'utf8');
  const catalog = await readFile(fileURLToPath(new URL('./list-edge-voices.py', import.meta.url)), 'utf8');
  assert.doesNotMatch(source, /add_argument\(["']--(?:text|token|endpoint|provider|model)["']/);
  assert.match(source, /add_argument\("--script-file"/);
  assert.match(source, /add_argument\("--reference-text-file"/);
  assert.match(source, /Client\("k2-fsa\/OmniVoice"/);
  assert.match(source, /api_name="\/_clone_fn"/);
  assert.match(source, /edge_tts\.Communicate\(script, voice\)/);
  assert.match(catalog, /edge_tts\.list_voices\(\)/);
});
