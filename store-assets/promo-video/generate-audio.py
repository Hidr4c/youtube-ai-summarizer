import asyncio
import os
import edge_tts

SCENES = [
    {
        "id": 1,
        "text": "Watching long YouTube videos to find key information takes forever. Meet YouTube AI Summarizer - your intelligent companion built directly into YouTube.",
        "file": "audio-1.mp3"
    },
    {
        "id": 2,
        "text": "Generate crystal-clear summaries in seconds. Choose between quick bullet points or comprehensive deep dives, complete with clickable timestamps that jump straight to the exact moment in the video.",
        "file": "audio-2.mp3"
    },
    {
        "id": 3,
        "text": "Have a real conversation with any video. Search the entire transcript, extract code snippets, verify claims, or ask questions with interactive one-click suggestion chips.",
        "file": "audio-3.mp3"
    },
    {
        "id": 4,
        "text": "Your privacy is guaranteed. Run models completely offline on your own GPU with LM Studio or Ollama, or connect directly to Google Gemini and Groq with your own API keys.",
        "file": "audio-4.mp3"
    },
    {
        "id": 5,
        "text": "Supporting eight languages with instant export to Markdown and JSON. Add YouTube AI Summarizer to Chrome today - fast, free, and open source!",
        "file": "audio-5.mp3"
    }
]

VOICE = "en-US-BrianMultilingualNeural"

async def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"Generating studio neural voiceovers using {VOICE}...")
    for sc in SCENES:
        out_path = os.path.join(script_dir, sc["file"])
        communicate = edge_tts.Communicate(sc["text"], VOICE, rate="+0%")
        await communicate.save(out_path)
        print(f"  [OK] Scene {sc['id']}: {sc['file']} ({os.path.getsize(out_path)} bytes)")

if __name__ == "__main__":
    asyncio.run(main())
