import asyncio
import json
import sys


async def main():
    try:
        import edge_tts
    except ImportError as error:
        raise RuntimeError("Install edge-tts for Python 3.13.") from error

    voices = await edge_tts.list_voices()
    catalog = [
        {
            "name": voice["ShortName"],
            "locale": voice["Locale"],
            "language": voice["Locale"].split("-", 1)[0].lower(),
            "gender": voice["Gender"].lower(),
            "label": voice["FriendlyName"],
        }
        for voice in voices
        if voice.get("ShortName") and voice.get("Locale") and voice.get("Gender")
    ]
    catalog.sort(key=lambda voice: (voice["locale"], voice["gender"], voice["name"]))
    print(json.dumps(catalog, ensure_ascii=False))


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as error:
        print(f"list-edge-voices: {error}", file=sys.stderr)
        raise SystemExit(1)
