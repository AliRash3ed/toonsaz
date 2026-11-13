import { EMOTION_IDS, GESTURE_IDS } from './gesture-plan.mjs';

const gestures = new Set(GESTURE_IDS);
const emotions = new Set(EMOTION_IDS);
const dangerousKeys = new Set(['__proto__', 'prototype', 'constructor']);

function assertDuration(duration) {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Cue-plan duration must be positive and finite.');
}

function assertSafeJSON(value) {
  if (!value || typeof value !== 'object') return;
  for (const key of Object.keys(value)) {
    if (dangerousKeys.has(key)) throw new Error(`Unsafe JSON key: ${key}`);
    assertSafeJSON(value[key]);
  }
}

export function buildAICuePrompt({ text = '', words = null, duration } = {}) {
  assertDuration(duration);
  const input = {
    text: String(text),
    ...(words === null || words === undefined ? {} : { words }),
    duration,
  };
  return [
    'You are generating a deterministic semantic avatar cue plan for model openrouter/free.',
    'Return JSON only. Do not use Markdown fences, commentary, or provider metadata.',
    'Return exactly this shape: {"cues":[{"start":0,"end":2,"gesture":"open-palms","emotion":"neutral","text":"optional source phrase"}]}.',
    `Allowed gesture ids (exact strings only): ${JSON.stringify(GESTURE_IDS)}.`,
    `Allowed emotion ids (exact strings only): ${JSON.stringify(EMOTION_IDS)}.`,
    'Rules: cues must be ordered, contiguous, non-overlapping, start at 0, and end exactly at duration.',
    'Every cue must last 1.0 to 5.0 seconds inclusive. A shorter final cue is allowed only when the entire duration is below 1.0 second.',
    'Gesture and emotion must both be present on every cue. Every boundary must change BOTH the gesture and the emotion.',
    'Prefer supplied word, phrase, and sentence boundaries. Use only textual meaning and punctuation; do not claim to infer acoustic tone.',
    `Input: ${JSON.stringify(input)}`,
  ].join('\n');
}

export function normalizeAICuePlan(plan, { duration } = {}) {
  assertDuration(duration);
  assertSafeJSON(plan);
  let cues;
  if (Array.isArray(plan)) {
    cues = plan;
  } else if (plan && typeof plan === 'object' && !Array.isArray(plan)) {
    const keys = Object.keys(plan);
    if (keys.length !== 1 || keys[0] !== 'cues' || !Array.isArray(plan.cues)) {
      throw new Error('Cue-plan JSON object must contain only a cues array.');
    }
    cues = plan.cues;
  } else {
    throw new Error('Cue-plan JSON must be an array or an object containing a cues array.');
  }
  if (!cues.length) throw new Error('Cue plan must contain at least one cue.');

  let previousEnd = 0;
  let previousGesture = null;
  let previousEmotion = null;
  const normalized = cues.map((cue, index) => {
    if (!cue || typeof cue !== 'object' || Array.isArray(cue)) throw new Error(`Cue ${index} must be an object.`);
    const keys = Object.keys(cue);
    if (keys.some(key => !['start', 'end', 'gesture', 'emotion', 'text'].includes(key))) throw new Error(`Cue ${index} contains an unknown field.`);
    if (!keys.includes('start') || !keys.includes('end') || !keys.includes('gesture') || !keys.includes('emotion')) throw new Error(`Cue ${index} is missing a required field.`);
    if (!Number.isFinite(cue.start) || !Number.isFinite(cue.end) || cue.start < 0 || cue.end <= cue.start) throw new Error(`Cue ${index} has invalid times.`);
    if (cue.start !== previousEnd) throw new Error(`Cue ${index} creates a gap, overlap, or ordering error.`);
    if (!gestures.has(cue.gesture)) throw new Error(`Unknown gesture: ${cue.gesture}`);
    if (!emotions.has(cue.emotion)) throw new Error(`Unknown emotion: ${cue.emotion}`);
    if (Object.hasOwn(cue, 'text') && typeof cue.text !== 'string') throw new Error(`Cue ${index} text must be a string.`);
    const cueDuration = cue.end - cue.start;
    const shortWholePlan = duration < 1 && cues.length === 1 && index === 0;
    if (cueDuration > 5 || cueDuration < 1 && !shortWholePlan) throw new Error(`Cue ${index} must use a 1-5 second cadence.`);
    if (cue.gesture === previousGesture) throw new Error(`Cue ${index} repeats the preceding gesture.`);
    if (cue.emotion === previousEmotion) throw new Error(`Cue ${index} repeats the preceding emotion.`);
    previousEnd = cue.end;
    previousGesture = cue.gesture;
    previousEmotion = cue.emotion;
    return {
      start: Object.is(cue.start, -0) ? 0 : cue.start,
      end: cue.end,
      gesture: cue.gesture,
      emotion: cue.emotion,
      ...(Object.hasOwn(cue, 'text') ? { text: cue.text } : {}),
    };
  });
  if (normalized.at(-1).end !== duration) throw new Error('Cue plan must end exactly at duration.');
  return normalized;
}

export function parseAICuePlan(responseText, { duration } = {}) {
  assertDuration(duration);
  if (typeof responseText !== 'string' || !responseText.trim()) throw new Error('AI cue response must be non-empty JSON text.');
  const trimmed = responseText.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i);
  const source = fenced ? fenced[1].trim() : trimmed;
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    throw new Error(`Invalid cue-plan JSON: ${error.message}`);
  }
  return normalizeAICuePlan(parsed, { duration });
}
