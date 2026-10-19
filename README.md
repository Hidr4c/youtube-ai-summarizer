# 🎬 YouTube Summarizer AI (LM Studio, Ollama & Cloud)

[![CI Build](https://github.com/Hidr4c/youtube-ai-summarizer/actions/workflows/ci.yml/badge.svg)](https://github.com/Hidr4c/youtube-ai-summarizer/actions/workflows/ci.yml)
[![Tests Passing](https://img.shields.io/badge/tests-55%20passed-brightgreen.svg?logo=node.js)](tests/)
[![Coverage](https://img.shields.io/badge/coverage-%3E80%25%20(96.8%25%20lines)-brightgreen.svg?logo=jest)](#-automated-tests--coverage)
[![Version](https://img.shields.io/badge/version-1.3.0-blue.svg)](https://github.com/Hidr4c/youtube-ai-summarizer/releases)
[![Manifest](https://img.shields.io/badge/manifest-v3-success.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-Hidr4c-181717.svg?logo=github)](https://github.com/Hidr4c/youtube-ai-summarizer)
[![Browsers](https://img.shields.io/badge/browsers-Chrome%20%7C%20Brave%20%7C%20Edge-red.svg)](https://github.com/Hidr4c/youtube-ai-summarizer)

> **A powerful, modern, and privacy-first browser extension for Chrome, Brave, and Edge**, embedded directly below the YouTube video player. Summarize videos in seconds, engage in interactive Q&A chat based on real transcripts, speak your questions with microphone speech-to-text (STT), and listen with text-to-speech (TTS).

Works **100% locally and offline** with your own hardware (**LM Studio**, **Ollama**, local Whisper STT) or with top-tier Cloud models (**Google Gemini**, **Groq**, **OpenAI GPT-4o**, **Claude 3.5**, **DeepSeek R1**, **Grok**, **Qwen**, **Mistral**, **Perplexity**).

---

## 🚀 Key Features

- 🏠 **100% Local & Private** : Full native support for **LM Studio** and **Ollama** — zero data leaves your machine.
- ☁️ **11 Major Cloud Providers** : Google Gemini (1M token free tier), Groq (ultra-fast LPU inference), OpenAI (GPT-4o, o3-mini), Anthropic Claude, DeepSeek (V3 & R1), xAI Grok, Alibaba Qwen, Mistral AI, OpenRouter, Perplexity, Together AI.
- 🎙️ **Microphone Voice Dictation (STT)** :
  - **Native Web Speech API** on Chrome & Edge.
  - **Local Whisper Server** (e.g. `http://localhost:8000/v1/audio/transcriptions` or `whisper.cpp`) for 100% local, private voice recognition!
  - **Cloud Whisper via Groq** (ultra-fast 200ms, free) to seamlessly bypass Brave browser speech restrictions.
- 🔊 **Text-to-Speech (TTS) Audio Player** : Listen to summaries and chat replies with adjustable speech speed (`0.75x` to `2.0x`).
- 💬 **Interactive Q&A Chat** : Ask questions about any specific point in the video, with instant one-click suggestion prompts.
- ⏱️ **Clickable Interactive Timestamps** : Click any timestamp (`01:23`, `12:45`) in summaries or transcripts to jump the YouTube player directly to that moment!
- 🌍 **Dynamic Multi-Language System (8 Languages)** : English 🇬🇧, French 🇫🇷, Spanish 🇪🇸, German 🇩🇪, Italian 🇮🇹, Russian 🇷🇺, Japanese 🇯🇵, Chinese 🇨🇳. Interface and system prompts switch dynamically on the fly.
- ⚙️ **Advanced Configuration Panel** :
  - AI Creativity (Temperature slider from `0.0` to `1.0`).
  - Max Token limits (`Auto` to `8,192`).
  - Auto-summarize when opening a new video.
  - Custom system prompt directives.
- 💾 **Multi-Format Export** : Save your summaries to Markdown (`.md`), Plain Text (`.txt`), or structured JSON (`.json`).

---

## 📦 Installation Guide

### Option 1 : Developer Mode (Recommended)
1. Download the latest release package: [`youtube-summarizer-ai-v1.3.0.zip`](releases/youtube-summarizer-ai-v1.3.0.zip) or from the [GitHub Releases page](https://github.com/Hidr4c/youtube-ai-summarizer/releases).
2. Unzip the archive into a folder of your choice on your computer.
3. Open your browser's extensions manager:
   - **Chrome**: `chrome://extensions/`
   - **Brave**: `brave://extensions/`
   - **Edge**: `edge://extensions/`
4. Enable **« Developer mode »** (toggle in the top-right corner).
5. Click **« Load unpacked »** and select the unzipped directory.
6. Open any YouTube video: the summarizer banner appears immediately below the player!

---

## 🛠️ AI Provider Setup

### 1. LM Studio (Local & Free)
1. Download and install [LM Studio](https://lmstudio.ai/) and get your favorite model (e.g. `Qwen2.5-7B`, `Llama-3.1-8B`).
2. Navigate to the **Local Server** tab (`<->`), load your model, and click **Start Server**.
3. In the extension toolbar on YouTube, select **LM Studio**: the extension automatically detects and lists your running models!

### 2. Ollama (Local & Free)
1. Start Ollama on your machine (`ollama serve`).
2. The extension connects directly to `http://localhost:11434` and lists your installed models.

### 3. Google Gemini (Free Cloud Tier)
1. Generate a free API key at [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Paste the key in the extension settings and select `gemini-1.5-flash` or `gemini-2.0-flash`.

### 4. Groq (Ultra-Fast Cloud & Whisper STT)
1. Get a free API key at [Groq Console](https://console.groq.com/keys).
2. Paste your key in the extension: this instantly enables lightning-fast inference and Whisper voice dictation!

---

## 🔒 Privacy & Security

- **No telemetry or data tracking** : 100% open-source, inspectable code.
- **Secure local storage** : Your API keys, model selections, and custom preferences stay strictly within your browser's `chrome.storage.local`.
- Read our full [Privacy Policy](docs/PRIVACY.md).

---

## 🧪 Automated Tests & Industrial Coverage (> 80%)

The codebase is protected by continuous integration (GitHub Actions) and an extensive automated test suite strictly exceeding **80% coverage** across all criteria:

| Metric | Target | Current Status |
| :--- | :---: | :---: |
| **Line Coverage** | `> 80%` | **96.8%** 🟢 |
| **Branch Coverage** | `> 80%` | **83.2%** 🟢 |
| **Function Coverage** | `> 80%` | **91.3%** 🟢 |
| **Automated Tests** | `All pass` | **55 passed / 0 failed** 🟢 |

### Running Tests Locally
```bash
# Run complete test suite with coverage report
npm test

# Run syntax and bundle verification
npm run check
```

---

## 🤝 Contributing

Contributions, bug reports, and suggestions are welcome! Please check our [Contributing Guide](docs/CONTRIBUTING.md) for details on code style and pull requests.

- 🐛 **Report a bug** : [Open an Issue](https://github.com/Hidr4c/youtube-ai-summarizer/issues)
- ⭐ **Star the repository** : If you find this extension useful, consider giving it a star on GitHub!

---

## 📄 License

This project is open-source under the [MIT License](LICENSE) — Created with care by **[Hidr4c](https://github.com/Hidr4c)**.
