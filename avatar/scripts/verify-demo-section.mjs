// Screenshots the demo section at desktop and phone widths for visual review.
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';

const require = createRequire(resolve(process.argv[2]));
const puppeteer = require('puppeteer-core');
const { getInstalledBrowsers } = require('@puppeteer/browsers');
const installed = await getInstalledBrowsers({ cacheDir: join(homedir(), '.cache', 'hyperframes', 'chrome') });
const executable = installed.filter(i => i.browser === 'chrome-headless-shell')
  .sort((a, b) => b.buildId.localeCompare(a.buildId, undefined, { numeric: true }))[0]?.executablePath;
const out = resolve('.hyperframes/demo/site');
await mkdir(out, { recursive: true });

const browser = await puppeteer.launch({ executablePath: executable, headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:4180/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 2000));
const demo = await page.$('#demo');
await demo.screenshot({ path: join(out, 'demo-desktop.png') });
console.log('video ready state:', await page.$eval('#demo video', v => ({ readyState: v.readyState, poster: v.poster, src: v.currentSrc })));

await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await page.reload({ waitUntil: 'networkidle0' });
const mobile = await page.$('#demo');
await mobile.screenshot({ path: join(out, 'demo-mobile.png') });
console.log('errors:', JSON.stringify(errors));
await browser.close();


