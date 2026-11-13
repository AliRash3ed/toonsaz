import assert from 'node:assert/strict';
import test from 'node:test';
import { createGesturePlan } from './gesture-plan.mjs';

// The semantic keyword rules were written in Roman transliteration only, so an
// Urdu or Devanagari script produced generic cadence rotation instead of real
// gestures. These tests lock the alias tables and the Arabic question mark.

const pairs = text => createGesturePlan({ text }).gestureCues.map(cue => `${cue.gesture}/${cue.emotion}`);

test('Urdu script greeting opens with a wave, not a neutral default', () => {
  const first = pairs('السلام علیکم دوستو، آج ہم بات کریں گے۔')[0];
  assert.equal(first, 'wave/warm');
});

test('Urdu script thanks closes with a wave', () => {
  const cues = createGesturePlan({ text: 'یہ ضرور یاد رکھیں۔ شکریہ۔' }).gestureCues;
  assert.equal(cues.at(-1).gesture, 'wave');
  assert.equal(cues.at(-1).emotion, 'warm');
});

test('the Arabic question mark U+061F still triggers the curious thinking cue', () => {
  const cues = createGesturePlan({ text: 'کیا آپ جانتے ہیں؟ یہ اہم ہے۔' }).gestureCues;
  assert.ok(cues.some(cue => cue.gesture === 'thinking' && cue.emotion === 'curious'), 'expected a thinking/curious cue');
});

test('Devanagari greeting opens with a wave', () => {
  assert.equal(pairs('नमस्ते दोस्तों, आज हम बात करेंगे।')[0], 'wave/warm');
});

test('Devanagari emphasis and thanks map to chop and wave', () => {
  const cues = createGesturePlan({ text: 'यह ज़रूर याद रखें। धन्यवाद।' }).gestureCues;
  assert.ok(cues.some(cue => cue.gesture === 'chop' && cue.emotion === 'confident'), 'expected chop/confident');
  assert.equal(cues.at(-1).gesture, 'wave');
});

test('Devanagari matras survive token cleaning', () => {
  // "नमस्ते" loses its matras if combining marks are stripped from tokens.
  const cues = createGesturePlan({ text: 'नमस्ते।' }).gestureCues;
  assert.equal(cues[0].gesture, 'wave');
});

test('Urdu script produces a lively cadence instead of four long holds', () => {
  const text = 'السلام علیکم دوستو، آج ہم بات کریں گے اے آئی کے بارے میں۔ یہ ٹیکنالوجی بہت تیزی سے بدل رہی ہے۔ لیکن ایک مسئلہ ہے، لوگ سمجھتے نہیں۔ کیا آپ جانتے ہیں؟ یہ ضرور یاد رکھیں۔ شکریہ۔';
  const plan = createGesturePlan({ text });
  assert.ok(plan.gestureCues.length >= 7, `expected at least 7 segments, got ${plan.gestureCues.length}`);
  for (const cue of plan.gestureCues) assert.ok(cue.end - cue.start <= 5.001, 'no segment may exceed five seconds');
});

test('Roman Urdu behaviour is unchanged by the alias tables', () => {
  const cues = createGesturePlan({ text: 'Assalamualaikum dosto, aaj hum baat karenge. Shukriya.' }).gestureCues;
  assert.equal(cues[0].gesture, 'wave');
  assert.equal(cues.at(-1).gesture, 'wave');
});

test('every script keeps the full cadence contract', () => {
  for (const text of ['السلام علیکم۔ شکریہ۔', 'नमस्ते। धन्यवाद।', 'Assalamualaikum. Shukriya.']) {
    const cues = createGesturePlan({ text }).gestureCues;
    for (let index = 1; index < cues.length; index++) {
      assert.notEqual(cues[index].gesture, cues[index - 1].gesture, `gesture repeated at ${index} for ${text}`);
      assert.notEqual(cues[index].emotion, cues[index - 1].emotion, `emotion repeated at ${index} for ${text}`);
    }
  }
});
