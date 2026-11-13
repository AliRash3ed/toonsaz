import http from 'node:http';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { access, copyFile, mkdir, mkdtemp, open, readFile, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { createGesturePlan, validateActionCues } from './gesture-plan.mjs';
import { buildAICuePrompt, parseAICuePlan } from './ai-cue-plan.mjs';
import { analyze, toDevanagari } from './transliterate.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export const MAX_UPLOAD_BYTES = 300 * 1024 * 1024;
const JSON_LIMIT = 2 * 1024 * 1024;
const MAX_VOICE_REFERENCE_BYTES = 25 * 1024 * 1024;
const VOICE_REFERENCE_TTL = 30 * 60 * 1000;
const MAX_DURATION = 86400;
const avatars = new Set(['sana', 'ayan', 'zain', 'noor', 'squircle', 'css-person', 'bearded-man', 'curly-boy', 'cap-guy', 'pompadour-guy', 'soft-bust', 'blond-swept', 'clay', 'homer', 'bart', 'king', 'guard', 'inquisitor', 'heart', 'mouse', 'kawaii-cat', 'neo', 'luna', 'koda', 'ayan-copy', 'aarav', 'forma-zara', 'forma-barnaby', 'forma-tariq', 'forma-kabir', 'forma-devon', 'forma-elena', 'forma-marcus', 'forma-mina', 'forma-kenji', 'forma-mei', 'forma-jinwoo', 'forma-priya', 'forma-haruto', 'forma-zainab', 'forma-arthur', 'forma-liam', 'forma-oliver', 'forma-noah', 'forma-chloe', 'forma-malik', 'forma-harper', 'forma-maya', 'forma-amara']);
const backgrounds = new Set(['white-grid', 'cream-grid', 'sky-grid', 'night-grid', 'solid-white', 'solid-black', 'chroma-green', 'transparent', 'custom']);
const canvasSizes = Object.freeze({
  '1:1': Object.freeze({ width: 1080, height: 1080 }),
  '9:16': Object.freeze({ width: 1080, height: 1920 }),
  '16:9': Object.freeze({ width: 1920, height: 1080 }),
});
const outfits = new Set(['profile', 'hoodie', 'crewneck', 'blazer', 'sweater', 'tshirt', 'royal', 'armor', 'cloak']);
const glasses = new Set(['none', 'round', 'square', 'sunglasses']);
const hats = new Set(['none', 'cap', 'backwards-cap', 'beanie', 'crown', 'helmet', 'inquisitor']);
const earrings = new Set(['profile', 'none', 'hoops', 'studs', 'drops']);
const neckwear = new Set(['profile', 'none', 'pearls', 'chain', 'tie']);
const voiceLanguages = new Set(['en', 'es']);
const languageCode = value => typeof value === 'string' && /^[a-z]{2,3}$/.test(value);
const gestures = new Set(['auto', 'rest', 'open-palms', 'point-up', 'point-front', 'empathy', 'directional', 'stop', 'chop', 'steeple', 'count-1', 'count-2', 'count-3', 'scale-wide', 'scale-small', 'pinch', 'thinking', 'wave']);
const emotions = new Set(['auto', 'neutral', 'warm', 'sad', 'shock', 'focused', 'curious', 'confident']);
const extensions = {
  audio: new Set(['.wav', '.mp3', '.m4a', '.aac', '.ogg', '.flac', '.opus', '.aif', '.aiff', '.webm', '.wma']),
  video: new Set(['.mp4', '.webm', '.mov', '.mkv', '.m4v', '.avi']),
  image: new Set(['.png', '.jpg', '.jpeg', '.webp']),
};
const customBackgroundPath = /^assets\/uploads\/image-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}-[A-Za-z0-9_-]+\.(?:png|jpe?g|webp)$/;
const defaults = {
  avatar: 'sana', background: 'white-grid', customBackground: null, layout: 'solo', aspectRatio: '1:1',
  placement: { x: 0, y: 0, scale: 1 }, outfit: 'profile', glasses: 'none', hat: 'none', earrings: 'profile', neckwear: 'profile',
  gesture: 'auto', emotion: 'auto', video: { enabled: false, src: 'assets/source-video.mp4', duration: 0 }, actionCues: [],
};
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.ogg': 'audio/ogg', '.flac': 'audio/flac', '.opus': 'audio/ogg', '.aif': 'audio/aiff', '.aiff': 'audio/aiff', '.wma': 'audio/x-ms-wma', '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.mkv': 'video/x-matroska', '.avi': 'video/x-msvideo', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, `${label} must be an object.`);
}
function keys(value, allowed, label) {
  object(value, label);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new HttpError(400, `Unknown ${label} field: ${key}`);
}
function finiteDuration(value, zero = false) {
  return Number.isFinite(value) && value >= (zero ? 0 : Number.MIN_VALUE) && value <= MAX_DURATION;
}
function checkedPlan(input) {
  keys(input, ['text', 'words', 'duration'], 'plan');
  if (input.text !== undefined && (typeof input.text !== 'string' || input.text.length > 100000)) throw new HttpError(400, 'Script must be text, at most 100,000 characters.');
  if (input.words !== undefined && input.words !== null && typeof input.words !== 'string' && typeof input.words !== 'object') throw new HttpError(400, 'Word timestamps must be transcript text or JSON.');
  if (input.duration !== undefined && !finiteDuration(input.duration)) throw new HttpError(400, 'Duration must be positive, finite, and at most 24 hours.');
  try { return createGesturePlan(input); }
  catch (error) { throw new HttpError(400, error.message); }
}

function checkedVoiceRequest(input) {
  object(input, 'voice request');
  if (!['edge', 'omni'].includes(input.source)) throw new HttpError(400, 'Voice source must be edge or omni.');
  const allowed = input.source === 'edge'
    ? ['source', 'script', 'language', 'voice', 'maxPause', 'useAiCues']
    : ['source', 'script', 'language', 'referenceId', 'referenceText', 'speed', 'consent', 'useAiCues'];
  keys(input, allowed, 'voice request');
  const script = typeof input.script === 'string' ? input.script.trim() : '';
  if (!script || input.script.length > 20000) throw new HttpError(400, 'Script must contain 1 to 20,000 characters.');
  if (input.useAiCues !== undefined && typeof input.useAiCues !== 'boolean') throw new HttpError(400, 'useAiCues must be a boolean.');
  if (input.source === 'edge') {
    if (!languageCode(input.language)) throw new HttpError(400, 'Edge language must be a two or three letter code.');
    if (typeof input.voice !== 'string' || !/^[a-z]{2,3}(?:-[A-Za-z0-9]+)+Neural$/.test(input.voice)) throw new HttpError(400, 'Select a supported Edge voice.');
    if (!input.voice.toLowerCase().startsWith(`${input.language}-`)) throw new HttpError(400, 'The selected Edge voice does not support that language.');
    if (!Number.isFinite(input.maxPause) || input.maxPause < 0.1 || input.maxPause > 0.3) throw new HttpError(400, 'maxPause must be from 0.10 to 0.30 seconds.');
    return { ...input, script };
  }
  if (!voiceLanguages.has(input.language)) throw new HttpError(400, 'Omni language must be en or es.');
  if (typeof input.referenceId !== 'string' || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(input.referenceId)) throw new HttpError(400, 'referenceId must be an opaque server-issued ID.');
  const referenceText = typeof input.referenceText === 'string' ? input.referenceText.trim() : '';
  if (!referenceText || input.referenceText.length > 10000) throw new HttpError(400, 'Reference text must contain 1 to 10,000 characters.');
  if (!Number.isFinite(input.speed) || input.speed < 0.5 || input.speed > 1.5) throw new HttpError(400, 'speed must be from 0.5 to 1.5.');
  if (input.consent !== true) throw new HttpError(400, 'Voice cloning requires explicit consent.');
  return { ...input, script, referenceText };
}

