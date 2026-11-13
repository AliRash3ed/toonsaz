import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import "../assets/gesture-engine.js";

const engine = globalThis.GestureEngine;
const { gestures, handShapes, handMetadata, shoulders, sampleGesture, solveArm, sleevePath, cuffGeometry, handMarkup } = engine;
const radians = Math.PI / 180;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const near = (actual, expected, epsilon = 1e-7) => assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);

function worldPoint(hand, side, local) {
  const x = local.x * (side === "right" ? -1 : 1);
  const a = hand.angle * radians;
  return { x: hand.wrist.x + x * Math.cos(a) - local.y * Math.sin(a), y: hand.wrist.y + x * Math.sin(a) + local.y * Math.cos(a) };
}

test("classic browser script and side-effect Node import expose the same API", async () => {
  assert.ok(Object.isFrozen(engine));
  const context = vm.createContext({});
  vm.runInContext(await readFile(new URL("../assets/gesture-engine.js", import.meta.url), "utf8"), context);
  for (const name of ["sampleGesture", "solveArm", "sleevePath", "cuffGeometry", "handMarkup"]) {
    assert.equal(typeof context.GestureEngine[name], "function");
  }
  assert.equal(JSON.stringify(context.GestureEngine.sampleGesture("steeple")), JSON.stringify(sampleGesture("steeple")));
});

test("all 17 named gestures have unique ids, labels, descriptions, and valid shapes", () => {
  const expected = ["rest", "open-palms", "point-up", "point-front", "empathy", "directional", "stop", "chop", "steeple", "count-1", "count-2", "count-3", "scale-wide", "scale-small", "pinch", "thinking", "wave"];
  assert.deepEqual(gestures.map(({ id }) => id), expected);
  const used = new Set();
  for (const gesture of gestures) {
    assert.ok(gesture.label && gesture.description);
    assert.ok(Object.isFrozen(gesture));
    for (const side of ["left", "right"]) {
      const pose = sampleGesture(gesture.id)[side];
      assert.ok(handShapes.includes(pose.shape));
      used.add(pose.shape);
    }
  }
  assert.deepEqual([...used].sort(), [...handShapes].sort());
});

test("hands have original distinct SVG contours, transparent backgrounds, and modest bounds", () => {
  const contours = new Set();
  for (const shape of handShapes) {
    const markup = handMarkup(shape);
    assert.match(markup, /fill="var\(--skin-color\)"/);
    assert.match(markup, /stroke="var\(--outline-color\)"/);
    assert.match(markup, /class="avatar-hand-material avatar-skin-material avatar-limb-depth"/);
    assert.match(markup, /data-part="silhouette"/);
    assert.match(markup, /data-part="highlight"/);
    assert.doesNotMatch(markup, /\bid\s*=|<svg|<rect|<image|<script|<animate|\btransform\s*=/i);
    assert.doesNotMatch(markup, /NaN|Infinity|undefined/);
    const contour = markup.match(/data-part="silhouette" d="([^"]+)"/)[1];
    assert.match(contour, /^M-?\d+/);
    assert.match(contour, /Z/);
    contours.add(contour);
    const meta = handMetadata[shape];
    const b = meta.bounds;
    assert.ok(b.width + 3.2 <= 85, `${shape} width`);
    assert.ok(b.height + 3.2 <= 110, `${shape} height`);
    assert.ok(b.x <= 0 && b.x + b.width >= 0 && b.y <= 0 && b.y + b.height >= 0);
    // Every path's coordinate control hull fits its declared size.
    const values = contour.match(/-?\d+(?:\.\d+)?/g).map(Number);
    for (let i = 0; i < values.length; i += 2) {
      assert.ok(values[i] >= b.x && values[i] <= b.x + b.width, `${shape}: x ${values[i]}`);
      assert.ok(values[i + 1] >= b.y && values[i + 1] <= b.y + b.height, `${shape}: y ${values[i + 1]}`);
    }
  }
  assert.equal(contours.size, handShapes.length);
  assert.equal(handMarkup("unknown"), handMarkup("relaxed"));
  assert.equal(handMarkup('<script id="bad">'), handMarkup("relaxed"));
});

test("hand material treatment is additive and leaves every sampled pose deterministic", () => {
  for (const { id } of gestures) {
    const before = sampleGesture(id, 0.375);
    for (const side of ["left", "right"]) {
      const markup = handMarkup(before[side].shape);
      assert.match(markup, /avatar-skin-material/);
      assert.match(markup, /M-13 -15 Q-3 -6 9 -10/);
    }
    assert.deepEqual(sampleGesture(id, 0.375), before, id);
  }
});

