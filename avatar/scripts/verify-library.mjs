import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLibraryServer } from './library-server.mjs';

const project = fileURLToPath(new URL('../', import.meta.url));
if (!process.argv[2]) throw new Error('Pass the cached HyperFrames package.json path to reuse its browser tools.');
const require = createRequire(resolve(process.argv[2]));
const puppeteer = require('puppeteer-core');
const { getInstalledBrowsers } = require('@puppeteer/browsers');
const installed = await getInstalledBrowsers({ cacheDir: join(homedir(), '.cache', 'hyperframes', 'chrome') });
const executable = installed.filter(item => item.browser === 'chrome-headless-shell').sort((a, b) => b.buildId.localeCompare(a.buildId, undefined, { numeric: true }))[0]?.executablePath;
if (!executable) throw new Error('Run the project HyperFrames check to install its browser first.');
const artifacts = join(project, '.hyperframes', 'artifacts', 'library-qc');
// Mirrors library.js `hiddenProfiles`: the editor hides the nine legacy cartoon
// rigs, so the cast strip must show the remaining 40 profiles in registry order.
const expectedAvatars = [
  'sana', 'ayan', 'zain', 'noor', 'squircle', 'css-person', 'king', 'guard', 'inquisitor',
  'heart', 'mouse', 'kawaii-cat', 'neo', 'luna', 'koda', 'ayan-copy', 'aarav',
  'forma-zara', 'forma-barnaby', 'forma-tariq', 'forma-kabir', 'forma-devon', 'forma-elena',
  'forma-marcus', 'forma-mina', 'forma-kenji', 'forma-mei', 'forma-jinwoo', 'forma-priya',
  'forma-haruto', 'forma-zainab', 'forma-arthur', 'forma-liam', 'forma-oliver', 'forma-noah',
  'forma-chloe', 'forma-malik', 'forma-harper', 'forma-maya', 'forma-amara'
];
await mkdir(artifacts, { recursive: true });
const fixture = await mkdtemp(join(project, '.hyperframes', 'library-browser-'));
for (const path of ['assets', 'compositions', 'scripts', 'node_modules/gsap/dist']) await mkdir(join(fixture, path), { recursive: true });
const files = ['library.html', 'library.css', 'library.js', 'index.html', 'package.json', 'compositions/presenter.html', 'assets/avatar-forma.js', 'assets/avatar-profiles.js', 'assets/gesture-engine.js', 'assets/avatar-rig.js', 'assets/avatar_guide.txt', 'assets/narration.wav', 'assets/narration.rhubarb.json', 'assets/lipsync-data.js', 'scripts/list-edge-voices.py', 'node_modules/gsap/dist/gsap.min.js'];
for (const path of files) await copyFile(join(project, path), join(fixture, path));
const defaults = { avatar: 'sana', background: 'white-grid', customBackground: null, layout: 'solo', aspectRatio: '1:1', placement: { x: 0, y: 0, scale: 1 }, outfit: 'profile', glasses: 'none', hat: 'none', earrings: 'profile', neckwear: 'profile', gesture: 'auto', emotion: 'auto', video: { enabled: false, src: 'assets/source-video.mp4', duration: 0 }, actionCues: [] };
await writeFile(join(fixture, 'assets/avatar-settings.json'), JSON.stringify(defaults));
await writeFile(join(fixture, 'assets/avatar-settings.js'), `globalThis.AvatarSettings = ${JSON.stringify(defaults)};`);
const server = createLibraryServer({ root: fixture, capabilities: { edge: true, omni: false, aiCues: false } });
server.listen(0, '127.0.0.1'); await once(server, 'listening');
let browser;
const errors = [];
try {
  browser = await puppeteer.launch({ executablePath: executable, headless: true, userDataDir: join(fixture, '.browser-profile'), args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${server.address().port}/library.html`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.getElementById('rig-stage').dataset.avatar === 'sana' && !document.getElementById('performance-fieldset').disabled);
  await page.waitForFunction(() => !document.getElementById('edge-generate').disabled);
  assert.deepEqual(await page.$$eval('.cast-option', nodes => nodes.map(node => node.dataset.avatar)), expectedAvatars);
  assert.equal(await page.$$eval('[data-voice-source]', nodes => nodes.length), 3);
  assert.ok(await page.$$eval('#edge-language option', nodes => nodes.length) >= 50);
  assert.ok(await page.$$eval('#edge-voice option', nodes => nodes.length) >= 2);
  assert.equal(await page.$eval('[data-voice-source="omni"]', node => node.disabled), false);
  assert.equal(await page.$eval('#use-ai-cues', node => node.disabled), true);
  await page.click('[data-voice-source="edge"]');
  assert.equal(await page.$eval('#voice-panel-edge', node => node.hidden), false);
  assert.equal(await page.$eval('#edge-generate', node => node.disabled), false);
  await page.click('[data-voice-source="upload"]');
  await page.screenshot({ path: join(artifacts, 'editor-desktop.png'), fullPage: true });
  for (const id of expectedAvatars) {
    await page.click(`.cast-option[data-avatar="${id}"]`);
    await page.waitForFunction(value => document.getElementById('rig-stage').dataset.avatar === value && !document.getElementById('performance-fieldset').disabled, {}, id);
    console.log('Avatar selector verified:', id);
  }
  const fixtureState = await page.evaluate(async () => (await fetch('/api/state')).json());
  const drawing = await page.evaluate(async () => (await fetch('/api/rig')).json());
  await page.evaluate(({ svg }) => {
    const host = document.createElement('div'); host.id = 'qc-rig'; host.className = 'rig';
    Object.assign(host.style, { position: 'relative', inset: 'auto', width: '1080px', height: '1080px' });
    host.innerHTML = svg; document.body.append(host);
    window.qcRig = AvatarRig.mount(host, { metadata: { duration: 20 }, mouthCues: [] }, { avatar: 'sana', background: 'white-grid', gesture: 'open-palms', emotion: 'neutral' });
  }, drawing);
  const host = await page.$('#qc-rig');
  const gestureCycle = ['open-palms', 'point-up', 'steeple', 'empathy', 'wave'];
  const emotionCycle = ['warm', 'neutral', 'confident', 'sad', 'curious'];
  const showcase = expectedAvatars.map((avatar, index) => [avatar, gestureCycle[index % gestureCycle.length], emotionCycle[index % emotionCycle.length]]);
  for (const [avatar, gesture, emotion] of showcase) {
    await page.evaluate((options) => { qcRig.setOptions(options); qcRig.render(2); }, { avatar, gesture, emotion, background: await page.evaluate(id => AvatarProfiles.getAvatar(id).background, avatar), layout: 'solo' });
    await host.screenshot({ path: join(artifacts, `avatar-${avatar}.png`) });
  }
  await page.evaluate(({ svg, avatars }) => {
    const gallery = document.createElement('section'); gallery.id = 'qc-character-gallery';
    Object.assign(gallery.style, { display: 'grid', gridTemplateColumns: 'repeat(4, 280px)', gap: '12px', width: '1156px', padding: '12px', background: '#e8e7e1' });
    for (const avatar of avatars) {
      const card = document.createElement('div'); Object.assign(card.style, { position: 'relative', width: '280px', height: '320px', overflow: 'hidden', background: '#fff', border: '1px solid #aaa' });
      const rigHost = document.createElement('div'); rigHost.className = 'rig'; rigHost.innerHTML = svg;
      Object.assign(rigHost.style, { position: 'absolute', inset: '0 0 40px 0' });
      const label = document.createElement('strong'); label.textContent = AvatarProfiles.getAvatar(avatar).name; Object.assign(label.style, { position: 'absolute', left: '12px', bottom: '11px', font: '12px Arial', zIndex: '3' });
      card.append(rigHost, label); gallery.append(card);
      const instance = AvatarRig.mount(rigHost, { metadata: { duration: 3 }, mouthCues: [] }, { avatar, background: AvatarProfiles.getAvatar(avatar).background, gesture: 'open-palms', emotion: 'warm', layout: 'solo' });
      instance.render(2);
      rigHost.querySelector('svg')?.setAttribute('viewBox', '180 80 720 900');
    }
    document.body.append(gallery);
  }, { svg: drawing.svg, avatars: expectedAvatars });
  await (await page.$('#qc-character-gallery')).screenshot({ path: join(artifacts, 'character-gallery.png') });
  await page.evaluate(() => document.getElementById('qc-character-gallery').remove());
  const ids = await page.evaluate(() => GestureEngine.gestures.map(item => item.id));
  for (const gesture of ids) {
    await page.evaluate(id => { qcRig.setOptions({ avatar: 'sana', background: 'white-grid', layout: 'solo', gesture: id, emotion: 'neutral' }); qcRig.render(2); }, gesture);
    const bounds = await page.evaluate(() => {
      const frame = document.getElementById('qc-rig').getBoundingClientRect();
      return ['left', 'right'].map(side => {
        const hand = document.querySelector(`#qc-rig #female-${side}-hand`).getBoundingClientRect();
        return { left: hand.left-frame.left, top: hand.top-frame.top, right: hand.right-frame.left, bottom: hand.bottom-frame.top };
      });
    });
    for (const box of bounds) assert.ok(box.left >= 0 && box.top >= 0 && box.right <= 1080 && box.bottom <= 1080, `${gesture} hand is outside frame`);
    await host.screenshot({ path: join(artifacts, `gesture-${gesture}.png`) });
  }
  for (const emotion of ['neutral', 'warm', 'sad', 'shock', 'focused', 'curious', 'confident']) {
    await page.evaluate(value => { qcRig.setOptions({ gesture: 'open-palms', emotion: value }); qcRig.render(2); }, emotion);
    await host.screenshot({ path: join(artifacts, `emotion-${emotion}.png`) });
  }
  await page.evaluate(() => document.getElementById('qc-rig').remove());
  for (const [id, value] of [['outfit', 'blazer'], ['glasses', 'round'], ['hat', 'cap'], ['earrings', 'studs'], ['neckwear', 'tie']]) {
    await page.select(`#${id}`, value);
    await page.waitForFunction((key, selected) => !document.getElementById('performance-fieldset').disabled && document.getElementById(key).value === selected, {}, id, value);
  }
  const styled = await page.evaluate(async () => (await fetch('/api/state')).json());
  assert.deepEqual([styled.settings.outfit, styled.settings.glasses, styled.settings.hat, styled.settings.earrings, styled.settings.neckwear], ['blazer', 'round', 'cap', 'studs', 'tie']);
  await page.click('#tab-scene');
  assert.equal(await page.$eval('#panel-scene', node => node.hidden), false);
  for (const aspect of ['9:16', '16:9', '1:1']) {
    await page.click(`button[data-aspect-ratio="${aspect}"]`);
    await page.waitForFunction(async value => (await (await fetch('/api/state')).json()).settings.aspectRatio === value, {}, aspect);
    assert.equal(await page.$eval('#stage-shell', node => node.dataset.aspect), aspect);
    await page.waitForFunction(() => !document.getElementById('performance-fieldset').disabled);
    assert.equal((await page.evaluate(async () => (await fetch('/api/state')).json())).settings.aspectRatio, aspect);
  }
  await page.evaluate(() => { document.getElementById('position-x').value = '35'; document.getElementById('position-y').value = '-20'; document.getElementById('position-scale').value = '125'; document.getElementById('position-scale').dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForFunction(() => !document.getElementById('performance-fieldset').disabled);
  assert.deepEqual((await page.evaluate(async () => (await fetch('/api/state')).json())).settings.placement, { x: 35, y: -20, scale: 1.25 });
  const background = join(fixture, 'test-background.png');
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-f', 'lavfi', '-i', 'color=c=0x314159:s=640x960:d=0.04', '-frames:v', '1', '-n', background]);
  await (await page.$('#background-file')).uploadFile(background);
  await page.waitForFunction(async () => (await (await fetch('/api/state')).json()).settings.background === 'custom', { timeout: 60000 });
  await page.screenshot({ path: join(artifacts, 'custom-background.png'), fullPage: true });
  await page.click('#transparent-background');
  await page.waitForFunction(async () => (await (await fetch('/api/state')).json()).settings.background === 'transparent');
  await page.click('#sample-button'); await page.click('#plan-button');
  await page.waitForFunction(() => !document.getElementById('silent-note').hidden && !document.getElementById('performance-fieldset').disabled);
  assert.equal(await page.$eval('#export-button', node => node.disabled), true);
  assert.equal(await page.$eval('#narration', node => node.paused), true);
  assert.equal(await page.$eval('#rig-stage #female-mouth', node => node.dataset.mouth), 'X');
  assert.equal(await page.$$eval('#gesture-lane .cue-block', nodes => nodes.length), 4);
  const rehearsalBlocks = await page.$$('#gesture-lane .cue-block');
  for (const [index, gesture] of ['point-up', 'empathy', 'directional', 'stop'].entries()) {
    await rehearsalBlocks[index].click();
    assert.equal(await page.$eval('#rig-stage', node => node.dataset.pose), gesture);
    await (await page.$('#stage-shell')).screenshot({ path: join(artifacts, `sample-${gesture}.png`) });
  }
  assert.equal(await page.$eval('#rig-stage', node => node.dataset.emotion), 'shock');
  await page.screenshot({ path: join(artifacts, 'baby-script-rehearsal.png'), fullPage: true });
  await page.click('#restore-voice');
  await page.click('button[data-aspect-ratio="9:16"]');
  await page.waitForFunction(() => document.getElementById('stage-shell').dataset.aspect === '9:16' && !document.getElementById('performance-fieldset').disabled);
  const clip = join(fixture, 'test-clip.mp4');
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-f', 'lavfi', '-i', 'color=c=0x9fb6d2:s=640x360:r=30:d=1', '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-n', clip]);
  await (await page.$('#video-file')).uploadFile(clip);
  await page.waitForFunction(() => !document.getElementById('stage-video').hidden && !document.getElementById('performance-fieldset').disabled, { timeout: 60000 });
  await page.evaluate(async () => { await document.getElementById('stage-video').play(); });
  await page.waitForFunction(() => document.getElementById('stage-video').readyState >= 2);
  await page.evaluate(() => document.getElementById('stage-video').pause());
  assert.match(await page.$eval('#rig-stage #avatar-camera', node => node.getAttribute('transform')), /translate\([^)]*\) scale\([^)]+\)/);
  await page.screenshot({ path: join(artifacts, 'split-video-layout.png'), fullPage: true });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Mobile editor overflows horizontally');
  await page.screenshot({ path: join(artifacts, 'editor-mobile.png'), fullPage: true });
  assert.deepEqual(errors, [], 'Browser runtime errors');
  console.log(`Verified ${expectedAvatars.length} avatars, wardrobe/wearables, 3 aspects, custom/transparent backgrounds, 17 gestures, 7 expressions, split layout, and mobile sizing.`);
  console.log('Evidence:', artifacts);
  await writeFile(join(artifacts, 'result.json'), JSON.stringify({ avatars: expectedAvatars.length, aspects: 3, wardrobe: true, customBackground: true, transparentBackground: true, gestures: ids.length, expressions: 7, errors, originalProjectSettingsUnchanged: true, currentNarrationDuration: fixtureState.speech.metadata.duration }, null, 2));
} finally {
  if (browser) await browser.close();
  server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  await rm(fixture, { recursive: true, force: true });
}