export function parseAssignedJSON(source, name) {
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name)) throw new Error('Invalid global name.');
  const match = source.match(new RegExp(`^\\s*globalThis\\.${name}\\s*=\\s*(\\{[\\s\\S]*\\})\\s*;\\s*$`));
  if (!match) throw new Error(`${name} must be a single JSON assignment, not executable code.`);
  return JSON.parse(match[1]);
}

export function validateSettings(patch, current = defaults, duration = MAX_DURATION) {
  keys(patch, ['avatar', 'background', 'customBackground', 'layout', 'aspectRatio', 'placement', 'outfit', 'glasses', 'hat', 'earrings', 'neckwear', 'gesture', 'emotion', 'video', 'actionCues'], 'settings');
  const base = {
    ...defaults, ...current,
    placement: { ...defaults.placement, ...current.placement },
    video: { ...defaults.video, ...current.video },
    actionCues: current.actionCues || [],
  };
  const next = { ...base, ...patch, placement: { ...base.placement }, video: { ...base.video }, actionCues: base.actionCues };
  for (const [key, allowed] of [
    ['avatar', avatars], ['background', backgrounds], ['layout', new Set(['solo', 'split'])], ['aspectRatio', new Set(Object.keys(canvasSizes))],
    ['outfit', outfits], ['glasses', glasses], ['hat', hats], ['earrings', earrings], ['neckwear', neckwear], ['gesture', gestures], ['emotion', emotions],
  ]) {
    if (!allowed.has(next[key])) throw new HttpError(400, `Invalid ${key}: ${String(next[key])}`);
  }
  if (next.customBackground !== null && (typeof next.customBackground !== 'string' || !customBackgroundPath.test(next.customBackground))) {
    throw new HttpError(400, 'Custom background must be null or a server-generated PNG, JPEG, or WebP upload path.');
  }
  if (patch.placement !== undefined) {
    keys(patch.placement, ['x', 'y', 'scale'], 'placement');
    next.placement = { ...base.placement, ...patch.placement };
  }
  if (![next.placement.x, next.placement.y, next.placement.scale].every(Number.isFinite)
      || next.placement.x < -100 || next.placement.x > 100 || next.placement.y < -100 || next.placement.y > 100
      || next.placement.scale < 0.5 || next.placement.scale > 1.8) {
    throw new HttpError(400, 'Placement needs finite x/y values from -100 to 100 and scale from 0.5 to 1.8.');
  }
  if (patch.video !== undefined) {
    keys(patch.video, ['enabled', 'src', 'duration'], 'video');
    next.video = { ...base.video, ...patch.video };
  }
  if (typeof next.video.enabled !== 'boolean' || next.video.src !== 'assets/source-video.mp4' || !finiteDuration(next.video.duration, true)) throw new HttpError(400, 'Video needs a boolean enabled flag, the fixed assets/source-video.mp4 path, and a valid duration.');
  if (patch.actionCues !== undefined) next.actionCues = patch.actionCues;
  if (!Array.isArray(next.actionCues) || next.actionCues.length > 2000) throw new HttpError(400, 'Action cues must be an array with at most 2,000 entries.');
  for (const cue of next.actionCues) {
    keys(cue, ['start', 'end', 'gesture', 'emotion', 'text'], 'cue');
    if (cue.text !== undefined && (typeof cue.text !== 'string' || cue.text.length > 10000)) throw new HttpError(400, 'Cue text must be at most 10,000 characters.');
  }
  try { next.actionCues = validateActionCues(next.actionCues, duration); }
  catch (error) { throw new HttpError(400, error.message); }
  return next;
}

export function normalizeUploadName(kind, name) {
  if (!extensions[kind]) throw new HttpError(400, 'Upload kind must be audio, video, or image.');
  if (typeof name !== 'string' || !name || name.length > 180 || /[\\/\x00-\x1f]/.test(name) || name.startsWith('.') || /^data:/i.test(name)) throw new HttpError(400, 'Use a filename, not a path or data URL.');
  const extension = extname(name).toLowerCase();
  if (!extensions[kind].has(extension)) throw new HttpError(415, `Unsupported ${kind} extension: ${extension || '(none)'}`);
  const stem = name.slice(0, -extension.length).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || kind;
  return `${stem}${extension}`;
}

function markupAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\u0060]+))`, 'i'));
  return match ? match[1] ?? match[2] ?? match[3] : undefined;
}

function setMarkupAttribute(tag, name, value) {
  const pattern = new RegExp(`(\\s${name}\\s*=\\s*)("[^"]*"|'[^']*'|[^\\s"'=<>\u0060]+)`, 'i');
  if (pattern.test(tag)) {
    return tag.replace(pattern, (match, prefix, raw) => `${prefix}${raw.startsWith("'") ? `'${value}'` : `"${value}"`}`);
  }
  const close = tag.endsWith('/>') ? '/>' : '>';
  return `${tag.slice(0, -close.length).replace(/\s+$/, '')} ${name}="${value}"${close}`;
}

