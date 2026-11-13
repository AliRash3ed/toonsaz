export const GESTURE_IDS = Object.freeze(['rest', 'open-palms', 'point-up', 'point-front', 'empathy', 'directional', 'stop', 'chop', 'steeple', 'count-1', 'count-2', 'count-3', 'scale-wide', 'scale-small', 'pinch', 'thinking', 'wave']);
export const EMOTION_IDS = Object.freeze(['neutral', 'warm', 'sad', 'shock', 'focused', 'curious', 'confident']);
const gestures = new Set(GESTURE_IDS);
const emotions = new Set(EMOTION_IDS);
const fallbackGestures = Object.freeze(['open-palms', 'directional', 'pinch', 'empathy', 'point-up', 'steeple', 'rest']);
const cadenceEmotions = Object.freeze(['neutral', 'warm', 'confident', 'curious', 'focused', 'sad', 'shock']);
const splitWords = text => String(text).trim().split(/\s+/).filter(Boolean);
// \p{M} keeps Devanagari matras and Urdu diacritics, which are combining marks
// rather than letters. Dropping them turned "नमस्ते" into "नमसत".
const clean = word => word.toLowerCase().replace(/[^\p{L}\p{M}\p{N}-]/gu, '');
const samePair = (left, right) => left?.gesture === right?.gesture && left?.emotion === right?.emotion;

// The keyword rules below are written in Roman transliteration, which covers
// "assalamualaikum" but not "السلام علیکم" or "नमस्ते". These alias tables give
// Urdu and Hindi speakers the same semantic gestures without an AI key.
const ALIAS_WORDS = Object.freeze({
  wave: ['سلام', 'السلام', 'علیکم', 'خداحافظ', 'شکریہ', 'नमस्ते', 'नमस्कार', 'स्वागत', 'हैलो', 'हाय', 'धन्यवाद', 'शुक्रिया', 'अलविदा'],
  empathy: ['دکھ', 'غم', 'افسوس', 'اداس', 'رونا', 'ماں', 'امی', 'بچہ', 'बच्चा', 'माँ', 'मां', 'दुख', 'गम', 'अफसोस', 'उदास', 'रोना'],
  stop: ['رکو', 'رکا', 'رکیں', 'رک', 'اچانک', 'حیران', 'خطرہ', 'रुको', 'रुका', 'रुकिए', 'अचानक', 'हैरान', 'खतरा', 'वाह'],
  chopFocus: ['غلط', 'مسئلہ', 'مشکل', 'نہیں', 'غصہ', 'गलत', 'समस्या', 'मुश्किल', 'नहीं', 'गुस्सा'],
  chopConfident: ['ضرور', 'اہم', 'لازمی', 'ज़रूर', 'जरूर', 'महत्वपूर्ण', 'लाज़िमी', 'लाजिमी'],
  steeple: ['اعتماد', 'یقین', 'بھروسہ', 'भरोसा', 'यकीन', 'विश्वास', 'रणनीति'],
  thinking: ['کیوں', 'کیسے', 'کیا', 'سوال', 'سوچو', 'क्यों', 'कैसे', 'क्या', 'सवाल', 'सोचो'],
  count1: ['ایک', 'پہلا', 'پہلی', 'एक', 'पहला', 'पहली'],
  count2: ['دو', 'دوسرا', 'دوسری', 'दो', 'दूसरा', 'दूसरी'],
  count3: ['تین', 'تیسرا', 'تیسری', 'तीन', 'तीसरा', 'तीसरी'],
  wide: ['بڑا', 'بڑی', 'بہت', 'زیادہ', 'बड़ा', 'बड़ी', 'बहुत', 'ज़्यादा', 'ज्यादा', 'विशाल'],
  small: ['چھوٹا', 'چھوٹی', 'کم', 'تھوڑا', 'छोटा', 'छोटी', 'कम', 'थोड़ा'],
  pinch: ['بالکل', 'ٹھیک', 'बिल्कुल', 'ठीक', 'सटीक'],
  warm: ['خوشی', 'خوش', 'اچھا', 'بہترین', 'پیار', 'خوبصورت', 'مبارک', 'खुशी', 'खुश', 'अच्छा', 'बढ़िया', 'प्यार', 'सुंदर', 'मुबारक'],
  directional: ['چلو', 'جاؤ', 'سفر', 'चलो', 'जाओ', 'सफर'],
  up: ['اوپر', 'ऊपर'],
  front: ['آپ', 'تم', 'आप', 'तुम'],
  explain: ['سمجھاؤ', 'بتاؤ', 'بول', 'بیان', 'समझाओ', 'बताओ', 'बोलो', 'बताइए'],
});