test("canonical wrist is origin, fingers go up, and front-palm thumbs mirror inward", () => {
  assert.deepEqual(engine.handConvention, { fingerDirection: "negative-y", thumbSide: "positive-x", leftMirror: 1, rightMirror: -1 });
  for (const shape of handShapes) {
    const meta = handMetadata[shape];
    assert.deepEqual(meta.wrist, { x: 0, y: 0 });
    assert.equal(meta.thumbSide, "positive-x");
    assert.ok(meta.thumbTip.x > 0);
    assert.ok(meta.thumbTip.y < 0);
  }
  const pose = sampleGesture("stop", 2);
  for (const side of ["left", "right"]) {
    const thumb = worldPoint(pose[side], side, handMetadata[pose[side].shape].thumbTip);
    assert.ok(side === "left" ? thumb.x > pose[side].wrist.x : thumb.x < pose[side].wrist.x);
  }
});

test("all gesture sample points preserve both bone lengths, stay in frame, and need no target clamp", () => {
  for (const { id } of gestures) {
    for (let frame = 0; frame <= 90; frame++) {
      const pose = sampleGesture(id, frame / 60);
      for (const side of ["left", "right"]) {
        const hand = pose[side];
        const arm = solveArm(shoulders[side], hand.wrist, side);
        near(arm.upperLength, 130);
        near(arm.forearmLength, 138);
        near(distance(arm.shoulder, arm.elbow), 130);
        near(distance(arm.elbow, arm.wrist), 138);
        assert.deepEqual(arm.wrist, hand.wrist, `${id} ${side} was clamped`);
        assert.ok(side === "left" ? arm.elbow.x <= arm.shoulder.x : arm.elbow.x >= arm.shoulder.x, `${id} elbow bends inward`);
        for (const p of [arm.shoulder, arm.elbow, arm.wrist]) {
          assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
          assert.ok(p.x > 40 && p.x < 1040 && p.y > 40 && p.y < 1040, `${id} joint outside frame`);
        }
        const b = handMetadata[hand.shape].bounds;
        for (const x of [b.x - 1.6, b.x + b.width + 1.6]) {
          for (const y of [b.y - 1.6, b.y + b.height + 1.6]) {
            const p = worldPoint(hand, side, { x, y });
            assert.ok(p.x > 0 && p.x < 1080 && p.y > 0 && p.y < 1080, `${id} hand outside frame`);
          }
        }
        assert.ok(Number.isFinite(arm.forearmAngle));
        const sleeve = sleevePath(arm.shoulder, arm.elbow, arm.wrist);
        assert.match(sleeve, /^M.*Z$/);
        assert.doesNotMatch(sleeve, /NaN|Infinity|undefined/);
      }
    }
  }
});

test("IK clamps unreachable, coincident and extreme finite targets without stretching bones", () => {
  for (const side of ["left", "right"]) {
    const shoulder = shoulders[side];
    for (const target of [shoulder, { x: shoulder.x + 1, y: shoulder.y }, { x: shoulder.x, y: shoulder.y - 1000 }, { x: -1e300, y: 1e300 }, { x: Number.MAX_VALUE, y: -Number.MAX_VALUE }]) {
      const arm = solveArm(shoulder, target, side);
      near(distance(arm.shoulder, arm.elbow), 130);
      near(distance(arm.elbow, arm.wrist), 138);
      const reach = distance(arm.shoulder, arm.wrist);
      assert.ok(reach >= 8.009999 && reach <= 267.990001);
      assert.ok([arm.elbow.x, arm.elbow.y, arm.wrist.x, arm.wrist.y, arm.forearmAngle].every(Number.isFinite));
      assert.doesNotMatch(sleevePath(arm.shoulder, arm.elbow, arm.wrist), /NaN|Infinity/);
    }
  }
  assert.throws(() => solveArm({ x: NaN, y: 0 }, { x: 0, y: 0 }), TypeError);
  assert.throws(() => solveArm(shoulders.left, { x: 0, y: Infinity }), TypeError);
});

test("IK accepts profile-specific bone lengths while preserving legacy calls", () => {
  const target = { x: 438, y: 925 };
  const custom = solveArm({ x: 397, y: 755 }, target, "left", { upperArmLength: 118, forearmLength: 127 });
  near(custom.upperLength, 118);
  near(custom.forearmLength, 127);
  near(distance(custom.shoulder, custom.elbow), 118);
  near(distance(custom.elbow, custom.wrist), 127);
  assert.deepEqual(custom.wrist, target);

  const numeric = solveArm({ x: 397, y: 755 }, target, "left", 118, 127);
  assert.deepEqual(numeric, custom);
  const implicitLeft = solveArm({ x: 397, y: 755 }, target, { upperLength: 118, forearmLength: 127 });
  near(implicitLeft.upperLength, 118);
  near(implicitLeft.forearmLength, 127);

  const legacy = solveArm(shoulders.left, sampleGesture("rest").left.wrist, "left");
  near(legacy.upperLength, 130);
  near(legacy.forearmLength, 138);
  assert.throws(() => solveArm(shoulders.left, target, "left", { upperArmLength: 0, forearmLength: 120 }), TypeError);
});

