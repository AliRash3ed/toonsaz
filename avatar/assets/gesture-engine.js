(function () {
  "use strict";

  const radians = Math.PI / 180;
  const defaultUpperLength = 130;
  const defaultForearmLength = 138;
  const shoulders = Object.freeze({
    left: Object.freeze({ x: 378, y: 750 }),
    right: Object.freeze({ x: 702, y: 750 })
  });

  // Original silhouettes, not finger transforms: every shape has its own contour.
  // Bounds include Bezier control points; a 3.2px outline adds 1.6px per edge.
  const artwork = {
    relaxed: {
      bounds: [-23, -57, 53, 63], extended: [], thumb: [27, -29],
      outline: "M-10 6 C-11 -6 -21 -13 -22 -27 L-23 -37 Q-23 -45 -17 -45 Q-12 -45 -11 -38 L-10 -45 Q-9 -52 -3 -52 Q3 -52 4 -44 L5 -49 Q6 -57 12 -56 Q19 -55 19 -47 L20 -36 L23 -34 Q29 -37 30 -30 Q30 -24 24 -18 L16 -8 L10 6 Z",
      creases: "M-11 -36 L-10 -25 M3 -42 L4 -28 M18 -39 L18 -27 M24 -21 Q12 -25 9 -15"
    },
    "palm-up": {
      bounds: [-28, -87, 63, 93], extended: ["index", "middle", "ring", "little"], thumb: [32, -35],
      outline: "M-10 6 C-14 -3 -24 -12 -26 -28 L-28 -54 Q-28 -61 -23 -62 Q-17 -63 -16 -55 L-13 -42 L-17 -70 Q-18 -78 -12 -79 Q-6 -80 -5 -72 L-1 -47 L-3 -79 Q-3 -87 3 -87 Q9 -87 9 -79 L10 -47 L13 -73 Q14 -81 20 -79 Q26 -77 24 -69 L19 -35 L25 -41 Q31 -47 35 -41 Q35 -35 29 -29 L23 -22 C19 -10 13 -5 10 6 Z",
      creases: "M-16 -36 Q-2 -22 17 -30 M-12 -25 Q0 -12 12 -18 M21 -29 Q12 -31 8 -23"
    },
    "palm-front": {
      bounds: [-35, -99, 74, 105], extended: ["index", "middle", "ring", "little", "thumb"], thumb: [36, -43],
      outline: "M-10 6 C-14 -6 -24 -14 -25 -30 L-35 -67 Q-35 -75 -29 -76 Q-23 -77 -21 -69 L-15 -45 L-22 -85 Q-23 -93 -17 -94 Q-10 -95 -9 -86 L-4 -47 L-6 -91 Q-6 -99 1 -99 Q8 -99 8 -91 L10 -46 L15 -84 Q16 -92 22 -90 Q29 -89 27 -81 L21 -36 L29 -47 Q34 -53 39 -48 Q39 -42 35 -36 L25 -20 Q21 -7 10 6 Z",
      creases: "M-15 -42 L-11 -26 M-3 -44 L-1 -24 M10 -43 L9 -25 M21 -33 Q7 -34 4 -17 M-12 -13 Q-2 -6 8 -10"
    },
    "index-up": {
      bounds: [-24, -96, 56, 102], extended: ["index"], thumb: [30, -32], tip: [12, -96],
      outline: "M-10 6 C-12 -5 -23 -12 -24 -28 L-24 -40 Q-24 -48 -18 -48 Q-12 -48 -12 -40 L-12 -33 L-11 -47 Q-10 -54 -4 -53 Q2 -53 2 -45 L3 -35 L5 -88 Q5 -96 12 -96 Q19 -96 19 -88 L18 -36 L23 -39 Q30 -43 32 -36 Q32 -29 25 -24 L20 -12 L10 6 Z",
      creases: "M-12 -36 L-11 -24 M1 -39 L2 -26 M25 -26 Q14 -31 8 -25 M8 -71 L16 -71"
    },
    "index-front": {
      bounds: [-25, -63, 59, 69], extended: ["index"], thumb: [31, -30], tip: [10, -52], projectedLength: 22,
      outline: "M-10 6 C-12 -5 -24 -11 -25 -27 L-25 -36 Q-25 -44 -19 -44 Q-13 -44 -12 -36 L-11 -42 Q-10 -49 -4 -49 Q3 -49 4 -41 L5 -34 L6 -48 Q7 -56 14 -55 Q21 -54 21 -46 L20 -33 L26 -36 Q32 -41 34 -34 Q34 -27 27 -22 L20 -10 L10 6 Z",
      creases: "M-12 -34 L-11 -24 M2 -37 L3 -26 M27 -24 Q15 -29 9 -20",
      detail: '<circle data-part="index-tip" cx="10" cy="-52" r="11" /><path d="M5 -54 Q10 -58 15 -54" fill="none" stroke-width="1.5" opacity="0.45" />'
    },
    "count-2": {
      bounds: [-24, -97, 56, 103], extended: ["index", "middle"], thumb: [30, -31],
      outline: "M-10 6 C-12 -5 -23 -12 -24 -28 L-24 -39 Q-24 -47 -18 -47 Q-12 -47 -12 -39 L-11 -31 L-12 -88 Q-12 -97 -5 -97 Q2 -97 2 -88 L4 -47 L10 -85 Q11 -93 17 -92 Q24 -91 22 -82 L17 -34 L23 -38 Q30 -42 32 -35 Q32 -29 25 -24 L20 -12 L10 6 Z",
      creases: "M-12 -33 L-11 -23 M3 -43 L3 -27 M25 -26 Q14 -31 8 -23"
    },
    "count-3": {
      bounds: [-26, -99, 58, 105], extended: ["index", "middle", "ring"], thumb: [30, -30],
      outline: "M-10 6 C-12 -5 -24 -12 -26 -28 L-26 -39 Q-26 -46 -20 -46 Q-14 -46 -14 -38 L-13 -31 L-20 -80 Q-21 -88 -15 -89 Q-8 -90 -7 -82 L-3 -46 L-4 -91 Q-4 -99 3 -99 Q10 -99 10 -91 L10 -45 L15 -82 Q16 -90 22 -88 Q28 -87 26 -79 L19 -34 L24 -37 Q30 -41 32 -34 Q32 -28 25 -23 L20 -11 L10 6 Z",
      creases: "M-13 -33 L-11 -24 M-3 -43 L-2 -27 M10 -41 L9 -27 M25 -25 Q14 -30 7 -22"
    },
    blade: {
      bounds: [-17, -95, 39, 101], extended: ["index", "middle", "ring", "little"], thumb: [20, -32],
      outline: "M-9 6 C-12 -7 -17 -19 -17 -33 L-13 -81 Q-13 -89 -8 -90 L-4 -93 Q1 -95 5 -92 Q10 -91 11 -83 L12 -40 L16 -38 Q22 -38 22 -31 Q22 -25 15 -21 L10 6 Z",
      creases: "M-7 -81 L-9 -42 M0 -86 L-1 -43 M7 -82 L7 -44 M15 -23 Q7 -26 3 -20"
    },
    steeple: {
      bounds: [-17, -96, 36, 102], extended: ["index", "middle", "ring", "little"], thumb: [17, -35], tip: [0, -96],
      outline: "M-9 6 C-12 -8 -17 -20 -16 -37 L-10 -78 L-6 -90 Q-5 -95 0 -96 Q5 -96 6 -90 L9 -58 L11 -40 L15 -42 Q19 -42 19 -36 Q19 -30 13 -26 L10 6 Z",
      creases: "M-5 -84 L-9 -42 M0 -86 L-3 -43 M5 -80 L3 -44 M13 -28 Q6 -29 3 -21"
    },
    pinch: {
      bounds: [-25, -72, 63, 78], extended: [], thumb: [29, -60], tip: [29, -60],
      outline: "M-10 6 C-12 -5 -24 -13 -25 -29 L-25 -40 Q-25 -48 -19 -48 Q-13 -48 -12 -40 L-11 -46 Q-10 -54 -4 -54 Q2 -54 3 -46 L4 -37 L5 -54 C5 -68 16 -72 27 -67 C38 -62 38 -47 29 -41 L22 -29 L19 -12 L10 6 Z M16 -55 C16 -62 24 -64 28 -59 C33 -53 27 -47 21 -49 Q16 -50 16 -55 Z",
      creases: "M-12 -37 L-11 -26 M2 -41 L3 -28 M29 -43 Q21 -41 15 -30", evenodd: true
    },
    chin: {
      bounds: [-24, -93, 55, 99], extended: ["index"], thumb: [29, -31], tip: [15, -91],
      outline: "M-10 6 C-12 -5 -23 -12 -24 -28 L-24 -40 Q-24 -48 -18 -48 Q-12 -48 -12 -40 L-11 -46 Q-10 -54 -4 -53 Q2 -53 2 -45 L3 -34 L5 -74 Q6 -88 15 -91 Q22 -93 23 -87 Q23 -82 17 -79 L16 -36 L22 -39 Q29 -42 31 -35 Q31 -29 24 -24 L19 -11 L10 6 Z",
      creases: "M-12 -35 L-11 -24 M1 -39 L2 -27 M24 -26 Q14 -30 8 -23"
    },
    chest: {
      bounds: [-27, -94, 56, 100], extended: ["index", "middle", "ring", "little"], thumb: [27, -39],
      outline: "M-10 6 C-14 -5 -24 -16 -25 -31 L-27 -65 Q-27 -72 -22 -73 Q-16 -74 -15 -66 L-13 -42 L-17 -80 Q-18 -88 -12 -89 Q-6 -90 -5 -81 L-2 -45 L-3 -86 Q-3 -94 3 -94 Q10 -94 10 -86 L10 -44 L13 -77 Q14 -85 20 -83 Q26 -82 24 -74 L19 -35 L22 -43 Q24 -48 29 -45 Q29 -40 26 -34 L23 -20 Q20 -7 10 6 Z",
      creases: "M-14 -42 L-12 -32 M-2 -43 L-1 -32 M10 -41 L9 -31 M23 -29 L18 -21"
    }
  };

  const handShapes = Object.freeze(Object.keys(artwork));
  const fingers = ["thumb", "index", "middle", "ring", "little"];
  const handMetadata = Object.freeze(Object.fromEntries(handShapes.map((shape) => {
    const art = artwork[shape];
    const [x, y, width, height] = art.bounds;
    return [shape, Object.freeze({
      wrist: Object.freeze({ x: 0, y: 0 }),
      thumbSide: "positive-x",
      thumbTip: Object.freeze({ x: art.thumb[0], y: art.thumb[1] }),
      bounds: Object.freeze({ x, y, width, height }),
      extendedFingers: Object.freeze(art.extended.slice()),
      curledFingers: Object.freeze(fingers.filter((finger) => !art.extended.includes(finger))),
      contact: art.tip ? Object.freeze({ x: art.tip[0], y: art.tip[1] }) : null,
      projectedLength: art.projectedLength || null
    })];
  })));

  function hand(x, y, angle, shape) {
    return { wrist: { x, y }, angle, shape };
  }

  function contactHand(shape, side, x, y, angle) {
    const tip = handMetadata[shape].contact;
    const tx = side === "right" ? -tip.x : tip.x;
    const a = angle * radians;
    return hand(x - tx * Math.cos(a) + tip.y * Math.sin(a), y - tx * Math.sin(a) - tip.y * Math.cos(a), angle, shape);
  }

  const restLeft = hand(444, 945, 160, "relaxed");
  const restRight = hand(636, 945, -160, "relaxed");
  const definitions = [
    { id: "rest", label: "Rest", description: "Relaxed hands beside the waist.", left: restLeft, right: restRight },
    { id: "open-palms", label: "Open Palms / Explain", description: "Cupped, upward-facing palms offer an explanation at waist level.", left: hand(418, 874, 65, "palm-up"), right: hand(662, 868, -65, "palm-up") },
    { id: "point-up", label: "Point Up", description: "Both index fingers point up, outside the face, slightly inward.", left: hand(285, 663, 7, "index-up"), right: hand(795, 663, -7, "index-up") },
    { id: "point-front", label: "Point Toward Camera", description: "One foreshortened index with a round fingertip; the other four fingers are curled.", left: restLeft, right: hand(639, 828, -8, "index-front") },
    { id: "empathy", label: "Empathy / Chest", description: "Two close-finger hands rest over the chest.", left: hand(479, 845, 18, "chest"), right: hand(601, 835, -18, "chest") },
    { id: "directional", label: "Narrative Sweep", description: "One rightward presenting sweep, then a quiet hold.", left: hand(441, 911, 73, "palm-up"), right: hand(900, 813, 70, "palm-up"), fromRight: hand(838, 834, 65, "palm-up"), duration: 0.8 },
    { id: "stop", label: "Stop", description: "Two front-facing palms press forward once and hold.", left: hand(425, 805, 0, "palm-front"), right: hand(655, 805, 0, "palm-front"), fromLeft: hand(431, 835, -5, "palm-front"), fromRight: hand(649, 835, 5, "palm-front"), duration: 0.5 },
    { id: "chop", label: "Chop", description: "A narrow edge-on right hand makes one downward chopping stroke.", left: hand(479, 917, 80, "palm-up"), right: hand(674, 887, -90, "blade"), fromRight: hand(674, 827, -82, "blade"), duration: 0.55 },
    { id: "steeple", label: "Steeple", description: "Grouped fingertips from both hands meet exactly above the waist.", left: contactHand("steeple", "left", 540, 770, 34), right: contactHand("steeple", "right", 540, 770, -34) },
    { id: "count-1", label: "Count One", description: "One upright index; thumb and three other fingers tucked.", left: restLeft, right: hand(649, 807, -10, "index-up") },
    { id: "count-2", label: "Count Two", description: "Index and middle fingers extended; the others tucked.", left: restLeft, right: hand(649, 807, -10, "count-2") },
    { id: "count-3", label: "Count Three", description: "Index, middle and ring fingers extended; thumb and little finger tucked.", left: restLeft, right: hand(649, 807, -10, "count-3") },
    { id: "scale-wide", label: "Size / Wide", description: "Narrow palms mark a broad span without enlarging the hands.", left: hand(191, 805, -33, "blade"), right: hand(889, 805, 33, "blade") },
    { id: "scale-small", label: "Size / Small", description: "Narrow palms mark a small span at the waist.", left: hand(487, 865, 23, "blade"), right: hand(593, 865, -23, "blade") },
    { id: "pinch", label: "Precision Pinch", description: "Thumb and index close around a small transparent precision opening.", left: hand(448, 911, 70, "palm-up"), right: hand(652, 815, -15, "pinch") },
    { id: "thinking", label: "Thinking", description: "A curved index fingertip touches the chin at screen (565,621).", left: restLeft, right: contactHand("chin", "right", 565, 621, -44) },
    { id: "wave", label: "Wave", description: "One small greeting arc outside the face, then hold; no repeated waving.", left: restLeft, right: hand(811, 704, -14, "palm-front"), fromRight: hand(800, 711, 14, "palm-front"), duration: 0.65 }
  ];
  const gestures = Object.freeze(definitions.map(({ id, label, description }) => Object.freeze({ id, label, description })));

  function sampleGesture(id, ageSeconds = 0) {
    const definition = definitions.find((entry) => entry.id === id) || definitions[0];
    const age = ageSeconds === Infinity ? Infinity : Number.isFinite(ageSeconds) ? Math.max(0, ageSeconds) : 0;
    const t = definition.duration ? Math.min(1, age / definition.duration) : 1;
    // Quintic ease has zero velocity and acceleration at the move/hold boundary.
    const progress = t * t * t * (t * (t * 6 - 15) + 10);
    const pose = {};
    for (const side of ["left", "right"]) {
      const end = definition[side];
      const start = definition[side === "left" ? "fromLeft" : "fromRight"] || end;
      pose[side] = hand(
        start.wrist.x + (end.wrist.x - start.wrist.x) * progress,
        start.wrist.y + (end.wrist.y - start.wrist.y) * progress,
        start.angle + (end.angle - start.angle) * progress,
        end.shape
      );
    }
    return pose;
  }

  function solveArm(shoulder, wrist, side = "left", lengths, explicitForearmLength) {
    if (!shoulder || !wrist || ![shoulder.x, shoulder.y, wrist.x, wrist.y].every(Number.isFinite)) {
      throw new TypeError("Arm shoulder and wrist must be finite {x,y} points.");
    }
    if (side && typeof side === "object") {
      lengths = side;
      side = "left";
    }
    const upperLength = typeof lengths === "number" ? lengths
      : lengths?.upperArmLength ?? lengths?.upperLength ?? defaultUpperLength;
    const forearmLength = explicitForearmLength ?? (typeof lengths === "object" ? lengths?.forearmLength : undefined) ?? defaultForearmLength;
    if (![upperLength, forearmLength].every((value) => Number.isFinite(value) && value > 0)) {
      throw new TypeError("Arm lengths must be positive finite numbers.");
    }
    const sign = side === "right" ? 1 : -1;
    let dx = wrist.x - shoulder.x;
    let dy = wrist.y - shoulder.y;
    // Scale before normalizing, including inputs whose difference overflows.
    let scale = Math.max(Math.abs(dx), Math.abs(dy));
    if (!Number.isFinite(scale)) {
      scale = Math.max(Math.abs(wrist.x), Math.abs(wrist.y), Math.abs(shoulder.x), Math.abs(shoulder.y));
      dx = wrist.x / scale - shoulder.x / scale;
      dy = wrist.y / scale - shoulder.y / scale;
      scale = 1;
    }
    const magnitude = scale ? Math.hypot(dx / scale, dy / scale) : 0;
    const ux = magnitude ? (dx / scale) / magnitude : sign * Math.SQRT1_2;
    const uy = magnitude ? (dy / scale) / magnitude : Math.SQRT1_2;
    const distance = Math.hypot(wrist.x - shoulder.x, wrist.y - shoulder.y);
    const reach = Math.max(Math.abs(forearmLength - upperLength) + 0.01, Math.min(upperLength + forearmLength - 0.01, distance));
    const along = (upperLength * upperLength - forearmLength * forearmLength + reach * reach) / (2 * reach);
    const height = Math.sqrt(Math.max(0, upperLength * upperLength - along * along));
    const baseX = shoulder.x + ux * along;
    const baseY = shoulder.y + uy * along;
    const candidates = [
      { x: baseX - uy * height, y: baseY + ux * height },
      { x: baseX + uy * height, y: baseY - ux * height }
    ];
    const outward = candidates.filter((point) => sign * (point.x - shoulder.x) >= -1e-9);
    // Prefer a downwards elbow when both branches are already outside the torso.
    const elbow = outward.length === 2 ? outward.reduce((a, b) => a.y >= b.y ? a : b)
      : outward[0] || candidates.reduce((a, b) => sign * a.x >= sign * b.x ? a : b);
    const resolved = distance === reach ? { x: wrist.x, y: wrist.y }
      : { x: shoulder.x + ux * reach, y: shoulder.y + uy * reach };
    return {
      shoulder: { x: shoulder.x, y: shoulder.y }, elbow, wrist: resolved,
      forearmAngle: Math.atan2(resolved.y - elbow.y, resolved.x - elbow.x) / radians,
      upperLength, forearmLength
    };
  }

  function sleevePath(shoulder, elbow, wrist) {
    const upper = Math.hypot(elbow.x - shoulder.x, elbow.y - shoulder.y);
    const lower = Math.hypot(wrist.x - elbow.x, wrist.y - elbow.y);
    if (![shoulder.x, shoulder.y, elbow.x, elbow.y, wrist.x, wrist.y, upper, lower].every(Number.isFinite) || !upper || !lower) {
      throw new TypeError("Sleeve needs three finite, noncoincident joint points.");
    }
    const u = { x: (elbow.x - shoulder.x) / upper, y: (elbow.y - shoulder.y) / upper };
    const v = { x: (wrist.x - elbow.x) / lower, y: (wrist.y - elbow.y) / lower };
    const n = { x: -u.y, y: u.x };
    const m = { x: -v.y, y: v.x };
    const turn = u.x * v.y - u.y * v.x;
    const dot = Math.max(-1, Math.min(1, u.x * v.x + u.y * v.y));
    const number = (value) => Number(value.toFixed(4)).toString();
    const point = (p) => `${number(p.x)} ${number(p.y)}`;
    const offset = (p, axis, distance, normal, width) => ({ x: p.x + axis.x * distance + normal.x * width, y: p.y + axis.y * distance + normal.y * width });
    const edge = (sign) => {
      const outer = sign * turn < 0;
      const miter = 20 * Math.sqrt(Math.max(0, (1 - dot) / Math.max(0.0001, 1 + dot)));
      const trim = outer ? 0 : Math.min(upper * 0.9, lower * 0.9, miter + 8);
      const start = offset(shoulder, u, 0, n, sign * 27);
      const before = offset(elbow, u, -trim, n, sign * 20);
      const after = offset(elbow, v, trim, m, sign * 20);
      const end = offset(wrist, v, 0, m, sign * 14);
      const joinLength = Math.max(0, Math.min(8, trim - miter) * 0.55);
      return {
        start, before, after, end, outer,
        upper1: offset(shoulder, u, upper * 0.35, n, sign * 26),
        upper2: offset(before, u, -Math.min(30, (upper - trim) * 0.35), n, 0),
        join1: offset(before, u, joinLength, n, 0),
        join2: offset(after, v, -joinLength, m, 0),
        lower1: offset(after, v, Math.min(35, (lower - trim) * 0.35), m, 0),
        lower2: offset(wrist, v, -lower * 0.3, m, sign * 16)
      };
    };
    const a = edge(1);
    const b = edge(-1);
    const join = (e, reverse) => e.outer
      ? `A20 20 0 0 ${reverse ? Number(turn < 0) : Number(turn > 0)} ${point(reverse ? e.before : e.after)}`
      : `C${point(reverse ? e.join2 : e.join1)} ${point(reverse ? e.join1 : e.join2)} ${point(reverse ? e.before : e.after)}`;
    return `M${point(a.start)} C${point(a.upper1)} ${point(a.upper2)} ${point(a.before)} ${join(a, false)} C${point(a.lower1)} ${point(a.lower2)} ${point(a.end)} L${point(b.end)} C${point(b.lower2)} ${point(b.lower1)} ${point(b.after)} ${join(b, true)} C${point(b.upper2)} ${point(b.upper1)} ${point(b.start)} Q${point(offset(shoulder, u, -20, n, 0))} ${point(a.start)} Z`;
  }

  function cuffGeometry(elbow, wrist) {
    if (!elbow || !wrist || ![elbow.x, elbow.y, wrist.x, wrist.y].every(Number.isFinite)) {
      throw new TypeError("Cuff elbow and wrist must be finite {x,y} points.");
    }
    // +x is the cuff's width axis, perpendicular to elbow -> wrist.
    return { x: wrist.x, y: wrist.y, angle: Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x) / radians + 90, width: 34, height: 17 };
  }

  function handMarkup(shape) {
    const key = handShapes.includes(shape) ? shape : "relaxed";
    const art = artwork[key];
    return `<g class="avatar-hand-material avatar-skin-material avatar-limb-depth" data-hand-shape="${key}" data-thumb-side="positive-x" fill="var(--skin-color)" stroke="var(--outline-color)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path data-part="silhouette" d="${art.outline}"${art.evenodd ? ' fill-rule="evenodd"' : ""} /><path data-part="creases" d="${art.creases}" fill="none" stroke-width="1.6" opacity="0.45" /><path data-part="highlight" d="M-13 -15 Q-3 -6 9 -10" />${art.detail || ""}</g>`;
  }

  globalThis.GestureEngine = Object.freeze({
    gestures, handShapes, handMetadata, shoulders,
    handConvention: Object.freeze({ fingerDirection: "negative-y", thumbSide: "positive-x", leftMirror: 1, rightMirror: -1 }),
    sampleGesture, solveArm, sleevePath, cuffGeometry, handMarkup
  });
})();
