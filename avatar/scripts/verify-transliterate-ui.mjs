// Live QC for the Devanagari helper. Drives the real editor UI on the running
// library server, so a broken selector or a rejected request fails loudly here
// instead of in front of a creator.
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
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
const profile = await mkdtemp(join(process.env.TEMP ?? '.', 'translit-qc-'));
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

  const button = await page.$('#transliterate-button');
  assert.ok(button, 'the Devanagari button must exist');
  assert.equal(await page.$eval('#transliterate-button', node => node.disabled), false, 'the button must be enabled once state loads');
  assert.equal(await page.$eval('#translit-panel', node => node.hidden), true, 'the preview starts hidden');

  // Roman Urdu -> Devanagari
  await page.$eval('#script', node => { node.value = 'Assalamualaikum dosto, ye technology bohat tezi se badal rahi hai.'; });
  await page.click('#transliterate-button');
  await page.waitForFunction(() => !document.querySelector('#translit-panel').hidden, { timeout: 15000 });
  const roman = await page.$eval('#translit-result', node => node.textContent);
  assert.match(roman, /अस्सलामुअलैकुम/u);
  assert.match(roman, /दोस्तो/u);
  assert.match(roman, /टेक्नोलॉजी/u);
  assert.equal(await page.$eval('#translit-meta', node => node.textContent), 'LATIN → DEVANAGARI / 10 WORDS');

  // "Use this script" replaces the textarea and clears stale timings.
  await page.$eval('#words', node => { node.value = 'stale timings'; });
  await page.click('#translit-apply');
  const applied = await page.$eval('#script', node => node.value);
  assert.match(applied, /अस्सलामुअलैकुम/u);
  assert.equal(await page.$eval('#words', node => node.value), '', 'stale timings must be cleared');
  assert.equal(await page.$eval('#translit-panel', node => node.hidden), true, 'the panel closes after applying');

  // Urdu script -> Devanagari
  await page.$eval('#script', node => { node.value = 'السلام علیکم دوستو، آج ہم بات کریں گے۔'; });
  await page.click('#transliterate-button');
  await page.waitForFunction(() => !document.querySelector('#translit-panel').hidden, { timeout: 15000 });
  const urdu = await page.$eval('#translit-result', node => node.textContent);
  assert.match(urdu, /दोस्तो/u);
  assert.match(urdu, /आज हम बात/u);
  assert.ok(!/[\u0600-\u06FF]/u.test(urdu), 'no Arabic letters may remain');
  assert.equal(await page.$eval('#translit-meta', node => node.textContent), 'ARABIC → DEVANAGARI / 8 WORDS');

  // Already-Devanagari input offers nothing to apply.
  await page.$eval('#script', node => { node.value = 'नमस्ते दोस्तों।'; });
  await page.click('#transliterate-button');
  await page.waitForFunction(() => !document.querySelector('#translit-panel').hidden, { timeout: 15000 });
  assert.equal(await page.$eval('#translit-apply', node => node.disabled), true, 'apply is disabled when nothing changes');
  assert.equal(await page.$eval('#translit-title', node => node.textContent), 'Devanagari preview');

  // English prose is recognised and left alone.
  await page.$eval('#script', node => { node.value = 'This is a plain English sentence about the weather.'; });
  await page.click('#transliterate-button');
  await page.waitForFunction(() => document.querySelector('#translit-title').textContent === 'This already reads as English', { timeout: 15000 });

  await page.click('#translit-close');
  assert.equal(await page.$eval('#translit-panel', node => node.hidden), true);

  // Restore a neutral script so the saved project is not left with test text.
  await page.$eval('#script', node => { node.value = ''; });

  assert.deepEqual(errors, [], 'browser runtime errors');
  console.log('Devanagari helper QC passed: button, Roman, Urdu, Devanagari no-op, English guard, apply, close.');
} finally {
  if (browser) await browser.close();
  await rm(profile, { recursive: true, force: true });
}