export function patchCanvasMarkup(source, aspectRatio, kind) {
  if (typeof source !== 'string') throw new TypeError('Canvas markup must be a string.');
  if (!canvasSizes[aspectRatio]) throw new Error(`Unsupported aspect ratio: ${String(aspectRatio)}`);
  if (!['index', 'presenter'].includes(kind)) throw new Error('Canvas markup kind must be index or presenter.');
  const { width, height } = canvasSizes[aspectRatio];
  const seen = { root: 0, host: 0, svg: 0, backdrop: 0 };
  const backdropIds = new Set(['avatar-background', 'avatar-backdrop', 'presenter-backdrop', 'scene-backdrop', 'backdrop', 'background']);
  const customImageIds = new Set(['avatar-custom-background', 'avatar-custom-image', 'custom-background', 'custom-background-image', 'custom-image']);
  const tags = /<!--[\s\S]*?-->|<(script|style|textarea|title)\b(?:[^"'<>]|"[^"]*"|'[^']*')*>[\s\S]*?<\/\1\s*>|<[a-z][\w:-]*(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi;
  const patched = source.replace(tags, (tag, rawText) => {
    if (rawText || tag.startsWith('<!--')) return tag;
    const tagName = tag.match(/^<([a-z][\w:-]*)/i)?.[1].toLowerCase();
    const id = markupAttribute(tag, 'id');
    let attributes = [];
    if (id === 'root') {
      if (++seen.root > 1) throw new Error(`Duplicate #root in ${kind} markup.`);
      attributes = [['data-width', width], ['data-height', height], ['data-fps', 30], ['data-aspect-ratio', aspectRatio]];
    } else if (kind === 'index' && id === 'presenter') {
      if (++seen.host > 1) throw new Error('Duplicate #presenter in index markup.');
      attributes = [['data-width', width], ['data-height', height], ['data-aspect-ratio', aspectRatio]];
    } else if (kind === 'presenter' && tagName === 'svg' && seen.svg === 0) {
      seen.svg++;
      attributes = [['viewBox', `0 0 ${width} ${height}`]];
    } else if (kind === 'presenter' && tagName === 'rect' && backdropIds.has(id)) {
      if (++seen.backdrop > 1) throw new Error('Duplicate presenter backdrop.');
      attributes = [['width', width], ['height', height]];
    } else if (kind === 'presenter' && tagName === 'image' && (customImageIds.has(id) || /custom.*(?:background|image)|(?:background|image).*custom/i.test(id || ''))) {
      attributes = [['width', width], ['height', height]];
    }
    for (const [name, value] of attributes) tag = setMarkupAttribute(tag, name, value);
    return tag;
  });
  const missing = kind === 'index'
    ? [['root', seen.root], ['presenter host', seen.host]]
    : [['root', seen.root], ['SVG', seen.svg], ['backdrop', seen.backdrop]];
  const absent = missing.filter(([, count]) => count !== 1).map(([label]) => label);
  if (absent.length) throw new Error(`Missing canvas target(s) in ${kind} markup: ${absent.join(', ')}.`);
  return patched;
}

export function parseRange(header, size) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2]) || size <= 0) throw new HttpError(416, 'Only a single valid byte range is supported.');
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] ? (match[2] ? Math.min(Number(match[2]), size - 1) : size - 1) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start || (!match[1] && Number(match[2]) === 0)) throw new HttpError(416, 'Byte range is outside this file.');
  return { start, end };
}

function frameRate(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
  if (typeof value !== 'string' || !value) return null;
  const rational = value.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  const parsed = rational ? Number(rational[1]) / Number(rational[2]) : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function streamHasAlpha(stream) {
  const alphaTag = Object.entries(stream.tags || {}).find(([name]) => name.toLowerCase() === 'alpha_mode')?.[1];
  if (alphaTag !== undefined && !['', '0', 'false', 'no'].includes(String(alphaTag).toLowerCase())) return true;
  return /^(?:rgba|bgra|argb|abgr|rgba64(?:le|be)|bgra64(?:le|be)|ya\d*|yuva\d+p\d*(?:le|be)?|gbrap(?:f32|\d+)?(?:le|be)?|pal8)$/i.test(stream.pix_fmt || '');
}

async function runProcess(executable, args, label, timeout = 15 * 60 * 1000, options = {}) {
  return new Promise((accept, reject) => {
    let stdout = '', stderr = '', timedOut = false;
    const child = spawn(executable, args, {
      cwd: this.root, shell: false, windowsHide: true, detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'], ...(options.env ? { env: options.env } : {}),
    });
    const timer = setTimeout(() => {
      timedOut = true;
      if (process.platform === 'win32' && child.pid) {
        const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { shell: false, windowsHide: true, stdio: 'ignore' });
        killer.on('error', () => child.kill());
      } else if (child.pid) {
        try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
      }
    }, timeout);
    child.stdout.on('data', chunk => { stdout = (stdout + chunk).slice(-2 * 1024 * 1024); });
    child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-2 * 1024 * 1024); });
    child.on('error', error => { clearTimeout(timer); reject(new HttpError(503, `${label} could not start: ${error.message}`)); });
    child.on('close', code => {
      clearTimeout(timer);
      if (timedOut) reject(new HttpError(504, `${label} timed out. Its processing tree was stopped.`));
      else if (code !== 0) {
        const details = [stderr.trim(), stdout.trim()].filter(Boolean).join('\n') || `exit ${code}`;
        reject(new HttpError(422, `${label} failed: ${details.slice(-8000)}`));
      }
      else accept({ stdout, stderr });
    });
  });
}

