/**
 * Script conversion for Hinglish, Roman Urdu and Urdu script -> Devanagari.
 *
 * Why this exists: Edge TTS Hindi voices (`hi-IN-*`) only pronounce Devanagari
 * correctly. A creator who writes "assalamualaikum dosto" or "السلام علیکم دوستو"
 * gets an English-accented mess. This module turns either into Devanagari so the
 * same script can be voiced by a Hindi voice, and so the creator can proofread
 * the result before rendering.
 *
 * Design: a curated lexicon handles the high-frequency words where spelling is
 * genuinely ambiguous, and a deterministic rule engine handles everything else.
 * Urdu script is an abjad (short vowels are unwritten), so it leans harder on the
 * lexicon; Roman input is mostly recoverable by rules.
 */

const DEVANAGARI_CHAR = /[\u0900-\u097F]/u;
const ARABIC_CHAR = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/u;
const LATIN_CHAR = /[A-Za-z]/;

/** Independent vowel forms, and the matra each becomes after a consonant. */
const MATRA = Object.freeze({
  'अ': '', 'आ': 'ा', 'इ': 'ि', 'ई': 'ी', 'उ': 'ु',
  'ऊ': 'ू', 'ए': 'े', 'ऐ': 'ै', 'ओ': 'ो', 'औ': 'ौ',
});

/**
 * Roman graphemes -> Devanagari, longest first so "chh" wins over "ch".
 * `type` decides whether the renderer emits a consonant (with virama joining)
 * or a vowel (as an independent form or a matra).
 */
const ROMAN_PHONEMES = Object.freeze([
  // Consonant digraphs and clusters
  ['chh', 'छ', 'C'], ['ksh', 'क्ष', 'C'], ['shr', 'श्र', 'C'],
  ['kh', 'ख', 'C'], ['gh', 'घ', 'C'], ['ch', 'च', 'C'], ['jh', 'झ', 'C'],
  ['th', 'थ', 'C'], ['dh', 'ध', 'C'], ['ph', 'फ', 'C'], ['bh', 'भ', 'C'],
  ['sh', 'श', 'C'], ['zh', 'झ़', 'C'], ['rh', 'ढ़', 'C'],
  // Vowels, longest first
  ['aa', 'आ', 'V'], ['ee', 'ई', 'V'], ['ii', 'ई', 'V'], ['oo', 'ऊ', 'V'],
  ['uu', 'ऊ', 'V'], ['ai', 'ऐ', 'V'], ['au', 'औ', 'V'], ['ou', 'औ', 'V'],
  ['oa', 'ओ', 'V'], ['ie', 'ई', 'V'], ['ei', 'ऐ', 'V'], ['ae', 'ए', 'V'],
  // Consonants
  ['b', 'ब', 'C'], ['c', 'क', 'C'], ['d', 'द', 'C'], ['f', 'फ़', 'C'],
  ['g', 'ग', 'C'], ['h', 'ह', 'C'], ['j', 'ज', 'C'], ['k', 'क', 'C'],
  ['l', 'ल', 'C'], ['m', 'म', 'C'], ['n', 'न', 'C'], ['p', 'प', 'C'],
  ['q', 'क़', 'C'], ['r', 'र', 'C'], ['s', 'स', 'C'], ['t', 'त', 'C'],
  ['v', 'व', 'C'], ['w', 'व', 'C'], ['x', 'क्स', 'C'], ['y', 'य', 'C'],
  ['z', 'ज़', 'C'],
  // Vowels
  ['a', 'अ', 'V'], ['e', 'ए', 'V'], ['i', 'इ', 'V'], ['o', 'ओ', 'V'], ['u', 'उ', 'V'],
]);

/** Word endings where Roman "n" is really nasalisation, not a consonant. */
const NASAL_SUFFIXES = Object.freeze([
  ['ein', 'ें'], ['ain', 'ैं'], ['on', 'ों'], ['un', 'ूं'], ['in', 'ीं'], ['an', 'ां'],
]);

/** Consonants that turn a preceding n/m into anusvara: "andar" -> अंदर. */
const ANUSVARA_BEFORE = 'kgcjtdpbs';

/**
 * High-frequency words where a rule engine guesses wrong. Kept lowercase.
 * Anything absent still converts; this is quality, not coverage.
 */
