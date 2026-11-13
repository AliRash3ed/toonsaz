// Ports the Forma2D EGM v3.0 character pack into the presenter rig.
//
// Source: forma2d_egm_v3_0_unified_html_css_vector_character_rig_30_hand_gestures_*.html
// Art lives in 240-unit stage space there, so every block is wrapped in the same
// affine transform that lands it on the 1080x1080 presenter canvas:
//   X = 3.6x + 108,  Y = 3.6y + 62.8
//   translate(540 250) scale(3.6) translate(-120 -52)
//
// Run: node scripts/port-forma2d.mjs   (rewrites assets/avatar-forma.js)

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const output = join(here, "..", "assets", "avatar-forma.js");
const SOURCE = "https://forma2d.studio/egm-v3-character-rig";

/* ------------------------------------------------------------------ helpers */

const wrap = (inner) => `<g stroke="none" transform="translate(540 250) scale(3.6) translate(-120 -52)">${
  inner.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => "\n          " + line).join("")
}
        </g>`;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const num = (value) => String(Number(value.toFixed(2)));
const num3 = (value) => String(Number(value.toFixed(3)));
const nr = (value) => Number(value.toFixed(3));

function parse(hex) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
}

function toHex([r, g, b]) {
  return "#" + [r, g, b].map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0")).join("");
}

const mix = (from, to, amount) => {
  const a = parse(from);
  const b = parse(to);
  return toHex(a.map((channel, index) => channel + (b[index] - channel) * amount));
};

const darken = (hex, amount) => mix(hex, "#000000", amount);
const lighten = (hex, amount) => mix(hex, "#ffffff", amount);
const lower = (hex) => hex.toLowerCase();

/* ------------------------------------------------------------ source artwork */

function hairBack(style, hair) {
  if (style === "zara-curls") {
    return `
      <circle cx="62" cy="108" r="20" fill="${hair.hi}" />
      <circle cx="178" cy="108" r="20" fill="${hair.hi}" />
      <circle cx="57" cy="134" r="21" fill="${hair.hi}" />
      <circle cx="183" cy="134" r="21" fill="${hair.hi}" />
      <circle cx="68" cy="154" r="19" fill="${hair.hi}" />
      <circle cx="172" cy="154" r="19" fill="${hair.hi}" />
      <path d="M66,94 C52,114 54,148 74,166 L166,166 C186,148 188,114 174,94 Z" fill="${hair.base}" />
      <path d="M61,130 C55,138 61,148 71,146 M179,130 C185,138 179,148 169,146" stroke="${hair.hi}" stroke-width="3" fill="none" stroke-linecap="round" />`;
  }
  if (style === "zainab-waves") {
    return `
      <path d="M56,84 C38,98 34,128 44,148 C36,164 44,184 68,188 L172,188 C196,184 204,164 196,148 C206,128 202,98 184,84 C176,52 150,34 120,34 C90,34 64,52 56,84 Z" fill="${hair.shade}" />
      <path d="M60,88 C44,104 40,128 50,146 C42,160 50,178 70,182 L170,182 C190,178 198,160 190,146 C200,128 196,104 180,88 C172,58 148,44 120,44 C92,44 68,58 60,88 Z" fill="${hair.base}" />`;
  }
  if (style === "sleek-bob" || style === "asym-bob") {
    return `<path d="M54,72 C44,106 48,154 68,172 L172,172 C192,154 196,106 186,72 Z" fill="${hair.base}" />`;
  }
  if (style === "afro-curls") {
    return `
      <g fill="${hair.shade}">
        <circle cx="58" cy="70" r="27" /><circle cx="182" cy="70" r="27" />
        <circle cx="50" cy="104" r="27" /><circle cx="190" cy="104" r="27" />
        <circle cx="58" cy="138" r="25" /><circle cx="182" cy="138" r="25" />
        <circle cx="88" cy="46" r="29" /><circle cx="152" cy="46" r="29" /><circle cx="120" cy="40" r="31" />
      </g>
      <g fill="${hair.base}">
        <circle cx="62" cy="68" r="24" /><circle cx="178" cy="68" r="24" />
        <circle cx="54" cy="100" r="24" /><circle cx="186" cy="100" r="24" />
        <circle cx="62" cy="134" r="21" /><circle cx="178" cy="134" r="21" />
        <circle cx="90" cy="44" r="26" /><circle cx="150" cy="44" r="26" /><circle cx="120" cy="38" r="28" />
      </g>`;
  }
  if (style === "twin-buns") {
    return `
      <circle cx="54" cy="48" r="21" fill="${hair.base}" />
      <circle cx="186" cy="48" r="21" fill="${hair.shade}" />
      <circle cx="64" cy="58" r="4.5" fill="#FBBF24" /><circle cx="176" cy="58" r="4.5" fill="#FBBF24" />
      <path d="M56,72 C48,106 52,148 70,166 L170,166 C188,148 192,106 184,72 Z" fill="${hair.shade}" />`;
  }
  if (style === "hijab-drape") {
    return `<path d="M58,88 C54,128 64,162 82,174 L158,174 C176,162 186,128 182,88 C178,48 152,34 120,34 C88,34 62,48 58,88 Z" fill="${hair.base}" />`;
  }
  // A bald crown has no mass behind the head at all.
  if (style === "bald-elder") return "";
  // Short styles have no mass behind the head, so they get a thin silhouette rim
  // instead: it keeps the crop readable and still sits behind the face.
  return `<path d="M62 104 C57 55 80 33 122 33 C160 33 183 55 178 104 L62 104 Z" fill="${darken(hair.base, 0.28)}" />`;
}