test("cuffs are centered on the solved wrist and their width axes are perpendicular to forearms", () => {
  for (const { id } of gestures) {
    for (const t of [0, 0.25, 0.5, 1, 10]) {
      const pose = sampleGesture(id, t);
      for (const side of ["left", "right"]) {
        const arm = solveArm(shoulders[side], pose[side].wrist, side);
        const cuff = cuffGeometry(arm.elbow, arm.wrist);
        assert.equal(cuff.x, arm.wrist.x);
        assert.equal(cuff.y, arm.wrist.y);
        near(cuff.angle, arm.forearmAngle + 90);
        const a = cuff.angle * radians;
        near(Math.cos(a) * (arm.wrist.x - arm.elbow.x) + Math.sin(a) * (arm.wrist.y - arm.elbow.y), 0);
        assert.equal(cuff.width, 34);
        assert.equal(cuff.height, 17);
        // Sleeve ends are wrist +/- 14px along the same width axis.
        const d = sleevePath(arm.shoulder, arm.elbow, arm.wrist);
        const end = d.match(/ L(-?[\d.]+) (-?[\d.]+)/);
        const p = { x: Number(end[1]), y: Number(end[2]) };
        near(distance(p, arm.wrist), 14, 0.0001);
        near((p.x - arm.wrist.x) * Math.cos(a) + (p.y - arm.wrist.y) * Math.sin(a), -14, 0.0001);
      }
    }
  }
});

test("one closed tapered sleeve has a rounded elbow, no internal elbow outline, and mirrored geometry", () => {
  const left = solveArm(shoulders.left, { x: 439, y: 865 }, "left");
  const right = solveArm(shoulders.right, { x: 641, y: 865 }, "right");
  near(left.elbow.x + right.elbow.x, 1080);
  near(left.elbow.y, right.elbow.y);
  for (const arm of [left, right]) {
    const d = sleevePath(arm.shoulder, arm.elbow, arm.wrist);
    assert.equal((d.match(/M/g) || []).length, 1);
    assert.equal((d.match(/Z/g) || []).length, 1);
    assert.equal((d.match(/L/g) || []).length, 1);
    assert.equal((d.match(/A20 20/g) || []).length, 1);
    assert.match(d, /Q/);
    const p = d.match(/^M(-?[\d.]+) (-?[\d.]+)/);
    near(distance({ x: Number(p[1]), y: Number(p[2]) }, arm.shoulder), 27, 0.0001);
  }
  const straight = sleevePath({ x: 0, y: 0 }, { x: 0, y: 130 }, { x: 0, y: 268 });
  assert.doesNotMatch(straight, /NaN|Infinity/);
  assert.throws(() => sleevePath({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }), TypeError);
});

test("both point-up fingers are upright outside the face and other four fingers are curled", () => {
  const pose = sampleGesture("point-up");
  for (const side of ["left", "right"]) {
    const hand = pose[side];
    assert.equal(hand.shape, "index-up");
    const meta = handMetadata[hand.shape];
    assert.deepEqual(meta.extendedFingers, ["index"]);
    assert.equal(meta.curledFingers.length, 4);
    const tip = worldPoint(hand, side, meta.contact);
    assert.ok(tip.y < hand.wrist.y - 90);
    assert.ok(side === "left" ? hand.wrist.x < 340 && tip.x < 340 : hand.wrist.x > 740 && tip.x > 740);
    assert.ok(side === "left" ? tip.x > hand.wrist.x : tip.x < hand.wrist.x);
    assert.ok(Math.abs(hand.angle) <= 10);
  }
});

test("camera point is a short index with a round tip, not a rotated long pointing finger", () => {
  const pose = sampleGesture("point-front");
  assert.equal(pose.right.shape, "index-front");
  assert.equal(pose.left.shape, "relaxed");
  const meta = handMetadata[pose.right.shape];
  assert.deepEqual(meta.extendedFingers, ["index"]);
  assert.deepEqual(meta.curledFingers, ["thumb", "middle", "ring", "little"]);
  assert.equal(meta.projectedLength, 22);
  assert.ok(meta.bounds.height < handMetadata["index-up"].bounds.height * 0.7);
  assert.match(handMarkup("index-front"), /<circle data-part="index-tip" cx="10" cy="-52" r="11"/);
});

