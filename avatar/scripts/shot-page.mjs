// Screenshot any local page at a given width. Used to review the site before deploy.
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';

const [, , hyperframesPkg, url, outPath, widthArg, fullArg] = process.argv;
if (!hyperframesPkg || !url || !outPath) throw new Error('Usage: node shot-page.mjs <hyperframes-package.json> <url> <out.png> [width] [full]');

const require = createRequire(resolve(hyperframesPkg));
const puppeteer = require('puppeteer-core');
const { getInstalledBrowsers } = require('@puppeteer/browsers');

const installed = await getInstalledBrowsers({ cacheDir: join(homedir(), '.cache', 'hyperframes', 'chrome') });
const executable = installed
  .filter(item => item.browser === 'chrome-headless-shell')
  .sort((a, b) => b.buildId.localeCompare(a.buildId, undefined, { numeric: true }))[0]?.executablePath;
if (!executable) throw new Error('No cached Chrome.');

const width = Number(widthArg ?? 1440);
const profile = await mkdtemp(join(process.env.TEMP ?? '.', 'shot-'));
const errors = [];
let browser;
try {
  browser = await puppeteer.launch({ executablePath: executable, headless: true, userDataDir: profile });
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  page.on('requestfailed', request => errors.push(`failed: ${request.url()}`));
  await page.setViewport({ width, height: 1000, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: resolve(outPath), fullPage: fullArg === 'full' });
  if (errors.length) {
    console.error(errors.join('\n'));
    throw new Error(`${errors.length} page error(s)`);
  }
  console.log(`shot ${outPath}`);
} finally {
  if (browser) await browser.close();
  await rm(profile, { recursive: true, force: true });
}