const ROMAN_LEXICON = Object.freeze({
  // Greetings, politeness, discourse markers
  assalamualaikum: 'अस्सलामुअलैकुम', assalamu: 'अस्सलामु', alaikum: 'अलैकुम',
  salam: 'सलाम', namaste: 'नमस्ते', namaskar: 'नमस्कार', shukriya: 'शुक्रिया',
  dhanyavad: 'धन्यवाद', dhanyawad: 'धन्यवाद', khuda: 'ख़ुदा', hafiz: 'हाफ़िज़',
  hello: 'हैलो', ji: 'जी', haan: 'हाँ', han: 'हाँ', nahi: 'नहीं', nahin: 'नहीं',
  na: 'ना', kya: 'क्या', kyun: 'क्यों', kyon: 'क्यों', kaise: 'कैसे',
  kahan: 'कहाँ', kab: 'कब', kaun: 'कौन', kyunki: 'क्योंकि', lekin: 'लेकिन',
  magar: 'मगर', par: 'पर', aur: 'और', ya: 'या', bhi: 'भी', hi: 'ही',
  to: 'तो', ab: 'अब', phir: 'फिर', fir: 'फिर', ye: 'ये', yeh: 'ये', yah: 'यह',
  woh: 'वो', wo: 'वो', voh: 'वो', hum: 'हम', ham: 'हम', aap: 'आप', tum: 'तुम',
  main: 'मैं', mein: 'में', mai: 'मैं', mujhe: 'मुझे', tumhe: 'तुम्हें',
  aapko: 'आपको', usko: 'उसको', unko: 'उनको', humein: 'हमें', hamara: 'हमारा',
  hamari: 'हमारी', hamare: 'हमारे', aapka: 'आपका', aapki: 'आपकी', aapke: 'आपके',
  tera: 'तेरा', meri: 'मेरी', mera: 'मेरा', mere: 'मेरे', apna: 'अपना',
  apni: 'अपनी', apne: 'अपने', sab: 'सब', sabhi: 'सभी', kuch: 'कुछ', kuchh: 'कुछ',
  koi: 'कोई', koyi: 'कोई', sabse: 'सबसे',

  // Degree, evaluation, emphasis
  bahut: 'बहुत', bohat: 'बहुत', bohot: 'बहुत', zyada: 'ज़्यादा', ziada: 'ज़्यादा',
  kam: 'कम', thoda: 'थोड़ा', thodi: 'थोड़ी', thode: 'थोड़े', bada: 'बड़ा',
  badi: 'बड़ी', bade: 'बड़े', chhota: 'छोटा', chhoti: 'छोटी', chhote: 'छोटे',
  accha: 'अच्छा', acha: 'अच्छा', achha: 'अच्छा', acchi: 'अच्छी', achhi: 'अच्छी',
  theek: 'ठीक', thik: 'ठीक', sahi: 'सही', galat: 'ग़लत', bilkul: 'बिल्कुल',
  zaroor: 'ज़रूर', jaroor: 'ज़रूर', zaruri: 'ज़रूरी', zaroori: 'ज़रूरी',
  lazmi: 'लाज़िमी', ahem: 'अहम', mumkin: 'मुमकिन', mushkil: 'मुश्किल',
  asaan: 'आसान', aasan: 'आसान', sach: 'सच', jhooth: 'झूठ', sachchai: 'सच्चाई',
  bekar: 'बेकार', shandar: 'शानदार', zabardast: 'ज़बरदस्त', kamaal: 'कमाल',

  // Family and people
  baat: 'बात', bat: 'बात', baatein: 'बातें', baaton: 'बातों', cheez: 'चीज़',
  cheezein: 'चीज़ें', log: 'लोग', logon: 'लोगों', aadmi: 'आदमी', bacha: 'बच्चा',
  bachcha: 'बच्चा', bacche: 'बच्चे', bachon: 'बच्चों', maa: 'माँ', maan: 'माँ',
  ammi: 'अम्मी', abbu: 'अब्बू', bhai: 'भाई', behan: 'बहन', dost: 'दोस्त',
  dosto: 'दोस्तो', doston: 'दोस्तों', dosti: 'दोस्ती', logon: 'लोगों',

  // Time
  waqt: 'वक़्त', samay: 'समय', din: 'दिन', raat: 'रात', subah: 'सुबह',
  shaam: 'शाम', aaj: 'आज', kal: 'कल', abhi: 'अभी', hamesha: 'हमेशा',
  kabhi: 'कभी', pehle: 'पहले', pehla: 'पहला', pehli: 'पहली', pehli: 'पहली',
  baad: 'बाद', saath: 'साथ', bina: 'बिना', liye: 'लिए', saal: 'साल',
  mahina: 'महीना', hafta: 'हफ़्ता', ghanta: 'घंटा', minute: 'मिनट',
  second: 'सेकंड', umar: 'उम्र', bachpan: 'बचपन', jawani: 'जवानी',

  // Verbs, common conjugations
  karna: 'करना', karta: 'करता', karti: 'करती', karte: 'करते', kar: 'कर',
  kiya: 'किया', ki: 'की', ka: 'का', ke: 'के', hua: 'हुआ', hui: 'हुई',
  hue: 'हुए', hota: 'होता', hoti: 'होती', hote: 'होते', hai: 'है', hain: 'हैं',
  tha: 'था', thi: 'थी', the: 'थे', hoga: 'होगा', hogi: 'होगी', honge: 'होंगे',
  gaya: 'गया', gayi: 'गई', gaye: 'गए', raha: 'रहा', rahi: 'रही', rahe: 'रहे',
  sakta: 'सकता', sakti: 'सकती', sakte: 'सकते', chahiye: 'चाहिए',
  milega: 'मिलेगा', milegi: 'मिलेगी', mile: 'मिले', milta: 'मिलता',
  aata: 'आता', aati: 'आती', aate: 'आते', aana: 'आना', aaya: 'आया', aayi: 'आई',
  jaana: 'जाना', jata: 'जाता', jati: 'जाती', jate: 'जाते', ja: 'जा',
  chalo: 'चलो', chalein: 'चलें', chal: 'चल', dekho: 'देखो', dekh: 'देख',
  dekha: 'देखा', dekhi: 'देखी', dekhe: 'देखे', dekhna: 'देखना', dekhte: 'देखते',
  suno: 'सुनो', sun: 'सुन', suna: 'सुना', suni: 'सुनी', bolo: 'बोलो',
  bol: 'बोल', bola: 'बोला', bolna: 'बोलना', bolte: 'बोलते', kehte: 'कहते',
  kehta: 'कहता', kehti: 'कहती', kehna: 'कहना', kaha: 'कहा', samjho: 'समझो',
  samajh: 'समझ', samajhte: 'समझते', samajhna: 'समझना', samjha: 'समझा',
  samjhao: 'समझाओ', jao: 'जाओ', aao: 'आओ', lo: 'लो', do: 'दो', de: 'दे',
  le: 'ले', batao: 'बताओ', bata: 'बता', bataya: 'बताया', poochho: 'पूछो',
  poochh: 'पूछ', pucho: 'पूछो', socho: 'सोचो', soch: 'सोच', socha: 'सोचा',
  yaad: 'याद', bhool: 'भूल', jaan: 'जान', jaante: 'जानते', jaanta: 'जानता',
  jaanti: 'जानती', pata: 'पता', maloom: 'मालूम', matlab: 'मतलब',
  liya: 'लिया', diya: 'दिया', di: 'दी', dena: 'देना', lena: 'लेना',
  deta: 'देता', deti: 'देती', dete: 'देते', rakhna: 'रखना', rakhein: 'रखें',
  karein: 'करें', karo: 'करो', kare: 'करे', karenge: 'करेंगे', karega: 'करेगा',
  beta: 'बेटा', beti: 'बेटी', use: 'यूज़', user: 'यूज़र', users: 'यूज़र्स',
  hoga: 'होगा', hota: 'होता', denge: 'देंगे', lenge: 'लेंगे',

  // Space, direction, place
  tarah: 'तरह', tarika: 'तरीका', tareeqa: 'तरीक़ा', zariye: 'ज़रिए',
  aage: 'आगे', peeche: 'पीछे', upar: 'ऊपर', neeche: 'नीचे', andar: 'अंदर',
  bahar: 'बाहर', saamne: 'सामने', paas: 'पास', door: 'दूर', yahan: 'यहाँ',
  wahan: 'वहाँ', idhar: 'इधर', udhar: 'उधर', jahan: 'जहाँ', kahin: 'कहीं',
  ghar: 'घर', kaam: 'काम', sheher: 'शहर', gaon: 'गाँव', mulk: 'मुल्क',
  desh: 'देश', duniya: 'दुनिया', dunya: 'दुनिया', zindagi: 'ज़िंदगी',

  // Money, work, aspiration
  paisa: 'पैसा', paise: 'पैसे', naukri: 'नौकरी', job: 'जॉब', mehnat: 'मेहनत',
  kamyabi: 'कामयाबी', kamyab: 'कामयाब', nakaam: 'नाकाम', umeed: 'उम्मीद',
  asha: 'आशा', khwab: 'ख़्वाब', sapna: 'सपना', soch: 'सोच', dimaag: 'दिमाग़',
  dil: 'दिल', aankh: 'आँख', aankhen: 'आँखें', haath: 'हाथ', pair: 'पैर',
  sar: 'सर', chehra: 'चेहरा', shakal: 'शक्ल', awaaz: 'आवाज़', zubaan: 'ज़ुबान',
  bhasha: 'भाषा', sawal: 'सवाल', jawab: 'जवाब', baat: 'बात',

  // Places, languages, institutions
  hindi: 'हिंदी', urdu: 'उर्दू', english: 'अंग्रेज़ी', angrezi: 'अंग्रेज़ी',
  pakistan: 'पाकिस्तान', hindustan: 'हिंदुस्तान', india: 'इंडिया',
  bharat: 'भारत', school: 'स्कूल', college: 'कॉलेज', university: 'यूनिवर्सिटी',
  teacher: 'टीचर', student: 'स्टूडेंट',

  // Technology and business vocabulary used in Hinglish speech
  technology: 'टेक्नोलॉजी', computer: 'कंप्यूटर', internet: 'इंटरनेट',
  mobile: 'मोबाइल', phone: 'फ़ोन', video: 'वीडियो', photo: 'फ़ोटो', app: 'ऐप',
  software: 'सॉफ़्टवेयर', website: 'वेबसाइट', data: 'डेटा', digital: 'डिजिटल',
  online: 'ऑनलाइन', offline: 'ऑफ़लाइन', company: 'कंपनी',
  companies: 'कंपनियाँ', business: 'बिज़नेस', market: 'मार्केट',
  kaarobar: 'कारोबार', number: 'नंबर', percent: 'प्रतिशत',
  pratishat: 'प्रतिशत', problem: 'प्रॉब्लम', system: 'सिस्टम',
  service: 'सर्विस', product: 'प्रोडक्ट', customer: 'कस्टमर', brand: 'ब्रांड',
  youtube: 'यूट्यूब', facebook: 'फ़ेसबुक', instagram: 'इंस्टाग्राम',
  whatsapp: 'व्हाट्सऐप', google: 'गूगल', microsoft: 'माइक्रोसॉफ़्ट',
  apple: 'एप्पल', android: 'एंड्रॉइड', windows: 'विंडोज़',
});

