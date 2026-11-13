// Builds the landing-page demo: two on-brand cards rendered in Chrome, then a
// single MP4 with the screencast and the real narration muxed at the moment the
// editor started playing it. Run record-demo.mjs first.
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

if (!process.argv[2]) throw new Error('Pass the cached HyperFrames package.json path.');
const require = createRequire(resolve(process.argv[2]));
const puppeteer = require('puppeteer-core');
const { getInstalledBrowsers } = require('@puppeteer/browsers');

const installed = await getInstalledBrowsers({ cacheDir: join(homedir(), '.cache', 'hyperframes', 'chrome') });
const executable = installed
  .filter(item => item.browser === 'chrome-headless-shell')
  .sort((a, b) => b.buildId.localeCompare(a.buildId, undefined, { numeric: true }))[0]?.executablePath;
if (!executable) throw new Error('No cached Chrome. Run npm run check once.');

const root = fileURLToPath(new URL('..', import.meta.url));
const work = join(root, '.hyperframes', 'demo');
const out = join(root, '..', 'site', 'assets', 'toonsaz-demo.mp4');
const marks = JSON.parse(await readFile(join(work, 'marks.json'), 'utf8'));
await copyFile(join(root, 'assets', 'narration.wav'), join(work, 'narration.wav'));
await mkdir(join(work, 'cards'), { recursive: true });

const card = ({ eyebrow, headline, sub, foot }) => `<!doctype html><meta charset="utf-8">
<style>
  @page { margin: 0 }
  * { box-sizing: border-box }
  body { margin: 0; width: 1280px; height: 720px; background: #f7f5ef; color: #242720;
    font-family: "Segoe UI", Arial, sans-serif; display: flex; flex-direction: column;
    justify-content: space-between; padding: 64px 76px; }
  .brand { display: flex; align-items: center; gap: 14px; }
  .mark { width: 52px; height: 52px; border: 2px solid #242720; border-radius: 6px; text-align: center;
    font-family: Georgia, serif; font-size: 38px; line-height: 48px; padding-bottom: 2px; }
  .mark span { color: #527047; }
  .name { font-size: 13px; font-weight: 700; letter-spacing: 3px; line-height: 1.15; }
  .eyebrow { font-size: 11px; letter-spacing: 2.6px; color: #6b6e62; margin: 0 0 18px; }
  h1 { font-family: Georgia, "Times New Roman", serif; font-weight: 400; font-size: 68px;
    line-height: 1.08; letter-spacing: -1.6px; margin: 0; max-width: 900px; }
  .sub { margin: 22px 0 0; font-size: 19px; color: #6b6e62; }
  .rule { height: 1px; background: #dcded3; margin: 30px 0 18px; }
  .foot { display: flex; justify-content: space-between; align-items: baseline; font-size: 13px; color: #6b6e62; }
  .url { font-size: 17px; color: #242720; font-weight: 600; letter-spacing: .3px; }
  .dot { color: #527047; }
</style>
<div class="brand"><div class="mark">t<span>.</span></div><div class="name">TOON<br>SAZ</div></div>
<div><p class="eyebrow">${eyebrow}</p><h1>${headline}</h1><p class="sub">${sub}</p></div>
<div><div class="rule"></div><div class="foot"><span>${foot}</span><span class="url">toonsaz.vercel.app</span></div></div>`;

const browser = await puppeteer.launch({ executablePath: executable, headless: true, defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
for (const [name, spec] of Object.entries({
  title: {
    eyebrow: 'LOCAL CARTOON AVATAR STUDIO',
    headline: 'Cartoon videos,<br>made on your machine.',
    sub: 'Forty characters <span class="dot">·</span> real lip sync <span class="dot">·</span> Urdu and Hindi',
    foot: 'Free and open source',
  },
  end: {
    eyebrow: 'WINDOWS 10 AND 11',
    headline: 'Make the next one<br>yourself.',
    sub: 'No account <span class="dot">·</span> no subscription <span class="dot">·</span> nothing uploaded',
    foot: 'MIT licensed',
  },
})) {
  await page.setContent(card(spec), { waitUntil: 'load' });
  await page.screenshot({ path: join(work, 'cards', `${name}.png`) });
}
await browser.close();

const titleSeconds = 3;
const endSeconds = 3;
const rawSeconds = marks.duration / 1000;
const total = titleSeconds + rawSeconds + endSeconds;
const audioDelay = Math.round((titleSeconds + marks.audioStart / 1000) * 1000);

const args = [
  '-y',
  '-loop', '1', '-t', String(titleSeconds), '-i', join(work, 'cards', 'title.png'),
  '-i', join(work, 'raw.webm'),
  '-loop', '1', '-t', String(endSeconds), '-i', join(work, 'cards', 'end.png'),
  '-i', join(work, 'narration.wav'),
  '-filter_complex',
  `[0:v]fps=30,scale=1280:720,setsar=1[v0];[1:v]fps=30,scale=1280:720,setsar=1[v1];[2:v]fps=30,scale=1280:720,setsar=1[v2];[v0][v1][v2]concat=n=3:v=1:a=0[v];[3:a]adelay=${audioDelay}|${audioDelay},apad[a]`,
  '-map', '[v]', '-map', '[a]',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '160k', '-ar', '48000',
  '-movflags', '+faststart', '-shortest', '-t', total.toFixed(2),
  out,
];

await new Promise((done, fail) => {
  const child = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-4000); });
  child.on('close', code => code === 0 ? done() : fail(new Error(`ffmpeg failed (${code})\n${stderr}`)));
});
console.log(`wrote ${out} (${total.toFixed(1)}s, audio at ${(audioDelay / 1000).toFixed(2)}s)`);
