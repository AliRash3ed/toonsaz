import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import "../assets/avatar-profiles.js";
import "../assets/gesture-engine.js";
import "../assets/avatar-rig.js";

const { mouthAt, mouthShapes, poseAt, particleAt, aspectDimensions } = globalThis.AvatarRig;
const cues = [
  { start: 0, end: 0.2, value: "A" },
  { start: 0.2, end: 0.4, value: "D" },
  { start: 0.6, end: 0.8, value: "F" }
];

test("supports all nine Rhubarb mouth shapes", () => {
  assert.deepEqual(mouthShapes, ["A", "B", "C", "D", "E", "F", "G", "H", "X"]);
});

test("mouth cues use exact half-open boundaries and rest during gaps", () => {
  assert.equal(mouthAt(cues, 0), "A");
  assert.equal(mouthAt(cues, 0.1999), "A");
  assert.equal(mouthAt(cues, 0.2), "D");
  assert.equal(mouthAt(cues, 0.4), "X");
  assert.equal(mouthAt(cues, 0.7), "F");
  assert.equal(mouthAt(cues, 0.8), "X");
  for (const t of [-1, NaN, Infinity, 18]) assert.equal(mouthAt(cues, t), "X");
});

test("every prepared narration cue maps to its actual mouth shape", async () => {
  const speech = JSON.parse(await readFile(new URL("../assets/avatar_guide.rhubarb.json", import.meta.url), "utf8"));
  for (const cue of speech.mouthCues) {
    assert.equal(mouthAt(speech.mouthCues, cue.start), cue.value);
    assert.equal(mouthAt(speech.mouthCues, (cue.start + cue.end) / 2), cue.value);
  }
  assert.equal(mouthAt(speech.mouthCues, speech.metadata.duration), "X");
});

test("scene contains the complete editable face and both hand rigs", async () => {
  const html = await readFile(new URL("../compositions/presenter.html", import.meta.url), "utf8");
  for (const shape of mouthShapes) assert.ok(html.includes(`id="female-mouth-${shape}"`));
  for (const side of ["left", "right"]) {
    for (const part of ["upper", "forearm", "hand"]) assert.ok(html.includes(`id="female-${side}-${part}"`));
  }
});

test("scene exposes safe character-owned feature and wearable layers with mouth painted last", async () => {
  const html = await readFile(new URL("../compositions/presenter.html", import.meta.url), "utf8");
  assert.match(html, /#root\s*\{[\s\S]*?background:\s*transparent;/);
  for (const id of [
    "avatar-custom-background", "female-model", "female-hat-back", "female-neckwear", "female-ears",
    "female-face-details", "female-cheeks", "female-eye-shell-left", "female-eye-shell-right",
    "female-glasses", "female-hat-front", "female-earrings"
  ]) assert.ok(html.includes(`id="${id}"`), id);
  for (const id of ["panel", "play", "title", "subtitle"]) assert.ok(html.includes(`id="avatar-video-placeholder-${id}"`), id);
  const backdrop = html.indexOf('id="avatar-background"');
  const custom = html.indexOf('id="avatar-custom-background"');
  const grid = html.indexOf('id="avatar-background-grid"');
  const particles = html.indexOf('id="female-particles"');
  assert.ok(backdrop < custom && custom < grid && grid < particles);
  assert.doesNotMatch(html.match(/<image id="avatar-custom-background"[^>]+>/)[0], /\bhref\s*=/i);
  const mouth = html.lastIndexOf('id="female-mouth"');
  for (const id of ["female-face-details", "female-cheeks", "female-nose", "female-front-hair", "female-glasses", "female-hat-front", "female-earrings"]) {
    assert.ok(mouth > html.lastIndexOf(`id="${id}"`), `${id} must remain behind A-H/X`);
  }
  const authoredIds = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(authoredIds).size, authoredIds.length, "presenter ids must be unique");
  const svg = html.match(/<svg\b[\s\S]*?<\/svg>/)[0];
  const stack = [];
  for (const tag of svg.matchAll(/<(\/?)((?:svg|defs|linearGradient|radialGradient|stop|filter|feDropShadow|g|title|desc|rect|image|path|text|ellipse|circle))\b([^>]*?)(\/?)>/g)) {
    const [, closing, name, attributes, selfClosing] = tag;
    if (closing) assert.equal(stack.pop(), name, `unbalanced </${name}>`);
    else if (selfClosing !== "/" && !/\/\s*$/.test(attributes)) stack.push(name);
  }
  assert.deepEqual(stack, [], "presenter SVG must be balanced");
});