/** Acronyms that must be spelled out in Devanagari for a Hindi voice. */
const ACRONYMS = Object.freeze({
  ai: 'एआई', api: 'एपीआई', seo: 'एसईओ', app: 'ऐप', url: 'यूआरएल',
  ui: 'यूआई', ux: 'यूएक्स', gpt: 'जीपीटी', llm: 'एलएलएम', tts: 'टीटीएस',
  seo: 'एसईओ', sme: 'एसएमई', gdp: 'जीडीपी', ceo: 'सीईओ', it: 'आईटी',
});

/**
 * Urdu letter -> Devanagari. `ھ` is handled as an aspiration digraph before this
 * table is consulted, so it is absent here.
 */
const URDU_LETTERS = Object.freeze({
  'آ': 'आ', 'ا': '', 'ب': 'ब', 'پ': 'प', 'ت': 'त', 'ٹ': 'ट', 'ث': 'स',
  'ج': 'ज', 'چ': 'च', 'ح': 'ह', 'خ': 'ख़', 'د': 'द', 'ڈ': 'ड', 'ذ': 'ज़',
  'ر': 'र', 'ڑ': 'ड़', 'ز': 'ज़', 'ژ': 'झ़', 'س': 'स', 'ش': 'श', 'ص': 'स',
  'ض': 'ज़', 'ط': 'त', 'ظ': 'ज़', 'ع': '', 'غ': 'ग़', 'ف': 'फ़', 'ق': 'क़',
  'ک': 'क', 'ك': 'क', 'گ': 'ग', 'ل': 'ल', 'م': 'म', 'ن': 'न', 'ں': 'ं',
  'و': 'ो', 'ہ': 'ह', 'ه': 'ह', 'ی': 'ी', 'ي': 'ी', 'ے': 'े', 'ء': '',
  'ئ': 'य', 'ؤ': 'व', 'ۓ': 'ए', 'ۃ': 'ा',
});

