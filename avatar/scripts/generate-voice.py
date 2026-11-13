import argparse
import asyncio
import os
import shutil
import subprocess
import sys
import tempfile
import re
from pathlib import Path


class AdapterError(RuntimeError):
    pass


def parse_args():
    parser = argparse.ArgumentParser(description="Generate private avatar narration.")
    parser.add_argument("--engine", required=True, choices=("edge", "omni", "local"))
    parser.add_argument("--script-file", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--language", required=True)
    parser.add_argument("--voice")
    parser.add_argument("--max-pause", type=float)
    parser.add_argument("--reference-audio")
    parser.add_argument("--reference-text-file")
    parser.add_argument("--speed", type=float)
    return parser.parse_args()


def readable_file(raw_path, label):
    path = Path(raw_path).expanduser().resolve()
    if not path.is_file():
        raise AdapterError(f"{label} is missing or unreadable.")
    return path


def read_text(path, label, maximum):
    try:
        text = path.read_text(encoding="utf-8").strip()
    except (OSError, UnicodeError) as error:
        raise AdapterError(f"{label} must be a readable UTF-8 file.") from error
    if not text or len(text) > maximum:
        raise AdapterError(f"{label} must contain 1 to {maximum:,} characters.")
    return text


def validate_args(args):
    script_path = readable_file(args.script_file, "Script file")
    script = read_text(script_path, "Script", 20000)
    output = Path(args.output).expanduser().resolve()
    if output.suffix.lower() != ".wav" or not output.parent.is_dir():
        raise AdapterError("Output must be a WAV file in an existing private directory.")
    if output.exists():
        raise AdapterError("Output file already exists.")
    if output == script_path:
        raise AdapterError("Output and script file must be different.")

    if args.engine == "edge":
        if args.voice is None or args.max_pause is None:
            raise AdapterError("Edge requires --voice and --max-pause.")
        if any(value is not None for value in (args.reference_audio, args.reference_text_file, args.speed)):
            raise AdapterError("Omni reference options cannot be used with Edge.")
        if not re.fullmatch(r"[a-z]{2,3}", args.language):
            raise AdapterError("Edge language must be a two or three letter code.")
        if not re.fullmatch(r"[a-z]{2,3}(?:-[A-Za-z0-9]+)+Neural", args.voice):
            raise AdapterError("Select a valid Edge neural voice.")
        if not args.voice.lower().startswith(f"{args.language.lower()}-"):
            raise AdapterError("The selected Edge voice does not support that language.")
        if not 0.10 <= args.max_pause <= 0.30:
            raise AdapterError("Edge max pause must be from 0.10 to 0.30 seconds.")
        return script, output, None, None

    if args.engine == "local":
        if sys.platform != "win32":
            raise AdapterError("Windows offline voices are only available on Windows.")
        if not args.voice:
            raise AdapterError("Windows offline voices require --voice.")
        if len(args.voice) > 200:
            raise AdapterError("Select an installed Windows voice.")
        if args.max_pause is not None or args.reference_audio is not None or args.reference_text_file is not None:
            raise AdapterError("Edge and Omni options cannot be used with Windows offline voices.")
        if args.speed is None or not 0.5 <= args.speed <= 1.5:
            raise AdapterError("Windows offline speed must be from 0.5 to 1.5.")
        if not re.fullmatch(r"[a-z]{2,3}", args.language):
            raise AdapterError("Windows offline language must be a two or three letter code.")
        return script, output, None, None

    if args.reference_audio is None or args.reference_text_file is None or args.speed is None:
        raise AdapterError("Omni requires reference audio, reference text, and speed.")
    if args.voice is not None or args.max_pause is not None:
        raise AdapterError("Edge voice options cannot be used with Omni.")
    if not 0.5 <= args.speed <= 1.5:
        raise AdapterError("Omni speed must be from 0.5 to 1.5.")
    if args.language not in ("en", "es"):
        raise AdapterError("Omni supports English or Spanish only.")
    reference_audio = readable_file(args.reference_audio, "Reference audio")
    reference_text_path = readable_file(args.reference_text_file, "Reference text file")
    reference_text = read_text(reference_text_path, "Reference text", 10000)
    if output in (reference_audio, reference_text_path):
        raise AdapterError("Output must be separate from reference inputs.")
    return script, output, reference_audio, reference_text


def ffmpeg_normalize(source, output, max_pause=None):
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise AdapterError("ffmpeg is required on PATH to normalize narration.")
    temporary = output.with_name(f".{output.name}.{os.getpid()}.tmp.wav")
    command = [
        ffmpeg,
        "-hide_banner",
        "-loglevel",
        "error",
        "-nostdin",
        "-y",
        "-i",
        str(source),
        "-map",
        "0:a:0",
        "-vn",
    ]
    if max_pause is not None:
        pause = f"{max_pause:.3f}"
        command.extend(
            [
                "-af",
                "silenceremove="
                f"stop_periods=-1:stop_duration={pause}:stop_threshold=-50dB:stop_silence={pause}",
            ]
        )
    command.extend(["-ac", "1", "-ar", "24000", "-c:a", "pcm_s16le", str(temporary)])
    try:
        result = subprocess.run(
            command,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        if result.returncode != 0 or not temporary.is_file() or temporary.stat().st_size == 0:
            raise AdapterError("ffmpeg could not normalize the generated audio.")
        os.replace(temporary, output)
    finally:
        try:
            temporary.unlink()
        except FileNotFoundError:
            pass


async def edge_generate(script, voice, destination):
    try:
        import edge_tts
    except ImportError as error:
        raise AdapterError("Edge TTS is unavailable. Install edge-tts for Python 3.13.") from error
    try:
        communicate = edge_tts.Communicate(script, voice)
        await communicate.save(str(destination))
    except Exception as error:
        raise AdapterError(
            "Edge TTS generation failed. Check network access and the selected voice."
        ) from error
    if not destination.is_file() or destination.stat().st_size == 0:
        raise AdapterError("Edge TTS did not return an audio file.")


SAPI_SCRIPT = r"""
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice = $env:TOONSAZ_SAPI_VOICE
if ($voice) { $synth.SelectVoice($voice) }
$synth.Rate = [int]$env:TOONSAZ_SAPI_RATE
$synth.SetOutputToWaveFile($env:TOONSAZ_SAPI_OUTPUT)
$text = [IO.File]::ReadAllText($env:TOONSAZ_SAPI_SCRIPT, [Text.Encoding]::UTF8)
$synth.Speak($text)
$synth.Dispose()
"""


def local_generate(script_path, voice, speed, destination):
    if sys.platform != "win32":
        raise AdapterError("Windows offline voices are only available on Windows.")
    powershell = shutil.which("powershell") or shutil.which("pwsh")
    if not powershell:
        raise AdapterError("PowerShell is required for Windows offline voices.")
    rate = max(-10, min(10, round((speed - 1) * 10)))
    environment = os.environ.copy()
    environment.update(
        {
            "TOONSAZ_SAPI_VOICE": voice,
            "TOONSAZ_SAPI_RATE": str(rate),
            "TOONSAZ_SAPI_SCRIPT": str(script_path),
            "TOONSAZ_SAPI_OUTPUT": str(destination),
        }
    )
    try:
        result = subprocess.run(
            [
                powershell,
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                SAPI_SCRIPT,
            ],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=environment,
            check=False,
        )
    except OSError as error:
        raise AdapterError("Windows Speech could not be started.") from error
    if result.returncode != 0 or not destination.is_file() or destination.stat().st_size == 0:
        detail = result.stderr.decode("utf-8", "replace").strip().splitlines()
        message = detail[-1] if detail else "the selected voice may not be installed."
        raise AdapterError(f"Windows Speech could not generate audio: {message}")
    if destination.stat().st_size <= 44:
        raise AdapterError("Windows Speech returned an empty audio file. Check the selected voice.")


def removable_provider_file(path, protected):
    try:
        resolved = path.resolve()
        temporary_root = Path(tempfile.gettempdir()).resolve()
        return resolved not in protected and resolved.is_relative_to(temporary_root)
    except (OSError, RuntimeError):
        return False


def omni_generate(script, language, reference_audio, reference_text, speed, destination):
    token = os.environ.get("OMNIVOICE_HF_TOKEN", "")
    if not token:
        raise AdapterError("OmniVoice is not configured on this server.")
    try:
        from gradio_client import Client, handle_file
    except ImportError as error:
        raise AdapterError(
            "OmniVoice is unavailable. Install gradio-client for Python 3.13."
        ) from error

    provider_path = None
    try:
        try:
            client = Client("k2-fsa/OmniVoice", token=token, verbose=False)
            result = client.predict(
                text=script,
                lang="Spanish" if language == "es" else "English",
                ref_aud=handle_file(str(reference_audio)),
                ref_text=reference_text,
                instruct="",
                ns=32,
                gs=2.0,
                dn=True,
                sp=speed,
                du=0.0,
                pp=True,
                po=True,
                api_name="/_clone_fn",
            )
        except Exception as error:
            raise AdapterError(
                "OmniVoice request failed. Verify server credentials, consent, and provider availability."
            ) from error
        if not isinstance(result, (tuple, list)) or len(result) != 2 or not isinstance(result[0], str):
            raise AdapterError("OmniVoice returned an unexpected result.")
        provider_path = Path(result[0]).expanduser().resolve()
        if not provider_path.is_file() or provider_path.stat().st_size == 0:
            raise AdapterError("OmniVoice did not return an audio file.")
        shutil.copyfile(provider_path, destination)
        if not destination.is_file() or destination.stat().st_size == 0:
            raise AdapterError("OmniVoice audio could not be copied into private storage.")
    finally:
        protected = {reference_audio.resolve(), destination.resolve()}
        if provider_path is not None and removable_provider_file(provider_path, protected):
            try:
                provider_path.unlink()
            except OSError:
                pass


def main():
    args = parse_args()
    script, output, reference_audio, reference_text = validate_args(args)
    work = Path(tempfile.mkdtemp(prefix=".voice-adapter-", dir=output.parent))
    try:
        if args.engine == "edge":
            source = work / "edge.mp3"
            asyncio.run(edge_generate(script, args.voice, source))
            ffmpeg_normalize(source, output, args.max_pause)
        elif args.engine == "local":
            source = work / "local.wav"
            local_generate(
                Path(args.script_file).expanduser().resolve(),
                args.voice,
                args.speed,
                source,
            )
            ffmpeg_normalize(source, output)
        else:
            source = work / "omni.wav"
            omni_generate(
                script,
                args.language,
                reference_audio,
                reference_text,
                args.speed,
                source,
            )
            ffmpeg_normalize(source, output)
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    try:
        main()
    except AdapterError as error:
        print(f"generate-voice: {error}", file=sys.stderr)
        raise SystemExit(1)
    except Exception:
        print("generate-voice: Voice generation failed unexpectedly.", file=sys.stderr)
        raise SystemExit(1)
