/* Interactive editor only. The exported composition uses its paused GSAP timeline. */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const all = selector => [...document.querySelectorAll(selector)];
  const names = Object.fromEntries(GestureEngine.gestures.map(item => [item.id, item.label]));
  const emotionNames = { neutral: "Neutral", warm: "Warm", sad: "Empathetic", shock: "Shocked", focused: "Focused", curious: "Curious", confident: "Confident" };
  const emotionHints = { neutral: "Calm listening", warm: "Friendly eyes", sad: "Raised inner brows", shock: "Wide eyes / smaller pupils", focused: "Narrowed eyes", curious: "A thoughtful head tilt", confident: "A steady expression" };
  const dimensions = { "1:1": [1080, 1080], "9:16": [1080, 1920], "16:9": [1920, 1080] };
  const pressedSettings = { avatar: "avatar", gesture: "gesture", emotion: "emotion", layout: "layout", background: "background", aspectRatio: "aspect-ratio" };
  const hiddenProfiles = new Set(["bearded-man", "curly-boy", "cap-guy", "pompadour-guy", "soft-bust", "blond-swept", "clay", "homer", "bart"]);
  const sample = "The upper video you are seeing is an emotional video of a baby who is going with his mother, and then he stopped.";
  let state, svg, rig, speech, silent = false, overrides = {}, busy = false, playing = false, time = 0, startedAt = 0;
  let voiceSource = "upload", voiceReference = null, edgeVoices = [], edgeCatalogReady = false;
  const audio = $("narration"), video = $("stage-video");
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const options = () => ({ ...state.settings, ...(silent ? { actionCues: [], ...overrides } : {}) });
  const placementFromControls = () => ({ x: Number($("position-x").value), y: Number($("position-y").value), scale: Number($("position-scale").value) / 100 });
  const length = () => speech?.renderDuration ?? speech?.metadata?.duration ?? 1;
  const format = value => `${String(Math.floor(value / 60)).padStart(2, "0")}:${(value % 60).toFixed(1).padStart(4, "0")}`;
  function notice(text, error = false) {
    $("notice-text").textContent = text;
    $("notice").classList.toggle("is-error", error);
  }
  function controls() {
    $("performance-fieldset").disabled = busy || !state;
    all("[data-write]").forEach(node => { node.disabled = busy || !state; });
    $("play-button").disabled = busy || !rig;
    $("scrubber").disabled = busy || !rig;
    $("export-button").disabled = busy || !state || silent;
    $("export-format").disabled = busy || !state || silent;
    const capabilities = state?.capabilities ?? {};
    $("edge-generate").disabled = busy || !state || capabilities.edge !== true || !edgeCatalogReady || !$("edge-voice").value;
    $("omni-generate").disabled = busy || !state || capabilities.omni !== true || !voiceReference;
    $("use-ai-cues").disabled = busy || !state || capabilities.aiCues !== true;
    $("use-video-audio").disabled = busy || !state?.uploads?.video?.hasAudio;
    const edgeTab = document.querySelector('[data-voice-source="edge"]');
    edgeTab.disabled = false;
    edgeTab.title = capabilities.edge === true ? "Internet connection required." : "Edge TTS dependencies are unavailable. Open this tab for details.";
    const omniTab = document.querySelector('[data-voice-source="omni"]');
    omniTab.disabled = false;
    omniTab.title = capabilities.omni === true ? "" : "Add a Hugging Face token in Settings to enable voice cloning.";
    $("save-cues").disabled = busy || silent || !state;
    $("notice").classList.toggle("is-busy", busy);
    all(".cast-option").forEach(node => { node.disabled = busy; });
  }
  async function request(path, body, method = "POST") {
    const response = await fetch(path, { method, ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Local operation failed.");
    return result;
  }
  async function job(label, fn, errorPrefix = "") {
    if (busy) return;
    busy = true; controls(); notice(label);
    try { return await fn(); }
    catch (error) { notice(errorPrefix + error.message, true); }
    finally { busy = false; controls(); }
  }
  function mountStage() {
    $("rig-stage").classList.add("rig");
    $("rig-stage").innerHTML = svg;
    rig = AvatarRig.mount($("rig-stage"), speech, options());
    render(time);
  }
  function updateVideo(reload = false) {
    const shown = options().layout === "split" && state.settings.video.enabled;
    $("stage-shell").dataset.layout = options().layout;
    video.hidden = !shown;
    $("video-empty").hidden = options().layout !== "split" || shown;
    if (shown && (reload || !video.getAttribute("src"))) {
      video.src = "/" + state.settings.video.src + "?v=" + Date.now();
    }
    if (!shown) video.pause();
  }
  /** Mirrors server provider readiness in the voice panel and the settings dialog. */
  function syncProviders() {
    const providers = state?.providers ?? {};
    const providerText = (id, label, fallback) => {
      const item = providers[id] ?? {};
      const node = $(`${id === "aiCues" ? "openrouter" : id}-status`);
      node.className = item.error ? "is-error" : item.ready ? "is-ready" : "is-setup";
      node.lastChild.textContent = `${label}: ${item.error || (item.ready ? "ready" : item.requirement || fallback)}`;
    };
    providerText("edge", "Edge catalog", "checking current voices");
    providerText("omni", "Omni", "add a Hugging Face token in Settings");
    providerText("aiCues", "OpenRouter", "add an OpenRouter key in Settings");
    for (const [id, statusId, removeId] of [["aiCues", "settings-openrouter-status", "settings-openrouter-remove"], ["omni", "settings-omni-status", "settings-omni-remove"]]) {
      const item = providers[id] ?? {};
      const badge = $(statusId);
      if (!badge) continue;
      badge.className = `settings-status ${item.ready ? "is-ready" : item.error ? "is-error" : "is-setup"}`;
      badge.lastChild.textContent = item.ready ? "Ready" : item.error ? "Key needs attention" : "No key saved";
      badge.title = item.error || item.requirement || (item.ready ? "Saved on this machine." : "");
      $(removeId).hidden = !item.ready && !item.error;
    }
  }
  function applyState(next, rebuild = false, reloadVideo = false) {
    state = next;
    if (!silent) {
      speech = state.speech;
      if (rebuild || !rig) mountStage();
      else rig.setOptions(options());
    } else rig.setOptions(options());
    if (rebuild || !audio.getAttribute("src")) {
      audio.src = "/assets/narration.wav?v=" + Date.now();
      audio.load();
    }
    const selected = AvatarProfiles.getAvatar(state.settings.avatar);
    $("stage-name").textContent = selected.name.toUpperCase() + " / LIVE PREVIEW";
    $("stage-outfit").textContent = state.settings.outfit === "profile" ? selected.outfit : state.settings.outfit;
    $("cast-description").textContent = selected.description;
    $("save-state").textContent = "Choices saved to your HyperFrames project";
    $("audio-file-name").textContent = state.uploads?.audio?.name ?? "WAV, MP3, M4A, AAC, OGG, FLAC, OPUS, AIFF, WebM or WMA";
    $("audio-file-name").title = state.uploads?.audio?.name ?? "";
    $("video-file-name").textContent = state.uploads?.video?.name ?? "MP4, WebM, MOV, MKV, M4V or AVI";
    $("video-file-name").title = state.uploads?.video?.name ?? "";
    if (state.uploads?.image?.name) $("background-file").title = state.uploads.image.name;
    syncProviders();
    $("source-hint").textContent = `Local uploads are ready. Edge exposes its live voice catalog. Omni and OpenRouter activate only when you add a key in Settings.`;
    $("audio-description").textContent = `Rhubarb / ${state.speech.metadata.duration.toFixed(2)} seconds`;
    $("video-enabled").checked = state.settings.video.enabled;
    const opt = options();
    for (const [key, attribute] of Object.entries(pressedSettings)) {
      all(`button[data-${attribute}]`).forEach(node => node.setAttribute("aria-pressed", String(node.dataset[key] === opt[key])));
    }
    for (const key of ["outfit", "glasses", "hat", "earrings", "neckwear"]) if ($(key)) $(key).value = opt[key];
    const aspect = dimensions[opt.aspectRatio] ? opt.aspectRatio : "1:1";
    const [width, height] = dimensions[aspect];
    $("stage-shell").dataset.aspect = aspect;
    $("stage-corner").textContent = `${width} x ${height} / 30 fps`;
    const placement = opt.placement ?? { x: 0, y: 0, scale: 1 };
    $("position-x").value = placement.x; $("position-y").value = placement.y; $("position-scale").value = Math.round(placement.scale * 100);
    $("position-x-value").textContent = placement.x; $("position-y-value").textContent = placement.y; $("position-scale-value").textContent = `${Math.round(placement.scale * 100)}%`;
    updateVideo(reloadVideo);
    timeline(); controls(); render(time);
  }
  async function save(patch) {
    await job("Saving your presenter choices...", async () => {
      const result = await request("/api/settings", patch);
      if (silent) for (const key of ["gesture", "emotion"]) if (patch[key]) overrides[key] = patch[key];
      applyState(result);
      notice("Saved. The same choices are used by HyperFrames export.");
    });
  }
  function render(value) {
    if (!rig) return;
    time = Math.max(0, Math.min(length(), value));
    rig.render(time);
    $("scrubber").max = length(); $("scrubber").value = time;
    $("current-time").textContent = format(time); $("total-time").textContent = format(length());
    const stage = $("rig-stage");
    $("active-gesture").textContent = names[stage.dataset.pose] ?? stage.dataset.pose;
    $("active-emotion").textContent = emotionNames[stage.dataset.emotion] ?? "Neutral";
    const cue = (silent ? speech.gestureCues : state.settings.actionCues.length ? state.settings.actionCues : speech.gestureCues ?? []).find(item => item.start <= time && time < item.end);
    $("active-cue-text").textContent = cue?.text || "A held pose, with no finger fidgeting.";
    all(".cue-block").forEach(node => node.classList.toggle("is-active", Number(node.dataset.start) <= time && time < Number(node.dataset.end)));
    all(".cue-playhead").forEach(node => { node.style.left = `${time / length() * 100}%`; });
  }
  function pause() {
    playing = false; audio.pause(); video.pause();
    $("play-icon").innerHTML = '<path d="m9 5 11 7-11 7z"/>';
    $("play-button").setAttribute("aria-label", "Play preview");
  }
  function seek(value) {
    if (!silent) audio.currentTime = Math.min(value, state.speech.metadata.duration);
    if (!video.hidden) video.currentTime = Math.min(value, state.settings.video.duration || value);
    startedAt = performance.now() - value * 1000;
    render(value);
  }
  async function play() {
    if (playing) return pause();
    if (time >= length() - 0.02) seek(0);
    startedAt = performance.now() - time * 1000;
    if (!silent) await audio.play();
    if (!video.hidden) { video.currentTime = Math.min(time, state.settings.video.duration); await video.play(); }
    playing = true;
    $("play-icon").innerHTML = '<path d="M7 5h4v14H7zm7 0h4v14h-4z"/>';
    $("play-button").setAttribute("aria-label", "Pause preview");
  }
  function frame(now) {
    if (playing && rig) {
      const next = silent ? (now - startedAt) / 1000 : audio.currentTime;
      render(next);
      if (next >= length() - 0.01 || !silent && audio.ended) pause();
    }
    requestAnimationFrame(frame);
  }
  function cueRow(cue) {
    const row = element("tr");
    for (const key of ["start", "end"]) {
      const cell = element("td"), input = element("input");
      input.type = "number"; input.step = "0.01"; input.min = "0"; input.value = cue[key].toFixed(2); input.dataset.field = key;
      input.setAttribute("aria-label", "Cue " + key); cell.append(input); row.append(cell);
    }
    for (const [key, values] of [["gesture", names], ["emotion", { "": "Follow script", ...emotionNames }]]) {
      const cell = element("td"), select = element("select"); select.dataset.field = key;
      for (const [id, label] of Object.entries(values)) { const option = element("option", "", label); option.value = id; select.append(option); }
      select.value = cue[key] ?? ""; select.setAttribute("aria-label", "Cue " + key); cell.append(select); row.append(cell);
    }
    const cell = element("td"), remove = element("button", "remove-cue", "x"); remove.type = "button"; remove.setAttribute("aria-label", "Remove cue");
    remove.onclick = () => row.remove(); cell.append(remove); row.append(cell); $("cue-rows").append(row);
  }
  function timeline() {
    const opt = options();
    const gestures = !silent && state.settings.actionCues.length ? state.settings.actionCues : speech.gestureCues ?? [];
    const emotional = speech.emotionCues ?? [];
    $("timeline-ruler").replaceChildren();
    const interval = Math.max(1, Math.ceil(length() / 12));
    for (let second = 0; second <= length(); second += interval) {
      const tick = element("span", "ruler-tick", String(second)); tick.style.left = `${second / length() * 100}%`; $("timeline-ruler").append(tick);
    }
    for (const [id, cues, key] of [["gesture-lane", gestures, "gesture"], ["emotion-lane", emotional, "emotion"]]) {
      const lane = $(id); lane.replaceChildren();
      if (!cues.length) lane.append(element("span", "cue-empty", "No automatic cues. Choose a preset or build with a script."));
      for (const cue of cues) {
        const block = element("button", "cue-block", key === "gesture" ? names[cue.gesture] : emotionNames[cue.emotion]);
        block.type = "button"; block.dataset.start = cue.start; block.dataset.end = cue.end;
        block.style.left = `${cue.start / length() * 100}%`; block.style.width = `${(cue.end - cue.start) / length() * 100}%`;
        block.title = `${cue.start.toFixed(2)}-${cue.end.toFixed(2)}s: ${cue.text ?? cue[key]}`;
        block.onclick = () => { pause(); seek(Math.min(cue.end - 0.01, cue.start + 0.35)); };
        lane.append(block);
      }
      lane.append(element("span", "cue-playhead"));
    }
    $("cue-rows").replaceChildren(); gestures.forEach(cueRow);
    $("cue-count").textContent = `${gestures.length} cues`;
    const basis = speech.timingBasis ?? "none";
    $("timing-badge").textContent = basis === "word-timestamps" ? "WORD-TIMED" : basis === "segment-timestamps" ? "COARSE SEGMENT TIMING" : "ESTIMATED GESTURE TIMING";
    $("timing-badge").classList.toggle("estimated", basis !== "word-timestamps");
    $("timing-description").textContent = silent ? "Gesture-only rehearsal. Timings are not a generated voice track." : basis === "word-timestamps" ? "Hands follow transcript timestamps. Mouths follow the actual audio." : "Rhubarb mouth timing is audio-based; add word timestamps for precise gesture timing.";
    $("gesture-pin-note").textContent = opt.gesture === "auto" ? "Follow cues" : "Pinned: " + names[opt.gesture];
    $("emotion-pin-note").textContent = opt.emotion === "auto" ? "Follow cues" : "Pinned: " + emotionNames[opt.emotion];
  }
  function cast() {
    $("cast-strip").replaceChildren();
    const profiles = AvatarProfiles.avatars.filter(profile => !hiddenProfiles.has(profile.id));
    $("cast-count").textContent = `${profiles.length} CURATED CHARACTERS`;
    for (const profile of profiles) {
      const button = element("button", "cast-option"); button.type = "button"; button.dataset.avatar = profile.id;
      const portrait = element("span", "portrait"), host = element("span", "rig"); host.innerHTML = svg; portrait.append(host);
      AvatarRig.mount(host, { metadata: { duration: 1 }, mouthCues: [] }, { avatar: profile.id, background: profile.background, gesture: "open-palms", emotion: "warm" }).render(0);
      host.querySelector("svg").setAttribute("viewBox", "240 120 600 760");
      const label = element("span", "cast-option-label");
      const kind = profile.kind ?? profile.category ?? (profile.gender === "male" ? "Male" : "Female");
      label.append(element("strong", "", profile.name), element("small", "", String(kind).replace(/\b\w/g, value => value.toUpperCase())));
      button.append(portrait, label); button.onclick = () => save({ avatar: profile.id }); $("cast-strip").append(button);
    }
  }
  function presets() {
    const fillSelect = (id, values) => {
      const select = $(id); select.replaceChildren();
      for (const item of values ?? []) { const option = element("option", "", item.name ?? item.label ?? item.id); option.value = item.id; select.append(option); }
    };
    fillSelect("outfit", AvatarProfiles.outfits);
    fillSelect("glasses", AvatarProfiles.glasses);
    fillSelect("hat", AvatarProfiles.hats);
    fillSelect("earrings", AvatarProfiles.earrings);
    fillSelect("neckwear", AvatarProfiles.neckwear);
    for (const item of GestureEngine.gestures) {
      const button = element("button", "gesture-option"); button.type = "button"; button.dataset.gesture = item.id; button.title = item.description;
      button.append(element("span", "gesture-mark", item.id.startsWith("count-") ? item.id.at(-1) : item.id === "point-up" ? "UP" : "+"), element("span", "", item.label)); $("gesture-grid").append(button);
    }
    for (const [id, label] of Object.entries(emotionNames)) {
      const button = element("button", "emotion-option"); button.type = "button"; button.dataset.emotion = id;
      button.append(element("strong", "", label), element("small", "", emotionHints[id])); $("emotion-grid").append(button);
    }
    for (const item of AvatarProfiles.backgrounds) {
      const button = element("button", "background-option"); button.type = "button"; button.dataset.background = item.id;
      const swatch = element("span", "background-swatch");
      swatch.style.setProperty("--swatch-color", item.color ?? "#ffffff"); swatch.style.setProperty("--swatch-dot", item.dotColor ?? "transparent");
      if (item.id === "transparent") swatch.style.backgroundImage = "linear-gradient(45deg,#d9d9d9 25%,transparent 25%),linear-gradient(-45deg,#d9d9d9 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d9d9d9 75%),linear-gradient(-45deg,transparent 75%,#d9d9d9 75%)";
      if (item.id === "custom") swatch.textContent = "+";
      button.append(swatch, element("span", "", item.name)); $("background-options").append(button);
    }
  }
  function setVoiceSource(source) {
    voiceSource = source;
    all("[data-voice-source]").forEach(button => { const active = button.dataset.voiceSource === source; button.classList.toggle("is-active", active); button.setAttribute("aria-pressed", String(active)); });
    all("[data-voice-panel]").forEach(panel => { panel.hidden = panel.dataset.voicePanel !== source; });
  }
  function updateEdgeVoiceOptions() {
    const locale = $("edge-language").value;
    const select = $("edge-voice"); select.replaceChildren();
    for (const voice of edgeVoices.filter(item => item.locale === locale)) {
      const person = voice.name.split("-").at(-1).replace(/Neural$/, "");
      const option = element("option", "", `${person} / ${voice.gender}`);
      option.value = voice.name; select.append(option);
    }
    if (!select.options.length) {
      const option = element("option", "", "No voices returned for this locale"); option.value = ""; select.append(option);
    }
    controls();
  }
  async function loadEdgeVoiceCatalog() {
    const result = await request("/api/voices/edge", undefined, "GET");
    edgeVoices = result.voices;
    const locales = [...new Set(edgeVoices.map(voice => voice.locale))];
    const languageNames = typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(["en"], { type: "language" }) : null;
    const select = $("edge-language"); select.replaceChildren();
    for (const locale of locales) {
      let display = locale;
      try { display = languageNames?.of(locale) ?? locale; } catch { /* Keep the provider locale verbatim. */ }
      const option = element("option", "", `${display} (${locale})`);
      option.value = locale; select.append(option);
    }
    select.value = locales.includes("en-US") ? "en-US" : locales[0];
    edgeCatalogReady = edgeVoices.length > 0;
    updateEdgeVoiceOptions();
  }
  function uploadRequest(path, file, progressId) {
    const progress = $(progressId), bar = progress?.firstElementChild;
    if (progress) progress.hidden = false;
    if (bar) bar.style.width = "0%";
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", path); xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.upload.onprogress = event => { if (bar && event.lengthComputable) bar.style.width = `${Math.round(event.loaded / event.total * 100)}%`; };
      xhr.onerror = () => reject(new Error("The local upload connection failed."));
      xhr.onload = () => {
        let result; try { result = JSON.parse(xhr.responseText); } catch { return reject(new Error("The local server returned an invalid upload response.")); }
        if (xhr.status < 200 || xhr.status >= 300) reject(new Error(result.error ?? "Upload failed.")); else resolve(result);
      };
      xhr.onloadend = () => { if (progress) progress.hidden = true; if (bar) bar.style.width = "0%"; };
      xhr.send(file);
    });
  }
  function applyBuiltState(result, message) {
    pause(); silent = false; overrides = {}; time = 0; speech = result.speech;
    $("script").value = speech.transcript || $("script").value;
    $("narration-controls").hidden = false; $("silent-note").hidden = true;
    $("mode-badge").textContent = "Real audio lip sync"; $("mode-badge").classList.remove("is-silent");
    applyState(result, true); notice(message);
    return result;
  }
  async function uploadVoiceReference(file) {
    if (!file) return;
    return job("Validating and privately normalizing the voice reference...", async () => {
      const result = await uploadRequest(`/api/voice-reference?name=${encodeURIComponent(file.name)}`, file, "reference-upload-progress");
      voiceReference = result;
      $("voice-reference-name").textContent = `${result.name} / ${result.duration.toFixed(1)}s / private`;
      notice("Private voice reference is ready. It expires automatically and is consumed after one successful clone.");
      controls();
      return result;
    });
  }
  async function generateVoice(source) {
    return job(source === "edge" ? "Generating Edge TTS, then transcribing and animating..." : "Cloning the permitted reference voice, then transcribing and animating...", async () => {
      const script = $("script").value.trim();
      if (!script) throw new Error("Enter the script to speak first.");
      const body = source === "edge" ? {
        source, script, language: $("edge-language").value.split("-")[0], voice: $("edge-voice").value, maxPause: Number($("edge-pause").value) / 100, useAiCues: $("use-ai-cues").checked,
      } : {
        source, script, language: $("omni-language").value, referenceId: voiceReference?.id,
        referenceText: $("voice-reference-text").value, speed: Number($("omni-speed").value) / 100,
        consent: $("omni-consent").checked, useAiCues: $("use-ai-cues").checked,
      };
      const result = await request("/api/voice/generate", body);
      if (source === "omni") { voiceReference = null; $("voice-reference-file").value = ""; $("voice-reference-name").textContent = "Reference consumed. Upload another to clone again."; }
      return applyBuiltState(result, `${source === "edge" ? "Edge TTS" : "Omni voice clone"} is lip-synced with word-timed gestures and emotions.`);
    });
  }
  async function upload(kind, file) {
    if (!file) return;
    const imported = await job(`Importing ${kind} locally...`, async () => {
      const result = await uploadRequest(`/api/upload?kind=${kind}&name=${encodeURIComponent(file.name)}`, file, `${kind}-upload-progress`);
      applyState(result, false, kind === "video");
      notice(kind === "audio" ? "Recording imported." : kind === "image" ? "Custom background imported and saved." : "Video imported. Use the preview play button to synchronize voice and footage.");
      return result;
    });
    if (imported && kind === "audio" && $("auto-transcribe").checked) await buildLipSync(true);
  }
  async function buildLipSync(automatic = false) {
    return job(automatic ? "Upload saved. Transcribing audio and building lip-sync..." : "Converting audio and generating Rhubarb cues locally...", async () => {
      pause();
      const autoTranscribe = automatic || $("auto-transcribe").checked;
      const words = $("words").value.trim();
      const result = await request("/api/build", {
        script: autoTranscribe ? "" : $("script").value,
        ...(!autoTranscribe && words ? { words } : {}),
        recognizer: $("recognizer").value,
        useVideoAudio: $("use-video-audio").checked,
        autoTranscribe,
        language: $("language").value,
        useAiCues: $("use-ai-cues").checked,
      });
      return applyBuiltState(result, autoTranscribe ? "Automatic transcript, lip sync, emotions and gestures are ready." : "Real audio lip sync is ready. Manual cue overrides were reset for the new timing.");
    }, automatic ? "Upload saved, but automatic lip-sync failed: " : "");
  }
  async function restore() {
    pause(); silent = false; overrides = {}; time = 0; speech = state.speech;
    $("silent-note").hidden = true; $("narration-controls").hidden = false;
    $("mode-badge").textContent = "Real audio lip sync"; $("mode-badge").classList.remove("is-silent");
    applyState(state, true); notice("Current saved narration restored. No speech was generated by the script rehearsal.");
  }
  async function init() {
    try {
      const [data, drawing] = await Promise.all([request("/api/state", undefined, "GET"), request("/api/rig", undefined, "GET")]);
      svg = drawing.svg; state = data; speech = data.speech;
      presets(); cast(); applyState(data, true);
      if (data.capabilities.edge) {
        try { await loadEdgeVoiceCatalog(); }
        catch (error) { state.providers.edge.error = error.message; applyState(state); }
      }
      $("script").value = speech.transcript || data.demoScript;
      notice("Choose a presenter, then add narration or a video to accompany it.");
      requestAnimationFrame(frame);
    } catch (error) { notice(error.message, true); }
  }
  document.addEventListener("click", event => {
    const button = event.target.closest("button"); if (!button || busy) return;
    if (button.dataset.voiceSource) { setVoiceSource(button.dataset.voiceSource); return; }
    for (const [key, attribute] of Object.entries(pressedSettings)) {
      if (key === "avatar") continue;
      const value = button.dataset[key];
      if (key === "background" && value === "custom" && !state.settings.customBackground) { $("background-file").click(); return; }
      if (value) save({ [key]: value });
      else if (button.hasAttribute(`data-${attribute}`)) save({ [key]: button.getAttribute(`data-${attribute}`) });
    }
    if (button.getAttribute("role") === "tab") {
      all('[role="tab"]').forEach(tab => { const selected = tab === button; tab.setAttribute("aria-selected", selected); tab.tabIndex = selected ? 0 : -1; $(tab.getAttribute("aria-controls")).hidden = !selected; });
    }
  });
  $("play-button").onclick = () => play().catch(error => notice(error.message, true));
  $("scrubber").oninput = () => seek(Number($("scrubber").value));
  audio.onplay = () => { playing = true; $("play-icon").innerHTML = '<path d="M7 5h4v14H7zm7 0h4v14h-4z"/>'; $("play-button").setAttribute("aria-label", "Pause preview"); };
  audio.onpause = () => { if (!silent) pause(); };
  audio.onseeking = () => { if (!silent) render(audio.currentTime); };
  $("video-enabled").onchange = () => save({ video: { ...state.settings.video, enabled: $("video-enabled").checked } });
  $("stage-import-video").onclick = () => $("video-file").click();
  $("audio-file").onchange = async () => { const input = $("audio-file"); await upload("audio", input.files[0]); input.value = ""; };
  $("video-file").onchange = async () => { const input = $("video-file"); await upload("video", input.files[0]); input.value = ""; };
  $("voice-reference-file").onchange = async () => { const input = $("voice-reference-file"); await uploadVoiceReference(input.files[0]); input.value = ""; };
  $("background-file").onchange = async () => { const input = $("background-file"); await upload("image", input.files[0]); input.value = ""; };
  $("transparent-background").onclick = () => save({ background: "transparent" });
  for (const key of ["outfit", "glasses", "hat", "earrings", "neckwear"]) $(key).onchange = () => save({ [key]: $(key).value });
  const previewPlacement = () => {
    const placement = placementFromControls();
    $("position-x-value").textContent = placement.x; $("position-y-value").textContent = placement.y; $("position-scale-value").textContent = `${Math.round(placement.scale * 100)}%`;
    rig?.setOptions({ ...options(), placement }); rig?.render(time);
  };
  for (const id of ["position-x", "position-y", "position-scale"]) {
    $(id).oninput = previewPlacement;
    $(id).onchange = () => save({ placement: placementFromControls() });
  }
  $("reset-placement").onclick = () => save({ placement: { x: 0, y: 0, scale: 1 } });
  $("language").onchange = () => { if ($("language").value !== "en") $("recognizer").value = "phonetic"; };
  $("edge-language").onchange = updateEdgeVoiceOptions;
  $("edge-pause").oninput = () => { $("edge-pause-value").textContent = `${(Number($("edge-pause").value) / 100).toFixed(2)}s`; };
  $("omni-speed").oninput = () => { $("omni-speed-value").textContent = `${(Number($("omni-speed").value) / 100).toFixed(2)}x`; };
  $("edge-generate").onclick = () => generateVoice("edge");
  $("omni-generate").onclick = () => generateVoice("omni");
  $("export-format").onchange = () => {
    $("export-button").firstChild.textContent = $("export-format").value === "webm" ? "Export alpha WebM " : "Export fast MP4 ";
    if ($("export-format").value === "webm" && state?.settings.background !== "transparent") notice("Transparent WebM needs the transparent background option.");
  };
  $("words-file").onchange = async () => { const file = $("words-file").files[0]; if (file) $("words").value = await file.text(); };
  let transliteration = null;
  $("transliterate-button").onclick = () => job("Converting the script to Devanagari...", async () => {
    const text = $("script").value.trim();
    if (!text) throw new Error("Write or paste a script first.");
    const result = await request("/api/transliterate", { text });
    transliteration = result;
    $("translit-result").textContent = result.result;
    $("translit-title").textContent = result.looksEnglish ? "This already reads as English" : "Devanagari preview";
    $("translit-meta").textContent = `${result.script.toUpperCase()} → DEVANAGARI / ${result.words} WORDS`;
    $("translit-apply").disabled = !result.needsConversion;
    $("translit-panel").hidden = false;
    notice(result.needsConversion
      ? "Devanagari preview ready. Read it once, then use it if the spelling is right."
      : "Nothing to convert: this script is already Devanagari or plain English.");
  });
  $("translit-apply").onclick = () => {
    if (!transliteration) return;
    $("script").value = transliteration.result;
    $("words").value = "";
    $("translit-panel").hidden = true;
    notice("Script replaced with Devanagari. Timed transcript cleared so gesture timing is recalculated.");
  };
  $("translit-copy").onclick = async () => {
    if (!transliteration) return;
    try {
      await navigator.clipboard.writeText(transliteration.result);
      notice("Devanagari copied to the clipboard.");
    } catch {
      notice("Clipboard access was blocked. Select the preview text and copy it manually.", true);
    }
  };
  $("translit-close").onclick = () => { $("translit-panel").hidden = true; };
  $("sample-button").onclick = () => { $("script").value = sample; $("words").value = ""; $("sample-actions").hidden = false; notice("Preview this script silently, or import a recording that speaks these exact words."); };
  $("plan-button").onclick = () => job("Planning phrase-based gestures...", async () => {
    const text = $("script").value.trim(), words = $("words").value.trim();
    const plan = await request("/api/plan", { text, ...(words ? { words } : {}) });
    pause(); silent = true; overrides = { gesture: "auto", emotion: "auto" }; time = 0;
    speech = { ...plan, metadata: { duration: plan.duration }, renderDuration: plan.duration + 0.7, mouthCues: [] };
    $("narration-controls").hidden = true; $("silent-note").hidden = false;
    $("mode-badge").textContent = "Gesture-only rehearsal"; $("mode-badge").classList.add("is-silent");
    mountStage(); applyState(state); notice("Silent rehearsal ready. This has no generated speech and is not saved as narration.");
  });
  $("restore-voice").onclick = restore;
  $("build-button").onclick = () => buildLipSync(false);
  $("add-cue").onclick = () => {
    const rows = all("#cue-rows tr"), last = rows.at(-1)?.querySelector('[data-field="end"]');
    const start = last ? Number(last.value) : 0;
    if (start >= length()) return notice("The last cue reaches the end. Shorten or remove it before adding another.", true);
    cueRow({ start, end: Math.min(length(), start + 1), gesture: "open-palms" });
  };
  $("clear-cues").onclick = () => save({ actionCues: [] });
  $("save-cues").onclick = () => {
    if (silent) return notice("Build a matching recording before saving rehearsal cues.", true);
    const actionCues = all("#cue-rows tr").map(row => {
      const value = key => row.querySelector(`[data-field="${key}"]`).value;
      return { start: Number(value("start")), end: Number(value("end")), gesture: value("gesture"), ...(value("emotion") ? { emotion: value("emotion") } : {}) };
    });
    save({ actionCues });
  };
  $("export-button").onclick = () => job("Rendering at 1080p and 30 fps. The first export downloads the renderer once, so it takes longer than later ones...", async () => {
    if (silent) throw new Error("Return to matching narration before export.");
    const format = $("export-format").value;
    if (format === "webm" && (state.settings.background !== "transparent" || state.settings.layout !== "solo" || state.settings.video.enabled)) throw new Error("Transparent WebM needs Transparent background, Avatar only layout, and imported video switched off.");
    const name = $("export-name").value.trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,70}$/.test(name)) throw new Error("Filename must use only letters, numbers, underscores or hyphens.");
    pause(); const result = await request("/api/render", { name, format });
    const link = $("download-link"); link.href = result.fileURL; link.download = result.fileName; link.textContent = `Download ${result.fileName}`; link.hidden = false;
    notice(`${format.toUpperCase()} export complete: ${result.outputPath} (${result.metadata.width} x ${result.metadata.height}, ${result.metadata.fps} fps).`);
  });
  document.querySelector(".tabs").addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabs = all('[role="tab"]'), current = tabs.indexOf(document.activeElement);
    if (current < 0) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].click(); tabs[next].focus();
  });
  // Optional API keys: written to .env.local by the server, never rendered back.
  const settingsDialog = $("settings-dialog");
  function settingsNote(text, kind = "") {
    const node = $("settings-note");
    node.textContent = text;
    node.classList.toggle("is-error", kind === "error");
    node.classList.toggle("is-ok", kind === "ok");
  }
  function resetSettingsInputs() {
    for (const button of all("[data-reveal]")) {
      const input = $(button.dataset.reveal);
      input.value = "";
      input.type = "password";
      button.textContent = "Show";
      button.setAttribute("aria-pressed", "false");
    }
  }
  $("settings-button").onclick = () => {
    resetSettingsInputs();
    settingsNote("Keys activate immediately. Nothing is sent anywhere until you use the feature.");
    syncProviders();
    settingsDialog.showModal();
  };
  $("settings-close").onclick = () => settingsDialog.close();
  $("settings-cancel").onclick = () => settingsDialog.close();
  settingsDialog.addEventListener("click", event => {
    if (event.target === settingsDialog) settingsDialog.close();
  });
  all("[data-reveal]").forEach(button => {
    button.onclick = () => {
      const input = $(button.dataset.reveal), show = input.type === "password";
      input.type = show ? "text" : "password";
      button.textContent = show ? "Hide" : "Show";
      button.setAttribute("aria-pressed", String(show));
    };
  });
  async function saveCredentials(patch, message) {
    $("settings-save").disabled = true;
    try {
      const result = await request("/api/credentials", patch);
      if (state) {
        state.capabilities = result.capabilities;
        state.providers = result.providers;
        syncProviders();
        controls();
      }
      resetSettingsInputs();
      settingsNote(message, "ok");
      notice(message);
    } catch (error) {
      settingsNote(error.message, "error");
    } finally {
      $("settings-save").disabled = false;
    }
  }
  $("settings-save").onclick = () => {
    const patch = {};
    const openrouter = $("settings-openrouter").value.trim();
    const omni = $("settings-omni").value.trim();
    if (openrouter) patch.openrouter = openrouter;
    if (omni) patch.omnivoice = omni;
    if (!Object.keys(patch).length) return settingsNote("Type a key first, or use Remove saved key below a field.", "error");
    saveCredentials(patch, "Saved. The service is active now — no restart needed.");
  };
  $("settings-openrouter-remove").onclick = () => saveCredentials({ openrouter: null }, "OpenRouter key removed. AI cue analysis is off until you add one.");
  $("settings-omni-remove").onclick = () => saveCredentials({ omnivoice: null }, "Hugging Face token removed. Voice cloning is off until you add one.");
  setVoiceSource("upload");
  init();
})();
