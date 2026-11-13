#!/usr/bin/env node
/**
 * One-command setup and health check.
 *
 * `npm install` alone is not enough: export shells out to a pinned HyperFrames
 * CLI, and voice generation needs two Python packages. This script installs what
 * npm can install, reports what is missing, and pre-fetches the renderer so the
 * first export is not a surprise download.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const isWindows = process.platform === 'win32';
const PIN = '0.9.30';

const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');
const skipRenderer = args.has('--no-renderer');

const results = [];
let failed = 0;

function run(executable, commandArgs, options = {}) {
  return execFileSync(executable, commandArgs, {
    cwd: root,
    encoding: 'utf8',
    stdio: options.capture === false ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    timeout: options.timeout ?? 10 * 60 * 1000,
  });
}

/** Locate npm's JS entry point so we never need a shell to run npm or npx. */
function resolveCli(name) {
  const candidates = [];
  if (process.env.npm_execpath) candidates.push(join(dirname(process.env.npm_execpath), `${name}-cli.js`));
  candidates.push(join(dirname(process.execPath), 'node_modules', 'npm', 'bin', `${name}-cli.js`));
  if (isWindows) {
    try {
      const found = execFileSync('where.exe', [name], { encoding: 'utf8' });
      for (const line of found.split(/\r?\n/).filter(Boolean)) {
        candidates.push(join(dirname(line.trim()), 'node_modules', 'npm', 'bin', `${name}-cli.js`));
      }
    } catch { /* npm is not on PATH; the candidates above decide */ }
  }
  return candidates.find(candidate => existsSync(candidate)) ?? null;
}

const npmCli = resolveCli('npm');
const npxCli = resolveCli('npx');

function runNpm(commandArgs, options) {
  if (npmCli) return run(process.execPath, [npmCli, ...commandArgs], options);
  return run(isWindows ? 'npm.cmd' : 'npm', commandArgs, { ...options, shell: isWindows });
}

function runNpx(commandArgs, options) {
  if (npxCli) return run(process.execPath, [npxCli, ...commandArgs], options);
  return run(isWindows ? 'npx.cmd' : 'npx', commandArgs, { ...options, shell: isWindows });
}

function probe(label, executable, commandArgs, { required = true, hint = '', parse = null } = {}) {
  try {
    const output = run(executable, commandArgs).trim();
    const detail = parse ? parse(output) : output.split(/\r?\n/)[0];
    results.push({ label, ok: true, detail, hint });
    return output;
  } catch {
    results.push({ label, ok: false, detail: 'not found', hint, required });
    if (required) failed++;
    return null;
  }
}

function pythonCommand() {
  for (const candidate of isWindows ? [['py', ['-3']], ['python', []]] : [['python3', []], ['python', []]]) {
    try {
      run(candidate[0], [...candidate[1], '--version']);
      return candidate;
    } catch { /* try the next interpreter */ }
  }
  return null;
}

console.log(`\nToonSaz setup${checkOnly ? ' (check only)' : ''}\n`);

// 1. Node itself.
const nodeMajor = Number(process.versions.node.split('.')[0]);
results.push({
  label: 'Node.js',
  ok: nodeMajor >= 20,
  detail: `v${process.versions.node}`,
  hint: nodeMajor >= 20 ? '' : 'Install Node.js 20 or newer from nodejs.org.',
});
if (nodeMajor < 20) failed++;

// 2. npm dependencies.
if (!checkOnly) {
  process.stdout.write('Installing npm dependencies... ');
  try {
    runNpm(['install', '--no-audit', '--no-fund'], { capture: false });
    console.log('done');
  } catch {
    console.log('failed');
    failed++;
  }
}
results.push({
  label: 'npm packages',
  ok: existsSync(join(root, 'node_modules', 'gsap')),
  detail: existsSync(join(root, 'node_modules', 'gsap')) ? 'installed' : 'missing',
  hint: 'Run npm install in the avatar folder.',
});

// 3. ffmpeg, required for every upload, probe and export.
probe('ffmpeg', 'ffmpeg', ['-version'], {
  hint: 'Install ffmpeg and put it on PATH. Windows: winget install Gyan.FFmpeg',
  parse: output => `version ${output.match(/ffmpeg version (\S+)/)?.[1] ?? 'unknown'}`,
});

// 4. Python and the two voice packages.
const python = pythonCommand();
results.push({
  label: 'Python',
  ok: Boolean(python),
  detail: python ? `${python[0]} ${python[1].join(' ')}`.trim() : 'not found',
  hint: 'Install Python 3.11 or newer from python.org and tick "Add to PATH".',
});
if (!python) failed++;

const pipHint = `Run: ${python ? `${python[0]} ${python[1].join(' ')} `.trim() + ' ' : ''}-m pip install edge-tts faster-whisper`;
for (const [label, module] of [['edge-tts', 'edge_tts'], ['faster-whisper', 'faster_whisper']]) {
  if (!python) {
    results.push({ label, ok: false, detail: 'skipped (no Python)', hint: pipHint, required: false });
    continue;
  }
  try {
    run(python[0], [...python[1], '-c', `import ${module}`]);
    results.push({ label, ok: true, detail: 'installed' });
  } catch {
    results.push({ label, ok: false, detail: 'missing', hint: pipHint, required: false });
  }
}

// 5. The renderer. This is the step everyone forgets: export runs a pinned
//    HyperFrames CLI, which npm install does not provide.
if (!skipRenderer) {
  process.stdout.write(`Fetching HyperFrames ${PIN}... `);
  try {
    const version = runNpx(['--yes', `hyperframes@${PIN}`, '--version'], { timeout: 30 * 60 * 1000 }).trim();
    console.log('done');
    results.push({ label: 'HyperFrames', ok: true, detail: version.split(/\r?\n/)[0] });
  } catch {
    console.log('failed');
    results.push({
      label: 'HyperFrames',
      ok: false,
      detail: 'not available',
      hint: 'Export needs internet for the first run. Check your connection and retry.',
      required: true,
    });
    failed++;
  }
}

// 6. Report.
console.log('');
for (const item of results) {
  const mark = item.ok ? 'ok  ' : item.required === false ? 'warn' : 'FAIL';
  console.log(`  ${mark}  ${item.label.padEnd(15)} ${item.detail}`);
  if (!item.ok && item.hint) console.log(`        ${item.hint}`);
}

console.log('');
if (failed) {
  console.log(`${failed} required step(s) failed. Fix the lines marked FAIL and run npm run setup again.`);
  process.exit(1);
}
console.log('Everything required is ready.');
console.log('Start the editor with:  npm run library');
console.log('First export downloads a headless browser (about 150 MB) once, then renders offline.');