function hairFront(style, hair) {
  if (style === "spiky-sweep") {
    return `
      <path d="M66 96 C62 56 84 36 122 36 C156 36 178 54 174 90 C168 80 156 80 144 84 C128 89 106 96 88 93 C80 91 72 90 66 96 Z" fill="${hair.base}" />
      <path d="M150 44 C164 50 172 60 174 76 C170 64 160 55 148 50 Z" fill="${hair.hi}" opacity="0.5" />`;
  }
  if (style === "zara-curls") {
    return `
      <path d="M64,92 C60,54 82,34 120,34 C158,34 180,54 176,92 C168,74 148,64 120,64 C92,64 72,74 64,92 Z" fill="${hair.base}" />
      <path d="M70,86 C86,70 116,68 136,76 C120,84 98,88 70,86 Z" fill="${hair.hi}" opacity="0.85" />`;
  }
  if (style === "pompadour") {
    return `
      <rect x="66" y="74" width="11" height="27" rx="5" fill="${hair.shade}" />
      <rect x="163" y="74" width="11" height="27" rx="5" fill="${hair.shade}" />
      <path d="M63,72 C53,52 57,42 69,46 C75,34 102,30 132,31 C166,32 183,48 177,72 C173,80 152,80 120,80 C88,80 67,80 63,72 Z" fill="${hair.base}" />
      <path d="M96,36 C134,34 169,44 169,66 C167,74 155,74 146,72 C152,54 128,42 96,36 Z" fill="${hair.hi}" />`;
  }
  if (style === "zainab-waves") {
    return `
      <path d="M60,88 C56,52 78,28 122,28 C162,28 184,52 180,88 C170,70 154,58 138,48 C118,66 90,78 60,88 Z" fill="${hair.base}" />
      <path d="M74,58 C92,38 122,32 146,40" fill="none" stroke="${hair.hi}" stroke-width="5.5" stroke-linecap="round" opacity="0.65" />`;
  }
  if (style === "twoblock-asian" || style === "comma-perm") {
    return `
      <path d="M62,84 C58,46 82,28 122,28 C160,28 182,46 178,84 C164,68 146,56 128,50 C130,64 122,76 112,82 C116,66 114,54 108,50 C92,58 76,70 62,84 Z" fill="${hair.base}" />
      <path d="M78,44 C98,32 134,32 156,42" fill="none" stroke="${hair.hi}" stroke-width="5" stroke-linecap="round" opacity="0.6" />`;
  }
  if (style === "twin-buns" || style === "sleek-bob" || style === "asym-bob") {
    return `
      <path d="M62,84 C60,46 84,30 120,30 C156,30 180,46 178,84 C160,68 136,62 120,48 C104,62 80,68 62,84 Z" fill="${hair.base}" />
      <path d="M78,44 C102,32 138,32 162,44" fill="none" stroke="${hair.hi}" stroke-width="5" stroke-linecap="round" opacity="0.58" />`;
  }
  if (style === "afro-curls") {
    return `
      <path d="M64,86 C70,56 92,42 120,42 C148,42 170,56 176,86 C166,72 146,64 120,64 C94,64 74,72 64,86 Z" fill="${hair.base}" />
      <path d="M78,58 Q120,44 162,58" fill="none" stroke="${hair.hi}" stroke-width="4.5" stroke-linecap="round" opacity="0.55" />`;
  }
  if (style === "buzz-fade") {
    return `
      <path d="M65,80 C64,44 86,32 120,32 C154,32 176,44 175,80 C168,62 150,56 120,56 C90,56 72,62 65,80 Z" fill="${hair.base}" />
      <path d="M84,42 C106,34 134,34 156,42" fill="none" stroke="${hair.hi}" stroke-width="4.5" stroke-linecap="round" opacity="0.5" />`;
  }
  if (style === "bald-elder") {
    return `
      <rect x="74" y="82" width="7" height="26" rx="3.5" fill="${hair.base}" />
      <rect x="159" y="82" width="7" height="26" rx="3.5" fill="${hair.shade}" />`;
  }
  if (style === "hijab-drape") {
    return `
      <ellipse cx="66" cy="107" rx="7.5" ry="10" fill="${hair.base}" />
      <ellipse cx="174" cy="107" rx="7.5" ry="10" fill="${hair.base}" />
      <path d="M62,92 C62,50 86,34 120,34 C154,34 178,50 178,92 C178,132 158,156 120,158 C82,156 62,132 62,92 Z M73,98 C73,130 92,148 120,148 C148,148 167,130 167,98 C167,70 148,56 120,56 C92,56 73,70 73,98 Z" fill="${hair.base}" fill-rule="evenodd" />
      <path d="M84,144 Q120,162 156,144 L152,176 Q120,190 88,176 Z" fill="${hair.base}" />
      <circle cx="146" cy="152" r="3.6" fill="#F59E0B" />`;
  }
  return "";
}

