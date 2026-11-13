import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import "../assets/avatar-forma.js";
import "../assets/avatar-profiles.js";

const api = globalThis.AvatarProfiles;
const {
  avatars, backgrounds, outfits, glasses, hats, earrings, neckwear,
  getAvatar, getBackground, getOutfit, getGlasses, getHat, getEarrings, getNeckwear
} = api;
const avatarIds = [
  "sana", "ayan", "zain", "noor", "squircle", "css-person", "bearded-man", "curly-boy",
  "cap-guy", "pompadour-guy", "soft-bust", "blond-swept", "clay", "homer", "bart", "king", "guard",
  "inquisitor", "heart", "mouse", "kawaii-cat", "neo", "luna", "koda", "ayan-copy", "aarav",
  "forma-zara", "forma-barnaby", "forma-tariq", "forma-kabir", "forma-devon", "forma-elena",
  "forma-marcus", "forma-mina", "forma-kenji", "forma-mei", "forma-jinwoo", "forma-priya",
  "forma-haruto", "forma-zainab", "forma-arthur", "forma-liam", "forma-oliver", "forma-noah",
  "forma-chloe", "forma-malik", "forma-harper", "forma-maya", "forma-amara"
];
const paletteKeys = ["skin", "hair", "cloth", "shade", "trim", "outline", "accent", "skinShadow", "lip", "iris"];
const safeTags = new Set(["g", "path", "circle", "rect", "ellipse"]);
const forbiddenMarkup = /\bid\s*=|\b(?:href|src|on[a-z]+)\s*=|(?:https?:|data:|javascript:|\/\/)|url\s*\(|<(?:script|style|image|use|foreignObject|animate)\b/i;

function validateMarkup(markup, label, allowEmpty = false) {
  assert.equal(typeof markup, "string", label);
  if (!allowEmpty) assert.ok(markup.trim(), `${label} is empty`);
  assert.doesNotMatch(markup, forbiddenMarkup, label);
  const stack = [];
  for (const match of markup.matchAll(/<(\/?)([\w-]+)\b([^>]*?)>/g)) {
    const [, closing, name, attributes] = match;
    assert.ok(safeTags.has(name), `${label}: unsafe <${name}>`);
    if (closing) assert.equal(stack.pop(), name, `${label}: unbalanced ${name}`);
    else if (!/\/\s*$/.test(attributes)) stack.push(name);
  }
  assert.deepEqual(stack, [], `${label}: unclosed SVG tags`);
}

function numericPoint(value, label) {
  assert.deepEqual(Object.keys(value).sort(), ["x", "y"], label);
  assert.ok(Number.isFinite(value.x) && Number.isFinite(value.y), label);
}

test("classic script exposes the expanded frozen browser API without runtime side effects", async () => {
  const expected = [
    "avatars", "backgrounds", "outfits", "glasses", "hats", "earrings", "neckwear",
    "getAvatar", "getBackground", "getOutfit", "getGlasses", "getHat", "getEarrings", "getNeckwear"
  ];
  assert.deepEqual(Object.keys(api).sort(), expected.sort());
  const source = await readFile(new URL("../assets/avatar-profiles.js", import.meta.url), "utf8");
  const sandbox = { FormaAvatarSpecs: globalThis.FormaAvatarSpecs };
  runInNewContext(source, sandbox, { timeout: 1000 });
  assert.deepEqual(Object.keys(sandbox).sort(), ["AvatarProfiles", "FormaAvatarSpecs"]);
  assert.deepEqual([...sandbox.AvatarProfiles.avatars].map(({ id }) => id), avatarIds);
  assert.doesNotMatch(source, /\b(?:document|window|fetch|XMLHttpRequest|WebSocket|setTimeout|setInterval|requestAnimationFrame|requestIdleCallback|Date|performance)\b|Math\.random/);
});

test("the exact 49 avatar ids are ordered and categorized", () => {
  assert.deepEqual(avatars.map(({ id }) => id), avatarIds);
  assert.equal(new Set(avatars.map(({ id }) => id)).size, avatars.length);
  assert.deepEqual(avatars.slice(0, 4).map(({ name }) => name), ["Sana", "Ayan", "Zain", "Noor"]);
  assert.ok(avatars.some(({ kind }) => kind === "human"));
  assert.ok(avatars.some(({ kind }) => kind === "cartoon"));
  assert.ok(avatars.some(({ kind }) => kind === "mascot"));
  for (const avatar of avatars) {
    assert.ok(["human", "cartoon", "mascot"].includes(avatar.kind), avatar.id);
    assert.equal(avatar.category, avatar.kind[0].toUpperCase() + avatar.kind.slice(1), avatar.id);
    assert.match(avatar.source, /^https:\/\//, `${avatar.id}.source`);
    assert.ok(avatar.description.length > 30, `${avatar.id}.description`);
  }
});

test("the original four retain their artwork, palettes and profile outfits", () => {
  assert.deepEqual(avatars.slice(0, 4).map(({ outfit }) => outfit), ["hoodie", "crewneck", "blazer", "sweater"]);
  assert.equal(getAvatar("sana").palette.hair, "#49382f");
  assert.equal(getAvatar("sana").palette.cloth, "#803447");
  assert.equal(getAvatar("sana").palette.skin, "#f2a582");
  assert.match(getAvatar("sana").frontHair, /M540 177 C498 148/);
  assert.equal((getAvatar("sana").body.match(/<circle/g) || []).length, 6);
  assert.match(getAvatar("ayan").frontHair, /M371 433 L359 354/);
  assert.match(getAvatar("zain").body, /M470 663 L488 674/);
  assert.match(getAvatar("noor").frontHair, /#e6bd58/);
});

test("every profile has complete palette, character-owned facial geometry and inert SVG markup", () => {
  const featureKeys = ["ears", "details", "cheeks", "eyeLeft", "eyeRight", "pupilLeft", "pupilRight", "browLeft", "browRight"];
  for (const avatar of avatars) {
    assert.deepEqual(Object.keys(avatar.palette).sort(), [...paletteKeys].sort(), avatar.id);
    for (const color of Object.values(avatar.palette)) assert.match(color, /^#[0-9a-f]{6}$/i, avatar.id);
    for (const field of ["frontHair", "backHair", "body"]) validateMarkup(avatar[field], `${avatar.id}.${field}`);
    assert.deepEqual(Object.keys(avatar.features).sort(), [...featureKeys].sort(), avatar.id);
    for (const [field, markup] of Object.entries(avatar.features)) validateMarkup(markup, `${avatar.id}.features.${field}`, field === "details");
    assert.doesNotMatch(Object.values(avatar.features).join(""), /female-mouth|mouth-[A-HX]/i, `${avatar.id} owns no mouth layer`);
    assert.doesNotMatch(avatar.facePath + avatar.nosePath, /[<>]|\b(?:transform|href|src)\b/i, avatar.id);
    assert.match(avatar.facePath, /^M/);
    assert.match(avatar.facePath, /Z$/);
  }
});

test("new characters have pairwise-distinct head, face, eye, hair and body signatures", () => {
  const facialSignature = (avatar) => [avatar.facePath, avatar.nosePath, ...Object.values(avatar.features)].join("|");
  // ayan-copy intentionally duplicates ayan, so one fewer distinct signature than avatars
  const distinct = avatars.length - 1;
  assert.equal(new Set(avatars.map(facialSignature)).size, distinct);
  for (const field of ["frontHair", "backHair", "body", "facePath", "nosePath"]) {
    assert.equal(new Set(avatars.map((avatar) => avatar[field])).size, distinct, field);
  }
  const added = avatars.slice(4);
  for (const field of ["ears", "cheeks", "eyeLeft", "eyeRight", "pupilLeft", "pupilRight", "browLeft", "browRight"]) {
    assert.equal(new Set(added.map((avatar) => avatar.features[field])).size, added.length, field);
  }
  assert.ok(added.some(({ facePath }) => !facePath.startsWith("M540 245")), "new heads must not reuse the canonical face path");
});

test("the four reference-driven profiles have complete distinct premium layers", () => {
  const ids = ["cap-guy", "pompadour-guy", "soft-bust", "blond-swept"];
  const profiles = ids.map(getAvatar);
  const signatures = profiles.map((avatar) => [avatar.facePath, avatar.nosePath, ...Object.values(avatar.features)].join("|"));
  assert.equal(new Set(signatures).size, ids.length);
  for (const avatar of profiles) {
    for (const field of ["frontHair", "backHair", "body", "facePath", "nosePath"]) assert.ok(avatar[field].trim(), `${avatar.id}.${field}`);
    for (const [field, markup] of Object.entries(avatar.features)) assert.ok(markup.trim(), `${avatar.id}.features.${field}`);
  }
  assert.match(getAvatar("cap-guy").frontHair, /#7d2943/);
  assert.match(getAvatar("pompadour-guy").frontHair, /#41444a/);
  assert.match(getAvatar("soft-bust").body, /opacity="0\.28"/);
  assert.match(getAvatar("blond-swept").frontHair, /#ffd96b/);
  assert.ok((getAvatar("blond-swept").features.details.match(/<circle/g) || []).length >= 6, "blond-swept freckles");
  assert.ok((getAvatar("blond-swept").features.pupilLeft.match(/fill="#ffffff"/g) || []).length >= 2, "blond-swept eye highlights");
});

test("rig metrics are complete, profile-specific and deeply immutable", () => {
  const signatures = new Set();
  for (const avatar of avatars) {
    const rig = avatar.rig;
    numericPoint(rig.shoulders.left, `${avatar.id}.shoulders.left`);
    numericPoint(rig.shoulders.right, `${avatar.id}.shoulders.right`);
    for (const key of ["upperArmLength", "forearmLength", "handScale"]) assert.ok(Number.isFinite(rig[key]) && rig[key] > 0, `${avatar.id}.${key}`);
    for (const key of ["gestureScale", "offset", "headPivot", "mouthAnchor", "mouthScale"]) numericPoint(rig[key], `${avatar.id}.${key}`);
    for (const side of ["left", "right"]) {
      numericPoint(rig.eyeAnchors[side], `${avatar.id}.eyeAnchors.${side}`);
      numericPoint(rig.browAnchors[side], `${avatar.id}.browAnchors.${side}`);
      numericPoint(rig.wearableAnchors.earrings[side], `${avatar.id}.earrings.${side}`);
    }
    numericPoint(rig.eyeScale, `${avatar.id}.eyeScale`);
    for (const key of ["glasses", "hat", "neckwear"]) {
      const value = rig.wearableAnchors[key];
      assert.ok(["x", "y", "scale", "rotation"].every((field) => Number.isFinite(value[field])), `${avatar.id}.${key}`);
    }
    assert.ok(Number.isFinite(rig.wearableAnchors.earrings.scale));
    assert.ok(["x", "y", "scaleX", "scaleY", "rotation"].every((field) => Number.isFinite(rig.noseTransform[field])));
    numericPoint(rig.noseTransform.pivot, `${avatar.id}.noseTransform.pivot`);
    signatures.add(JSON.stringify([rig.shoulders, rig.upperArmLength, rig.forearmLength, rig.gestureScale, rig.offset, rig.headPivot, rig.eyeAnchors, rig.mouthAnchor, rig.wearableAnchors]));
    assert.ok(Object.isFrozen(rig) && Object.isFrozen(rig.shoulders) && Object.isFrozen(rig.wearableAnchors), avatar.id);
    for (const value of Object.values(rig)) if (value && typeof value === "object") assert.ok(Object.isFrozen(value), `${avatar.id} nested rig value`);
  }
  assert.equal(signatures.size, avatars.length);
  assert.throws(() => { avatars[4].rig.shoulders.left.x = 0; }, TypeError);
  assert.throws(() => { avatars[4].rig.wearableAnchors.hat.scale = 0; }, TypeError);
});

test("new and extreme head shapes use fitted wearable anchors", () => {
  const ids = ["cap-guy", "pompadour-guy", "soft-bust", "blond-swept", "homer", "bart", "king", "guard", "heart", "mouse", "kawaii-cat"];
  for (const id of ids) {
    const rig = getAvatar(id).rig;
    const eyesCenter = (rig.eyeAnchors.left.x + rig.eyeAnchors.right.x) / 2;
    const glasses = rig.wearableAnchors.glasses;
    const hat = rig.wearableAnchors.hat;
    assert.ok(Math.abs(glasses.x - eyesCenter) <= 25, `${id} glasses centered`);
    assert.ok(Math.abs(glasses.y - (rig.eyeAnchors.left.y + rig.eyeAnchors.right.y) / 2) <= 12, `${id} glasses height`);
    assert.ok(glasses.scale >= 0.6 && glasses.scale <= 1.05, `${id} glasses scale`);
    assert.ok(Math.abs(hat.x - rig.headPivot.x) <= 25, `${id} hat centered`);
    assert.ok(hat.y >= 180 && hat.y <= 285, `${id} hat height`);
    assert.ok(hat.scale >= 0.65 && hat.scale <= 1.05, `${id} hat scale`);
    assert.ok(Math.abs(hat.rotation) <= 6, `${id} hat rotation`);
  }
});

test("wardrobe and wearable catalogs have exact ids and safe inline SVG", () => {
  assert.deepEqual(outfits.map(({ id }) => id), ["profile", "hoodie", "crewneck", "blazer", "sweater", "tshirt", "royal", "armor", "cloak"]);
  assert.deepEqual(glasses.map(({ id }) => id), ["none", "round", "square", "sunglasses"]);
  assert.deepEqual(hats.map(({ id }) => id), ["none", "cap", "backwards-cap", "beanie", "crown", "helmet", "inquisitor"]);
  assert.deepEqual(earrings.map(({ id }) => id), ["profile", "none", "hoops", "studs", "drops"]);
  assert.deepEqual(neckwear.map(({ id }) => id), ["profile", "none", "pearls", "chain", "tie"]);
  for (const item of outfits) validateMarkup(item.bodyMarkup, `outfit.${item.id}`, item.id === "profile");
  for (const item of glasses) validateMarkup(item.markup, `glasses.${item.id}`, item.id === "none");
  for (const item of hats) {
    validateMarkup(item.backMarkup, `hat.${item.id}.back`, item.id === "none");
    validateMarkup(item.frontMarkup, `hat.${item.id}.front`, item.id === "none");
  }
  for (const item of [...earrings, ...neckwear]) validateMarkup(item.markup, `${item.id}.markup`, ["profile", "none"].includes(item.id));
});

test("backgrounds preserve the original four and add solid, alpha and custom modes", () => {
  assert.deepEqual(backgrounds.map(({ id }) => id), [
    "white-grid", "cream-grid", "sky-grid", "night-grid", "solid-white", "solid-black", "chroma-green", "transparent", "custom"
  ]);
  assert.deepEqual(backgrounds.slice(0, 4).map(({ color }) => color), ["#ffffff", "#f4eee2", "#e8eff7", "#192238"]);
  assert.equal(getBackground("chroma-green").color, "#00ff00");
  assert.equal(getBackground("transparent").color, "none");
  assert.equal(getBackground("transparent").grid, false);
  assert.equal(getBackground("custom").dotOpacity, 0);
});

test("lookups return catalog entries and preserve stable fallbacks", () => {
  for (const avatar of avatars) assert.equal(getAvatar(avatar.id), avatar);
  for (const item of backgrounds) assert.equal(getBackground(item.id), item);
  for (const item of outfits) assert.equal(getOutfit(item.id), item);
  for (const item of glasses) assert.equal(getGlasses(item.id), item);
  for (const item of hats) assert.equal(getHat(item.id), item);
  for (const item of earrings) assert.equal(getEarrings(item.id), item);
  for (const item of neckwear) assert.equal(getNeckwear(item.id), item);
  assert.equal(getAvatar("unknown"), avatars[0]);
  assert.equal(getBackground("unknown"), backgrounds[0]);
  assert.equal(getOutfit("unknown"), outfits[0]);
  assert.equal(getGlasses("unknown"), glasses[0]);
  assert.equal(getHat("unknown"), hats[0]);
  assert.equal(getEarrings("unknown"), earrings[0]);
  assert.equal(getNeckwear("unknown"), neckwear[0]);
});

test("all exported arrays, entries and nested values are frozen", () => {
  assert.ok(Object.isFrozen(api));
  for (const list of [avatars, backgrounds, outfits, glasses, hats, earrings, neckwear]) {
    assert.ok(Object.isFrozen(list));
    for (const item of list) assert.ok(Object.isFrozen(item));
  }
  assert.throws(() => avatars.push({}), TypeError);
  assert.throws(() => { avatars[0].palette.hair = "#ffffff"; }, TypeError);
  assert.throws(() => { hats[1].frontMarkup = ""; }, TypeError);
  assert.throws(() => { api.getAvatar = () => null; }, TypeError);
});