const URDU_ASPIRATES = Object.freeze({
  'ب': 'भ', 'پ': 'फ', 'ت': 'थ', 'ٹ': 'ठ', 'د': 'ध', 'ڈ': 'ढ', 'ک': 'ख',
  'ك': 'ख', 'گ': 'घ', 'چ': 'छ', 'ج': 'झ', 'ر': 'र्ह', 'ل': 'ल्ह', 'م': 'म्ह', 'ن': 'न्ह',
});

const URDU_DIACRITICS = Object.freeze({
  '\u064E': 'ा', // fatha
  '\u0650': 'ि', // kasra
  '\u064F': 'ु', // damma
  '\u0652': '्', // sukun
  '\u0651': '', // shadda, handled by doubling
  '\u064B': 'ं', // fathatan
  '\u064D': 'ं', // kasratan
  '\u064C': 'ं', // dammatan
});

/** Common Urdu words whose short vowels are unwritten and unrecoverable by rule. */
const URDU_LEXICON = Object.freeze({
  'السلام': 'अस्सलाम', 'علیکم': 'अलैकुम', 'سلام': 'सलाम', 'شکریہ': 'शुक्रिया',
  'خدا': 'ख़ुदा', 'حافظ': 'हाफ़िज़', 'دوستو': 'दोस्तो', 'دوستوں': 'दोस्तों',
  'دوست': 'दोस्त', 'دوستی': 'दोस्ती', 'آج': 'आज', 'ہم': 'हम', 'بات': 'बात',
  'کریں': 'करें', 'کریں گے': 'करेंगे', 'گے': 'गे', 'میں': 'में', 'میں نے': 'मैंने',
  'یہ': 'यह', 'وہ': 'वो', 'ہے': 'है', 'ہیں': 'हैं', 'تھا': 'था', 'تھی': 'थी',
  'تھے': 'थे', 'نہیں': 'नहीं', 'کیا': 'क्या', 'کیوں': 'क्यों', 'کیسے': 'कैसे',
  'کہاں': 'कहाँ', 'کب': 'कब', 'کون': 'कौन', 'لیکن': 'लेकिन', 'مگر': 'मगर',
  'اور': 'और', 'یا': 'या', 'بھی': 'भी', 'ہی': 'ही', 'تو': 'तो', 'اب': 'अब',
  'پھر': 'फिर', 'آپ': 'आप', 'تم': 'तुम', 'مجھے': 'मुझे', 'ہمیں': 'हमें',
  'انہیں': 'उन्हें', 'اسے': 'उसे', 'ہمارا': 'हमारा', 'ہماری': 'हमारी',
  'ہمارے': 'हमारे', 'آپ کا': 'आपका', 'آپ کی': 'आपकी', 'آپ کے': 'आपके',
  'سب': 'सब', 'کچھ': 'कुछ', 'کوئی': 'कोई', 'بہت': 'बहुत', 'زیادہ': 'ज़्यादा',
  'کم': 'कम', 'تھوڑا': 'थोड़ा', 'بڑا': 'बड़ा', 'بڑی': 'बड़ी', 'چھوٹا': 'छोटा',
  'اچھا': 'अच्छा', 'اچھی': 'अच्छी', 'ٹھیک': 'ठीक', 'صحیح': 'सही', 'غلط': 'ग़लत',
  'بالکل': 'बिल्कुल', 'ضرور': 'ज़रूर', 'ضروری': 'ज़रूरी', 'اہم': 'अहम',
  'ممکن': 'मुमकिन', 'مشکل': 'मुश्किल', 'آسان': 'आसान', 'سچ': 'सच',
  'جھوٹ': 'झूठ', 'زندگی': 'ज़िंदगी', 'دنیا': 'दुनिया', 'لوگ': 'लोग',
  'لوگوں': 'लोगों', 'آدمی': 'आदमी', 'بچہ': 'बच्चा', 'بچے': 'बच्चे',
  'ماں': 'माँ', 'امی': 'अम्मी', 'ابو': 'अब्बू', 'بھائی': 'भाई', 'بہن': 'बहन',
  'وقت': 'वक़्त', 'دن': 'दिन', 'رات': 'रात', 'صبح': 'सुबह', 'شام': 'शाम',
  'کل': 'कल', 'ابھی': 'अभी', 'ہمیشہ': 'हमेशा', 'کبھی': 'कभी', 'پہلے': 'पहले',
  'پہلا': 'पहला', 'پہلی': 'पहली', 'بعد': 'बाद', 'ساتھ': 'साथ', 'بغیر': 'बिना',
  'لیے': 'लिए', 'سال': 'साल', 'مہینہ': 'महीना', 'ہفتہ': 'हफ़्ता',
  'گھر': 'घर', 'کام': 'काम', 'شہر': 'शहर', 'گاؤں': 'गाँव', 'ملک': 'मुल्क',
  'دیش': 'देश', 'پیسہ': 'पैसा', 'پیسے': 'पैसे', 'نوکری': 'नौकरी',
  'محنت': 'मेहनत', 'کامیابی': 'कामयाबी', 'کامیاب': 'कामयाब', 'امید': 'उम्मीद',
  'خواب': 'ख़्वाब', 'سپنا': 'सपना', 'سوچ': 'सोच', 'دماغ': 'दिमाग़',
  'دل': 'दिल', 'آنکھ': 'आँख', 'آنکھیں': 'आँखें', 'ہاتھ': 'हाथ', 'پیر': 'पैर',
  'سر': 'सर', 'چہرہ': 'चेहरा', 'شکل': 'शक्ल', 'آواز': 'आवाज़', 'زبان': 'ज़ुबान',
  'بھاشا': 'भाषा', 'سوال': 'सवाल', 'جواب': 'जवाब', 'ہندی': 'हिंदी',
  'اردو': 'उर्दू', 'انگریزی': 'अंग्रेज़ी', 'پاکستان': 'पाकिस्तान',
  'ہندوستان': 'हिंदुस्तान', 'انڈیا': 'इंडिया', 'بھارت': 'भारत',
  'ٹیکنالوجی': 'टेक्नोलॉजी', 'کمپیوٹر': 'कंप्यूटर', 'انٹرنیٹ': 'इंटरनेट',
  'موبائل': 'मोबाइल', 'فون': 'फ़ोन', 'ویڈیو': 'वीडियो', 'فوٹو': 'फ़ोटो',
  'ایپ': 'ऐप', 'ویب سائٹ': 'वेबसाइट', 'ڈیٹا': 'डेटा', 'ڈیجیٹل': 'डिजिटल',
  'آن لائن': 'ऑनलाइन', 'کمپنی': 'कंपनी', 'کمپنیاں': 'कंपनियाँ',
  'بزنس': 'बिज़नेस', 'مارکیٹ': 'मार्केट', 'کاروبار': 'कारोबार',
  'نمبر': 'नंबर', 'فیصد': 'प्रतिशत', 'مسئلہ': 'समस्या', 'مسئلے': 'समस्याएँ',
  'ٹیکنیک': 'तकनीक', 'یاد': 'याद', 'رکھیں': 'रखें', 'بتائیں': 'बताइए',
  'تیزی': 'तेज़ी', 'آئی': 'आई', 'ہے': 'है', 'سمجھتے': 'समझते', 'سمجھ': 'समझ', 'جانتے': 'जानते', 'کر': 'कर',
  'کرنا': 'करना', 'کرتا': 'करता', 'کرتی': 'करती', 'کرتے': 'करते', 'کیا ہے': 'किया है',
  'ہوا': 'हुआ', 'ہوئی': 'हुई', 'ہوتا': 'होता', 'ہوتی': 'होती', 'ہوتے': 'होते',
  'ہوگا': 'होगा', 'ہوگی': 'होगी', 'سکتا': 'सकता', 'سکتی': 'सकती',
  'سکتے': 'सकते', 'چاہیے': 'चाहिए', 'دیکھو': 'देखो', 'دیکھیں': 'देखें',
  'سنو': 'सुनो', 'سنئیے': 'सुनिए', 'بولو': 'बोलो', 'کہو': 'कहो', 'کہتے': 'कहते',
  'سمجھاؤ': 'समझाओ', 'چلو': 'चलो', 'جاؤ': 'जाओ', 'آؤ': 'आओ', 'لو': 'लो',
  'دو': 'दो', 'دے': 'दे', 'لے': 'ले', 'بتاؤ': 'बताओ', 'پوچھو': 'पूछो',
  'سوچو': 'सोचो', 'بھول': 'भूल', 'جان': 'जान', 'پتہ': 'पता', 'معلوم': 'मालूम',
  'مطلب': 'मतलब', 'طرح': 'तरह', 'طریقہ': 'तरीका', 'ذریعے': 'ज़रिए',
  'آگے': 'आगे', 'پیچھے': 'पीछे', 'اوپر': 'ऊपर', 'نیچے': 'नीचे',
  'اندر': 'अंदर', 'باہر': 'बाहर', 'سامنے': 'सामने', 'پاس': 'पास', 'دور': 'दूर',
  'یہاں': 'यहाँ', 'وہاں': 'वहाँ', 'ادھر': 'इधर', 'ادھر': 'उधर', 'جہاں': 'जहाँ',
  'کہیں': 'कहीं', 'اسکول': 'स्कूल', 'کالج': 'कॉलेज', 'یونیورسٹی': 'यूनिवर्सिटी',
  'استاد': 'उस्ताद', 'طالب علم': 'तालिब-ए-इल्म', 'بچپن': 'बचपन',
  'جوانی': 'जवानी', 'عمر': 'उम्र', 'پروگرام': 'प्रोग्राम', 'سسٹم': 'सिस्टम',
  'سروس': 'सर्विस', 'پروڈکٹ': 'प्रोडक्ट', 'کسٹمر': 'कस्टमर', 'برانڈ': 'ब्रांड',
  'یوٹیوب': 'यूट्यूब', 'فیس بک': 'फ़ेसबुक', 'انسٹاگرام': 'इंस्टाग्राम',
  'واٹس ایپ': 'व्हाट्सऐप', 'گوگل': 'गूगल', 'مائیکروسافٹ': 'माइक्रोसॉफ़्ट',
  'ایپل': 'एप्पल', 'اینڈرائیڈ': 'एंड्रॉइड', 'ونڈوز': 'विंडोज़',
  'خوشی': 'ख़ुशी', 'خوش': 'ख़ुश', 'غم': 'ग़म', 'دکھ': 'दुख', 'افسوس': 'अफ़सोस',
  'ماں': 'माँ', 'محبت': 'मोहब्बत', 'پیار': 'प्यार', 'خوبصورت': 'ख़ूबसूरत',
  'مبارک': 'मुबारक', 'اچانک': 'अचानक', 'حیران': 'हैरान', 'خطرہ': 'ख़तरा',
  'رکو': 'रुको', 'اعتماد': 'भरोसा', 'یقین': 'यक़ीन', 'بھروسہ': 'भरोसा',
  'بول': 'बोल', 'بات کریں': 'बात करें', 'بارے': 'बारे',
});