function collarMarkup(collar, top, accent) {
  if (collar === "crew-collar") {
    return `<path d="M89,156 C91,188 149,188 151,156 L140,154 C138,176 102,176 100,154 Z" fill="${accent}" />`;
  }
  if (collar === "polo-sweater") {
    return `
      <path d="M91,154 C91,171 104,181 118,175 L120,164 L101,152 Z" fill="${accent}" />
      <path d="M149,154 C149,171 136,181 122,175 L120,164 L139,152 Z" fill="${accent}" />
      <path d="M91,154 C91,171 104,181 118,175 M149,154 C149,171 136,181 122,175" stroke="rgba(0,0,0,0.22)" stroke-width="1.5" fill="none" />`;
  }
  if (collar === "plush-sweater" || collar === "scoop-blouse") {
    return `<path d="M96,154 Q120,169 144,154" stroke="rgba(0,0,0,0.22)" stroke-width="3" fill="none" stroke-linecap="round" />`;
  }
  if (collar === "lab-coat") {
    return `
      <path d="M92,156 L120,238 L148,156 Z" fill="${accent}" />
      <path d="M80,156 L98,156 L114,238 L84,238 Z" fill="#E2E8F0" />
      <path d="M160,156 L142,156 L126,238 L156,238 Z" fill="#CBD5E1" />
      <path d="M70,156 L82,156 L78,262 L60,262 Z" fill="${accent}" />
      <path d="M170,156 L158,156 L162,262 L180,262 Z" fill="${accent}" />`;
  }
  if (collar === "vneck-tie" || collar === "suit-tie") {
    return `
      <path d="M90,156 L120,216 L150,156 Z" fill="#FFFFFF" />
      <path d="M115,164 L125,164 L128,212 L120,220 L112,212 Z" fill="${accent}" />`;
  }
  if (collar === "tunic-kurta") {
    return `
      <rect x="93" y="151" width="54" height="9" rx="4.5" fill="${accent}" opacity="0.9" />
      <rect x="116" y="156" width="8" height="66" rx="4" fill="${top}" stroke="${accent}" stroke-width="1.4" />
      <circle cx="120" cy="172" r="1.8" fill="${accent}" />
      <circle cx="120" cy="188" r="1.8" fill="${accent}" />`;
  }
  if (collar === "vest-shirt" || collar === "open-jacket") {
    return `
      <path d="M96,156 L144,156 L142,240 L98,240 Z" fill="${accent}" />
      <path d="M96,156 L120,196 L144,156" fill="none" stroke="rgba(0,0,0,0.16)" stroke-width="2.4" />`;
  }
  return "";
}

function torso(character, skin) {
  const top = character.top;
  const accent = character.accent;
  const shade = darken(top, 0.3);
  return `
    <path d="M66 166 C68 153 88 150 120 150 C152 150 172 153 174 166 L170 230 C178 262 184 292 186 334 L54 334 C56 292 62 262 70 230 Z" fill="${top}" />
    <path d="M70 230 C62 262 56 292 54 334 L79 334 C75 294 79 262 85 234 Z" fill="${shade}" opacity="0.42" />
    <path d="M170 230 C178 262 184 292 186 334 L161 334 C165 294 161 262 155 234 Z" fill="${shade}" opacity="0.42" />
    <path d="M72 232 Q120 250 168 232 L166 246 Q120 260 74 246 Z" fill="#0f172a" opacity="0.16" />
    <path d="M74 170 Q97 158 120 158" fill="none" stroke="#ffffff" stroke-width="4" opacity="0.1" stroke-linecap="round" />
    <path d="M101 140 L101 160 C101 172 139 172 139 160 L139 140 Z" fill="${skin.base}" />
    <path d="M101 142 Q120 158 139 142 L139 153 Q120 166 101 153 Z" fill="${skin.mid}" opacity="0.85" />
    ${collarMarkup(character.collar, top, accent)}
    ${character.dupatta ? `<path d="M74,160 C96,164 124,192 160,222 L158,232 C120,206 92,182 72,172 Z" fill="${lighten(accent, 0.3)}" opacity="0.9" />` : ""}`;
}

function beardMarkup(character) {
  const type = character.beard;
  if (!type) return "";
  const color = character.beardColor;
  if (type === "mustache") {
    return `
      <path d="M120,119 C109,117 94,120 92,127 C91,132 99,135 107,132 C114,130 117,127 120,127 C123,127 126,130 133,132 C141,135 149,132 148,127 C146,120 131,117 120,119 Z" fill="${color}" />
      <path d="M98,124 Q110,119 120,122 Q130,119 142,124" stroke="rgba(255,255,255,0.28)" stroke-width="2.2" fill="none" stroke-linecap="round" />`;
  }
  if (type === "boxed" || type === "elder") {
    return `
      <path d="M67,108 C67,138 84,158 120,159 C156,158 173,138 173,108 L165,108 C162,126 150,133 138,129 C131,126 125,124 120,124 C115,124 109,126 102,129 C90,133 78,126 75,108 Z" fill="${color}" />
      <path d="M96,123 Q120,116 144,123 Q140,130 120,128 Q100,130 96,123 Z" fill="${color}" />`;
  }
  if (type === "goatee") {
    return `
      <path d="M102,123 Q120,118 138,123 Q135,128 120,126 Q105,128 102,123 Z" fill="${color}" />
      <path d="M100,141 Q120,148 140,141 Q136,154 120,155 Q104,154 100,141 Z" fill="${color}" />`;
  }
  return "";
}

