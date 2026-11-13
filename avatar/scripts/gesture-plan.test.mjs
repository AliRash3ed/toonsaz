import assert from 'node:assert/strict';
import test from 'node:test';
import { createGesturePlan, parseTimedTranscript, validateActionCues } from './gesture-plan.mjs';

const sample = 'The upper video you are seeing is an emotional video of a baby who is going with his mother, and then he stopped.';
const boundaries = cues => cues.map(({ start, end }) => [start, end]);

function assertAutomaticCadence(plan) {
  assert.equal(plan.gestureCues[0].start, 0);
  assert.equal(plan.gestureCues.at(-1).end, plan.duration);
  for (const [index, cue] of plan.gestureCues.entries()) {
    const cueDuration = cue.end - cue.start;
    assert.ok(cueDuration <= 5 + 1e-8, `cue ${index} exceeds five seconds`);
    assert.ok(cueDuration >= 1 - 1e-8 || plan.duration < 1 && index === plan.gestureCues.length - 1, `cue ${index} is shorter than one second`);
    if (index) {
      assert.equal(cue.start, plan.gestureCues[index - 1].end);
      assert.notEqual(cue.gesture, plan.gestureCues[index - 1].gesture, `cue ${index} must change gesture`);
      assert.notEqual(cue.emotion, plan.gestureCues[index - 1].emotion, `cue ${index} must change emotion`);
    }
  }
}

test('baby example maps to the requested four semantic hand actions', () => {
  const plan = createGesturePlan({ text: sample, duration: 10 });
  assert.deepEqual(plan.gestureCues.map(cue => cue.gesture), ['point-up', 'empathy', 'directional', 'stop']);
  assert.equal(plan.timingBasis, 'estimated');
  assert.equal(plan.gestureCues.at(-1).emotion, 'shock');
  assertAutomaticCadence(plan);
});
test('actual word timestamps determine gesture starts, not proportional guesses', () => {
  const plan = createGesturePlan({ duration: 12, words: [
    { word: 'upper', start: 0, end: 1 }, { word: 'video', start: 1, end: 2 },
    { word: 'emotional', start: 3.2, end: 4 }, { word: 'going', start: 6.5, end: 7 },
    { word: 'stopped', start: 10.1, end: 11.8 },
  ] });
  assert.equal(plan.timingBasis, 'word-timestamps');
  assert.deepEqual(plan.gestureCues.map(cue => cue.start), [0, 3.2, 6.5, 10.1]);
});
test('word lines, JSON, SRT and VTT imports are supported with honest timing labels', () => {
  assert.equal(parseTimedTranscript('[0.00s -> 0.18s] Hi,\n[0.44s -> 0.74s] hello').words.length, 2);
  assert.equal(parseTimedTranscript('[{"word":"hi","start":0,"end":0.2}]').timingBasis, 'word-timestamps');
  for (const text of ['1\n00:00:01,000 --> 00:00:02,000\nupper video\n', 'WEBVTT\n\n00:01.000 --> 00:02.000\nupper video\n']) {
    const result = parseTimedTranscript(text);
    assert.equal(result.timingBasis, 'segment-timestamps');
    assert.equal(result.words[0].start, 1);
  }
});
test('counts, front-pointing and precision phrases create distinct fingers', () => {
  const plan = createGesturePlan({ text: 'You should follow one two three precisely', duration: 8 });
  assert.deepEqual(plan.gestureCues.map(cue => cue.gesture), ['point-front', 'count-1', 'count-2', 'count-3', 'pinch']);
});
test('multilingual sentiment and punctuation drive automatic emotion changes', () => {
  const plan = createGesturePlan({ text: 'Salam! ye zabardast hai. Lekin masla kyun?', duration: 8 });
  assert.ok(plan.gestureCues.some(cue => cue.gesture === 'wave'));
  assert.ok(plan.gestureCues.some(cue => cue.gesture === 'open-palms'));
  assert.ok(plan.gestureCues.some(cue => cue.gesture === 'chop'));
  assert.ok(plan.gestureCues.some(cue => cue.gesture === 'thinking'));
  assert.ok(plan.emotionCues.some(cue => cue.emotion === 'warm'));
  assert.ok(plan.emotionCues.some(cue => cue.emotion === 'focused'));
  assert.equal(plan.emotionCues.at(-1).emotion, 'curious');
});
test('long speech is fully covered with deterministic one-to-five-second aligned segments', () => {
  const input = {
    text: 'This is a calm explanation with several phrases, and it continues with useful context before the final clear conclusion.',
    duration: 16,
  };
  const first = createGesturePlan(input);
  const second = createGesturePlan(input);
  assert.deepEqual(first, second);
  assert.ok(first.gestureCues.length >= 4);
  assertAutomaticCadence(first);
  assert.deepEqual(boundaries(first.gestureCues), boundaries(first.emotionCues));
  assert.deepEqual(first.gestureCues.map(cue => cue.emotion), first.emotionCues.map(cue => cue.emotion));
});
test('partitionable durations do not produce a short final tail', () => {
  const plan = createGesturePlan({ text: 'A steady explanation continues through the complete thought.', duration: 5.5 });
  assertAutomaticCadence(plan);
  assert.ok(plan.gestureCues.every(cue => cue.end - cue.start >= 1));
  const short = createGesturePlan({ text: 'Hi', duration: 0.75 });
  assert.equal(short.gestureCues.length, 1);
  assert.equal(short.gestureCues[0].end, 0.75);
});
test('Roman Urdu/Hindi and Spanish text cues use textual sentiment', () => {
  const roman = createGesturePlan({ text: 'Namaste dosto, yeh badhiya hai. Lekin mushkil kyun?', duration: 10 });
  assert.ok(roman.emotionCues.some(cue => cue.emotion === 'warm'));
  assert.ok(roman.emotionCues.some(cue => cue.emotion === 'focused'));
  assert.equal(roman.emotionCues.at(-1).emotion, 'curious');

  const spanish = createGesturePlan({ text: 'Hola amigos, estamos feliz. Pero este problema es triste. Por qué ocurrió esta sorpresa?', duration: 14 });
  for (const emotion of ['warm', 'focused', 'sad', 'curious', 'shock']) {
    assert.ok(spanish.emotionCues.some(cue => cue.emotion === emotion), `missing Spanish ${emotion} cue`);
  }
});
test('manual cue overrides reject unknown gestures, overlapping or out-of-range times', () => {
  assert.deepEqual(validateActionCues([], 10), []);
  for (const cues of [[{start:0,end:1,gesture:'wrong'}], [{start:-1,end:1,gesture:'stop'}], [{start:0,end:11,gesture:'stop'}], [{start:0,end:2,gesture:'stop'},{start:1,end:3,gesture:'wave'}]]) {
    assert.throws(() => validateActionCues(cues, 10));
  }
});
test('malformed or unsynchronized transcripts are rejected', () => {
  assert.throws(() => parseTimedTranscript([{ word: 'hi', start: 2, end: 1 }]));
  assert.throws(() => createGesturePlan({ words: [{ word: 'hi', start: 0, end: 5 }], duration: 3 }));
  assert.throws(() => createGesturePlan({ text: '' }));
});
