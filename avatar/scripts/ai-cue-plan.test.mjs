import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAICuePrompt, parseAICuePlan } from './ai-cue-plan.mjs';
import { EMOTION_IDS, GESTURE_IDS } from './gesture-plan.mjs';

const valid = {
  cues: [
    { start: 0, end: 3, gesture: 'open-palms', emotion: 'neutral', text: 'First phrase' },
    { start: 3, end: 6, gesture: 'point-up', emotion: 'confident' },
  ],
};

test('prompt declares openrouter/free and every exact allowed id', () => {
  const prompt = buildAICuePrompt({ text: 'Hello', words: [{ word: 'Hello', start: 0, end: 1 }], duration: 2 });
  assert.match(prompt, /openrouter\/free/);
  assert.match(prompt, /Return JSON only/);
  for (const id of [...GESTURE_IDS, ...EMOTION_IDS]) assert.ok(prompt.includes(`"${id}"`), `prompt omitted ${id}`);
});

test('raw object, raw array, and fenced JSON normalize to AvatarRig action cues', () => {
  const expected = valid.cues;
  assert.deepEqual(parseAICuePlan(JSON.stringify(valid), { duration: 6 }), expected);
  assert.deepEqual(parseAICuePlan(JSON.stringify(valid.cues), { duration: 6 }), expected);
  assert.deepEqual(parseAICuePlan(`\n\`\`\`json\n${JSON.stringify(valid)}\n\`\`\`\n`, { duration: 6 }), expected);
});

test('unknown gesture or emotion ids are rejected', () => {
  const unknownGesture = structuredClone(valid);
  unknownGesture.cues[0].gesture = 'narrative-sweep';
  const unknownEmotion = structuredClone(valid);
  unknownEmotion.cues[0].emotion = 'excited';
  assert.throws(() => parseAICuePlan(JSON.stringify(unknownGesture), { duration: 6 }), /Unknown gesture/);
  assert.throws(() => parseAICuePlan(JSON.stringify(unknownEmotion), { duration: 6 }), /Unknown emotion/);
});

test('every AI cue boundary changes both gesture and emotion', () => {
  assert.throws(() => parseAICuePlan(JSON.stringify({ cues: [
    { start: 0, end: 3, gesture: 'open-palms', emotion: 'neutral' },
    { start: 3, end: 6, gesture: 'open-palms', emotion: 'focused' },
  ] }), { duration: 6 }), /repeats the preceding gesture/);
  assert.throws(() => parseAICuePlan(JSON.stringify({ cues: [
    { start: 0, end: 3, gesture: 'open-palms', emotion: 'neutral' },
    { start: 3, end: 6, gesture: 'point-up', emotion: 'neutral' },
  ] }), { duration: 6 }), /repeats the preceding emotion/);
});

test('gaps, overlaps, under-duration, and over-duration plans are rejected', () => {
  const cases = [
    [{ start: 0, end: 2, gesture: 'open-palms', emotion: 'neutral' }, { start: 3, end: 6, gesture: 'point-up', emotion: 'focused' }],
    [{ start: 0, end: 4, gesture: 'open-palms', emotion: 'neutral' }, { start: 3, end: 6, gesture: 'point-up', emotion: 'focused' }],
    [{ start: 0, end: 5, gesture: 'open-palms', emotion: 'neutral' }],
    [{ start: 0, end: 5, gesture: 'open-palms', emotion: 'neutral' }, { start: 5, end: 7, gesture: 'point-up', emotion: 'focused' }],
  ];
  for (const cues of cases) assert.throws(() => parseAICuePlan(JSON.stringify({ cues }), { duration: 6 }));
});

test('cadence rejects long cues and avoidable sub-second tails', () => {
  assert.throws(() => parseAICuePlan(JSON.stringify({ cues: [{ start: 0, end: 6, gesture: 'open-palms', emotion: 'neutral' }] }), { duration: 6 }), /1-5 second cadence/);
  assert.throws(() => parseAICuePlan(JSON.stringify({ cues: [
    { start: 0, end: 5, gesture: 'open-palms', emotion: 'neutral' },
    { start: 5, end: 5.5, gesture: 'rest', emotion: 'neutral' },
  ] }), { duration: 5.5 }), /1-5 second cadence/);
  assert.deepEqual(parseAICuePlan('[{"start":0,"end":0.5,"gesture":"rest","emotion":"neutral"}]', { duration: 0.5 }), [
    { start: 0, end: 0.5, gesture: 'rest', emotion: 'neutral' },
  ]);
});

test('provider prose and malformed JSON are rejected rather than extracted', () => {
  assert.throws(() => parseAICuePlan(`Here is your plan:\n${JSON.stringify(valid)}`, { duration: 6 }), /Invalid cue-plan JSON/);
  assert.throws(() => parseAICuePlan('{"cues": [}', { duration: 6 }), /Invalid cue-plan JSON/);
});

test('prototype-pollution-shaped JSON is rejected without mutating prototypes', () => {
  const response = '{"__proto__":{"polluted":true},"cues":[{"start":0,"end":2,"gesture":"rest","emotion":"neutral"}]}';
  assert.throws(() => parseAICuePlan(response, { duration: 2 }), /Unsafe JSON key/);
  assert.equal({}.polluted, undefined);
});