function glassesMarkup(type) {
  if (type === "cyan-tech") {
    return `
      <rect x="72" y="90" width="44" height="29" rx="8" fill="#7CC4F8" fill-opacity="0.5" stroke="#1E2536" stroke-width="4.2" />
      <rect x="124" y="90" width="44" height="29" rx="8" fill="#7CC4F8" fill-opacity="0.5" stroke="#1E2536" stroke-width="4.2" />
      <path d="M78,93 L90,93 L82,116 L74,116 Z" fill="#FFFFFF" opacity="0.42" />
      <path d="M130,93 L142,93 L134,116 L126,116 Z" fill="#FFFFFF" opacity="0.42" />
      <path d="M116 103 H124" stroke="#1E2536" stroke-width="4.4" />
      <path d="M66 101 H72" stroke="#1E2536" stroke-width="4.2" stroke-linecap="round" />
      <path d="M168 101 H174" stroke="#1E2536" stroke-width="4.2" stroke-linecap="round" />`;
  }
  if (type === "round-tort") {
    return `
      <circle cx="95" cy="105" r="17" fill="rgba(254,243,199,0.14)" stroke="#78350F" stroke-width="3.4" />
      <circle cx="145" cy="105" r="17" fill="rgba(254,243,199,0.14)" stroke="#78350F" stroke-width="3.4" />
      <path d="M112,104 Q120,99 128,104" fill="none" stroke="#78350F" stroke-width="3.2" />`;
  }
  return "";
}

function capMarkup(type) {
  if (type === "coral-beanie") {
    return `
      <path d="M64,74 C66,38 90,28 120,28 C150,28 174,38 176,74 Z" fill="#C65A4B" />
      <path d="M84,50 C96,36 134,36 146,48 C128,44 102,44 84,50 Z" fill="#DF7B6C" />
      <path d="M60,70 C88,60 152,60 180,70 L178,86 C150,76 90,76 62,86 Z" fill="#D46657" />
      <path d="M62,71 C90,62 150,62 178,71" stroke="#EA8A7B" stroke-width="2.5" fill="none" stroke-linecap="round" />`;
  }
  if (type === "kufi") {
    return `
      <path d="M65,68 C65,36 88,24 120,24 C152,24 175,36 175,68 Z" fill="#F8FAFC" />
      <rect x="63" y="58" width="114" height="12" rx="6" fill="#CBD5E1" />
      <path d="M70,58 C90,50 152,50 170,58" stroke="#FFFFFF" stroke-width="2.4" fill="none" stroke-linecap="round" />`;
  }
  return "";
}

/* ----------------------------------------------------------- per-character art */

const lowerLid = (cx) => `M${cx - 7.2},117 Q${cx},120 ${cx + 7.2},117`;

function facePathFor(headWidth) {
  const centre = 540;
  const half = 187.2 * headWidth;
  const top = 250;
  const bottom = 602.8;
  const radius = 165.6 * headWidth;
  const left = centre - half;
  const right = centre + half;
  return [
    `M${num(left + radius)} ${num(top)}`,
    `H${num(right - radius)}`,
    `A${num(radius)} ${num(radius)} 0 0 1 ${num(right)} ${num(top + radius)}`,
    `V${num(bottom - radius)}`,
    `A${num(radius)} ${num(radius)} 0 0 1 ${num(right - radius)} ${num(bottom)}`,
    `H${num(left + radius)}`,
    `A${num(radius)} ${num(radius)} 0 0 1 ${num(left)} ${num(bottom - radius)}`,
    `V${num(top + radius)}`,
    `A${num(radius)} ${num(radius)} 0 0 1 ${num(left + radius)} ${num(top)}`,
    "Z"
  ].join(" ");
}

function nosePathFor(step) {
  const half = 11.9 + step * 0.062;
  const depth = 17.2 + (step % 4) * 0.45;
  return `M${num(540 - half)} 480.4 Q540 ${num(480.4 + depth)} ${num(540 + half)} 480.4`;
}