const ALIAS_CUES = Object.freeze({
  wave: { gesture: 'wave', emotion: 'warm', priority: 7 },
  empathy: { gesture: 'empathy', emotion: 'sad', priority: 9 },
  stop: { gesture: 'stop', emotion: 'shock', priority: 10 },
  chopFocus: { gesture: 'chop', emotion: 'focused', priority: 7 },
  chopConfident: { gesture: 'chop', emotion: 'confident', priority: 7 },
  steeple: { gesture: 'steeple', emotion: 'confident', priority: 7 },
  thinking: { gesture: 'thinking', emotion: 'curious', priority: 7 },
  count1: { gesture: 'count-1', priority: 7 },
  count2: { gesture: 'count-2', priority: 7 },
  count3: { gesture: 'count-3', priority: 7 },
  wide: { gesture: 'scale-wide', priority: 5 },
  small: { gesture: 'scale-small', priority: 5 },
  pinch: { gesture: 'pinch', emotion: 'focused', priority: 7 },
  warm: { gesture: 'open-palms', emotion: 'warm', priority: 7 },
  directional: { gesture: 'directional', priority: 5 },
  up: { gesture: 'point-up', priority: 6 },
  front: { gesture: 'point-front', priority: 3 },
  explain: { gesture: 'open-palms', priority: 4 },
});

const ALIAS_INDEX = new Map();
for (const [key, words] of Object.entries(ALIAS_WORDS)) {
  for (const word of words) ALIAS_INDEX.set(word, key);
}

const ALIAS_EMOTION_INDEX = new Map();
for (const [key, cue] of Object.entries(ALIAS_CUES)) {
  if (!cue.emotion) continue;
  for (const word of ALIAS_WORDS[key]) ALIAS_EMOTION_INDEX.set(word, cue.emotion);
}

function seconds(value) {
  const parts = value.replace(',', '.').split(':').map(Number);
  return parts.reduce((total, part) => total * 60 + part, 0);
}

