// Records the real editor for the landing page: a cursor overlay, a scripted
// walkthrough, and a screencast. Nothing is mocked; every panel shown is the
// shipping UI. Audio is muxed afterwards by make-demo.mjs.
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

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
const outDir = resolve(process.argv[4] ?? '.hyperframes/demo');
await mkdir(outDir, { recursive: true });

const wait = ms => new Promise(done => setTimeout(done, ms));
const started = { at: 0 };
const marks = {};
const since = () => Date.now() - started.at;

const CURSOR = () => {
  const mount = () => {
    const dot = document.createElement('div');
    dot.id = '__demo_cursor';
    dot.style.cssText = 'position:fixed;left:0;top:0;width:15px;height:15px;margin:-7.5px 0 0 -7.5px;border-radius:50%;background:#242720;border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.4);z-index:2147483647;pointer-events:none;';
    document.body.appendChild(dot);
    window.addEventListener('mousemove', event => {
      dot.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
    }, true);
    window.addEventListener('mousedown', () => {
      dot.animate([
        { boxShadow: '0 0 0 0 rgba(82,112,71,.65)' },
        { boxShadow: '0 0 0 16px rgba(82,112,71,0)' },
      ], { duration: 500, easing: 'ease-out' });
    }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
};

const browser = await puppeteer.launch({
  executablePath: executable,
  headless: false,
  defaultViewport: { width: 1280, height: 720 },
  args: ['--window-size=1280,800', '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
await page.evaluateOnNewDocument(CURSOR);
await page.goto(base + '/library.html', { waitUntil: 'networkidle0' });
await page.waitForFunction(() => document.querySelectorAll('.cast-option').length >= 40, { timeout: 20000 });
await wait(600);

// Move the mouse near the cast before recording so the overlay is already placed.
await page.mouse.move(220, 340);

const recorder = await page.screencast({ path: join(outDir, 'raw.webm') });
started.at = Date.now();

async function centre(selector) {
  const box = await page.$eval(selector, node => {
    const rect = node.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  });
  await page.mouse.move(box.x, box.y, { steps: 18 });
  return box;
}
async function clickAt(selector) {
  const box = await centre(selector);
  await wait(180);
  await page.mouse.click(box.x, box.y);
}

async function stageScroll() {
  return page.evaluate(() => {
    const button = document.querySelector('#play-button').getBoundingClientRect();
    return Math.max(0, window.scrollY + button.top + button.height / 2 - 630);
  });
}

// 01 - pick one of the new illustrated characters.
await page.$eval('[data-avatar="forma-zara"]', node => node.scrollIntoView({ inline: 'center', block: 'nearest' }));
await wait(500);
await clickAt('[data-avatar="forma-zara"]');
await wait(900);

// 02 - pin a gesture so the pose changes on stage.
await page.$eval('#gesture-grid', node => node.scrollIntoView({ block: 'center' }));
await wait(450);
await clickAt('[data-gesture="point-up"]');
await wait(500);
await page.evaluate(y => window.scrollTo(0, y), await stageScroll());
await wait(1200);

// 03 - show the offline voice option.
await page.$eval('#voice-panel-upload', node => node.scrollIntoView({ block: 'center' }));
await wait(450);
await clickAt('[data-voice-source="local"]');
await wait(1100);

// 04 - type Roman Urdu and convert it to Devanagari.
await page.$eval('#script', node => node.scrollIntoView({ block: 'center' }));
await wait(400);
await clickAt('#script');
await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
await page.keyboard.press('Backspace');
await wait(250);
await page.type('#script', 'Yeh video aapke liye hai.', { delay: 34 });
await wait(400);
await clickAt('#transliterate-button');
await page.waitForFunction(() => !document.querySelector('#translit-panel').hidden, { timeout: 10000 });
await wait(1700);
marks.translit = since();
await clickAt('#translit-close');
await wait(400);

// 05 - frame the stage, press play, and let the real narration run.
const playScroll = await stageScroll();
await page.evaluate(y => window.scrollTo(0, y), playScroll);
await wait(700);
marks.play = since();
await clickAt('#play-button');
await page.waitForFunction(() => !document.querySelector('#narration').paused, { timeout: 5000 });
await wait(600);
// Measure when the audio actually started, so the muxed track lands on the lips.
marks.audioStart = await page.evaluate(() => Date.now() - document.getElementById('narration').currentTime * 1000);
await wait(9200);
await page.screenshot({ path: join(outDir, 'poster.png') });
await wait(700);

await recorder.stop();
await writeFile(join(outDir, 'marks.json'), JSON.stringify({
  play: marks.play,
  audioStart: marks.audioStart - started.at,
  translit: marks.translit,
  duration: since(),
}, null, 2));
await browser.close();
console.log(`recorded ${(since() / 1000).toFixed(1)}s, audio starts at ${((marks.audioStart - started.at) / 1000).toFixed(2)}s`);
