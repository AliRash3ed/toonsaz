// Live QC for the optional-services settings panel. Drives the real editor on
// the running library server, so a broken selector, a rejected request or a
// leaked key fails here instead of in front of a creator.
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
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
const root = fileURLToPath(new URL('..', import.meta.url));
const envPath = join(root, '.env.local');
const profile = await mkdtemp(join(process.env.TEMP ?? '.', 'settings-qc-'));
const shotDir = join(root, '.hyperframes', 'qc');
await mkdir(shotDir, { recursive: true });
const errors = [];
let browser;

const readEnv = async () => {
  try { return await readFile(envPath, 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return ''; throw error; }
};
const envValue = (source, name) => source.match(new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=\\s*(.*)$`, 'm'))?.[1]?.trim() ?? '';
const before = await readEnv();
const realKey = envValue(before, 'OPENROUTER_API_KEY');

try {
  browser = await puppeteer.launch({ executablePath: executable, headless: true, userDataDir: profile });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });

  await page.goto(base + '/library.html', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelectorAll('.cast-option').length >= 40, { timeout: 20000 });

  assert.ok(await page.$('#settings-button'), 'the Settings button must exist');
  assert.equal(await page.$eval('#settings-button', node => node.disabled), false, 'Settings must be available once the page loads');
  assert.equal(await page.$eval('#settings-dialog', node => node.open), false, 'the dialog starts closed');

  await page.click('#settings-button');
  await page.waitForFunction(() => document.querySelector('#settings-dialog').open, { timeout: 5000 });
  assert.equal(await page.$eval('#settings-openrouter', node => node.type), 'password');
  assert.equal(await page.$eval('#settings-openrouter', node => node.value), '', 'keys are never rendered back');
  assert.equal(await page.$eval('#settings-omni', node => node.value), '', 'keys are never rendered back');

  // Badge state mirrors the server, not a guess.
  const badge = id => page.$eval(`#${id}`, node => ({ text: node.textContent.trim(), cls: node.className }));
  const openrouter = await badge('settings-openrouter-status');
  if (realKey) {
    assert.match(openrouter.text, /Ready/, 'a stored key must show Ready');
    assert.match(openrouter.cls, /is-ready/);
    assert.equal(await page.$eval('#settings-openrouter-remove', node => node.hidden), false, 'a stored key can be removed');
  } else {
    assert.match(openrouter.text, /No key saved/);
  }

  // Reveal toggle.
  await page.click('[data-reveal="settings-openrouter"]');
  assert.equal(await page.$eval('#settings-openrouter', node => node.type), 'text');
  assert.equal(await page.$eval('[data-reveal="settings-openrouter"]', node => node.textContent), 'Hide');
  await page.click('[data-reveal="settings-openrouter"]');
  assert.equal(await page.$eval('#settings-openrouter', node => node.type), 'password');

  // Empty save is refused without a request.
  await page.click('#settings-save');
  assert.match(await page.$eval('#settings-note', node => node.textContent), /Type a key first/);
  assert.match(await page.$eval('#settings-note', node => node.className), /is-error/);

  // A token with characters no real key uses is rejected by the server and
  // reported in the dialog; the saved file must not change. The browser logs
  // the deliberate 400, so only that one network error is allowed.
  const errorsBeforeReject = errors.length;
  await page.$eval('#settings-openrouter', node => { node.value = 'bad token'; });
  await page.click('#settings-save');
  await page.waitForFunction(() => /characters an API token never uses/.test(document.querySelector('#settings-note').textContent), { timeout: 10000 });
  assert.match(await page.$eval('#settings-note', node => node.className), /is-error/);
  const rejectedErrors = errors.splice(errorsBeforeReject);
  assert.equal(rejectedErrors.length, 1, 'the rejected save must produce exactly one browser log');
  assert.match(rejectedErrors[0], /400 \(Bad Request\)/);
  assert.equal(envValue(await readEnv(), 'OPENROUTER_API_KEY'), realKey, 'a rejected token must not touch .env.local');

  // Re-saving the stored key exercises the success path without changing state.
  if (realKey) {
    await page.$eval('#settings-openrouter', (node, value) => { node.value = value; }, realKey);
    await page.click('#settings-save');
    await page.waitForFunction(() => /^Saved\./.test(document.querySelector('#settings-note').textContent), { timeout: 10000 });
    assert.match(await page.$eval('#settings-note', node => node.className), /is-ok/);
    assert.equal(await page.$eval('#settings-openrouter', node => node.value), '', 'the field clears after saving');
    assert.match((await badge('settings-openrouter-status')).text, /Ready/);
    assert.equal(envValue(await readEnv(), 'OPENROUTER_API_KEY'), realKey, 'the stored key must survive a re-save');
  }

  // The key never appears anywhere in the document.
  if (realKey) {
    const html = await page.content();
    assert.ok(!html.includes(realKey), 'a saved key must never be serialised into the page');
  }

  // Escape closes the dialog.
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#settings-dialog').open, { timeout: 5000 });

  // Reopen and close with the X button.
  await page.click('#settings-button');
  await page.waitForFunction(() => document.querySelector('#settings-dialog').open, { timeout: 5000 });
  await page.click('#settings-close');
  await page.waitForFunction(() => !document.querySelector('#settings-dialog').open, { timeout: 5000 });

  // Screenshot for visual review.
  await page.click('#settings-button');
  await page.waitForFunction(() => document.querySelector('#settings-dialog').open, { timeout: 5000 });
  await page.screenshot({ path: join(shotDir, 'settings-panel.png'), fullPage: false });

  assert.deepEqual(errors, [], 'browser runtime errors');
  console.log('Settings panel QC passed: open, badges, reveal, empty guard, server rejection, save, no key in DOM, Escape and close.');
} finally {
  if (browser) await browser.close();
  await rm(profile, { recursive: true, force: true });
}