/** Punctuation and digits normalised so a Hindi voice does not stumble. */
const PUNCTUATION = Object.freeze({
  '۔': '.', '؟': '?', '،': ',', '؛': ';', '٪': '%', '؍': '/',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
});

const isDevanagari = char => DEVANAGARI_CHAR.test(char);
const isArabic = char => ARABIC_CHAR.test(char);
const isLatin = char => LATIN_CHAR.test(char);

/**
 * Common English function words. When a Latin script is mostly made of these,
 * the writer pasted English rather than Hinglish, and transliterating it would
 * produce nonsense like "plain" -> "प्लैन". The converter steps aside instead.
 */
const ENGLISH_STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
  'this', 'that', 'these', 'those', 'there', 'here', 'it', 'its', 'we', 'they',
  'you', 'your', 'he', 'she', 'his', 'her', 'our', 'their', 'my', 'me', 'us',
  'and', 'or', 'but', 'if', 'then', 'than', 'so', 'because', 'while', 'when',
  'what', 'which', 'who', 'how', 'why', 'where', 'with', 'without', 'from',
  'to', 'of', 'in', 'on', 'at', 'by', 'for', 'about', 'into', 'over', 'under',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could',
  'should', 'may', 'might', 'must', 'not', 'no', 'yes', 'all', 'any', 'some',
  'more', 'most', 'very', 'just', 'also', 'only', 'as', 'up', 'out', 'one',
]);