// Every profile needs its own facial signature, so small seed-driven offsets keep the
// shared rig geometry readable while never repeating a value.
function featuresFor(character, seed, skin) {
  const step = seed - 2;
  const iris = character.iris;
  const ry = (character.almond ? 8.9 : 10.1) + step * 0.0042;
  const rx = 10.05 + step * 0.0083;
  const pupil = (character.almond ? 6.8 : 7.3) - step * 0.0041;
  const browColour = character.brow;
  const browWidth = 6.2 - step * 0.02;
  const blushOpacity = 0.18 + step * 0.002;
  const earRx = character.coveredEars ? 6.2 : 11.9 + step * 0.02;
  const earRy = character.coveredEars ? 9 : 13.9 + (step % 7) * 0.15;
  const earX = character.coveredEars ? 68 : 65;
  const earX2 = 240 - earX;

  const eye = (cx) => `
    <ellipse cx="${cx}" cy="106" rx="${num3(rx)}" ry="${num3(ry)}" fill="#FFFFFF" />
    <path d="M${cx - 10.5},${num(106 - ry * 0.55)} Q${cx},${num(106 - ry * 1.16)} ${cx + 10.5},${num(106 - ry * 0.55)}" fill="none" stroke="#1E222D" stroke-width="3.2" stroke-linecap="round" />`;

  const pupilMarkup = (cx, fill) => `
    <circle cx="${cx + 0.5}" cy="106" r="${num3(pupil)}" fill="${fill}" />
    <circle cx="${cx - 2.2}" cy="103.2" r="2.9" fill="#FFFFFF" />
    <circle cx="${cx + 3.2}" cy="108.8" r="1.3" fill="#FFFFFF" />`;

  return {
    ears: wrap(`
      <ellipse cx="${earX}" cy="107" rx="${num(earRx)}" ry="${num(earRy)}" fill="${skin.base}" />
      <ellipse cx="${num(earX + (character.coveredEars ? 0.4 : 1))}" cy="107" rx="${num(earRx * 0.54)}" ry="${num(earRy * 0.55)}" fill="${skin.mid}" />
      <ellipse cx="${earX2}" cy="107" rx="${num(earRx)}" ry="${num(earRy)}" fill="${skin.base}" />
      <ellipse cx="${num(earX2 - (character.coveredEars ? 0.4 : 1))}" cy="107" rx="${num(earRx * 0.54)}" ry="${num(earRy * 0.55)}" fill="${skin.mid}" />`),
    details: wrap(`
      <ellipse cx="120" cy="142" rx="${num(31 + step * 0.03)}" ry="9" fill="${skin.mid}" opacity="0.28" />
      <ellipse cx="120" cy="113.5" rx="${num(6.5 + step * 0.02)}" ry="4.2" fill="${skin.mid}" opacity="0.45" />${
        character.rosyNose
          ? `
      <ellipse cx="120" cy="112.5" rx="6.4" ry="4.8" fill="#D95B43" />
      <ellipse cx="118" cy="111" rx="2.4" ry="1.5" fill="#F0806C" opacity="0.65" />`
          : ""
      }${character.bindi ? `
      <circle cx="120" cy="82" r="3.5" fill="#BE123C" stroke="#FBBF24" stroke-width="1.2" />` : ""}${character.beard ? `\n      ${beardMarkup(character)}` : ""}`),
    cheeks: wrap(`
      <ellipse cx="88" cy="120" rx="${num(13.9 + step * 0.02)}" ry="7" fill="#de7e78" opacity="${num(blushOpacity)}" />
      <ellipse cx="152" cy="120" rx="${num(13.9 + step * 0.02)}" ry="7" fill="#de7e78" opacity="${num(blushOpacity)}" />`),
    eyeLeft: wrap(`
      ${eye(97)}
      ${character.lashes ? `<path d="M86,101 L81,97 M89,98 L85,94" stroke="#1E222D" stroke-width="2.6" stroke-linecap="round" fill="none" />` : ""}
      <path d="${lowerLid(97)}" stroke="${skin.mid}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.7" />`),
    eyeRight: wrap(`
      ${eye(143)}
      ${character.lashes ? `<path d="M154,101 L159,97 M151,98 L155,94" stroke="#1E222D" stroke-width="2.6" stroke-linecap="round" fill="none" />` : ""}
      <path d="${lowerLid(143)}" stroke="${skin.mid}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.7" />`),
    pupilLeft: wrap(pupilMarkup(97, character.heterochromia ?? iris)),
    pupilRight: wrap(pupilMarkup(143, iris)),
    browLeft: wrap(`<path d="M84,90 Q97,85 108,89" fill="none" stroke="${browColour}" stroke-width="${num(browWidth)}" stroke-linecap="round" />`),
    browRight: wrap(`<path d="M132,89 Q143,85 156,90" fill="none" stroke="${browColour}" stroke-width="${num(browWidth)}" stroke-linecap="round" />`)
  };
}

/* ---------------------------------------------------------------- characters */

