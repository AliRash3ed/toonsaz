import assert from 'node:assert/strict';
import test from 'node:test';
import { updateDurationMarkup, validateCues } from './lipsync.mjs';

test('accepts all A-H/X shapes, gaps, and an exact duration boundary', () => {
  const cues = [...'ABCDEFGHX'].map((value, index) => ({ start: index, end: index + 0.5, value }));
  cues.at(-1).end = 9;
  assert.deepEqual(validateCues(9, cues), cues);
  assert.deepEqual(validateCues(1, []), []);
});

test('returns canonical cues without mutating the source', () => {
  const cues = [{ start: 0, end: 1, value: 'X', extra: 'ignored' }];
  assert.deepEqual(validateCues(1, cues), [{ start: 0, end: 1, value: 'X' }]);
  assert.equal(cues[0].extra, 'ignored');
});

test('rejects invalid durations, including NaN and non-numeric values', () => {
  for (const duration of [NaN, Infinity, -Infinity, -1, 0, '1', null, undefined]) {
    assert.throws(() => validateCues(duration, []), /positive finite/, String(duration));
  }
});

test('requires a cue array and individual cue objects', () => {
  for (const cues of [null, undefined, {}, 'A']) {
    assert.throws(() => validateCues(1, cues), /must be an array/);
  }
  for (const cue of [null, undefined, [], 'A']) {
    assert.throws(() => validateCues(1, [cue]), /must be an object/);
  }
  assert.throws(() => validateCues(1, new Array(1)), /must be an object/);
});

test('rejects unknown, lowercase, and malformed shapes', () => {
  for (const value of ['I', 'Z', 'a', 'x', '', 'AA', '<script>', null, undefined, 1]) {
    assert.throws(() => validateCues(1, [{ start: 0, end: 1, value }]), /unknown shape/);
  }
});

test('rejects NaN, infinite, and non-numeric times', () => {
  for (const field of ['start', 'end']) {
    for (const value of [NaN, Infinity, -Infinity, '0', null, undefined]) {
      const cue = { start: 0, end: 1, value: 'A', [field]: value };
      assert.throws(() => validateCues(1, [cue]), /finite numbers/);
    }
  }
});

test('rejects negative, inverted, and zero-length cues', () => {
  for (const [start, end] of [[-1, 0.5], [0, -1], [-Number.EPSILON, 1], [0.8, 0.2], [0.5, 0.5]]) {
    assert.throws(() => validateCues(1, [{ start, end, value: 'B' }]), /non-negative times and end > start/);
  }
});

test('rejects overlap and out-of-order cues rather than sorting them', () => {
  for (const cues of [
    [{ start: 0, end: 0.7, value: 'A' }, { start: 0.6, end: 1, value: 'B' }],
    [{ start: 0.6, end: 0.8, value: 'A' }, { start: 0.1, end: 0.3, value: 'B' }],
  ]) {
    assert.throws(() => validateCues(1, cues), /out of order or overlaps/);
  }
});

test('rejects cues beyond the measured duration', () => {
  assert.throws(() => validateCues(1, [{ start: 0, end: 1.01, value: 'C' }]), /beyond the audio duration/);
});

test('snaps floating-point boundary noise without leaving an overlap or overrun', () => {
  assert.deepEqual(validateCues(0.3, [{ start: 0, end: 0.1 + 0.2, value: 'A' }]), [
    { start: 0, end: 0.3, value: 'A' },
  ]);
  const cues = [{ start: 0, end: 0.1 + 0.2, value: 'A' }, { start: 0.3, end: 0.5, value: 'B' }];
  const validated = validateCues(0.5, cues);
  assert.equal(validated[1].start, validated[0].end);
  assert.equal(cues[1].start, 0.3);
});

test('does not forgive meaningful precision errors or collapsed boundary spans', () => {
  assert.throws(() => validateCues(1, [
    { start: 0, end: 0.5, value: 'A' }, { start: 0.5 - 1e-10, end: 1, value: 'B' },
  ]), /overlaps/);
  assert.throws(() => validateCues(1, [{ start: 0, end: 1 + 1e-10, value: 'A' }]), /beyond/);
  assert.throws(() => validateCues(1, [
    { start: 0, end: 0.1 + 0.2, value: 'A' }, { start: 0.3, end: 0.1 + 0.2, value: 'B' },
  ]), /no positive span/);
});

