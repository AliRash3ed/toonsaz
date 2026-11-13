# Avatar Video Harness

Use this file for a normal avatar-video job. Do not inspect the full codebase and do not modify application code.

## Required Inputs

Ask only for missing essentials:

- Voice: an audio recording path, or a UTF-8 script file plus an Edge voice ID
- Avatar: one ID from the curated list below
- Output: a safe filename without an extension

Defaults: `ayan`, MP4, `1:1`, solo layout, white grid, automatic gestures, automatic emotions, automatic transcription.

Curated avatar IDs (36). Run `npm run avatar-job -- --avatars` for the live list.

Legacy (13): `sana`, `ayan`, `zain`, `noor`, `squircle`, `css-person`, `king`, `guard`, `inquisitor`, `heart`, `mouse`, `kawaii-cat`, `aarav`

Forma2D lineless cast (23): `forma-zara`, `forma-barnaby`, `forma-tariq`, `forma-kabir`, `forma-devon`, `forma-elena`, `forma-marcus`, `forma-mina`, `forma-kenji`, `forma-mei`, `forma-jinwoo`, `forma-priya`, `forma-haruto`, `forma-zainab`, `forma-arthur`, `forma-liam`, `forma-oliver`, `forma-noah`, `forma-chloe`, `forma-malik`, `forma-harper`, `forma-maya`, `forma-amara`

Useful Edge voice IDs: `en-US-JennyNeural`, `ur-PK-UzmaNeural`, `hi-IN-SwaraNeural`, `ja-JP-NanamiNeural`, `ar-SA-HamedNeural`. The editor exposes the complete live catalog.

## Run

Work from `avatar/`. First check `http://127.0.0.1:3010/api/status`. If unavailable, start `npm run library` as a tracked background process and wait for port 3010.

Recording to finished video:

```powershell
npm run avatar-job -- --audio "C:\path\voice.wav" --avatar ayan --output my-video
```

Recording plus companion footage:

```powershell
npm run avatar-job -- --audio "C:\path\voice.wav" --video "C:\path\footage.mp4" --avatar sana --aspect 16:9 --output my-video
```

Edge TTS script to finished video:

```powershell
npm run avatar-job -- --script-file "C:\path\script.txt" --edge-voice ja-JP-NanamiNeural --avatar noor --aspect 9:16 --output japanese-presenter
```

Optional flags: `--language auto|en|ur|hi|es|ja|ar`, `--background white-grid`, `--layout solo|split`, `--format mp4|webm`, `--ai-cues`.

Finished videos are moved to the workspace root (`sprite sheet character with lipsync`) and reported as a normal absolute Windows path. Use `--output-dir "C:\path\folder"` only when the user requests another destination. Do not report a `kilo-desktop://` URL.

`--ai-cues` uses OpenRouter only when `OPENROUTER_API_KEY` is configured. Without it, the deterministic local planner still creates script-based 1-5 second gesture and emotion cues. WebM requires transparent background, solo layout, and no companion video.

## Completion

Report only:

- Avatar and voice source used
- Automatic gesture/emotion status
- Output path returned by the command
- Any concrete failure and its exact prerequisite

Do not explain the repository architecture unless explicitly asked.