const CHARACTERS = [
  {
    id: "forma-zara", name: "Zara", gender: "female", seed: 2,
    description: "Chestnut bob curls under a coral knit beanie with a cozy plum pullover and warm winged lashes.",
    skin: { base: "#F4C5A1", mid: "#D8A27B", deep: "#BF8660" },
    hair: { base: "#9E5B4B", shade: "#7D4335", hi: "#B87261" },
    style: "zara-curls", collar: "plush-sweater", top: "#69498E", accent: "#E9D5FF",
    cap: "coral-beanie", lashes: true, iris: "#1E222D", eyeShape: "oval"
  },
  {
    id: "forma-barnaby", name: "Barnaby Sterling", gender: "male", seed: 3,
    description: "Ginger pompadour, rosy bulb nose and a handlebar moustache over a teal collared mentor sweater.",
    skin: { base: "#F4C39B", mid: "#D89F74", deep: "#BF8358" },
    hair: { base: "#EB8B35", shade: "#C96E1E", hi: "#F7AA5C" },
    style: "pompadour", collar: "polo-sweater", top: "#216676", accent: "#2D929C",
    beard: "mustache", beardColor: "#C96E1E", rosyNose: true, iris: "#1E222D", eyeShape: "oval"
  },
  {
    id: "forma-tariq", name: "Tariq Mehmood", gender: "male", seed: 4,
    description: "Spiky swept hair under a two-tone kufi cap with a clean green mandarin-collar kurta placket.",
    skin: { base: "#F4C29A", mid: "#DC9F72", deep: "#C27E4E" },
    hair: { base: "#8C4A32", shade: "#63301E", hi: "#B5694D" },
    style: "spiky-sweep", collar: "tunic-kurta", top: "#41A35B", accent: "#FFFFFF",
    cap: "kufi", iris: "#1B2035", eyeShape: "oval"
  },
  {
    id: "forma-kabir", name: "Baba Kabir", gender: "male", seed: 5,
    description: "Senior advisor with snow-white arched brows, a full sculpted beard and a crimson V-neck pullover.",
    skin: { base: "#F4BE94", mid: "#DF9B6C", deep: "#C47B4B" },
    hair: { base: "#F1F5F9", shade: "#CBD5E1", hi: "#FFFFFF" },
    style: "bald-elder", collar: "vneck-tie", top: "#B83236", accent: "#FFFFFF",
    beard: "elder", beardColor: "#F1F5F9", iris: "#1B2035", eyeShape: "oval"
  },
  {
    id: "forma-devon", name: "Devon Brooks", gender: "male", seed: 6,
    description: "VP of strategy with a tapered navy crop fade, crisp dress shirt and a navy tie over charcoal slacks.",
    skin: { base: "#BA7242", mid: "#99552A", deep: "#7B401B" },
    hair: { base: "#1B2036", shade: "#0F1322", hi: "#323B61" },
    style: "buzz-fade", collar: "suit-tie", top: "#F8FAFC", accent: "#2563EB",
    iris: "#1A1412", eyeShape: "oval"
  },
  {
    id: "forma-elena", name: "Elena Rostova", gender: "female", seed: 7,
    description: "Centre-parted coral bob with a ribbon shine, blue tailored vest over white sleeves and indigo denim.",
    skin: { base: "#F6C59E", mid: "#E3A376", deep: "#C98255" },
    hair: { base: "#D96452", shade: "#9E3A2B", hi: "#F29385" },
    style: "sleek-bob", collar: "vest-shirt", top: "#2B7EB3", accent: "#F8FAFC",
    lashes: true, iris: "#3B2314", eyeShape: "oval"
  },
  {
    id: "forma-marcus", name: "Marcus Vance", gender: "male", seed: 8,
    description: "Creative technologist with heterochromia irises, a sculpted boxed beard and a cobalt open jacket.",
    skin: { base: "#AE6B3E", mid: "#8C4E25", deep: "#6E3916" },
    hair: { base: "#1B2238", shade: "#101524", hi: "#323E63" },
    style: "buzz-fade", collar: "open-jacket", top: "#1B6CA3", accent: "#F8FAFC",
    beard: "boxed", beardColor: "#1B2238", lashes: true, iris: "#1B8CA6", heterochromia: "#6E232A", eyeShape: "oval"
  },
  {
    id: "forma-mina", name: "Mina Lin", gender: "female", seed: 9,
    description: "East Asian art director with an asymmetrical indigo bob, almond lashed eyes and an amber vest.",
    skin: { base: "#F7C7A1", mid: "#E3A478", deep: "#C78254" },
    hair: { base: "#232846", shade: "#14182E", hi: "#3E4675" },
    style: "asym-bob", collar: "vest-shirt", top: "#ED9340", accent: "#C93B3B",
    lashes: true, iris: "#1B2035", eyeShape: "almond"
  },
  {
    id: "forma-kenji", name: "Kenji Sato", gender: "male", seed: 10,
    description: "Tokyo systems architect with a two-block curtain cut, sky-tinted tech glasses and a charcoal blazer.",
    skin: { base: "#F9D4B4", mid: "#E5B48E", deep: "#C99268" },
    hair: { base: "#161924", shade: "#0B0D14", hi: "#333A52" },
    style: "twoblock-asian", collar: "suit-tie", top: "#1E293B", accent: "#0EA5E9",
    glasses: "cyan-tech", iris: "#18181B", eyeShape: "almond"
  },
  {
    id: "forma-mei", name: "Mei-Ling Chen", gender: "female", seed: 11,
    description: "UX director with twin silk space buns, a blunt fringe and an emerald mandarin silk tunic.",
    skin: { base: "#FAD8BA", mid: "#E6B894", deep: "#CA966E" },
    hair: { base: "#161924", shade: "#0B0D14", hi: "#38415C" },
    style: "twin-buns", collar: "tunic-kurta", top: "#0F766E", accent: "#FBBF24",
    lashes: true, iris: "#1F1610", eyeShape: "almond"
  },
  {
    id: "forma-jinwoo", name: "Jin-Woo Park", gender: "male", seed: 12,
    description: "Seoul product lead with an S-curve comma perm, round tortoiseshell frames and a sage cardigan.",
    skin: { base: "#F9D4B4", mid: "#E5B48E", deep: "#C99268" },
    hair: { base: "#5C2F18", shade: "#3D1D0D", hi: "#87492B" },
    style: "comma-perm", collar: "vneck-tie", top: "#658B38", accent: "#1E293B",
    glasses: "round-tort", iris: "#261710", eyeShape: "almond"
  },
  {
    id: "forma-priya", name: "Priya Sharma", gender: "female", seed: 13,
    description: "Mumbai creative strategist with flowing espresso waves, a crimson bindi and an emerald kurta with dupatta.",
    skin: { base: "#EBB282", mid: "#D1925E", deep: "#B37240" },
    hair: { base: "#21130D", shade: "#120906", hi: "#4A2E21" },
    style: "zainab-waves", collar: "tunic-kurta", top: "#047857", accent: "#FBBF24",
    dupatta: true, bindi: true, lashes: true, iris: "#21120B", eyeShape: "oval"
  },
  {
    id: "forma-haruto", name: "Haruto Takahashi", gender: "male", seed: 14,
    description: "Kyoto principal artisan with a silver-streaked swept crown, sculpted goatee and indigo jacket.",
    skin: { base: "#F4BE94", mid: "#DF9B6C", deep: "#C47B4B" },
    hair: { base: "#334155", shade: "#1E293B", hi: "#94A3B8" },
    style: "pompadour", collar: "open-jacket", top: "#1E3A8A", accent: "#F8FAFC",
    beard: "goatee", beardColor: "#334155", iris: "#18181B", eyeShape: "almond"
  },
  {
    id: "forma-zainab", name: "Dr. Zainab Raza", gender: "female", seed: 15,
    description: "Medical and systems lead in a draped modest hijab with round frames and a clinical lab coat.",
    skin: { base: "#F0BC90", mid: "#D99C6C", deep: "#BA7C4C" },
    hair: { base: "#1E293B", shade: "#0F172A", hi: "#475569" },
    style: "hijab-drape", collar: "lab-coat", top: "#F8FAFC", accent: "#0D9488",
    glasses: "round-tort", lashes: true, iris: "#1F140E", eyeShape: "oval"
  },
  {
    id: "forma-arthur", name: "Prof. Arthur Vance", gender: "male", seed: 16,
    description: "Oxford design director with silver swept hair, a matching boxed beard and a navy crew-collar sweater.",
    skin: { base: "#F4A984", mid: "#DE8B64", deep: "#C26E47" },
    hair: { base: "#7E8791", shade: "#586069", hi: "#B0BAC4" },
    style: "pompadour", collar: "crew-collar", top: "#27374D", accent: "#93C5FD",
    glasses: "round-tort", beard: "boxed", beardColor: "#7E8791", iris: "#1E293B", eyeShape: "oval"
  },
  {
    id: "forma-liam", name: "Liam O'Connor", gender: "male", seed: 17,
    description: "Frontend lead with a chestnut spiky sweep, sky-blue collared sweater and indigo tapered jeans.",
    skin: { base: "#F6C59E", mid: "#E2A376", deep: "#C47F52" },
    hair: { base: "#5C2D16", shade: "#3D1C0B", hi: "#854627" },
    style: "spiky-sweep", collar: "polo-sweater", top: "#3B82F6", accent: "#93C5FD",
    iris: "#4A2C18", eyeShape: "oval"
  },
  {
    id: "forma-oliver", name: "Oliver Kensington", gender: "male", seed: 18,
    description: "Design strategist with golden-blonde swept hair, dark frames and an olive open jacket.",
    skin: { base: "#F7C9A6", mid: "#E3A87E", deep: "#C7865A" },
    hair: { base: "#EAB344", shade: "#C28922", hi: "#FCE08B" },
    style: "spiky-sweep", collar: "open-jacket", top: "#6A8D39", accent: "#FFFFFF",
    glasses: "round-tort", iris: "#3B2618", eyeShape: "oval"
  },
  {
    id: "forma-noah", name: "Noah Campbell", gender: "male", seed: 19,
    description: "Engineering manager with an espresso pompadour, a full tapered beard and a royal blue sweater.",
    skin: { base: "#F5C098", mid: "#DF9D6E", deep: "#C27B4A" },
    hair: { base: "#4A2511", shade: "#2E1508", hi: "#733E20" },
    style: "pompadour", collar: "crew-collar", top: "#1E3A8A", accent: "#FFFFFF",
    beard: "boxed", beardColor: "#4A2511", iris: "#3B2314", eyeShape: "oval"
  },
  {
    id: "forma-chloe", name: "Chloe Dubois", gender: "female", seed: 20,
    description: "Brand storyteller with flowing chestnut curls, emerald-green irises and a teal pullover.",
    skin: { base: "#F6C59E", mid: "#E3A376", deep: "#C98255" },
    hair: { base: "#7A3A1E", shade: "#522410", hi: "#A65632" },
    style: "zara-curls", collar: "plush-sweater", top: "#0D9488", accent: "#FFFFFF",
    lashes: true, iris: "#0D9488", eyeShape: "oval"
  },
  {
    id: "forma-malik", name: "Malik Al-Mansoor", gender: "male", seed: 21,
    description: "VP of operations with a close-cropped fade, boxed beard and a navy suit blazer with crimson tie.",
    skin: { base: "#B57042", mid: "#94542B", deep: "#733D1B" },
    hair: { base: "#211A16", shade: "#120E0B", hi: "#3D312A" },
    style: "buzz-fade", collar: "suit-tie", top: "#28364A", accent: "#B91C1C",
    beard: "boxed", beardColor: "#211A16", iris: "#1F140E", eyeShape: "oval"
  },
  {
    id: "forma-harper", name: "Harper Collins", gender: "female", seed: 22,
    description: "Visual designer with a glossy plum side-parted bob, rosy cheeks and a matching plum pullover.",
    skin: { base: "#F7C8A4", mid: "#E3A77D", deep: "#C78559" },
    hair: { base: "#6D214F", shade: "#471232", hi: "#9E3E78" },
    style: "asym-bob", collar: "plush-sweater", top: "#7A285B", accent: "#F8FAFC",
    lashes: true, iris: "#2E1A12", eyeShape: "oval"
  },
  {
    id: "forma-maya", name: "Maya Boateng", gender: "female", seed: 23,
    description: "Community lead with a voluminous ringlet afro halo, gold-brown highlights and a cobalt sweater.",
    skin: { base: "#BA7446", mid: "#99582E", deep: "#78401C" },
    hair: { base: "#4E2714", shade: "#33170A", hi: "#784126" },
    style: "afro-curls", collar: "plush-sweater", top: "#2563EB", accent: "#FFFFFF",
    lashes: true, iris: "#1E293B", eyeShape: "oval"
  },
  {
    id: "forma-amara", name: "Amara Okafor", gender: "female", seed: 24,
    description: "Creative director with dark-chocolate cloud curls, rich umber skin and a berry pullover.",
    skin: { base: "#9B5B30", mid: "#7D441E", deep: "#5E3011" },
    hair: { base: "#2A150B", shade: "#170A04", hi: "#4D2918" },
    style: "afro-curls", collar: "plush-sweater", top: "#7A234A", accent: "#F8FAFC",
    lashes: true, iris: "#1A110B", eyeShape: "oval"
  }
];

