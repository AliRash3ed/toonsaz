// Renders the social card and the PWA icons from real product art, so the OG
// image never drifts from what the app looks like.
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { mkdtemp, readFile, rm } from 'node:fs/promises';

if (!process.argv[2]) throw new Error('Pass the cached HyperFrames package.json path.');
const require = createRequire(resolve(process.argv[2]));
const puppeteer = require('puppeteer-core');
const { getInstalledBrowsers } = require('@puppeteer/browsers');

const installed = await getInstalledBrowsers({ cacheDir: join(homedir(), '.cache', 'hyperframes', 'chrome') });
const executable = installed
  .filter(item => item.browser === 'chrome-headless-shell')
  .sort((a, b) => b.buildId.localeCompare(a.buildId, undefined, { numeric: true }))[0]?.executablePath;
if (!executable) throw new Error('No cached Chrome.');

const out = resolve(process.argv[3] ?? 'site/assets');
// file:// images are blocked inside setContent, so inline the real stage render.
const stagePng = await readFile(join(out, 'editor-stage.png'));
const stage = `data:image/png;base64,${stagePng.toString('base64')}`;
const icon = await readFile(join(out, 'icon.svg'), 'utf8');

const card = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0}
  body{width:1200px;height:630px;background:#f7f5ef;color:#242720;
    font-family:"Segoe UI",system-ui,Arial,sans-serif;display:grid;
    grid-template-columns:1fr 440px;gap:48px;padding:64px 64px 56px;position:relative;overflow:hidden}
  .left{display:flex;flex-direction:column;justify-content:center}
  .mark{font-family:Georgia,serif;font-size:64px;line-height:.8;letter-spacing:-4px;margin-bottom:26px}
  .mark span{color:#527047}
  .eyebrow{font-family:Consolas,monospace;font-size:13px;letter-spacing:3.4px;text-transform:uppercase;color:#95998b;margin-bottom:20px}
  h1{font-family:Georgia,serif;font-weight:400;font-size:66px;line-height:1.03;letter-spacing:-2px;margin-bottom:24px}
  h1 em{font-style:normal;color:#3d5735}
  p{font-size:19px;line-height:1.55;color:#4a4f42;max-width:34ch}
  .right{position:relative;border:1px solid #c3c7b7;border-radius:4px;overflow:hidden;background:#fff}
  .right img{width:100%;height:100%;object-fit:cover;object-position:50% 22%}
  .url{position:absolute;left:64px;bottom:30px;font-family:Consolas,monospace;font-size:14px;letter-spacing:2px;color:#6b6e62}
  .dots{position:absolute;right:0;top:0;width:440px;height:100%;background-image:radial-gradient(#c3c7b7 1px,transparent 1px);background-size:18px 18px;opacity:.5}
</style></head><body>
  <div class="dots"></div>
  <div class="left">
    <div class="mark">t<span>.</span></div>
    <div class="eyebrow">Local cartoon avatar studio</div>
    <h1>Write a script.<br>Get a <em>talking cartoon</em>.</h1>
    <p>40 characters, 17 gestures, 1080p export. Runs on your own machine.</p>
  </div>
  <div class="right"><img src="${stage}" alt=""></div>
  <div class="url">toonsaz.vercel.app</div>
</body></html>`;

const profile = await mkdtemp(join(process.env.TEMP ?? '.', 'og-'));
let browser;
try {
  browser = await puppeteer.launch({ executablePath: executable, headless: true, userDataDir: profile });
  const page = await browser.newPage();

  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.setContent(card, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(out, 'og.png') });
  console.log('captured og.png');

  // Icons from the same SVG the favicon uses.
  const iconPage = await browser.newPage();
  for (const size of [180, 512]) {
    await iconPage.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    await iconPage.setContent(`<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px">${icon.replace('<svg', `<svg width="${size}" height="${size}"`)}</body></html>`, { waitUntil: 'load' });
    await iconPage.screenshot({ path: join(out, `icon-${size}.png`), omitBackground: true });
    console.log(`captured icon-${size}.png`);
  }
} finally {
  if (browser) await browser.close();
  await rm(profile, { recursive: true, force: true });
}
