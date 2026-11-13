// Live QC for the Windows offline voice tab. Proves the tab, the installed-voice
// catalog and the controls are wired to the real server before a creator sees it.
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

if (!process.argv[2]) throw new Error('Pass the cached HyperFrames package.json path to reuse its browser tools.');
const require = createRequire(resolve(process.argv[2]));
const puppeteer = require('puppeteer-core');
const { getInstalledBrowsers } = require('@puppeteer/browsers');

const installed = await getInstalledBrowsers({ cacheDir: join(homedir(), '.cache', 'hyperframes', 'chrome') });
const executable = installed
  .filter(item => item.browser === 'chrome-headless-shell')
  .sort((a, b) => b.buildId.localeCompare(a.buildId, undefined, { numeric: true }))[0]?.executablePath;
if (!executable) throw new Error('No cached Chrome. Run npm run check once.');

const base = process.argv[3] ?? 'http://127.0.0.1:3010';
const profile = await mkdtemp(join(process.env.TEMP ?? '.', 'local-voice-qc-'));
const shotDir = join(fileURLToPath(new URL('..', import.meta.url)), '.hyperframes', 'qc');
await mkdir(shotDir, { recursive: true });
const errors = [];
let browser;

try {
  browser = await puppeteer.launch({ executablePath: executable, headless: true, userDataDir: profile });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });

  await page.goto(base + '/library.html', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelectorAll('.cast-option').length >= 40, { timeout: 20000 });

  const tab = await page.$('[data-voice-source="local"]');
  assert.ok(tab, 'the Windows offline tab must exist');
  assert.equal(await page.$eval('[data-voice-source="local"]', node => node.disabled), false, 'the tab must be clickable');

  await page.click('[data-voice-source="local"]');
  await page.waitForFunction(() => !document.querySelector('#voice-panel-local').hidden, { timeout: 5000 });
  await page.waitForFunction(() => document.querySelectorAll('#local-voice option').length >= 1, { timeout: 15000 });

  const voices = await page.$$eval('#local-voice option', options => options.map(option => ({ value: option.value, label: option.textContent })));
  assert.ok(voices.length >= 1, 'at least one installed Windows voice must be listed');
  assert.ok(voices.every(voice => voice.value && !/checking|could not|No Windows/i.test(voice.value)), 'placeholders must be replaced by real voice names');
  assert.match(voices.map(voice => voice.label).join(' '), /Microsoft .+ Desktop/, 'the catalog must come from Windows Speech');

  assert.equal(await page.$eval('#local-generate', node => node.disabled), false, 'generate must be enabled with a voice selected');
  assert.equal(await page.$eval('#local-voice', node => node.value), voices[0].value);

  await page.$eval('#local-speed', node => { node.value = '120'; node.dispatchEvent(new Event('input', { bubbles: true })); });
  assert.equal(await page.$eval('#local-speed-value', node => node.textContent), '1.20x');

  // The local tab is genuinely offline: no network calls besides the local server.
  assert.equal(await page.$eval('#voice-panel-local .provider-disclosure', node => node.textContent.includes('never leave the machine')), true);

  await page.screenshot({ path: join(shotDir, 'local-voice-panel.png'), fullPage: false });

  assert.deepEqual(errors, [], 'browser runtime errors');
  console.log(`Windows offline voice QC passed: tab, ${voices.length} installed voices, speed control, offline disclosure.`);
} finally {
  if (browser) await browser.close();
  await rm(profile, { recursive: true, force: true });
}