/* ------------------------------------------------------------------- output */

function buildSpec(character) {
  const seed = character.seed;
  const step = seed - 2;
  const skin = character.skin;
  const hair = character.hair;
  const almond = character.eyeShape === "almond";
  const headWidth = 0.98 + step * 0.0015;
  const browColour = [hair.base, "#3A2E2B"].includes(hair.base) ? "#3A2E2B" : hair.base;
  const shade = darken(character.top, 0.34);
  const lip = mix(skin.deep, "#7d2f3c", 0.55);

  const featureSource = featuresFor({
    ...character,
    coveredEars: character.style === "hijab-drape",
    almond,
    brow: browColour,
    iris: lower(character.iris),
    heterochromia: character.heterochromia ? lower(character.heterochromia) : null
  }, seed, skin);

  const accessories = [
    character.cap ? capMarkup(character.cap) : "",
    character.glasses ? glassesMarkup(character.glasses) : ""
  ].filter(Boolean).join("\n      ");

  const frontHair = wrap(`${hairFront(character.style, lowercaseHair(hair))}${accessories ? "\n      " + accessories : ""}`);

  return {
    id: character.id,
    name: character.name,
    gender: character.gender,
    kind: "human",
    outfit: "crewneck",
    description: character.description,
    source: SOURCE,
    palette: {
      skin: lower(skin.base),
      hair: lower(hair.base),
      cloth: lower(character.top),
      shade: lower(shade),
      trim: lower(character.accent),
      outline: "#1a2030",
      accent: lower(hair.hi),
      skinShadow: lower(skin.mid),
      lip: lower(lip),
      iris: lower(character.iris)
    },
    background: "sky-grid",
    outlineWidth: 0,
    limbStyle: "flat",
    noseStroke: character.rosyNose ? 0 : undefined,
    backHair: wrap(hairBack(character.style, lowercaseHair(hair))),
    frontHair,
    body: wrap(torso({
      top: lower(character.top),
      accent: lower(character.accent),
      collar: character.collar,
      dupatta: character.dupatta
    }, { base: lower(skin.base), mid: lower(skin.mid) })),
    facePath: facePathFor(headWidth),
    nosePath: nosePathFor(step),
    features: featureSource,
    rigSpec: {
      shoulders: [[345.6, 660.4], [734.4, 660.4]],
      arms: [150, 152],
      gesture: [0.95, 0.98, 0, 2],
      head: [540, 602.8],
      eyes: [457.2, nr(444.42 + step * 0.005), 622.8, nr(444.42 + step * 0.005)],
      // Sub-pixel jitter keeps every rig signature unique without moving the art.
      eyeScale: [nr(1.12 + step * 0.002), nr(1.1 + step * 0.002)],
      brows: [453.6, 379.6, 626.4, 379.6],
      mouth: [540, 548.8, nr(1 + step * 0.001), nr(1 - step * 0.001)],
      nose: [0, 0, 1, 1, 0, 540, 480.4],
      wearables: {
        glasses: [540, 444.4, nr(0.9 + step * 0.002)],
        hat: [540, 214, nr(0.92 + step * 0.002)],
        earrings: [[338.4, 458.8], [741.6, 458.8], nr(0.85 + step * 0.002)],
        neckwear: [540, 640, nr(0.95 + step * 0.002)]
      },
      handScale: nr(0.9 + step * 0.001)
    },
    accessories: { earrings: "none", neckwear: "none" }
  };
}

function lowercaseHair(hair) {
  return { base: lower(hair.base), shade: lower(hair.shade), hi: lower(hair.hi) };
}

const specs = CHARACTERS.map(buildSpec);
const body = specs.map((spec) => `  ${JSON.stringify(spec, null, 2).replace(/\n/g, "\n  ")}`).join(",\n");

await writeFile(output, `// Generated by scripts/port-forma2d.mjs — do not edit by hand.
// Source art: Forma2D EGM v3.0 unified vector character rig (${SOURCE})
globalThis.FormaAvatarSpecs = Object.freeze([\n${body}\n]);\n`, "utf8");

console.log(`wrote ${specs.length} profiles to assets/avatar-forma.js`);
