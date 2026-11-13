# Focused Avatar Workflow

For requests to create an avatar video from a recording or Edge TTS script, do not audit or read the whole repository.

1. Read only `avatar/AI_AVATAR_VIDEO_HARNESS.md`.
2. Use `npm run avatar-job -- ...` from `avatar/`.
3. Read another project file only when the harness explicitly requires it or the command reports a specific failure there.
4. Do not edit the application for a normal video job.

The user can also invoke `/avatar-video` to load this focused workflow directly.