/** True when the text reads as English prose rather than Hinglish. */
export function looksEnglish(text) {
  const tokens = String(text ?? '').toLowerCase().match(/[a-z]+/g) ?? [];
  if (tokens.length < 4) return false;
  const hits = tokens.filter(token => ENGLISH_STOPWORDS.has(token)).length;
  return hits / tokens.length >= 0.4;
}

/**
 * Classify the writing system of a string.
 * Returns 'devanagari' | 'arabic' | 'latin' | 'mixed' | 'none'.
 */
export function detectScript(text) {
  const counts = { devanagari: 0, arabic: 0, latin: 0 };
  for (const char of String(text ?? '')) {
    if (isDevanagari(char)) counts.devanagari++;
    else if (isArabic(char)) counts.arabic++;
    else if (isLatin(char)) counts.latin++;
  }
  const total = counts.devanagari + counts.arabic + counts.latin;
  if (!total) return 'none';
  const dominant = Object.entries(counts).sort((left, right) => right[1] - left[1])[0];
  if (dominant[1] / total >= 0.85) return dominant[0];
  return 'mixed';
}

/** Detailed script report for the editor UI. */
export function analyze(text) {
  const source = String(text ?? '');
  const counts = { devanagari: 0, arabic: 0, latin: 0 };
  for (const char of source) {
    if (isDevanagari(char)) counts.devanagari++;
    else if (isArabic(char)) counts.arabic++;
    else if (isLatin(char)) counts.latin++;
  }
  const script = detectScript(source);
  const english = script === 'latin' && looksEnglish(source);
  const needsConversion = !english && (script === 'latin' || script === 'arabic' || script === 'mixed');
  return {
    script,
    counts,
    characters: source.length,
    words: source.trim() ? source.trim().split(/\s+/).length : 0,
    needsConversion,
    looksEnglish: english,
    // A Hindi Edge TTS voice reads Devanagari; Urdu voices read the Arabic script.
    recommendedVoice: script === 'arabic' ? 'ur-PK' : 'hi-IN',
  };
}