test("counts one, two and three change fixed digit silhouettes, not scaling or deformation", () => {
  for (let count = 1; count <= 3; count++) {
    const pose = sampleGesture(`count-${count}`);
    assert.equal(handMetadata[pose.right.shape].extendedFingers.length, count);
    assert.equal(handMetadata[pose.right.shape].curledFingers.length, 5 - count);
    assert.deepEqual(pose.right.wrist, sampleGesture("count-1").right.wrist);
    assert.equal(pose.right.angle, sampleGesture("count-1").right.angle);
  }
  assert.equal(new Set([1, 2, 3].map((n) => sampleGesture(`count-${n}`).right.shape)).size, 3);
});

test("steeple fingertips actually meet and thinking finger actually touches the chin", () => {
  const pose = sampleGesture("steeple");
  const left = worldPoint(pose.left, "left", handMetadata.steeple.contact);
  const right = worldPoint(pose.right, "right", handMetadata.steeple.contact);
  near(distance(left, right), 0);
  near(left.x, 540);
  near(left.y, 770);
  assert.match(handMarkup("steeple"), /Q-5 -95 0 -96/);
  const thinking = sampleGesture("thinking");
  const tip = worldPoint(thinking.right, "right", handMetadata.chin.contact);
  near(tip.x, 565);
  near(tip.y, 621);
  assert.match(handMarkup("chin"), /Q6 -88 15 -91/);
});

test("small/wide use identical physical hands and pinch preserves a transparent opening", () => {
  const wide = sampleGesture("scale-wide");
  const small = sampleGesture("scale-small");
  assert.ok(wide.right.wrist.x - wide.left.wrist.x > 600);
  assert.ok(small.right.wrist.x - small.left.wrist.x < 120);
  assert.equal(wide.left.shape, small.left.shape);
  assert.equal(wide.right.shape, small.right.shape);
  assert.match(handMarkup(sampleGesture("pinch").right.shape), /fill-rule="evenodd"/);
  assert.equal(sampleGesture("chop").right.shape, "blade");
  for (const side of ["left", "right"]) assert.equal(sampleGesture("empathy")[side].shape, "chest");
});

test("all animation is a single deterministic move then hold with unchanged finger artwork", () => {
  const dynamic = new Set(["directional", "stop", "chop", "wave"]);
  for (const { id } of gestures) {
    const start = sampleGesture(id, 0);
    const end = sampleGesture(id, 1);
    assert.deepEqual(sampleGesture(id, 1.5), end);
    assert.deepEqual(sampleGesture(id, 100000), end);
    assert.deepEqual(sampleGesture(id, Infinity), end);
    if (dynamic.has(id)) assert.notDeepEqual(start, end);
    else assert.deepEqual(start, end);
    for (const side of ["left", "right"]) {
      for (const field of ["x", "y", "angle"]) {
        const value = (pose) => field === "angle" ? pose[side].angle : pose[side].wrist[field];
        const lo = Math.min(value(start), value(end));
        const hi = Math.max(value(start), value(end));
        let previous = value(start);
        for (let i = 0; i <= 100; i++) {
          const pose = sampleGesture(id, i / 100);
          assert.equal(pose[side].shape, start[side].shape);
          assert.equal(handMarkup(pose[side].shape), handMarkup(start[side].shape));
          const current = value(pose);
          assert.ok(current >= lo - 1e-7 && current <= hi + 1e-7);
          assert.ok(value(end) >= value(start) ? current >= previous - 1e-7 : current <= previous + 1e-7);
          previous = current;
        }
      }
    }
    sampleGesture(id, 20);
    assert.deepEqual(sampleGesture(id, 0), start);
    for (const t of [-1, -Infinity, NaN]) assert.deepEqual(sampleGesture(id, t), start);
  }
  assert.deepEqual(sampleGesture("missing"), sampleGesture("rest"));
  const modified = sampleGesture("rest");
  modified.left.wrist.x = -1000;
  modified.right.shape = "bad";
  assert.deepEqual(sampleGesture("rest"), sampleGesture("missing"));
});

test("authored one-shot moves keep continuous elbows as well as continuous wrists", () => {
  for (const id of ["directional", "stop", "chop", "wave"]) {
    for (const side of ["left", "right"]) {
      let previous = solveArm(shoulders[side], sampleGesture(id, 0)[side].wrist, side);
      for (let i = 1; i <= 1000; i++) {
        const arm = solveArm(shoulders[side], sampleGesture(id, i / 1000)[side].wrist, side);
        assert.ok(distance(arm.elbow, previous.elbow) < 2, `${id} has an IK branch jump`);
        assert.ok(distance(arm.wrist, previous.wrist) < 2, `${id} wrist jumps`);
        previous = arm;
      }
    }
  }
});
