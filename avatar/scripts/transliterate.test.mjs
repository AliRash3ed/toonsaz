import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyze,
  detectScript,
  looksEnglish,
  romanToDevanagari,
  toDevanagari,
  urduToDevanagari,
} from './transliterate.mjs';

// Edge TTS Hindi voices only read Devanagari, so these tests protect the path a
// Roman Urdu or Urdu script creator takes before pressing Generate.

test('detectScript separates the three writing systems', () => {
  assert.equal(detectScript('assalamualaikum dosto'), 'latin');
  assert.equal(detectScript('नमस्ते दोस्तों'), 'devanagari');
  assert.equal(detectScript('السلام علیکم'), 'arabic');
  assert.equal(detectScript('12345 !!!'), 'none');
  assert.equal(detectScript(''), 'none');
});

test('detectScript reports mixed input instead of guessing', () => {
  assert.equal(detectScript('AI की technology بہت اچھی ہے'), 'mixed');
});

test('Roman greetings and function words use the curated spellings', () => {
  assert.equal(romanToDevanagari('assalamualaikum'), 'अस्सलामुअलैकुम');
  assert.equal(romanToDevanagari('namaste'), 'नमस्ते');
  assert.equal(romanToDevanagari('shukriya'), 'शुक्रिया');
  assert.equal(romanToDevanagari('hai'), 'है');
  assert.equal(romanToDevanagari('nahi'), 'नहीं');
  assert.equal(romanToDevanagari('mein'), 'में');
});

test('Roman consonant clusters become conjuncts', () => {
  assert.equal(romanToDevanagari('kya'), 'क्या');
  assert.equal(romanToDevanagari('dosto'), 'दोस्तो');
  assert.equal(romanToDevanagari('baat'), 'बात');
  assert.equal(romanToDevanagari('log'), 'लोग');
});

test('acronyms are spelled out but brand names stay readable', () => {
  assert.equal(romanToDevanagari('AI'), 'एआई');
  assert.equal(romanToDevanagari('SEO'), 'एसईओ');
  assert.equal(romanToDevanagari('OpenRouter'), 'OpenRouter');
  assert.equal(romanToDevanagari('VoxCPM2'), 'VoxCPM2');
});

test('numbers and punctuation survive conversion', () => {
  const output = romanToDevanagari('2026 mein 50% companies, aage badho!');
  assert.match(output, /2026/);
  assert.match(output, /50%/);
  assert.match(output, /,/);
  assert.match(output, /!/);
});

test('a full Roman sentence converts without leftover Latin words', () => {
  const output = romanToDevanagari('Assalamualaikum dosto, aaj hum baat karenge.');
  assert.match(output, /^अस्सलामुअलैकुम दोस्तो, आज हम बात करेंगे\.$/u);
});

test('Urdu script converts to Devanagari and normalises Urdu punctuation', () => {
  const output = urduToDevanagari('السلام علیکم دوستو، آج ہم بات کریں گے۔');
  assert.match(output, /दोस्तो,/);
  assert.match(output, /आज हम बात/);
  assert.ok(!output.includes('۔'), 'Urdu full stop must become a period');
  assert.ok(!output.includes('،'), 'Urdu comma must become a comma');
  assert.ok(!/[\u0600-\u06FF]/u.test(output), 'no Arabic letters may remain');
});

test('Urdu letters that Devanagari lacks still map to a readable sound', () => {
  assert.equal(urduToDevanagari('ٹ'), 'ट');
  assert.equal(urduToDevanagari('ڈ'), 'ड');
  assert.equal(urduToDevanagari('ڑ'), 'ड़');
  assert.equal(urduToDevanagari('ں'), 'ं');
});

test('Urdu aspiration digraphs collapse into one aspirated letter', () => {
  assert.equal(urduToDevanagari('پھ'), 'फ');
  assert.equal(urduToDevanagari('بھ'), 'भ');
  assert.equal(urduToDevanagari('کھ'), 'ख');
});

test('toDevanagari routes each script to the right converter', () => {
  assert.equal(toDevanagari('namaste'), 'नमस्ते');
  assert.equal(toDevanagari('नमस्ते'), 'नमस्ते');
  assert.equal(toDevanagari('سلام'), 'सलाम');
});

test('toDevanagari is idempotent', () => {
  const once = toDevanagari('Yeh technology bohat tezi se badal rahi hai.');
  assert.equal(toDevanagari(once), once);
});

test('English prose is left alone instead of being mangled', () => {
  const english = 'This is a plain English sentence about the weather.';
  assert.ok(looksEnglish(english));
  assert.equal(toDevanagari(english), english);
  assert.equal(analyze(english).needsConversion, false);
});

test('Hinglish is not mistaken for English', () => {
  const hinglish = 'Yeh video bohat acha hai, aap zaroor dekhein.';
  assert.ok(!looksEnglish(hinglish));
  assert.equal(analyze(hinglish).needsConversion, true);
});

test('analyze reports counts and a voice recommendation', () => {
  const latin = analyze('assalamualaikum');
  assert.equal(latin.script, 'latin');
  assert.equal(latin.recommendedVoice, 'hi-IN');
  assert.ok(latin.counts.latin > 0);

  const urdu = analyze('السلام');
  assert.equal(urdu.script, 'arabic');
  assert.equal(urdu.recommendedVoice, 'ur-PK');
});

test('mixed Hinglish keeps Devanagari parts untouched', () => {
  const output = toDevanagari('AI की technology');
  assert.match(output, /की/);
  assert.match(output, /एआई/);
});

test('empty and whitespace input round-trips safely', () => {
  assert.equal(toDevanagari(''), '');
  assert.equal(toDevanagari('   '), '   ');
  assert.equal(analyze('').script, 'none');
});
