(function () {
  "use strict";

  const mouthShapes = Object.freeze(["A", "B", "C", "D", "E", "F", "G", "H", "X"]);
  const blinkTimes = [2.7, 5.8, 8.9, 12.1];

  function mouthAt(cues, time) {
    if (!Number.isFinite(time) || time < 0) return "X";
    let low = 0;
    let high = cues.length - 1;
    while (low <= high) {
      const mid = (low + high) >>> 1;
      const cue = cues[mid];
      if (time < cue.start) high = mid - 1;
      else if (time >= cue.end) low = mid + 1;
      else return mouthShapes.includes(cue.value) ? cue.value : "X";
    }
    return "X";
  }

  const expressions = Object.freeze({
    neutral: { eyeX: 1, eyeY: 1, pupil: 1, brow: 0, browY: 0, tilt: 0 },
    warm: { eyeX: 1, eyeY: 0.96, pupil: 1.02, brow: -2, browY: -2, tilt: -0.8 },
    sad: { eyeX: 1, eyeY: 0.88, pupil: 0.97, brow: -9, browY: 2, tilt: 1.5 },
    shock: { eyeX: 1.1, eyeY: 1.16, pupil: 0.65, brow: -3, browY: -13, tilt: -1.5 },
    focused: { eyeX: 1, eyeY: 0.69, pupil: 0.92, brow: 7, browY: 4, tilt: 0 },
    curious: { eyeX: 1.02, eyeY: 1.03, pupil: 0.98, brow: -5, browY: -4, tilt: 2.8 },
    confident: { eyeX: 1, eyeY: 0.92, pupil: 0.98, brow: 2, browY: -1, tilt: -0.6 }
  });
  const smooth = value => { const x = Math.max(0, Math.min(1, value)); return x * x * (3 - 2 * x); };
  const lerp = (a, b, amount) => a + (b - a) * amount;
  const cueAt = (cues, time) => cues.find(cue => cue.start <= time && time < cue.end);
  const canonicalRig = Object.freeze({
    shoulders: Object.freeze({ left: Object.freeze({ x: 378, y: 750 }), right: Object.freeze({ x: 702, y: 750 }) }),
    upperArmLength: 130,
    forearmLength: 138,
    gestureScale: Object.freeze({ x: 1, y: 1 }),
    offset: Object.freeze({ x: 0, y: 0 })
  });

  function metricsFor(options) {
    if (options.rig?.shoulders) return options.rig;
    if (options.profile?.rig) return options.profile.rig;
    return globalThis.AvatarProfiles?.getAvatar(options.avatar ?? "sana")?.rig ?? canonicalRig;
  }

  function mapHand(hand, metrics) {
    const scale = metrics.gestureScale ?? canonicalRig.gestureScale;
    const offset = metrics.offset ?? canonicalRig.offset;
    return {
      wrist: {
        x: 540 + (hand.wrist.x - 540) * scale.x + offset.x,
        y: 750 + (hand.wrist.y - 750) * scale.y + offset.y
      },
      angle: hand.angle,
      shape: hand.shape
    };
  }

  function mappedGesture(id, age, metrics) {
    const pose = globalThis.GestureEngine.sampleGesture(id, age);
    return { left: mapHand(pose.left, metrics), right: mapHand(pose.right, metrics) };
  }

  function eyeOpen(time, delay) {
    let openness = 1;
    const cycleStart = Math.floor(time / 13.1) * 13.1;
    for (const localStart of blinkTimes) {
      const start = cycleStart + localStart;
      const phase = (time - start - delay) / 0.19;
      if (phase > 0 && phase < 1) openness = Math.min(openness, 1 - 0.94 * Math.sin(phase * Math.PI));
    }
    return openness;
  }

  function poseAt(time, speechDuration, options = {}, speech = {}) {
    const t = Math.max(0, Number.isFinite(time) ? time : 0);
    const cues = options.actionCues?.length ? options.actionCues : speech.gestureCues ?? [];
    let cue = cueAt(cues, t);
    if (!cue && t >= speechDuration && t < speechDuration + 0.55) cue = cues.at(-1);
    const manual = options.gesture && options.gesture !== "auto";
    const gesture = manual ? options.gesture : cue?.gesture ?? (t >= speechDuration + 0.55 ? "rest" : "open-palms");
    const tailStart = speechDuration + 0.55;
    const age = Math.max(0, t - (cue?.start ?? (gesture === "rest" ? tailStart : 0)));
    const metrics = metricsFor(options);
    const lengths = { upperArmLength: metrics.upperArmLength, forearmLength: metrics.forearmLength };
    const hands = mappedGesture(gesture, age, metrics);
    if (!manual && (cue || gesture === "rest" && cues.length)) {
      const index = cue ? cues.indexOf(cue) : cues.length;
      const previousCue = index > 0 ? cues[index - 1] : null;
      const previous = mappedGesture(previousCue?.gesture ?? "rest", previousCue ? previousCue.end - previousCue.start : 0, metrics);
      const span = Math.min(0.28, cue ? cue.end - cue.start : 0.28);
      const amount = smooth(age / span);
      const direction = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
      const wrapped = angle => ((angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      // Blend joint angles, not IK branches: a lift must never flip the elbow.
      for (const side of ["left", "right"]) {
        const shoulder = metrics.shoulders[side];
        const a = globalThis.GestureEngine.solveArm(shoulder, previous[side].wrist, side, lengths);
        const b = globalThis.GestureEngine.solveArm(shoulder, hands[side].wrist, side, lengths);
        const startUpper = direction(shoulder, a.elbow);
        const endUpper = direction(shoulder, b.elbow);
        const upper = startUpper + wrapped(endUpper - startUpper) * amount;
        const bend = lerp(wrapped(direction(a.elbow, a.wrist) - startUpper), wrapped(direction(b.elbow, b.wrist) - endUpper), amount);
        const elbow = { x: shoulder.x + metrics.upperArmLength * Math.cos(upper), y: shoulder.y + metrics.upperArmLength * Math.sin(upper) };
        hands[side] = {
          elbow,
          wrist: { x: elbow.x + metrics.forearmLength * Math.cos(upper + bend), y: elbow.y + metrics.forearmLength * Math.sin(upper + bend) },
          angle: previous[side].angle + (((hands[side].angle - previous[side].angle + 540) % 360) - 180) * amount,
          shape: amount < 0.5 ? previous[side].shape : hands[side].shape
        };
      }
    }
    const emotionCue = cueAt(speech.emotionCues ?? [], t);
    const emotion = options.emotion && options.emotion !== "auto" ? options.emotion : options.actionCues?.length && cue?.emotion ? cue.emotion : emotionCue?.emotion ?? cue?.emotion ?? "neutral";
    const expression = expressions[emotion] ?? expressions.neutral;
    const nod = age < 0.8 ? Math.sin(age * Math.PI * 2 / 0.8) * (1 - age / 0.8) * 1.6 : 0;
    return {
      hands, expression, emotion, gesture, poseName: gesture,
      bodyY: 1.8 * Math.sin(t * 1.55),
      headY: 1.4 * Math.sin(t * 1.55 - 0.35),
      headAngle: expression.tilt + (gesture === "point-up" ? -2.3 : 0) + nod + 0.35 * Math.sin(t * 0.9),
      hairAngle: 0.4 * Math.sin(t * 0.9 - 0.24),
      leftEye: eyeOpen(t, 0),
      rightEye: eyeOpen(t, 0.025),
      gazeY: gesture === "point-up" ? -8 : 0,
      earringAngle: 1.5 * Math.sin(t * 1.6 - 0.3)
    };
  }

  function particleAt(index, time, bounds = { width: 1080, height: 1080 }, explicitHeight) {
    const width = Math.max(80, Number.isFinite(bounds) ? bounds : Number(bounds?.width) || 1080);
    const height = Math.max(80, Number.isFinite(explicitHeight) ? explicitHeight : Number(bounds?.height) || (Number.isFinite(bounds) ? bounds : 1080));
    const row = Math.floor(index / 16);
    const column = index % 16;
    const phase = row * 0.8 + column * 0.57;
    const t = Number.isFinite(time) ? time : 0;
    const marginX = Math.min(36, width * 0.1);
    const marginY = Math.min(36, height * 0.1);
    const driftScale = Math.min(1, width / 1080, height / 1080);
    return {
      x: marginX + column * (width - marginX * 2) / 15 + 5.5 * driftScale * Math.sin(t * 0.45 + phase),
      y: marginY + row * (height - marginY * 2) / 15 + 6.5 * driftScale * Math.cos(t * 0.38 + phase),
      radius: (1.65 + ((row * 7 + column * 3) % 5) * 0.32) * Math.max(0.65, driftScale),
      opacity: 0.3 + 0.45 * (0.5 + 0.5 * Math.sin(t * 0.4 + phase))
    };
  }

  const aspectDimensions = Object.freeze({
    "1:1": Object.freeze({ width: 1080, height: 1080 }),
    "9:16": Object.freeze({ width: 1080, height: 1920 }),
    "16:9": Object.freeze({ width: 1920, height: 1080 })
  });
  const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const formatted = (value) => Number(value.toFixed(3)).toString();
  const accessoryTransform = (value) => `translate(${value.x} ${value.y}) rotate(${value.rotation ?? 0}) scale(${value.scale ?? 1})`;
  const safeBackgroundSource = (value) => typeof value === "string"
    && /^assets\/[a-z0-9_./-]+\.(?:png|jpe?g|webp)$/i.test(value)
    && !value.includes("..") ? value : null;

  function layoutGeometry(width, height, layout) {
    if (layout === "split" && width === 1080 && height === 1080) {
      return { camera: { x: 189, y: 378, scale: 0.65 }, panel: { x: 54, y: 54, width: 972, height: 410 } };
    }
    if (layout === "split" && height > width) {
      return { camera: { x: 151, y: 1055, scale: 0.72 }, panel: { x: 54, y: 54, width: width - 108, height: 880 } };
    }
    if (layout === "split") {
      return { camera: { x: 1110, y: 270, scale: 0.75 }, panel: { x: 54, y: 54, width: 1010, height: height - 108 } };
    }
    if (height > width) return { camera: { x: 0, y: height - 1080, scale: 1 }, panel: { x: 54, y: 54, width: width - 108, height: 880 } };
    if (width > height) return { camera: { x: (width - 1080) / 2, y: 0, scale: 1 }, panel: { x: 54, y: 54, width: 1010, height: height - 108 } };
    return { camera: { x: 0, y: 0, scale: 1 }, panel: { x: 54, y: 54, width: 972, height: 410 } };
  }

  function mount(root, speech, initialOptions = {}) {
    if (!globalThis.GestureEngine || !globalThis.AvatarProfiles) throw new Error("Avatar profiles and the gesture engine must load before the rig.");
    let options = {
      avatar: "sana", background: "white-grid", customBackground: null, layout: "solo", aspectRatio: "1:1",
      placement: { x: 0, y: 0, scale: 1 }, outfit: "profile", glasses: "none", hat: "none",
      earrings: "profile", neckwear: "profile", gesture: "auto", emotion: "auto", ...initialOptions
    };
    let profile;
    let background;
    let bounds = aspectDimensions["1:1"];
    let lastTime = 0;
    const nodes = {};
    const requiredParts = [
      "model", "body", "head", "back-hair", "front-hair", "face", "ears", "face-details", "cheeks", "nose",
      "eye-left", "eye-right", "eye-shell-left", "eye-shell-right", "pupil-left", "pupil-right", "brow-left", "brow-right",
      "hat-back", "hat-front", "glasses", "neckwear", "earring-left", "earring-right", "mouth",
      "left-sleeve", "right-sleeve", "left-wrist", "right-wrist", "left-cuff", "right-cuff", "left-hand", "right-hand"
    ];
    for (const part of requiredParts) {
      nodes[part] = root.querySelector("#female-" + part);
      if (!nodes[part]) throw new Error("Missing avatar rig part: " + part);
    }
    const mouths = mouthShapes.map((shape) => {
      const node = root.querySelector("#female-mouth-" + shape);
      if (!node) throw new Error("Missing Rhubarb mouth shape: " + shape);
      return node;
    });
    const neutralMouthPath = root.querySelector("#female-mouth-X path");
    const field = root.querySelector("#female-particles");
    const svg = root.querySelector("#female-illustration");
    const camera = root.querySelector("#avatar-camera");
    const backdrop = root.querySelector("#avatar-background");
    const customBackground = root.querySelector("#avatar-custom-background");
    const placeholder = root.querySelector("#avatar-video-placeholder");
    const placeholderPanel = root.querySelector("#avatar-video-placeholder-panel");
    const placeholderPlay = root.querySelector("#avatar-video-placeholder-play");
    const placeholderTitle = root.querySelector("#avatar-video-placeholder-title");
    const placeholderSubtitle = root.querySelector("#avatar-video-placeholder-subtitle");
    const grid = root.querySelector("#avatar-background-grid");
    const title = root.querySelector("#female-title");
    const description = root.querySelector("#female-description");
    if (![field, svg, camera, backdrop, customBackground, placeholder, placeholderPanel, placeholderPlay, placeholderTitle, placeholderSubtitle, grid, title, description, neutralMouthPath].every(Boolean)) {
      throw new Error("Missing avatar canvas or accessibility part.");
    }
    field.replaceChildren();
    // Fixed population and timeline-only drift keep arbitrary canvases deterministic.
    const particles = Array.from({ length: 256 }, () => {
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      field.appendChild(dot);
      return dot;
    });
    const duration = finite(speech?.metadata?.duration, 0);
    const shapeCache = {};

    function buildGrid() {
      const marginX = Math.min(36, bounds.width * 0.1);
      const marginY = Math.min(36, bounds.height * 0.1);
      let path = "";
      for (let index = 1; index < 16; index++) {
        const x = marginX + index * (bounds.width - marginX * 2) / 15;
        const y = marginY + index * (bounds.height - marginY * 2) / 15;
        path += `M0 ${formatted(y)}H${bounds.width} M${formatted(x)} 0V${bounds.height} `;
      }
      grid.innerHTML = `<path d="${path}" />`;
    }

    function applyPlaceholder(panel) {
      const centerX = panel.x + panel.width / 2;
      const centerY = panel.y + panel.height / 2;
      placeholderPanel.setAttribute("x", formatted(panel.x));
      placeholderPanel.setAttribute("y", formatted(panel.y));
      placeholderPanel.setAttribute("width", formatted(panel.width));
      placeholderPanel.setAttribute("height", formatted(panel.height));
      placeholderPanel.setAttribute("rx", formatted(Math.min(24, panel.height * 0.045)));
      placeholderPlay.setAttribute("d", `M${formatted(centerX - 21)} ${formatted(centerY - 34)} V${formatted(centerY + 34)} L${formatted(centerX + 36)} ${formatted(centerY)} Z`);
      placeholderTitle.setAttribute("x", formatted(centerX));
      placeholderTitle.setAttribute("y", formatted(centerY + 72));
      placeholderSubtitle.setAttribute("x", formatted(centerX));
      placeholderSubtitle.setAttribute("y", formatted(centerY + 110));
    }

    function applyCanvas() {
      bounds = aspectDimensions[options.aspectRatio] ?? aspectDimensions["1:1"];
      const { width, height } = bounds;
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.setAttribute("width", String(width));
      svg.setAttribute("height", String(height));
      backdrop.setAttribute("width", String(width));
      backdrop.setAttribute("height", String(height));
      customBackground.setAttribute("width", String(width));
      customBackground.setAttribute("height", String(height));
      const composition = root.closest?.("[data-composition-id]");
      if (composition) {
        composition.setAttribute("data-width", String(width));
        composition.setAttribute("data-height", String(height));
      }
      const layout = layoutGeometry(width, height, options.layout);
      const placement = { x: finite(options.placement?.x, 0), y: finite(options.placement?.y, 0), scale: Math.max(0.1, finite(options.placement?.scale, 1)) };
      const x = layout.camera.x + placement.x;
      const y = layout.camera.y + placement.y;
      const scale = layout.camera.scale * placement.scale;
      camera.setAttribute("transform", `translate(${formatted(x)} ${formatted(y)})${scale === 1 ? "" : ` scale(${formatted(scale)})`}`);
      placeholder.setAttribute("opacity", options.layout === "split" && !options.video?.enabled ? "1" : "0");
      applyPlaceholder(layout.panel);
      buildGrid();
      particles.forEach((dot, index) => dot.setAttribute("r", formatted(particleAt(index, 0, bounds).radius)));
      root.dataset.aspectRatio = options.aspectRatio in aspectDimensions ? options.aspectRatio : "1:1";
    }

    function applyFeatures() {
      const feature = profile.features;
      nodes.ears.innerHTML = feature.ears;
      nodes["face-details"].innerHTML = feature.details;
      nodes.cheeks.innerHTML = feature.cheeks;
      nodes["eye-shell-left"].innerHTML = feature.eyeLeft;
      nodes["eye-shell-right"].innerHTML = feature.eyeRight;
      nodes["pupil-left"].innerHTML = feature.pupilLeft;
      nodes["pupil-right"].innerHTML = feature.pupilRight;
      nodes["brow-left"].innerHTML = feature.browLeft;
      nodes["brow-right"].innerHTML = feature.browRight;
    }

    function applyAccessories() {
      const selectedEarrings = options.earrings === "profile" ? profile.accessories.earrings : options.earrings;
      const selectedNeckwear = options.neckwear === "profile" ? profile.accessories.neckwear : options.neckwear;
      const glasses = globalThis.AvatarProfiles.getGlasses(options.glasses);
      const hat = globalThis.AvatarProfiles.getHat(options.hat);
      const earrings = globalThis.AvatarProfiles.getEarrings(selectedEarrings);
      const neckwear = globalThis.AvatarProfiles.getNeckwear(selectedNeckwear);
      nodes.glasses.innerHTML = glasses.markup;
      nodes["hat-back"].innerHTML = hat.backMarkup;
      nodes["hat-front"].innerHTML = hat.frontMarkup;
      nodes["earring-left"].innerHTML = earrings.markup;
      nodes["earring-right"].innerHTML = earrings.markup;
      nodes.neckwear.innerHTML = neckwear.markup;
      const anchors = profile.rig.wearableAnchors;
      nodes.glasses.setAttribute("transform", accessoryTransform(anchors.glasses));
      nodes["hat-back"].setAttribute("transform", accessoryTransform(anchors.hat));
      nodes["hat-front"].setAttribute("transform", accessoryTransform(anchors.hat));
    }

    function setOptions(next = {}) {
      options = { ...options, ...next, placement: { ...options.placement, ...next.placement } };
      profile = globalThis.AvatarProfiles.getAvatar(options.avatar);
      background = globalThis.AvatarProfiles.getBackground(options.background ?? profile.background);
      const colors = { ...profile.palette, ...options.palette };
      const variables = { skin: "skin-color", hair: "hair-color", cloth: "hoodie-color", shade: "cloth-shade", trim: "cloth-trim", outline: "outline-color", accent: "accent-color", skinShadow: "skin-shadow", lip: "lip-color", iris: "iris-color" };
      for (const [key, variable] of Object.entries(variables)) if (colors[key]) root.style.setProperty("--" + variable, colors[key]);
      const outfit = globalThis.AvatarProfiles.getOutfit(options.outfit);
      nodes.body.innerHTML = outfit.id === "profile" ? profile.body : outfit.bodyMarkup;
      nodes["back-hair"].innerHTML = profile.backHair;
      nodes["front-hair"].innerHTML = profile.frontHair;
      nodes.face.setAttribute("d", profile.facePath);
      // Optional lineless profiles paint the face fill without the shared outline class stroke.
      if (Number.isFinite(profile.outlineWidth)) nodes.face.style.strokeWidth = String(profile.outlineWidth);
      else nodes.face.style.removeProperty("stroke-width");
      applyLimbStyle();
      nodes.nose.setAttribute("d", profile.nosePath);
      // Rosy-bulb profiles draw their own nose volume, so the shared nose line is hidden.
      if (Number.isFinite(profile.noseStroke)) nodes.nose.style.strokeWidth = String(profile.noseStroke);
      else nodes.nose.style.removeProperty("stroke-width");
      const nose = profile.rig.noseTransform;
      nodes.nose.setAttribute("transform", `translate(${nose.x} ${nose.y}) translate(${nose.pivot.x} ${nose.pivot.y}) rotate(${nose.rotation}) scale(${nose.scaleX} ${nose.scaleY}) translate(${-nose.pivot.x} ${-nose.pivot.y})`);
      const mouth = profile.rig.mouthAnchor;
      const mouthScale = profile.rig.mouthScale;
      nodes.mouth.setAttribute("transform", `translate(${mouth.x} ${mouth.y}) scale(${mouthScale.x} ${mouthScale.y})`);
      applyFeatures();
      applyAccessories();
      title.textContent = profile.name + " - front-facing presenter";
      description.textContent = profile.description;
      const transparent = background.id === "transparent";
      const customSource = background.id === "custom" ? safeBackgroundSource(options.customBackground) : null;
      backdrop.setAttribute("fill", transparent ? "none" : background.color);
      backdrop.setAttribute("opacity", transparent ? "0" : "1");
      if (customSource) customBackground.setAttribute("href", customSource);
      else customBackground.removeAttribute("href");
      customBackground.setAttribute("opacity", customSource ? "1" : "0");
      field.setAttribute("fill", background.dotColor);
      field.setAttribute("opacity", transparent ? "0" : "1");
      grid.setAttribute("stroke", background.dotColor);
      grid.setAttribute("opacity", !transparent && background.grid && background.id !== "white-grid" ? "0.065" : "0");
      applyCanvas();
      render(lastTime);
    }

    // Flat-vector profiles draw the sleeves from solid cloth with a thin seam instead of the
    // shared gradient material, which reads as a translucent strap over a flat torso.
    function applyLimbStyle() {
      const flat = profile.limbStyle === "flat";
      for (const side of ["left", "right"]) {
        const sleeve = nodes[side + "-sleeve"];
        const cuff = nodes[side + "-cuff"];
        const upper = sleeve.parentElement;
        const targets = [
          [sleeve, ["fill", "filter", "stroke", "stroke-width"]],
          [cuff, ["fill", "stroke"]],
          [upper, ["stroke-width"]]
        ];
        if (!flat) {
          for (const [node, properties] of targets) for (const property of properties) node.style.removeProperty(property);
          continue;
        }
        sleeve.style.fill = profile.palette.cloth;
        sleeve.style.filter = "none";
        sleeve.style.stroke = profile.palette.shade;
        sleeve.style.strokeWidth = "2";
        cuff.style.fill = profile.palette.cloth;
        cuff.style.stroke = "none";
        upper.style.strokeWidth = "0";
      }
    }

    function drawArm(side, hand, bodyY) {
      const rig = profile.rig;
      const base = rig.shoulders[side];
      const shoulder = { x: base.x, y: base.y + bodyY };
      const target = { x: hand.wrist.x, y: hand.wrist.y + bodyY };
      const lengths = { upperArmLength: rig.upperArmLength, forearmLength: rig.forearmLength };
      const arm = hand.elbow
        ? { shoulder, elbow: { x: hand.elbow.x, y: hand.elbow.y + bodyY }, wrist: target }
        : globalThis.GestureEngine.solveArm(shoulder, target, side, lengths);
      nodes[side + "-sleeve"].setAttribute("d", globalThis.GestureEngine.sleevePath(arm.shoulder, arm.elbow, arm.wrist));
      const transform = `translate(${arm.wrist.x} ${arm.wrist.y}) rotate(${hand.angle})`;
      nodes[side + "-wrist"].setAttribute("transform", transform);
      const handScale = rig.handScale ?? 1;
      nodes[side + "-hand"].setAttribute("transform", `${transform} scale(${side === "right" ? -handScale : handScale} ${handScale})`);
      if (shapeCache[side] !== hand.shape) {
        nodes[side + "-hand"].innerHTML = globalThis.GestureEngine.handMarkup(hand.shape);
        shapeCache[side] = hand.shape;
      }
      const cuff = globalThis.GestureEngine.cuffGeometry(arm.elbow, arm.wrist);
      nodes[side + "-cuff"].setAttribute("transform", `translate(${cuff.x} ${cuff.y}) rotate(${cuff.angle})`);
      nodes[side + "-hand"].dataset.shape = hand.shape;
    }

    function render(time) {
      lastTime = Number.isFinite(time) ? Math.max(0, time) : 0;
      const pose = poseAt(lastTime, duration, { ...options, profile }, speech);
      const rig = profile.rig;
      const pivot = rig.headPivot;
      nodes.body.setAttribute("transform", `translate(0 ${pose.bodyY.toFixed(3)})`);
      nodes.head.setAttribute("transform", `translate(0 ${pose.headY.toFixed(3)}) rotate(${pose.headAngle.toFixed(3)} ${pivot.x} ${pivot.y})`);
      nodes["back-hair"].setAttribute("transform", `translate(0 ${pose.headY.toFixed(3)}) rotate(${(pose.headAngle + pose.hairAngle).toFixed(3)} ${pivot.x} ${pivot.y})`);
      const neck = rig.wearableAnchors.neckwear;
      nodes.neckwear.setAttribute("transform", `translate(0 ${pose.bodyY.toFixed(3)}) ${accessoryTransform(neck)}`);
      drawArm("left", pose.hands.left, pose.bodyY);
      drawArm("right", pose.hands.right, pose.bodyY);
      const eyeX = rig.eyeScale.x * pose.expression.eyeX;
      const eyeY = rig.eyeScale.y * pose.expression.eyeY;
      for (const side of ["left", "right"]) {
        const eye = rig.eyeAnchors[side];
        const openness = side === "left" ? pose.leftEye : pose.rightEye;
        nodes["eye-" + side].setAttribute("transform", `translate(${eye.x} ${eye.y}) scale(${eyeX} ${openness * eyeY}) translate(${-eye.x} ${-eye.y})`);
        nodes["pupil-" + side].setAttribute("transform", `translate(${eye.x} ${eye.y + 6 + pose.gazeY}) scale(${pose.expression.pupil}) translate(${-eye.x} ${-(eye.y + 6)})`);
        const brow = rig.browAnchors[side];
        const angle = side === "left" ? pose.expression.brow : -pose.expression.brow;
        nodes["brow-" + side].setAttribute("transform", `translate(0 ${pose.expression.browY}) rotate(${angle} ${brow.x} ${brow.y})`);
      }
      const ear = rig.wearableAnchors.earrings;
      nodes["earring-left"].setAttribute("transform", `translate(${ear.left.x} ${ear.left.y}) rotate(${pose.earringAngle}) scale(${ear.scale})`);
      nodes["earring-right"].setAttribute("transform", `translate(${ear.right.x} ${ear.right.y}) rotate(${-pose.earringAngle * 0.7}) scale(${-ear.scale} ${ear.scale})`);
      const active = mouthAt(speech?.mouthCues ?? [], lastTime);
      mouths.forEach((node, index) => { node.style.opacity = mouthShapes[index] === active ? "1" : "0"; });
      nodes.mouth.dataset.mouth = active;
      root.dataset.pose = pose.poseName;
      root.dataset.emotion = pose.emotion;
      root.dataset.avatar = profile.id;
      root.dataset.kind = profile.kind;
      neutralMouthPath.setAttribute("d", pose.emotion === "sad" ? "M-40 10 Q0 -4 40 10" : pose.emotion === "focused" ? "M-38 3 Q0 0 38 3" : pose.emotion === "shock" ? "M-19 2 Q0 -2 19 2" : "M-43 -3 Q0 23 43 -3 M-44 -3 L-48 2");
      particles.forEach((dot, index) => {
        const particle = particleAt(index, lastTime, bounds);
        dot.setAttribute("cx", particle.x.toFixed(3));
        dot.setAttribute("cy", particle.y.toFixed(3));
        dot.setAttribute("opacity", (particle.opacity * (background.dotOpacity ?? 1)).toFixed(3));
      });
    }
    setOptions(options);
    return { render, setOptions };
  }

  globalThis.AvatarRig = Object.freeze({ mouthShapes, mouthAt, poseAt, particleAt, expressions, aspectDimensions, mount });
})();