const duration = 16.15;
const renderDuration = Math.ceil((duration + 1.25) * 30) / 30;
const indexHtml = `<!doctype html>
<!-- <div id="root" data-duration="88"></div> -->
<html><head>
<style>.fake::after { content: '<div id="presenter" data-duration="88">'; }</style>
<script>const fake = '<audio id="narrator" data-duration="88"></audio>';</script>
</head><body>
  <div
    data-start="0"
    data-duration="10"
    data-note="x > y"
    data-composition-id="main"
    id="root"
  >
    <div
      data-duration='10'
      data-composition-src="compositions/presenter.html"
      class="clip" id='presenter' data-start="0"
    ></div>
    <audio
      data-track-index="1" data-duration = "10"
      src="assets/narration.wav" id="narrator" data-start="0"
    ></audio>
    <div id="background" data-duration="999" data-start="0"></div>
    <div data-note='id="presenter" data-duration="222"' id="other" data-duration="variable"></div>
    <div id="presenter-other" data-duration="23"></div>
  </div>
</body></html>`;
const sceneHtml = `<template>
  <div
    data-composition-id='presenter'
    data-duration='5e0'
    id='root' data-start="0"
  >
    <div
      data-duration = " 5.000 " class="clip"
      data-start="0" id="presenter-art"
    ></div>
    <div id="presenter-decoration" data-duration="7"></div>
    <audio id="other-audio" data-duration="2"></audio>
  </div>
</template>`;

test('patches only main root, presenter host, and narrator numeric values', () => {
  const expected = indexHtml
    .replace('data-duration="10"', `data-duration="${renderDuration}"`)
    .replace("data-duration='10'", `data-duration='${renderDuration}'`)
    .replace('data-duration = "10"', `data-duration = "${duration}"`);
  assert.equal(renderDuration, 17.4);
  assert.equal(updateDurationMarkup(indexHtml, duration, renderDuration), expected);
});

test('patches scene root and art only, preserving quotes and numeric whitespace', () => {
  const expected = sceneHtml
    .replace("data-duration='5e0'", `data-duration='${renderDuration}'`)
    .replace('data-duration = " 5.000 "', `data-duration = " ${renderDuration} "`);
  assert.equal(updateDurationMarkup(sceneHtml, duration, renderDuration, true), expected);
});

test('supports unquoted numbers, uppercase attributes, and arbitrary attribute order', () => {
  const html = '<SECTION DATA-DURATION=10 ID=root DATA-COMPOSITION-ID=presenter>\n'
    + '<div data-start=0 id=presenter-art data-duration=.5 /></SECTION>';
  assert.equal(updateDurationMarkup(html, 1, 2.2666666666666666, true),
    '<SECTION DATA-DURATION=2.2666666666666666 ID=root DATA-COMPOSITION-ID=presenter>\n'
    + '<div data-start=0 id=presenter-art data-duration=2.2666666666666666 /></SECTION>');
});

test('requires every main duration target', () => {
  for (const marker of ['    id="root"', "class=\"clip\" id='presenter'", 'src="assets/narration.wav" id="narrator"']) {
    const html = indexHtml.replace(marker, marker.replace('id=', 'data-unused-id='));
    assert.throws(() => updateDurationMarkup(html, duration, renderDuration), /Missing duration target/);
  }
});

test('requires every scene duration target and the presenter composition identity', () => {
  assert.throws(() => updateDurationMarkup(sceneHtml.replace('id="presenter-art"', 'id="missing-art"'),
    duration, renderDuration, true), /Missing duration target/);
  assert.throws(() => updateDurationMarkup(sceneHtml.replace("id='root'", "id='other-root'"),
    duration, renderDuration, true), /Missing duration target/);
  for (const html of [
    sceneHtml.replace("data-composition-id='presenter'", "data-composition-id='other'"),
    sceneHtml.replace("data-composition-id='presenter'", ''),
  ]) {
    assert.throws(() => updateDurationMarkup(html, duration, renderDuration, true), /data-composition-id="presenter"/);
  }
});

test('requires narrator to be an audio element', () => {
  assert.throws(() => updateDurationMarkup(indexHtml.replace('<audio\n', '<div\n'),
    duration, renderDuration), /must be an audio element/);
});

test('rejects missing, duplicate, or non-numeric targeted duration attributes', () => {
  for (const html of [
    sceneHtml.replace("data-duration='5e0'", ''),
    sceneHtml.replace("data-duration='5e0'", "data-duration='5' data-duration='6'"),
  ]) {
    assert.throws(() => updateDurationMarkup(html, duration, renderDuration, true), /exactly one numeric/);
  }
  for (const value of ['NaN', 'Infinity', '1e309', '${duration}', '10seconds', '']) {
    assert.throws(() => updateDurationMarkup(sceneHtml.replace('5e0', value), duration, renderDuration, true),
      /data-duration must be numeric/);
  }
});

test('rejects duplicate targets and id attributes', () => {
  assert.throws(() => updateDurationMarkup(`${sceneHtml}<div id="presenter-art" data-duration="1"></div>`,
    duration, renderDuration, true), /Duplicate duration target/);
  assert.throws(() => updateDurationMarkup(sceneHtml.replace("id='root'", "id='root' id='other'"),
    duration, renderDuration, true), /Duplicate duration target/);
});

test('rejects invalid replacement durations and non-string HTML', () => {
  for (const value of [NaN, Infinity, -1, 0, '1']) {
    assert.throws(() => updateDurationMarkup(indexHtml, value, renderDuration), /positive finite/);
    assert.throws(() => updateDurationMarkup(indexHtml, duration, value), /positive finite/);
  }
  assert.throws(() => updateDurationMarkup(null, duration, renderDuration), /HTML must be a string/);
});