test("scene provides shared authored-vector materials and depth-treated limbs", async () => {
  const html = await readFile(new URL("../compositions/presenter.html", import.meta.url), "utf8");
  for (const id of [
    "avatar-material-defs", "avatar-skin-material", "avatar-hair-material", "avatar-cloth-material",
    "avatar-cloth-shadow-material", "avatar-eye-white-material", "avatar-iris-material", "avatar-soft-shadow"
  ]) assert.ok(html.includes(`id="${id}"`), id);
  assert.match(html, /<linearGradient id="avatar-skin-material"[\s\S]*?var\(--skin-color/);
  assert.match(html, /<radialGradient id="avatar-iris-material"[\s\S]*?var\(--iris-color/);
  assert.match(html, /<feDropShadow\b[^>]*flood-opacity="0\.16"/);
  for (const side of ["left", "right"]) {
    assert.match(html, new RegExp(`id="female-${side}-sleeve" class="[^"]*avatar-cloth-material[^"]*avatar-limb-depth`));
    assert.match(html, new RegExp(`id="female-${side}-wrist" class="avatar-limb-depth"`));
    assert.match(html, new RegExp(`id="female-${side}-cuff" class="avatar-limb-depth"`));
  }
  assert.match(html, /\.avatar-hand-material \[data-part="highlight"\]/);
  const expected = poseAt(4.25, 16.15, { avatar: "blond-swept", gesture: "empathy" });
  assert.deepEqual(poseAt(4.25, 16.15, { avatar: "blond-swept", gesture: "empathy" }), expected);
});

test("seeking backwards does not preserve an earlier mouth or pose", () => {
  const expected = { mouth: mouthAt(cues, 0.1), pose: poseAt(0.1, 16.15), dot: particleAt(12, 0.1) };
  for (const time of [10, 0.7, 16, 0, 3]) {
    mouthAt(cues, time);
    poseAt(time, 16.15);
    particleAt(12, time);
  }
  assert.deepEqual({ mouth: mouthAt(cues, 0.1), pose: poseAt(0.1, 16.15), dot: particleAt(12, 0.1) }, expected);
});

test("front-facing pupils stay fixed while eyes blink independently", () => {
  const blink = poseAt(2.795, 16.15);
  assert.ok(blink.leftEye < 0.07);
  assert.notEqual(blink.leftEye, blink.rightEye);
  assert.equal(poseAt(3.1, 16.15).leftEye, 1);
  assert.ok(poseAt(28.995, 120).leftEye < 0.07);
});

test("script cues control individual fingers, gestures and facial emotions", () => {
  const speech = { gestureCues: [{start:0,end:3,gesture:"point-up"}, {start:3,end:6,gesture:"empathy",emotion:"sad"}, {start:6,end:10,gesture:"stop",emotion:"shock"}] };
  assert.equal(poseAt(1, 10, {}, speech).hands.left.shape, "index-up");
  assert.equal(poseAt(4, 10, {}, speech).emotion, "sad");
  const shock = poseAt(7, 10, {}, speech);
  assert.equal(shock.poseName, "stop");
  assert.ok(shock.expression.pupil < 1 && shock.expression.eyeY > 1);
});

test("manual gestures and emotions override automatic cues", () => {
  const pose = poseAt(2, 10, { gesture: "count-3", emotion: "focused" });
  assert.equal(pose.hands.right.shape, "count-3");
  assert.equal(pose.emotion, "focused");
});

test("gesture transitions preserve bone lengths and can seek backwards", () => {
  const speech = { gestureCues: [{start:0,end:3,gesture:"point-up"}, {start:3,end:6,gesture:"empathy"}, {start:6,end:10,gesture:"stop"}] };
  const expected = poseAt(3.1, 10, {}, speech);
  for (const time of [7,0,5,3.1]) {
    const pose = poseAt(time, 10, {}, speech);
    for (const side of ["left", "right"]) {
      const arm = globalThis.GestureEngine.solveArm(globalThis.GestureEngine.shoulders[side], pose.hands[side].wrist, side);
      assert.ok(Math.abs(Math.hypot(arm.elbow.x-arm.shoulder.x, arm.elbow.y-arm.shoulder.y)-130) < 1e-7);
      assert.ok(Math.abs(Math.hypot(arm.wrist.x-arm.elbow.x, arm.wrist.y-arm.elbow.y)-138) < 1e-7);
    }
  }
  assert.deepEqual(poseAt(3.1, 10, {}, speech), expected);
});

test("pose mapping and transition blending use each profile's shoulders, scale, offset and lengths", () => {
  const canonical = globalThis.GestureEngine.sampleGesture("point-up", 1);
  const squircle = globalThis.AvatarProfiles.getAvatar("squircle");
  const mapped = poseAt(1, 10, { avatar: "squircle", gesture: "point-up" });
  assert.equal(mapped.hands.left.wrist.x, 540 + (canonical.left.wrist.x - 540) * squircle.rig.gestureScale.x + squircle.rig.offset.x);
  assert.equal(mapped.hands.left.wrist.y, 750 + (canonical.left.wrist.y - 750) * squircle.rig.gestureScale.y + squircle.rig.offset.y);
  assert.notDeepEqual(mapped.hands.left.wrist, canonical.left.wrist);

  const speech = { gestureCues: [{ start: 0, end: 3, gesture: "point-up" }, { start: 3, end: 6, gesture: "empathy" }] };
  for (const avatar of globalThis.AvatarProfiles.avatars) {
    const pose = poseAt(3.1, 6, { avatar: avatar.id }, speech);
    for (const side of ["left", "right"]) {
      const shoulder = avatar.rig.shoulders[side];
      const hand = pose.hands[side];
      assert.ok(hand.elbow, `${avatar.id}.${side} transition elbow`);
      assert.ok(Math.abs(Math.hypot(hand.elbow.x - shoulder.x, hand.elbow.y - shoulder.y) - avatar.rig.upperArmLength) < 1e-7, `${avatar.id}.${side} upper`);
      assert.ok(Math.abs(Math.hypot(hand.wrist.x - hand.elbow.x, hand.wrist.y - hand.elbow.y) - avatar.rig.forearmLength) < 1e-7, `${avatar.id}.${side} forearm`);
    }
  }
});

test("particle grid stays inside the square canvas for the complete scene", () => {
  for (let t = 0; t <= 17.4; t += 0.1) {
    for (let index = 0; index < 256; index++) {
      const p = particleAt(index, t);
      assert.ok(p.x - p.radius > 0 && p.x + p.radius < 1080);
      assert.ok(p.y - p.radius > 0 && p.y + p.radius < 1080);
      assert.ok(p.opacity >= 0 && p.opacity <= 1);
    }
  }
});

test("particles remain deterministic and bounded on square, portrait and landscape canvases", () => {
  assert.deepEqual(aspectDimensions, {
    "1:1": { width: 1080, height: 1080 },
    "9:16": { width: 1080, height: 1920 },
    "16:9": { width: 1920, height: 1080 }
  });
  assert.ok(Object.isFrozen(aspectDimensions) && Object.isFrozen(aspectDimensions["9:16"]));
  const legacy = particleAt(0, 0);
  assert.equal(legacy.x, 36);
  assert.equal(legacy.y, 42.5);
  assert.equal(legacy.radius, 1.65);
  for (const bounds of Object.values(aspectDimensions)) {
    for (const t of [0, 2.75, 17.4, -5, NaN]) {
      for (let index = 0; index < 256; index++) {
        const first = particleAt(index, t, bounds);
        const second = particleAt(index, t, bounds);
        assert.deepEqual(first, second);
        assert.ok(first.x - first.radius > 0 && first.x + first.radius < bounds.width, `${bounds.width}x${bounds.height} x`);
        assert.ok(first.y - first.radius > 0 && first.y + first.radius < bounds.height, `${bounds.width}x${bounds.height} y`);
        assert.ok(first.opacity >= 0 && first.opacity <= 1);
      }
    }
  }
  assert.deepEqual(particleAt(42, 3, 1920, 1080), particleAt(42, 3, { width: 1920, height: 1080 }));
});

test("rig source has no timer, randomness or network path and constrains custom images locally", async () => {
  const source = await readFile(new URL("../assets/avatar-rig.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Math\.random|Date\.now|\bfetch\s*\(|XMLHttpRequest|WebSocket|setTimeout|setInterval|requestAnimationFrame/);
  assert.ok(source.includes("/^assets\\/"));
  assert.ok(source.includes("(?:png|jpe?g|webp)"));
  assert.match(source, /customBackground\.removeAttribute\("href"\)/);
});