/** Attach anusvara where Roman "n"/"m" is nasalisation rather than a consonant. */
function nasalise(word) {
  let output = '';
  for (let index = 0; index < word.length; index++) {
    const char = word[index];
    const next = word[index + 1];
    if ((char === 'n' || char === 'm') && next && ANUSVARA_BEFORE.includes(next)) output += '~';
    else output += char;
  }
  return output;
}

/** Render a phoneme list into Devanagari with viramas and matras. */
function renderPhonemes(phonemes) {
  let output = '';
  let previousWasConsonant = false;
  for (const { value, type } of phonemes) {
    if (type === 'N') {
      output += 'ं';
      previousWasConsonant = false;
      continue;
    }
    if (type === 'V') {
      output += previousWasConsonant ? (MATRA[value] ?? value) : value;
      previousWasConsonant = false;
      continue;
    }
    if (previousWasConsonant) output += '्';
    output += value;
    previousWasConsonant = true;
  }
  return output;
}

function tokeniseRoman(word) {
  const phonemes = [];
  let index = 0;
  while (index < word.length) {
    if (word[index] === '~') {
      phonemes.push({ value: 'ं', type: 'N' });
      index++;
      continue;
    }
    let matched = false;
    for (const [roman, value, type] of ROMAN_PHONEMES) {
      if (word.startsWith(roman, index)) {
        phonemes.push({ value, type });
        index += roman.length;
        matched = true;
        break;
      }
    }
    if (!matched) index++;
  }
  return phonemes;
}

/** Rule-based conversion for a single Roman word that the lexicon does not know. */
function convertRomanWord(word) {
  let working = nasalise(word.toLowerCase());

  // A word-final nasal is written with a nasalised matra, not a consonant.
  let nasalTail = '';
  for (const [suffix, matra] of NASAL_SUFFIXES) {
    if (working.endsWith(suffix) && working.length - suffix.length >= 2) {
      // "din" and "man" are real consonant endings, so short words opt out.
      if (suffix === 'in' && working.length <= 3) break;
      working = working.slice(0, -suffix.length);
      nasalTail = matra;
      break;
    }
  }

  const phonemes = tokeniseRoman(working);
  // Roman Urdu writes final -a, -i and -u long, which the inherent vowel loses.
  const last = phonemes.at(-1);
  if (!nasalTail && last?.type === 'V' && last.value === 'अ') last.value = 'आ';
  if (!nasalTail && last?.type === 'V' && last.value === 'इ') last.value = 'ई';
  if (!nasalTail && last?.type === 'V' && last.value === 'उ') last.value = 'ऊ';

  return renderPhonemes(phonemes) + nasalTail;
}

function shouldPreserveLatin(raw) {
  // Mixed-case or digit-bearing tokens are names and versions: "OpenRouter", "GPT-4".
  if (/[0-9]/.test(raw)) return true;
  if (/[a-z][A-Z]|[A-Z][a-z]/.test(raw)) return true;
  // Unknown all-caps tokens are almost always acronyms or brand marks.
  if (raw.length <= 5 && raw === raw.toUpperCase() && raw.length > 1) return true;
  return false;
}

function convertRomanToken(raw) {
  const key = raw.toLowerCase();
  if (Object.hasOwn(ROMAN_LEXICON, key)) return ROMAN_LEXICON[key];
  if (Object.hasOwn(ACRONYMS, key)) return ACRONYMS[key];
  if (shouldPreserveLatin(raw)) return raw;
  return convertRomanWord(raw);
}

/**
 * Convert Roman Urdu / Hinglish / Hindi transliteration to Devanagari.
 * Punctuation, digits and line breaks pass through untouched.
 */
