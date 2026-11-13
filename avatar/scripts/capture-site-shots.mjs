// Captures the real editor for the landing page. Screenshots are taken from the
// running app, never mocked, so the site cannot drift from the product.
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import assert from 'node:assert/strict';

if (!process.argv[2]) throw new Error('Pass the cached HyperFrames package.json path.');
const require = createRequire(resolve(process.argv[2]));
const puppeteer = require('puppeteer-core');
const { getInstalledBrowsers } = require('@puppeteer/browsers');

const installed = await getInstalledBrowsers({ cacheDir: join(homedir(), '.cache', 'hyperframes', 'chrome') });
const executable = installed
  .filter(item => item.browser === 'chrome-headless-shell')
  .sort((a, b) => b.buildId.localeCompare(a.buildId, undefined, { numeric: true }))[0]?.executablePath;
if (!executable) throw new Error('No cached Chrome. Run npm run check once.');

const base = process.argv[3] ?? 'http://127.0.0.1:3010';
const out = resolve(process.argv[4] ?? 'site/assets');
await mkdir(out, { recursive: true });

const profile = await mkdtemp(join(process.env.TEMP ?? '.', 'shot-'));
let browser;
try {
  browser = await puppeteer.launch({ executablePath: executable, headless: true, userDataDir: profile });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1180, deviceScaleFactor: 2 });
  await page.goto(base + '/library.html', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelectorAll('.cast-option').length >= 40, { timeout: 20000 });
  await page.evaluate(() => document.fonts.ready);
  await new Promise(resolve => setTimeout(resolve, 600));

  const shot = async (name, selector, options = {}) => {
    const target = selector ? await page.$(selector) : page;
    assert.ok(target, `missing ${selector}`);
    await target.screenshot({ path: join(out, name), ...options });
    console.log(`captured ${name}`);
  };

  await shot('editor.png');
  await shot('editor-cast.png', '.cast-strip');
  await shot('editor-stage.png', '.stage-shell');

  // Devanagari helper, with a real Urdu script in the preview.
  await page.$eval('#script', node => { node.value = 'السلام علیکم دوستو، آج ہم بات کریں گے اے آئی کے بارے میں۔ یہ ٹیکنالوجی بہت تیزی سے بدل رہی ہے۔'; });
  await page.click('#transliterate-button');
  await page.waitForFunction(() => !document.querySelector('#translit-panel').hidden, { timeout: 15000 });
  await page.$eval('.script-section', node => node.scrollIntoView({ block: 'center' }));
  await shot('editor-devanagari.png', '.script-section');

  // Restore the editor to its saved narration script, not the demo text.
  await page.$eval('#translit-close', node => node.click());
  await page.$eval('#script', node => { node.value = ''; });
} finally {
  if (browser) await browser.close();
  await rm(profile, { recursive: true, force: true });
}