export function createLibraryServer({
  root = projectRoot,
  runCommand = runProcess,
  maxUploadBytes = MAX_UPLOAD_BYTES,
  npxCli,
  env = process.env,
  capabilities: capabilityOverrides = {},
  providerTimeouts = {},
  voiceReferenceTtlMs = VOICE_REFERENCE_TTL,
  fetchImpl = globalThis.fetch,
  aiTimeoutMs = 60_000,
} = {}) {
  root = resolve(root);
  const realRoot = realpath(root);
  const serverEnv = { ...env };
  const omniToken = typeof serverEnv.OMNIVOICE_HF_TOKEN === 'string' ? serverEnv.OMNIVOICE_HF_TOKEN.trim() : '';
  const capabilities = Object.freeze({
    edge: capabilityOverrides.edge === undefined ? true : capabilityOverrides.edge === true,
    omni: capabilityOverrides.omni !== false && Boolean(omniToken),
    aiCues: capabilityOverrides.aiCues !== false && typeof serverEnv.OPENROUTER_API_KEY === 'string' && Boolean(serverEnv.OPENROUTER_API_KEY.trim()),
  });
  const timeouts = {
    edge: Number.isFinite(providerTimeouts.edge) && providerTimeouts.edge > 0 ? providerTimeouts.edge : 5 * 60 * 1000,
    omni: Number.isFinite(providerTimeouts.omni) && providerTimeouts.omni > 0 ? providerTimeouts.omni : 15 * 60 * 1000,
  };
  const providerErrors = { edge: null, omni: null, aiCues: null };
  let edgeVoiceCatalog = null;
  if (!Number.isFinite(voiceReferenceTtlMs) || voiceReferenceTtlMs <= 0) throw new TypeError('voiceReferenceTtlMs must be positive.');
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function.');
  if (!Number.isFinite(aiTimeoutMs) || aiTimeoutMs <= 0) throw new TypeError('aiTimeoutMs must be positive.');
  const run = (executable, args, label, timeout, options) => runCommand.call({ root }, executable, args, label, timeout, options);
  const renameWithRetry = async (source, destination) => {
    for (let attempt = 0; ; attempt++) {
      try { return await rename(source, destination); }
      catch (error) {
        if (!['EPERM', 'EBUSY', 'EACCES'].includes(error.code) || attempt >= 6) throw error;
        await delay(20 * (2 ** attempt));
      }
    }
  };
  let queue = Promise.resolve(), pending = 0, processing = null;
  const voiceReferences = new Map();
  const confined = async path => {
    const actual = await realpath(join(root, path));
    const rel = relative(await realRoot, actual);
    if (rel.startsWith('..') || isAbsolute(rel)) throw new HttpError(403, 'Files outside the project are not accessible.');
    return actual;
  };
  const uploadsDirectory = async () => {
    await confined('assets');
    await mkdir(join(root, 'assets', 'uploads'), { recursive: true });
    return confined('assets/uploads');
  };
  const voicePrivateDirectory = async () => {
    await mkdir(join(root, '.voice-private'), { recursive: true, mode: 0o700 });
    return confined('.voice-private');
  };
  const removeVoiceReference = async id => {
    const reference = voiceReferences.get(id);
    if (!reference) return;
    voiceReferences.delete(id);
    clearTimeout(reference.timer);
    await rm(reference.path, { force: true });
  };
  const voiceReference = async id => {
    const reference = voiceReferences.get(id);
    if (!reference) throw new HttpError(404, 'Voice reference not found or expired. Upload it again.');
    if (reference.expiresAt <= Date.now()) {
      await removeVoiceReference(id);
      throw new HttpError(404, 'Voice reference not found or expired. Upload it again.');
    }
    return reference;
  };
  const loadJSON = async path => JSON.parse(await readFile(await confined(path), 'utf8'));
  const loadEdgeVoices = async () => {
    if (edgeVoiceCatalog) return edgeVoiceCatalog;
    try {
      const script = await confined('scripts/list-edge-voices.py');
      const pythonArgs = process.platform === 'win32' ? ['-3.13', '-B', script] : ['-B', script];
      const result = await run(process.platform === 'win32' ? 'py' : 'python3', pythonArgs, 'Edge voice catalog', 60_000);
      const catalog = JSON.parse(result.stdout);
      if (!Array.isArray(catalog) || catalog.length < 10 || catalog.some(voice => (
        !voice || typeof voice !== 'object' || !/^[a-z]{2,3}(?:-[A-Za-z0-9]+)+Neural$/.test(voice.name)
        || !languageCode(voice.language) || typeof voice.locale !== 'string' || !['female', 'male'].includes(voice.gender)
        || typeof voice.label !== 'string'
      ))) throw new Error('Edge returned an invalid voice catalog.');
      edgeVoiceCatalog = catalog;
      providerErrors.edge = null;
      return catalog;
    } catch (error) {
      providerErrors.edge = error.message;
      throw new HttpError(error.status || 503, `Edge voice catalog is unavailable: ${error.message}`);
    }
  };
  const enqueue = (label, work) => {
    if (pending >= 12) throw new HttpError(429, 'The local processing queue is full. Wait for the current job.');
    pending++;
    const job = queue.then(async () => {
      processing = label;
      try { return await work(); } finally { processing = null; pending--; }
    });
    queue = job.catch(() => {});
    return job;
  };
  const settingsEntries = async settings => {
    const json = JSON.stringify(settings, null, 2);
    const escaped = json.replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    const [index, presenter] = await Promise.all([
      readFile(await confined('index.html'), 'utf8'),
      readFile(await confined('compositions/presenter.html'), 'utf8'),
    ]);
    const hidden = settings.layout !== 'split' || !settings.video.enabled;
    const updated = patchCanvasMarkup(index, settings.aspectRatio, 'index').replace(/<video\b[^>]*\bid=["']source-video["'][^>]*>/i, tag => {
      return /\sdata-hidden\s*=/.test(tag) ? tag.replace(/(\sdata-hidden\s*=\s*)(["'])[^"']*\2/, `$1$2${hidden}$2`) : tag.replace(/>$/, ` data-hidden="${hidden}">`);
    });
    return [
      { path: 'assets/avatar-settings.json', content: `${json}\n` },
      { path: 'assets/avatar-settings.js', content: `globalThis.AvatarSettings = ${escaped};\n` },
      { path: 'index.html', content: updated },
      { path: 'compositions/presenter.html', content: patchCanvasMarkup(presenter, settings.aspectRatio, 'presenter') },
    ];
  };
  // Publish the settings twins (and converted video) together; roll back ordinary rename failures.
  const publish = async entries => {
    const directory = await mkdtemp(join(await uploadsDirectory(), '.library-publish-'));
    const completed = [];
    let retain = false;
    try {
      for (const [index, entry] of entries.entries()) {
        entry.destination = join(root, entry.path);
        entry.backup = join(directory, `backup-${index}`);
        try { await confined(entry.path); await copyFile(entry.destination, entry.backup); entry.existed = true; }
        catch (error) { if (error.code !== 'ENOENT') throw error; entry.existed = false; }
        entry.staged = join(directory, `new-${index}`);
        if (entry.source) await copyFile(entry.source, entry.staged);
        else await writeFile(entry.staged, entry.content, { flag: 'wx' });
      }
      try {
        for (const entry of entries) { await renameWithRetry(entry.staged, entry.destination); completed.push(entry); }
      } catch (error) {
        const failures = [];
        for (const entry of completed.reverse()) {
          try {
            if (entry.existed) await renameWithRetry(entry.backup, entry.destination);
            else await rm(entry.destination, { force: true });
          } catch (rollback) { failures.push(rollback.message); }
        }
        retain = failures.length > 0;
        throw new Error(`Publication failed: ${error.message}. ${retain ? 'Recovery backups retained in assets/uploads.' : 'Previous files restored.'}`);
      }
    } finally { if (!retain) await rm(directory, { recursive: true, force: true }); }
  };
  const loadInputs = async () => {
    let inputs;
    try { inputs = await loadJSON('assets/uploads/.library-inputs.json'); }
    catch (error) { if (error.code === 'ENOENT') return { audio: null, video: null, image: null }; throw error; }
    keys(inputs, ['audio', 'video', 'image'], 'inputs');
    for (const kind of ['audio', 'video', 'image']) {
      const input = inputs[kind];
      if (!input) continue;
      if (typeof input.src !== 'string' || !new RegExp(`^assets/uploads/${kind}-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}-[A-Za-z0-9_-]+\\.[a-z0-9]+$`).test(input.src) || !extensions[kind].has(extname(input.src).toLowerCase())) throw new Error('Stored upload path is invalid.');
      await confined(input.src);
    }
    return { audio: inputs.audio || null, video: inputs.video || null, image: inputs.image || null };
  };
  const loadState = async () => {
    const settings = validateSettings(await loadJSON('assets/avatar-settings.json'));
    const canonical = await loadJSON('assets/narration.rhubarb.json');
    const generated = parseAssignedJSON(await readFile(await confined('assets/lipsync-data.js'), 'utf8'), 'AvatarSpeech');
    if (!finiteDuration(canonical?.metadata?.duration) || !Array.isArray(canonical.mouthCues)) throw new Error('Canonical Rhubarb narration is invalid.');
    const speech = { ...generated, audio: 'assets/narration.wav', metadata: { ...generated.metadata, ...canonical.metadata }, mouthCues: canonical.mouthCues };
    speech.gestureCues ||= [];
    speech.emotionCues ||= [];
    if (typeof speech.transcript !== 'string') speech.transcript = '';
    const demoScript = (await readFile(await confined('assets/avatar_guide.txt'), 'utf8')).trim();
    return {
      settings, speech, uploads: await loadInputs(), demoScript, capabilities,
      providers: {
        edge: { ready: capabilities.edge, error: providerErrors.edge },
        omni: { ready: capabilities.omni, error: providerErrors.omni, requirement: capabilities.omni ? null : 'Add OMNIVOICE_HF_TOKEN to .env.local and restart.' },
        aiCues: { ready: capabilities.aiCues, error: providerErrors.aiCues, requirement: capabilities.aiCues ? null : 'Add OPENROUTER_API_KEY to .env.local and restart.' },
      },
    };
  };
  const probe = async (path, requireDuration = true) => {
    const result = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,format_name:stream=codec_type,codec_name,duration,width,height,avg_frame_rate,r_frame_rate,pix_fmt:stream_tags=alpha_mode', '-of', 'json', path], 'Media inspection', 60000);
    let info;
    try { info = JSON.parse(result.stdout); } catch { throw new HttpError(422, 'ffprobe did not return valid media metadata.'); }
    const streams = Array.isArray(info?.streams) ? info.streams : [];
    const duration = Number(info?.format?.duration || Math.max(0, ...streams.map(stream => Number(stream.duration) || 0)));
    if (requireDuration && !finiteDuration(duration)) throw new HttpError(422, 'Media must have a positive duration no longer than 24 hours.');
    return {
      duration: finiteDuration(duration) ? duration : null,
      hasAudio: streams.some(stream => stream.codec_type === 'audio'),
      hasVideo: streams.some(stream => stream.codec_type === 'video'),
      videoStreams: streams.filter(stream => stream.codec_type === 'video'),
      formatName: info?.format?.format_name,
    };
  };
  const receive = async (request, limit, file) => {
    const chunks = [];
    const handle = file ? await open(file, 'wx') : null;
    let count = 0;
    try {
      for await (const chunk of request.iterator({ destroyOnReturn: false })) {
        count += chunk.length;
        if (count > limit) { request.resume(); throw new HttpError(413, 'Upload/request exceeds the allowed size.'); }
        if (handle) {
          let offset = 0;
          while (offset < chunk.length) {
            const { bytesWritten } = await handle.write(chunk, offset, chunk.length - offset);
            if (!bytesWritten) throw new HttpError(500, 'Unable to write uploaded media.');
            offset += bytesWritten;
          }
        }
        else chunks.push(chunk);
      }
      if (count === 0) throw new HttpError(400, 'Request body is empty.');
      return file ? count : Buffer.concat(chunks).toString('utf8');
    } finally { await handle?.close(); }
  };
  const readJSONBody = async request => {
    if ((request.headers['content-type'] || '').split(';')[0].trim().toLowerCase() !== 'application/json') throw new HttpError(415, 'Send application/json.');
    if (Number(request.headers['content-length']) > JSON_LIMIT) throw new HttpError(413, 'JSON request is too large.');
    try { return JSON.parse(await receive(request, JSON_LIMIT)); }
    catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(400, 'Request must contain valid JSON.'); }
  };
  const json = (response, status, body) => {
    const data = JSON.stringify(body);
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(data), 'Cache-Control': 'no-store' });
    response.end(data);
  };
  const requestAICues = async ({ text, words, duration }) => {
    if (!capabilities.aiCues) return [];
    try {
      const response = await fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serverEnv.OPENROUTER_API_KEY.trim()}`,
          'Content-Type': 'application/json',
          'X-Title': 'Local Avatar Atelier',
        },
        body: JSON.stringify({
          model: 'openrouter/free',
          temperature: 0,
          messages: [
            { role: 'system', content: 'Return only the requested strict JSON cue plan.' },
            { role: 'user', content: buildAICuePrompt({ text, words, duration }) },
          ],
        }),
        signal: AbortSignal.timeout(aiTimeoutMs),
      });
      if (!response.ok) {
        providerErrors.aiCues = `OpenRouter returned HTTP ${response.status}; local cue planning was used.`;
        return [];
      }
      const payload = await response.json();
      const content = payload?.choices?.[0]?.message?.content;
      const plan = parseAICuePlan(content, { duration });
      providerErrors.aiCues = null;
      return plan;
    } catch (error) {
      providerErrors.aiCues = `OpenRouter failed (${error.name || 'request error'}); local cue planning was used.`;
      return [];
    }
  };
  const projectPath = path => relative(root, path).replace(/\\/g, '/');
  const buildNarration = async ({
    previous, audio, script, wordsInput, recognizer, language, transcribe, preserveScript = false, workDirectory, useAiCues = false,
  }) => {
    const audioPath = await confined(audio);
    const directory = workDirectory || await uploadsDirectory();
    const id = randomUUID();
    const temporaryFiles = [];
    try {
      const suppliedWords = wordsInput !== undefined && wordsInput !== null && wordsInput !== '';
      if (transcribe) {
        const transcriptPath = join(directory, `.transcript-${id}.json`);
        temporaryFiles.push(transcriptPath);
        const transcriber = await confined('scripts/transcribe-audio.py');
        const pythonArgs = process.platform === 'win32' ? ['-3.13', '-B', transcriber] : ['-B', transcriber];
        pythonArgs.push('--audio', audioPath, '--output', transcriptPath, '--language', language);
        await run(process.platform === 'win32' ? 'py' : 'python3', pythonArgs, 'Automatic transcription');
        let transcription;
        try { transcription = JSON.parse(await readFile(transcriptPath, 'utf8')); }
        catch (error) { throw new HttpError(422, `Automatic transcription did not produce valid JSON: ${error.message}`); }
        if (!transcription || typeof transcription.text !== 'string' || transcription.text.length > 100000
            || typeof transcription.language !== 'string' || !Array.isArray(transcription.words) || !transcription.words.length) {
          throw new HttpError(422, 'Automatic transcription must return text, a detected language, and word timestamps.');
        }
        if (!preserveScript || !script) script = transcription.text.trim();
        wordsInput = transcription.words;
      }
      const hasWords = wordsInput !== undefined && wordsInput !== null && wordsInput !== '';
      if (!script && !hasWords) throw new HttpError(400, 'Paste the words spoken in your recording, supply its timed transcript, or enable automatic transcription.');
      const plan = checkedPlan({ text: script, ...(hasWords ? { words: wordsInput } : {}) });
      if (!script) script = plan.transcript;
      const dialogPath = join(directory, `.dialog-${id}.txt`);
      temporaryFiles.push(dialogPath);
      await writeFile(dialogPath, `${script}\n`, { flag: 'wx', mode: 0o600 });
      const args = [join(root, 'scripts', 'lipsync.mjs'), '--audio', audio, '--dialog', projectPath(dialogPath), '--recognizer', recognizer];
      if (hasWords) {
        const wordsPath = join(directory, `.words-${id}.txt`);
        temporaryFiles.push(wordsPath);
        await writeFile(wordsPath, typeof wordsInput === 'string' ? wordsInput : JSON.stringify(wordsInput), { flag: 'wx', mode: 0o600 });
        args.push('--words', projectPath(wordsPath));
      }
      await run(process.execPath, args, 'Rhubarb lip sync');
      const actionCues = useAiCues ? await requestAICues({ text: script, words: hasWords ? wordsInput : null, duration: plan.duration }) : [];
      await publish(await settingsEntries({ ...previous.settings, actionCues }));
      return loadState();
    } finally {
      await Promise.all(temporaryFiles.map(path => rm(path, { force: true })));
    }
  };
  const serve = async (request, response, pathname) => {
    let path;
    if (pathname === '/' || ['/library.html', '/library.css', '/library.js'].includes(pathname)) path = pathname === '/' ? 'library.html' : pathname.slice(1);
    else if (pathname === '/gsapdist/gsap.min.js') path = 'node_modules/gsap/dist/gsap.min.js';
    else if (pathname.startsWith('/assets/')) path = pathname.slice(1);
    else if (/^\/renders\/[A-Za-z0-9_-]+\.(?:mp4|webm)$/.test(pathname)) path = pathname.slice(1);
    else throw new HttpError(404, 'Public file not found.');
    if (/[\\\x00]/.test(path) || path.split('/').some(part => part.startsWith('.')) || !types[extname(path).toLowerCase()]) throw new HttpError(404, 'Public file not found.');
    if (path === 'assets/avatar-settings.js' || path === 'assets/avatar-settings.json' || path === 'assets/source-video.mp4' || path === 'assets/narration.wav' || path === 'assets/lipsync-data.js') await queue;
    const filename = await confined(path);
    const info = await stat(filename);
    if (!info.isFile()) throw new HttpError(404, 'Public file not found.');
    let range;
    try { range = parseRange(request.headers.range, info.size); }
    catch (error) { response.setHeader('Content-Range', `bytes */${info.size}`); throw error; }
    const headers = { 'Content-Type': types[extname(path).toLowerCase()], 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache', 'Content-Length': range ? range.end - range.start + 1 : info.size };
    if (range) headers['Content-Range'] = `bytes ${range.start}-${range.end}/${info.size}`;
    response.writeHead(range ? 206 : 200, headers);
    if (request.method === 'HEAD') return response.end();
    const stream = createReadStream(filename, range || {});
    stream.on('error', () => response.destroy());
    response.on('close', () => stream.destroy());
    stream.pipe(response);
  };
  const server = http.createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    try {
      const port = server.address()?.port;
      if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(request.headers.host)) throw new HttpError(403, 'Only this local library host is allowed.');
      const url = new URL(request.url, `http://127.0.0.1:${port}`);
      const pathname = decodeURIComponent(url.pathname);
      const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
      if (mutating && request.headers.origin && ![`http://127.0.0.1:${port}`, `http://localhost:${port}`].includes(request.headers.origin)) throw new HttpError(403, 'Non-local or foreign Origin rejected. Open the library on port 3010.');
      if (request.method === 'GET' && pathname === '/api/status') return json(response, 200, { processing, pending });
      if (request.method === 'GET' && pathname === '/api/voices/edge') return json(response, 200, { voices: await loadEdgeVoices() });
      if (request.method === 'GET' && pathname === '/api/state') { await queue; return json(response, 200, await loadState()); }
      if (request.method === 'GET' && pathname === '/api/rig') {
        await queue;
        const html = await readFile(await confined('compositions/presenter.html'), 'utf8');
        const svg = html.match(/<svg\b[\s\S]*?<\/svg\s*>/i)?.[0];
        if (!svg) throw new Error('Presenter scene does not contain an SVG rig.');
        return json(response, 200, { svg });
      }
      if (request.method === 'POST' && pathname === '/api/plan') return json(response, 200, checkedPlan(await readJSONBody(request)));
      if (request.method === 'POST' && pathname === '/api/transliterate') {
        const body = await readJSONBody(request);
        object(body, 'Transliteration request');
        keys(body, ['text', 'force'], 'Transliteration request');
        if (typeof body.text !== 'string') throw new HttpError(400, 'Text is required.');
        if (body.text.length > 100000) throw new HttpError(400, 'Text must be at most 100,000 characters.');
        const force = body.force ?? null;
        if (force !== null && !['roman', 'urdu', 'devanagari'].includes(force)) throw new HttpError(400, 'Force must be roman, urdu, devanagari, or omitted.');
        return json(response, 200, { ...analyze(body.text), result: toDevanagari(body.text, { force }) });
      }
      if (request.method === 'POST' && pathname === '/api/settings') {
        const body = await readJSONBody(request);
        const state = await enqueue('Saving choices', async () => {
          const previous = await loadState();
          const duration = previous.speech.renderDuration || previous.speech.metadata.duration;
          const settings = validateSettings(body, previous.settings, duration);
          await publish(await settingsEntries(settings));
          return loadState();
        });
        return json(response, 200, state);
      }
      if (request.method === 'PUT' && pathname === '/api/voice-reference') {
        const queryKeys = [...url.searchParams.keys()];
        if (queryKeys.length !== 1 || queryKeys[0] !== 'name') throw new HttpError(400, 'Voice reference requires only one name query parameter.');
        const name = normalizeUploadName('audio', url.searchParams.get('name'));
        const contentType = (request.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
        if (contentType !== 'application/octet-stream' && !/^audio\/[a-z0-9.+-]+$/.test(contentType)) throw new HttpError(415, 'Voice reference must be supported audio data or application/octet-stream.');
        const length = request.headers['content-length'];
        if (length !== undefined && (!/^\d+$/.test(length) || Number(length) > MAX_VOICE_REFERENCE_BYTES)) throw new HttpError(413, 'Voice reference must be no larger than 25 MB.');
        const result = await enqueue('Preparing private voice reference', async () => {
          const directory = await voicePrivateDirectory();
          const id = randomUUID();
          const uploaded = join(directory, `.reference-upload-${id}.part`);
          const normalized = join(directory, `reference-${id}.wav`);
          let committed = false;
          try {
            await receive(request, MAX_VOICE_REFERENCE_BYTES, uploaded);
            const metadata = await probe(uploaded);
            if (!metadata.hasAudio) throw new HttpError(422, 'Voice reference must contain an audio stream.');
            if (metadata.duration < 3 || metadata.duration > 60) throw new HttpError(422, 'Voice reference duration must be from 3 to 60 seconds.');
            const level = await run('ffmpeg', [
              '-hide_banner', '-nostdin', '-i', uploaded, '-map', '0:a:0', '-vn',
              '-af', 'volumedetect', '-f', 'null', '-',
            ], 'Voice reference inspection', 60000);
            const maximum = level.stderr.match(/max_volume:\s*(-?inf|[-+]?\d+(?:\.\d+)?)\s*dB/i)?.[1];
            if (!maximum) throw new HttpError(422, 'Voice reference loudness could not be verified.');
            if (maximum.toLowerCase() === '-inf') throw new HttpError(422, 'Voice reference must contain audible speech, not silence.');
            await run('ffmpeg', [
              '-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-i', uploaded,
              '-map', '0:a:0', '-vn', '-ac', '1', '-ar', '24000', '-c:a', 'pcm_s16le', normalized,
            ], 'Voice reference normalization', 60000);
            const output = await probe(normalized);
            if (!output.hasAudio || output.duration < 3 || output.duration > 60) throw new HttpError(422, 'Normalized voice reference is not usable.');
            const expiresAt = Date.now() + voiceReferenceTtlMs;
            const timer = setTimeout(() => { removeVoiceReference(id).catch(() => {}); }, voiceReferenceTtlMs);
            timer.unref?.();
            voiceReferences.set(id, { path: normalized, name, duration: output.duration, expiresAt, timer });
            committed = true;
            return { id, name, duration: output.duration };
          } finally {
            await rm(uploaded, { force: true });
            if (!committed) await rm(normalized, { force: true });
          }
        });
        return json(response, 200, result);
      }
      if (request.method === 'PUT' && pathname === '/api/upload') {
        const kind = url.searchParams.get('kind');
        const name = normalizeUploadName(kind, url.searchParams.get('name'));
        const contentType = (request.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
        const imageTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
        const typed = kind === 'image' ? imageTypes.has(contentType) : new RegExp(`^${kind}/[a-z0-9.+-]+$`).test(contentType);
        if (contentType !== 'application/octet-stream' && !typed) throw new HttpError(415, `Upload must be supported ${kind} data or application/octet-stream.`);
        const length = request.headers['content-length'];
        if (length !== undefined && (!/^\d+$/.test(length) || Number(length) > maxUploadBytes)) throw new HttpError(413, 'Maximum upload size is 300 MB.');
        const state = await enqueue(`Importing ${kind}`, async () => {
          const directory = await uploadsDirectory();
          const src = `assets/uploads/${kind}-${randomUUID()}-${name}`;
          const destination = join(root, src);
          const temporary = `${destination}.part`;
          let converted;
          let committed = false;
          try {
            await receive(request, maxUploadBytes, temporary);
            await rename(temporary, destination);
            const metadata = await probe(destination, kind !== 'image');
            if (!(kind === 'audio' ? metadata.hasAudio : metadata.hasVideo)) throw new HttpError(422, `This file does not contain a usable ${kind} stream.`);
            const previous = await loadState();
            const inputs = { ...previous.uploads };
            let input = { src, name, duration: metadata.duration, hasAudio: metadata.hasAudio };
            const entries = [];
            if (kind === 'video') {
              converted = join(directory, `.converted-${randomUUID()}.mp4`);
              await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-i', destination, '-map', '0:v:0', '-map', '0:a:0?', '-sn', '-dn', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', converted], 'Video conversion');
              const output = await probe(converted);
              if (!output.hasVideo) throw new HttpError(422, 'Converted video has no video stream.');
              input.duration = output.duration;
              const settings = validateSettings({ layout: 'split', video: { enabled: true, src: 'assets/source-video.mp4', duration: output.duration } }, previous.settings);
              entries.push({ path: 'assets/source-video.mp4', source: converted }, ...await settingsEntries(settings));
            } else if (kind === 'image') {
              const stream = metadata.videoStreams.find(item => Number.isInteger(Number(item.width)) && Number(item.width) > 0 && Number.isInteger(Number(item.height)) && Number(item.height) > 0);
              const expectedCodec = { '.png': 'png', '.jpg': 'mjpeg', '.jpeg': 'mjpeg', '.webp': 'webp' }[extname(name).toLowerCase()];
              if (!stream || stream.codec_name !== expectedCodec) throw new HttpError(422, 'Image contents must match its PNG, JPEG, or WebP filename and have valid dimensions.');
              input = { src, name, width: Number(stream.width), height: Number(stream.height), codec: stream.codec_name };
              const settings = validateSettings({ background: 'custom', customBackground: src }, previous.settings);
              entries.push(...await settingsEntries(settings));
            }
            inputs[kind] = input;
            entries.push({ path: 'assets/uploads/.library-inputs.json', content: `${JSON.stringify(inputs, null, 2)}\n` });
            await publish(entries);
            committed = true;
            const obsolete = previous.uploads[kind]?.src;
            if (obsolete && obsolete !== src) await rm(join(root, obsolete), { force: true }).catch(() => {});
            return loadState();
          } finally {
            await rm(temporary, { force: true });
            if (converted) await rm(converted, { force: true });
            if (!committed) await rm(destination, { force: true });
          }
        });
        return json(response, 200, state);
      }
      if (request.method === 'POST' && pathname === '/api/voice/generate') {
        const body = checkedVoiceRequest(await readJSONBody(request));
        if (!capabilities[body.source]) throw new HttpError(503, `${body.source === 'edge' ? 'Edge TTS' : 'OmniVoice'} is not configured on this server.`);
        const state = await enqueue(`Generating ${body.source === 'edge' ? 'Edge' : 'Omni'} narration`, async () => {
          const previous = await loadState();
          const reference = body.source === 'omni' ? await voiceReference(body.referenceId) : null;
          const directory = await voicePrivateDirectory();
          const jobDirectory = await mkdtemp(join(directory, 'job-'));
          try {
            const scriptPath = join(jobDirectory, 'script.txt');
            const outputPath = join(jobDirectory, 'generated.wav');
            await writeFile(scriptPath, `${body.script}\n`, { flag: 'wx', mode: 0o600 });
            const generator = await confined('scripts/generate-voice.py');
            const pythonArgs = process.platform === 'win32' ? ['-3.13', '-B', generator] : ['-B', generator];
            pythonArgs.push('--engine', body.source, '--script-file', scriptPath, '--output', outputPath, '--language', body.language);
            if (body.source === 'edge') {
              pythonArgs.push('--voice', body.voice, '--max-pause', String(body.maxPause));
            } else {
              const referenceTextPath = join(jobDirectory, 'reference.txt');
              await writeFile(referenceTextPath, `${body.referenceText}\n`, { flag: 'wx', mode: 0o600 });
              pythonArgs.push('--reference-audio', reference.path, '--reference-text-file', referenceTextPath, '--speed', String(body.speed));
            }
            const childEnv = {};
            for (const key of ['PATH', 'Path', 'PATHEXT', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR', 'HOME', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA', 'PYTHONPATH', 'VIRTUAL_ENV']) {
              if (serverEnv[key] !== undefined) childEnv[key] = serverEnv[key];
            }
            if (body.source === 'omni') childEnv.OMNIVOICE_HF_TOKEN = omniToken;
            try {
              await run(process.platform === 'win32' ? 'py' : 'python3', pythonArgs, `${body.source === 'edge' ? 'Edge TTS' : 'OmniVoice'} generation`, timeouts[body.source], { env: childEnv });
            } catch (error) {
              providerErrors[body.source] = error.message;
              if (error.status === 504) throw new HttpError(504, 'Voice generation timed out. Retry with a shorter script.');
              throw new HttpError(502, 'Voice generation failed. Check the selected service and local dependencies, then retry.');
            }
            providerErrors[body.source] = null;
            let outputInfo;
            try {
              if (!(await stat(outputPath)).isFile()) throw new Error('not a file');
              outputInfo = await probe(outputPath);
            } catch {
              throw new HttpError(502, 'Voice generation did not produce usable audio. Retry or choose another voice.');
            }
            if (!outputInfo.hasAudio) throw new HttpError(502, 'Voice generation did not produce usable audio. Retry or choose another voice.');
            const generatedState = await buildNarration({
              previous,
              audio: projectPath(outputPath),
              script: body.script,
              wordsInput: undefined,
              recognizer: body.language === 'en' ? 'pocketSphinx' : 'phonetic',
              language: body.language,
              transcribe: true,
              preserveScript: true,
              workDirectory: jobDirectory,
              useAiCues: body.useAiCues === true,
            });
            if (reference) await removeVoiceReference(body.referenceId).catch(() => {});
            return generatedState;
          } finally {
            await rm(jobDirectory, { recursive: true, force: true });
          }
        });
        return json(response, 200, state);
      }
      if (request.method === 'POST' && pathname === '/api/build') {
        const body = await readJSONBody(request);
        keys(body, ['script', 'words', 'recognizer', 'useVideoAudio', 'autoTranscribe', 'language', 'useAiCues'], 'build');
        if (body.script !== undefined && (typeof body.script !== 'string' || body.script.length > 100000)) throw new HttpError(400, 'Script must be text, at most 100,000 characters.');
        const recognizer = body.recognizer || 'pocketSphinx';
        if (!['pocketSphinx', 'phonetic'].includes(recognizer)) throw new HttpError(400, 'Recognizer must be pocketSphinx or phonetic.');
        if (body.useVideoAudio !== undefined && typeof body.useVideoAudio !== 'boolean') throw new HttpError(400, 'useVideoAudio must be a boolean.');
        if (body.autoTranscribe !== undefined && typeof body.autoTranscribe !== 'boolean') throw new HttpError(400, 'autoTranscribe must be a boolean.');
        if (body.useAiCues !== undefined && typeof body.useAiCues !== 'boolean') throw new HttpError(400, 'useAiCues must be a boolean.');
        const language = body.language === undefined ? 'auto' : body.language;
        if (language !== 'auto' && !languageCode(language)) throw new HttpError(400, 'Language must be auto or a two/three letter ISO code.');
        const state = await enqueue('Building audio lip sync', async () => {
          const previous = await loadState();
          let audio = body.useVideoAudio ? null : previous.uploads.audio?.src;
          let imported = Boolean(audio);
          if (body.useVideoAudio) {
            if (!previous.uploads.video?.hasAudio) throw new HttpError(409, 'Import a video with an audible voice track first. Rhubarb cannot read silent video imagery.');
            audio = previous.uploads.video.src;
            imported = true;
          }
          let script = (body.script || '').trim();
          let wordsInput = body.words;
          if (!audio) {
            const normalize = text => text.trim().replace(/\s+/g, ' ');
            if (script && normalize(script) !== normalize(previous.demoScript)) throw new HttpError(409, 'This script differs from the demo recording. Import matching narration, or import voiced video and select its audio. Script preview does not generate speech.');
            script = previous.demoScript;
            audio = 'assets/avatar_guide.wav';
          }
          const suppliedWords = wordsInput !== undefined && wordsInput !== null && wordsInput !== '';
          return buildNarration({
            previous, audio, script, wordsInput, recognizer, language,
            transcribe: imported && (body.autoTranscribe === true || (!script && !suppliedWords)),
            useAiCues: body.useAiCues === true,
          });
        });
        return json(response, 200, state);
      }
      if (request.method === 'POST' && pathname === '/api/render') {
        const body = await readJSONBody(request);
        keys(body, ['name', 'format'], 'render');
        if (body.name !== undefined && (typeof body.name !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,70}$/.test(body.name))) throw new HttpError(400, 'Export name must contain only letters, numbers, underscores or hyphens.');
        const format = body.format === undefined ? 'mp4' : body.format;
        if (!['mp4', 'webm'].includes(format)) throw new HttpError(400, 'Render format must be mp4 or webm.');
        const result = await enqueue(`Rendering ${format.toUpperCase()}`, async () => {
          const state = await loadState();
          if (format === 'webm' && (state.settings.background !== 'transparent' || state.settings.layout !== 'solo' || state.settings.video.enabled)) {
            throw new HttpError(409, 'Transparent WebM requires a transparent background, solo layout, and disabled source video.');
          }
          await mkdir(join(root, 'renders'), { recursive: true });
          await confined('renders');
          const baseName = body.name || `${state.settings.avatar}-presenter`;
          let output = `renders/${baseName}.${format}`;
          for (let version = 2; ; version++) {
            try { await access(join(root, output)); output = `renders/${baseName}-${version}.${format}`; }
            catch (error) { if (error.code === 'ENOENT') break; throw error; }
          }
          const packageInfo = await loadJSON('package.json');
          const pin = packageInfo.scripts?.render?.match(/\bhyperframes@(\d+\.\d+\.\d+)(?=\s|$)/)?.[1];
          if (!pin) throw new HttpError(500, 'The project render script must pin a HyperFrames version.');
          const args = ['--yes', `hyperframes@${pin}`, 'render', '--format', format, '--fps', '30', '--quality', 'draft', ...(format === 'webm' ? ['--vp9-cpu-used', '8'] : []), '--output', output];
          let executable = 'npx';
          if (process.platform === 'win32') {
            const candidates = [
              ...(npxCli ? [isAbsolute(npxCli) ? npxCli : join(root, npxCli)] : []),
              join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js'),
            ];
            if (process.env.npm_execpath) candidates.push(join(dirname(process.env.npm_execpath), 'npx-cli.js'));
            try {
              const found = await run('where.exe', ['npx'], 'Finding local npx', 30000);
              for (const path of found.stdout.trim().split(/\r?\n/)) candidates.push(join(dirname(path), 'node_modules', 'npm', 'bin', 'npx-cli.js'));
            } catch { /* The Node-adjacent npm installation may still be available. */ }
            let npx;
            for (const path of candidates) { try { await access(path); npx = path; break; } catch {} }
            if (!npx) throw new HttpError(503, 'Local npx could not be found. Install Node.js with npm to export.');
            executable = process.execPath;
            args.unshift(npx);
          }
          const prefix = args.slice(0, args.indexOf('render'));
          let verified = false;
          try {
            await run(executable, [...prefix, 'check', '--json'], 'HyperFrames pre-export check');
            await run(executable, args, `HyperFrames ${format.toUpperCase()} render`, 30 * 60 * 1000);
            const filename = await confined(output);
            const metadata = await probe(filename, false);
            const stream = metadata.videoStreams.find(item => Number(item.width) > 0 && Number(item.height) > 0);
            const fps = stream && (frameRate(stream.avg_frame_rate) || frameRate(stream.r_frame_rate));
            const expected = canvasSizes[state.settings.aspectRatio];
            if (!stream || Number(stream.width) !== expected.width || Number(stream.height) !== expected.height || fps === null || Math.abs(fps - 30) > 0.001) {
              throw new HttpError(422, `Rendered media must be ${expected.width}x${expected.height} at 30 fps.`);
            }
            if (format === 'webm' && !streamHasAlpha(stream)) throw new HttpError(422, 'Rendered WebM does not report an alpha channel.');
            verified = true;
            return { fileURL: `/${output}`, fileName: output.slice('renders/'.length), outputPath: output, metadata: { width: expected.width, height: expected.height, fps, format }, state: await loadState() };
          } finally {
            if (!verified) await rm(join(root, output), { force: true });
          }
        });
        return json(response, 200, result);
      }
      if (['GET', 'HEAD'].includes(request.method) && !pathname.startsWith('/api/')) return await serve(request, response, pathname);
      throw new HttpError(404, 'Endpoint not found.');
    } catch (error) {
      if (response.headersSent) return response.destroy();
      const status = error.status || (['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : error instanceof URIError ? 400 : 500);
      if (status === 500) console.error(`library-server: ${error.message}`);
      json(response, status, { error: status === 404 ? 'Required local file or endpoint not found.' : error.message });
      request.resume();
    }
  });
  server.requestTimeout = 35 * 60 * 1000;
  server.headersTimeout = 60000;
  server.once('close', () => {
    for (const reference of voiceReferences.values()) clearTimeout(reference.timer);
    voiceReferences.clear();
    rm(join(root, '.voice-private'), { recursive: true, force: true }).catch(() => {});
  });
  return server;
}

const entry = process.argv[1] ? resolve(process.argv[1]) : '';
if (entry.toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  const server = createLibraryServer();
  server.on('error', error => { console.error(`Avatar library: ${error.message}`); process.exitCode = 1; });
  server.listen(3010, '127.0.0.1', () => console.log('Avatar Library: http://127.0.0.1:3010/library.html\nLocal-only. Import audio/video, preview cues, and export explicitly from the editor.'));
}