export function romanToDevanagari(text) {
  return String(text ?? '').replace(/[A-Za-z][A-Za-z'’]*/g, token => {
    const [head, ...tail] = token.split(/(['’].*)$/);
    if (!tail.length) return convertRomanToken(token);
    return convertRomanToken(head) + tail.join('');
  });
}

/** Convert one Urdu word using the lexicon, then the letter table. */
function convertUrduWord(word) {
  const key = word.replace(/[\u200c\u200d]/g, '');
  if (Object.hasOwn(URDU_LEXICON, key)) return URDU_LEXICON[key];

  const chars = [...key];
  let output = '';
  let previousWasConsonant = false;
  for (let index = 0; index < chars.length; index++) {
    const char = chars[index];

    if (URDU_DIACRITICS[char] !== undefined) {
      if (char === '\u0651' && previousWasConsonant) {
        // Shadda doubles the previous consonant: "السلام" -> अस्सलाम.
        const lastConsonant = output.at(-1);
        if (lastConsonant) output += '्' + lastConsonant;
      } else if (URDU_DIACRITICS[char]) {
        output += URDU_DIACRITICS[char];
        previousWasConsonant = false;
      }
      continue;
    }

    // Aspiration digraph: پ + ھ -> फ.
    if (chars[index + 1] === 'ھ' && URDU_ASPIRATES[char]) {
      output += (previousWasConsonant ? '्' : '') + URDU_ASPIRATES[char];
      previousWasConsonant = true;
      index++;
      continue;
    }

    if (char === 'ا') {
      const atStart = output.length === 0;
      const next = chars[index + 1];
      if (atStart && (next === 'ے' || next === 'ی')) {
        output += 'ए';
        previousWasConsonant = false;
        index++;
        continue;
      }
      output += atStart ? 'अ' : 'ा';
      previousWasConsonant = false;
      continue;
    }

    const mapped = URDU_LETTERS[char];
    if (mapped === undefined) {
      output += char;
      continue;
    }
    if (mapped === '') {
      previousWasConsonant = false;
      continue;
    }
    if (mapped === 'ं') {
      output += 'ं';
      previousWasConsonant = false;
      continue;
    }
    // Vowel letters (و / ی / ے) are matras and must not take a virama.
    const isMatra = mapped === 'ो' || mapped === 'ी' || mapped === 'े' || mapped === 'ा';
    if (isMatra) {
      output += mapped;
      previousWasConsonant = false;
      continue;
    }
    // Urdu never stacks consonants. Two consonants in a row mean an unwritten
    // short vowel, so Devanagari takes the inherent "a" instead of a virama.
    // Clusters like دوست are supplied by the lexicon above.
    output += mapped;
    previousWasConsonant = true;
  }
  return output;
}

/**
 * Convert Urdu script to Devanagari.
 *
 * Urdu leaves short vowels unwritten, so a letter table alone produces a
 * consonant skeleton. The lexicon supplies the vowels for common words; the rest
 * stays readable but may need a proofread, which is exactly what the editor is for.
 */
export function urduToDevanagari(text) {
  // Urdu punctuation lives inside the Arabic Unicode block, so normalise it
  // before the script split or it stays glued to the last word.
  const normalised = String(text ?? '').replace(/[۔؟،؛٪؍۰-۹]/g, mark => PUNCTUATION[mark] ?? mark);
  return normalised
    .split(/(\s+)/)
    .map(chunk => {
      if (!chunk.trim()) return chunk;
      return chunk
        .split(/([^\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]+)/)
        .map(part => {
          if (!part) return '';
          if (![...part].some(isArabic)) return part;
          return convertUrduWord(part);
        })
        .join('');
    })
    .join('');
}

/** Normalise punctuation in text that is already Devanagari. */
export function tidyDevanagari(text) {
  return String(text ?? '')
    .replace(/[۔؟،؛]/g, mark => PUNCTUATION[mark] ?? mark)
    .replace(/[ \t]{2,}/g, ' ');
}

/**
 * Convert any supported script to Devanagari.
 *
 * Mixed input is converted run by run, so "AI की technology" keeps each part in
 * the right writing system instead of forcing one script on everything.
 */
export function toDevanagari(text, { force = null } = {}) {
  const source = String(text ?? '');
  if (!source.trim()) return source;

  if (force === 'roman') return romanToDevanagari(source);
  if (force === 'urdu') return urduToDevanagari(source);
  if (force === 'devanagari') return tidyDevanagari(source);

  const script = detectScript(source);
  if (script === 'none') return source;
  if (script === 'devanagari') return tidyDevanagari(source);
  if (script === 'latin') return looksEnglish(source) ? source : romanToDevanagari(source);
  if (script === 'arabic') return urduToDevanagari(source);

  // Mixed: convert each run independently and keep the whitespace between them.
  return source
    .split(/(\s+)/)
    .map(chunk => {
      if (!chunk.trim()) return chunk;
      const chunkScript = detectScript(chunk);
      if (chunkScript === 'arabic') return urduToDevanagari(chunk);
      if (chunkScript === 'latin') return romanToDevanagari(chunk);
      if (chunkScript === 'devanagari') return tidyDevanagari(chunk);
      // A token mixing scripts: convert Latin runs, keep Arabic runs as they are.
      return chunk
        .split(/([\u0600-\u06FF\u0750-\u077F]+)/)
        .map(part => (part && isArabic(part[0]) ? urduToDevanagari(part) : romanToDevanagari(part)))
        .join('');
    })
    .join('');
}

// ---------------------------------------------------------------------------
// CLI: node scripts/transliterate.mjs "assalamualaikum dosto"
//      node scripts/transliterate.mjs --file script.txt --out script.devanagari.txt
// ---------------------------------------------------------------------------

async function runCli(argv) {
  const { readFile, writeFile } = await import('node:fs/promises');
  const args = [...argv];
  let force = null;
  let file = null;
  let out = null;
  let asJson = false;
  const words = [];

  while (args.length) {
    const arg = args.shift();
    if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/transliterate.mjs [options] [text...]');
      console.log('  --roman        force Roman transliteration rules');
      console.log('  --urdu         force the Urdu script table');
      console.log('  --file <path>  read text from a UTF-8 file');
      console.log('  --out <path>   write the result instead of printing it');
      console.log('  --json         print the script analysis as JSON');
      return 0;
    }
    if (arg === '--roman') force = 'roman';
    else if (arg === '--urdu') force = 'urdu';
    else if (arg === '--json') asJson = true;
    else if (arg === '--file') file = args.shift();
    else if (arg === '--out') out = args.shift();
    else words.push(arg);
  }

  const source = file ? await readFile(file, 'utf8') : words.join(' ');
  if (!source.trim()) {
    console.error('No text given. Pass a string or --file <path>.');
    return 2;
  }

  const result = toDevanagari(source, { force });
  if (out) {
    await writeFile(out, result, 'utf8');
    console.error(`Wrote ${result.length} characters to ${out}`);
    return 0;
  }
  if (asJson) console.log(JSON.stringify({ ...analyze(source), source, result }, null, 2));
  else console.log(result);
  return 0;
}

const invokedDirectly = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href;
if (invokedDirectly) {
  runCli(process.argv.slice(2)).then(code => process.exit(code)).catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}
