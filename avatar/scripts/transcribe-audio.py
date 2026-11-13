import argparse
import json
import math
import os
import re
import sys
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser(
        description="Transcribe local avatar audio with faster-whisper word timestamps."
    )
    parser.add_argument("--audio", required=True, help="Local audio or voiced-video file")
    parser.add_argument("--output", required=True, help="Destination JSON file")
    parser.add_argument(
        "--language",
        default="auto",
        help="Language code or auto detection (default: auto)",
    )
    return parser.parse_args()


def transcribe(audio_path, language):
    try:
        from faster_whisper import WhisperModel
    except ImportError as error:
        raise RuntimeError(
            "faster-whisper is not installed for this Python 3.13 interpreter. "
            "Install it locally, then retry."
        ) from error

    model_name = os.environ.get("AVATAR_WHISPER_MODEL", "base").strip() or "base"
    try:
        model = WhisperModel(
            model_name,
            device="cpu",
            compute_type="int8",
            local_files_only=True,
        )
    except Exception as error:
        raise RuntimeError(
            f"Unable to load faster-whisper model {model_name!r}. Cache the model locally "
            "or set AVATAR_WHISPER_MODEL to a local model directory. "
            f"Details: {error}"
        ) from error

    try:
        segments, info = model.transcribe(
            str(audio_path),
            language=None if language == "auto" else language,
            beam_size=5,
            temperature=0.0,
            word_timestamps=True,
            vad_filter=False,
            condition_on_previous_text=True,
        )
        segments = list(segments)
    except Exception as error:
        raise RuntimeError(
            f"faster-whisper could not transcribe {audio_path.name!r}: {error}"
        ) from error

    words = []
    previous_end = 0.0
    for segment in segments:
        for item in segment.words or ():
            word = (item.word or "").strip()
            try:
                start = float(item.start)
                end = float(item.end)
            except (TypeError, ValueError):
                continue
            if not word or not math.isfinite(start) or not math.isfinite(end):
                continue
            start = max(0.0, previous_end, start)
            if end <= start:
                continue
            start = round(start, 6)
            end = round(end, 6)
            if end <= start:
                continue
            words.append({"word": word, "start": start, "end": end})
            previous_end = end

    if not words:
        raise RuntimeError(
            "No timestamped speech was detected. Check that the selected file contains an "
            "audible voice track and choose the correct language."
        )
    text = "".join(segment.text or "" for segment in segments).strip()
    if not text:
        text = " ".join(item["word"] for item in words)
    return {
        "text": text,
        "language": str(getattr(info, "language", None) or language),
        "words": words,
    }


def main():
    args = parse_args()
    if args.language != "auto" and not re.fullmatch(r"[a-z]{2,3}", args.language):
        raise RuntimeError("Language must be auto or a two/three letter ISO language code.")
    audio_path = Path(args.audio).expanduser().resolve()
    output_path = Path(args.output).expanduser().resolve()
    if not audio_path.is_file():
        raise RuntimeError(f"Audio input is not a readable file: {audio_path}")
    if audio_path == output_path:
        raise RuntimeError("Audio input and JSON output must be different files.")
    if not output_path.parent.is_dir():
        raise RuntimeError(f"Output directory does not exist: {output_path.parent}")

    result = transcribe(audio_path, args.language)
    temporary = output_path.with_name(f".{output_path.name}.{os.getpid()}.tmp")
    try:
        temporary.write_text(
            json.dumps(result, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        os.replace(temporary, output_path)
    finally:
        try:
            temporary.unlink()
        except FileNotFoundError:
            pass


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"transcribe-audio: {error}", file=sys.stderr)
        raise SystemExit(1)