export function parseTimedTranscript(input) {
  if (typeof input === 'string') {
    const text = input.trim();
    if (/^[\[{]/.test(text) && !/^\[\d+(?:\.\d+)?s?\s*->/.test(text)) {
      try { return parseTimedTranscript(JSON.parse(text)); }
      catch (error) { throw new Error(`Invalid transcript JSON: ${error.message}`); }
    }
    const wordLines = [...text.matchAll(/^\[(\d+(?:\.\d+)?)s?\s*->\s*(\d+(?:\.\d+)?)s?\]\s*(.+)$/gm)];
    if (wordLines.length) return parseTimedTranscript(wordLines.map(match => ({ start: Number(match[1]), end: Number(match[2]), word: match[3] })));
    const blocks = text.replace(/\r/g, '').split(/\n\s*\n/);
    const entries = [];
    for (const block of blocks) {
      const match = block.match(/((?:\d{2}:)?\d{2}:\d{2}[.,]\d{3})\s*-->\s*((?:\d{2}:)?\d{2}:\d{2}[.,]\d{3})[^\n]*\n([\s\S]+)/);
      if (match) entries.push({ start: seconds(match[1]), end: seconds(match[2]), text: match[3].replace(/<[^>]*>/g, '').replace(/\n/g, ' ') });
    }
    if (!entries.length) throw new Error('Timed transcript must be word JSON, segment JSON, SRT, VTT, or [0.00s -> 0.20s] word lines.');
    return parseTimedTranscript(entries);
  }
  if (input && !Array.isArray(input) && typeof input === 'object') {
    if (Array.isArray(input.words)) return parseTimedTranscript(input.words);
    if (Array.isArray(input.segments)) {
      return parseTimedTranscript(input.segments.flatMap(segment => Array.isArray(segment.words) ? segment.words : [segment]));
    }
  }
  if (!Array.isArray(input) || !input.length) throw new Error('Timed transcript needs a non-empty word or segment array.');
  let previousEnd = 0;
  let coarse = false;
  const words = [];
  for (const entry of input) {
    if (!entry || !Number.isFinite(entry.start) || !Number.isFinite(entry.end) || entry.start < 0 || entry.end <= entry.start || entry.start < previousEnd - 0.001) {
      throw new Error('Transcript timestamps must be finite, ordered, non-overlapping, and have end > start.');
    }
    const tokens = splitWords(entry.word ?? entry.text ?? '');
    if (!tokens.length) throw new Error('Each transcript entry needs word or text content.');
    coarse ||= tokens.length > 1;
    tokens.forEach((word, index) => words.push({
      word,
      start: entry.start + (entry.end - entry.start) * index / tokens.length,
      end: entry.start + (entry.end - entry.start) * (index + 1) / tokens.length,
    }));
    previousEnd = entry.end;
  }
  return { words, timingBasis: coarse ? 'segment-timestamps' : 'word-timestamps' };
}

export function validateActionCues(cues, duration) {
  if (!Array.isArray(cues)) throw new Error('Action cues must be an array.');
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Action cue duration must be positive and finite.');
  let previousEnd = 0;
  return cues.map((cue, index) => {
    if (!cue || !Number.isFinite(cue.start) || !Number.isFinite(cue.end) || cue.start < 0 || cue.end <= cue.start || cue.start < previousEnd - 1e-8 || cue.end > duration + 1e-8) {
      throw new Error(`Action cue ${index} has invalid, overlapping, or out-of-range times.`);
    }
    if (!gestures.has(cue.gesture)) throw new Error(`Unknown gesture: ${cue.gesture}`);
    if (cue.emotion !== undefined && !emotions.has(cue.emotion)) throw new Error(`Unknown emotion: ${cue.emotion}`);
    previousEnd = cue.end;
    return { start: cue.start, end: cue.end, gesture: cue.gesture, ...(cue.emotion ? { emotion: cue.emotion } : {}), ...(typeof cue.text === 'string' ? { text: cue.text } : {}) };
  });
}

function semanticCue(token, raw, near) {
  const alias = ALIAS_INDEX.get(token);
  if (alias) return { ...ALIAS_CUES[alias] };
  if (/^(upper|above|upward|upwards|upar|uparwali|arriba|superior)$/.test(token) || token === 'video' && /\b(upper|above|upar|arriba|superior)\b/.test(near)) return { gesture: 'point-up', priority: 6 };
  if (/^(stopped|stop|stops|halt|ruka|ruk|ruko|rukgaya|roko|parar|para|alto|detente)$/.test(token)) return { gesture: 'stop', emotion: 'shock', priority: 10 };
  if (/^(emotional|heartbreaking|sad|sadness|dukh|dukhi|udaas|udas|jazbati|afsos|triste|tristeza|dolor|llorar|emocional)$/.test(token)) return { gesture: 'empathy', emotion: 'sad', priority: 9 };
  if (/^(baby|mother|mom|maa|ammi|bacha|bachcha|bachay|madre|mama|mamá|bebe|bebé)$/.test(token)) return { gesture: 'empathy', emotion: 'sad', preserveDirection: true, priority: 8 };
  if (/^(going|walking|walks|moving|journey|across|ja|jana|chalo|chal|safar|ir|vamos|caminar|caminando|moviendo|viaje)$/.test(token)) return { gesture: 'directional', priority: 5 };
  if (/^(hi|hello|hey|salam|salaam|assalamualaikum|namaste|welcome|swagat|hola|bienvenido|bienvenida)$/.test(token)) return { gesture: 'wave', emotion: 'warm', priority: 7 };
  if (/^(one|first|1|pehla|pehli|ek|uno|una|primero|primera)$/.test(token)) return { gesture: 'count-1', priority: 7 };
  if (/^(two|second|2|do|dusra|dusri|dos|segundo|segunda)$/.test(token)) return { gesture: 'count-2', priority: 7 };
  if (/^(three|third|3|teen|teesra|teesri|tres|tercero|tercera)$/.test(token)) return { gesture: 'count-3', priority: 7 };
  if (/^(large|big|huge|wide|grow|growing|bara|bada|bari|grande|enorme|ancho|crecer)$/.test(token)) return { gesture: 'scale-wide', priority: 5 };
  if (/^(small|little|tiny|chota|chhota|choti|pequeño|pequena|pequeña|pequeno|chico|chica)$/.test(token)) return { gesture: 'scale-small', priority: 5 };
  if (/^(precisely|exactly|specific|precision|exact|bilkul|theek|exactamente|preciso|precisa|específico|especifico)$/.test(token)) return { gesture: 'pinch', emotion: 'focused', priority: 7 };
  if (/^(why|think|thinking|wonder|question|kyun|kyon|kaise|kya|socho|sawal|sawaal|porqué|porque|cómo|como|piensa|pensar|pregunta)$/.test(token) || /^(qué|que)$/.test(token) && /\bpor\b/.test(near)) return { gesture: 'thinking', emotion: 'curious', priority: 7 };
  if (/^(must|important|never|essential|zaroor|zarur|lazmi|ahm|yaad|debe|debes|importante|nunca|esencial)$/.test(token)) return { gesture: 'chop', emotion: 'confident', priority: 7 };
  if (/^(authority|confident|confidence|strategy|trust|believe|sure|bharosa|yaqeen|yakeen|confianza|seguro|segura|cree|creer|estrategia)$/.test(token)) return { gesture: 'steeple', emotion: 'confident', priority: 7 };
  if (/^(happy|happiness|great|awesome|amazing|love|lovely|beautiful|khushi|khush|acha|accha|badhiya|zabardast|pyar|pyaar|sundar|mubarak|feliz|alegría|alegria|genial|increíble|increible|amor|hermoso|hermosa|bueno|buena)$/.test(token)) return { gesture: 'open-palms', emotion: 'warm', priority: 7 };
  if (/^(wow|suddenly|surprise|surprised|shocked|danger|unexpected|achanak|hairan|khatra|sorpresa|sorprendido|sorprendida|peligro|repente|inesperado)$/.test(token)) return { gesture: 'stop', emotion: 'shock', priority: 9 };
  if (/^(wrong|problem|issue|angry|hate|nahi|nahin|galat|masla|mushkil|ghussa|gussa|mal|problema|error|enojado|enojada|odio|no)$/.test(token)) return { gesture: 'chop', emotion: 'focused', priority: 7 };
  if (/^(bye|goodbye|thanks|thankyou|shukriya|allahhafiz|khudahafiz|dhanyavaad|dhanyavad|adiós|adios|gracias)$/.test(token)) return { gesture: 'wave', emotion: 'warm', priority: 7 };
  if (/^(you|your|aap|tum|tu|tú|usted|ustedes)$/.test(token) && !/\b(upper|above|upar|arriba|superior)\b/.test(near)) return { gesture: 'point-front', priority: 3 };
  if (/^(explain|explaining|present|presenter|gesture|talk|samjha|samjhao|batao|bol|explicar|explica|presentar|hablar)$/.test(token)) return { gesture: 'open-palms', priority: 4 };
  // Arabic and Urdu use U+061F, so an ASCII-only check missed every Urdu question.
  if (/[?؟]$/.test(raw)) return { gesture: 'thinking', emotion: 'curious', priority: 7 };
  if (/!+$/.test(raw)) return { emotion: 'confident', priority: 4 };
  return null;
}

function emotionForText(text) {
  const tokens = splitWords(text).map(clean);
  const value = tokens.join(' ');
  for (const token of tokens) {
    const aliasEmotion = ALIAS_EMOTION_INDEX.get(token);
    if (aliasEmotion) return aliasEmotion;
  }
  if (/\b(stop|stopped|halt|ruko|roko|achanak|hairan|khatra|wow|surprise|danger|alto|detente|sorpresa|peligro|repente)\b/.test(value)) return 'shock';
  if (/\b(sad|sadness|heartbreaking|dukh|dukhi|udaas|udas|afsos|rona|triste|tristeza|dolor|llorar)\b/.test(value)) return 'sad';
  if (/[?؟]|\b(why|question|kyun|kyon|kaise|kya|sawal|sawaal|porqué|porque|cómo|como|pregunta)\b/.test(String(text).toLowerCase())) return 'curious';
  if (/\b(hi|hello|welcome|salam|salaam|namaste|khush|khushi|zabardast|pyar|pyaar|shukriya|hola|bienvenido|feliz|alegría|alegria|genial|amor|gracias)\b/.test(value)) return 'warm';
  if (/\b(wrong|problem|issue|nahi|nahin|galat|masla|mushkil|ghussa|gussa|mal|problema|error|enojado|odio)\b/.test(value)) return 'focused';
  if (/\b(must|important|essential|zaroor|zarur|lazmi|ahm|yaqeen|yakeen|bharosa|debe|importante|esencial|confianza|seguro)\b/.test(value)) return 'confident';
  return 'neutral';
}

function isPhraseBoundary(words, index) {
  const token = clean(words[index]?.word ?? '');
  const previous = String(words[index - 1]?.word ?? '');
  return /[.!?;,:]$/.test(previous) || /^(and|but|then|so|because|aur|lekin|phir|magar|kyunki|y|pero|entonces|porque)$/.test(token);
}

function preferredBoundary(target, minimum, maximum, words) {
  const candidates = words
    .map((word, index) => ({ time: word.start, phrase: isPhraseBoundary(words, index) }))
    .filter(candidate => candidate.time >= minimum && candidate.time <= maximum);
  if (!candidates.length) return Math.min(maximum, Math.max(minimum, target));
  candidates.sort((left, right) => {
    const leftScore = Math.abs(left.time - target) - (left.phrase ? 0.45 : 0);
    const rightScore = Math.abs(right.time - target) - (right.phrase ? 0.45 : 0);
    return leftScore - rightScore || left.time - right.time;
  });
  return candidates[0].time;
}

function buildSemanticAnchors(words, duration) {
  let currentGesture = 'open-palms';
  let currentEmotion = 'neutral';
  const events = [];
  for (let index = 0; index < words.length; index++) {
    const raw = String(words[index].word);
    const token = clean(raw);
    const near = words.slice(Math.max(0, index - 5), index + 4).map(word => clean(word.word)).join(' ');
    const semantic = semanticCue(token, raw, near);
    if (!semantic) continue;
    currentGesture = semantic.preserveDirection && currentGesture === 'directional' ? currentGesture : semantic.gesture ?? currentGesture;
    currentEmotion = semantic.emotion ?? (/\?$/.test(raw) ? 'curious' : /!+$/.test(raw) ? (semantic.gesture === 'stop' ? 'shock' : 'confident') : currentEmotion);
    events.push({
      desiredStart: words[index].start,
      pair: { gesture: currentGesture, emotion: currentEmotion },
      priority: semantic.priority,
    });
  }

  const anchors = [{ desiredStart: 0, pair: { gesture: 'open-palms', emotion: 'neutral' }, priority: 0 }];
  for (const event of events) {
    const last = anchors.at(-1);
    if (samePair(last.pair, event.pair)) continue;
    if (event.desiredStart - last.desiredStart < 1 - 1e-8) {
      if (event.priority > last.priority) {
        last.pair = event.pair;
        last.priority = event.priority;
        if (anchors.length > 1 && samePair(anchors.at(-2).pair, last.pair)) anchors.pop();
      }
      continue;
    }
    anchors.push(event);
  }

  const maximumSegments = duration < 1 ? 1 : Math.max(1, Math.floor(duration + 1e-8));
  while (anchors.length > maximumSegments) {
    let removeAt = 0;
    for (let index = 1; index < anchors.length; index++) {
      if (anchors[index].priority < anchors[removeAt].priority) removeAt = index;
    }
    anchors.splice(removeAt, 1);
  }
  for (let index = 1; index < anchors.length;) {
    if (samePair(anchors[index - 1].pair, anchors[index].pair)) anchors.splice(index, 1);
    else index++;
  }
  anchors[0].desiredStart = 0;

  for (const anchor of anchors) anchor.start = anchor.desiredStart;
  for (let index = anchors.length - 1; index > 0; index--) {
    anchors[index].start = Math.min(anchors[index].desiredStart, duration - (anchors.length - index));
  }
  anchors[0].start = 0;
  for (let index = anchors.length - 1; index > 0; index--) {
    const maximum = (anchors[index + 1]?.start ?? duration) - 1;
    const minimum = anchors[index - 1].start + 1;
    if (Math.abs(anchors[index].start - anchors[index].desiredStart) > 1e-8) {
      anchors[index].start = preferredBoundary(anchors[index].start, minimum, maximum, words);
    }
  }
  return anchors;
}

function addCadenceSegments(anchors, duration, words) {
  const segments = [];
  for (let index = 0; index < anchors.length; index++) {
    const anchor = anchors[index];
    const intervalEnd = anchors[index + 1]?.start ?? duration;
    segments.push({ start: anchor.start, pair: anchor.pair });
    const parts = Math.ceil((intervalEnd - anchor.start) / 5);
    let previous = anchor.start;
    for (let part = 1; part < parts; part++) {
      const remaining = parts - part;
      const target = anchor.start + (intervalEnd - anchor.start) * part / parts;
      const minimum = Math.max(previous + 1, intervalEnd - remaining * 5);
      const maximum = Math.min(previous + 5, intervalEnd - remaining);
      const start = preferredBoundary(target, minimum, maximum, words);
      segments.push({ start, pair: null });
      previous = start;
    }
  }
  return segments;
}

function wordsInInterval(words, start, end) {
  return words.filter(word => word.start >= start - 1e-8 && word.start < end - 1e-8).map(word => word.word).join(' ');
}

function assignFallbackPairs(segments, duration, words) {
  let fallbackIndex = 0;
  for (let index = 0; index < segments.length; index++) {
    if (segments[index].pair) continue;
    const end = segments[index + 1]?.start ?? duration;
    const emotion = emotionForText(wordsInInterval(words, segments[index].start, end));
    const previous = segments[index - 1]?.pair;
    const next = segments.slice(index + 1).find(segment => segment.pair)?.pair;
    for (let offset = 0; offset < fallbackGestures.length; offset++) {
      const gesture = fallbackGestures[(fallbackIndex + offset) % fallbackGestures.length];
      const candidate = { gesture, emotion };
      if (!samePair(previous, candidate) && !samePair(next, candidate)) {
        segments[index].pair = candidate;
        fallbackIndex = (fallbackIndex + offset + 1) % fallbackGestures.length;
        break;
      }
    }
  }
  return segments;
}

function enforceFullCadenceChanges(segments) {
  for (let index = 1; index < segments.length; index++) {
    const previous = segments[index - 1].pair;
    const current = segments[index].pair;
    if (current.gesture === previous.gesture) {
      for (let offset = 0; offset < fallbackGestures.length; offset++) {
        const candidate = fallbackGestures[(index + offset) % fallbackGestures.length];
        if (candidate !== previous.gesture && candidate !== segments[index + 1]?.pair?.gesture) {
          current.gesture = candidate;
          break;
        }
      }
    }
    if (current.emotion === previous.emotion) {
      const start = cadenceEmotions.indexOf(current.emotion);
      for (let offset = 1; offset < cadenceEmotions.length; offset++) {
        const candidate = cadenceEmotions[(Math.max(0, start) + offset) % cadenceEmotions.length];
        if (candidate !== previous.emotion && candidate !== segments[index + 1]?.pair?.emotion) {
          current.emotion = candidate;
          break;
        }
      }
    }
  }
  return segments;
}

export function createGesturePlan({ text = '', words: timed, duration } = {}) {
  const transcript = String(text).trim();
  let parsed;
  if (timed !== undefined && timed !== null && timed !== '') parsed = parseTimedTranscript(timed);
  const tokens = parsed?.words ?? splitWords(transcript).map(word => ({ word }));
  if (!tokens.length) throw new Error('Supply a script or a timed transcript.');
  duration ??= parsed ? parsed.words.at(-1).end : Math.max(2, tokens.length / 2.6);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Narration duration must be positive and finite.');
  if (parsed && parsed.words.at(-1).end > duration + 0.05) throw new Error('Transcript ends beyond the supplied narration duration.');
  const words = parsed ? parsed.words : tokens.map((token, index) => ({ ...token, start: index * duration / tokens.length, end: (index + 1) * duration / tokens.length }));
  const segments = enforceFullCadenceChanges(assignFallbackPairs(addCadenceSegments(buildSemanticAnchors(words, duration), duration, words), duration, words));
  const gestureCues = segments.map((segment, index) => {
    const end = segments[index + 1]?.start ?? duration;
    return { start: segment.start, end, ...segment.pair, text: wordsInInterval(words, segment.start, end) };
  });
  return {
    duration,
    transcript: transcript || words.map(word => word.word).join(' '),
    timingBasis: parsed?.timingBasis ?? 'estimated',
    gestureCues: validateActionCues(gestureCues, duration),
    emotionCues: gestureCues.map(({ start, end, emotion }) => ({ start, end, emotion })),
  };
}
