# 🎬 ClarifAI — Web & YouTube AI Assistant

[![CI Build](https://github.com/Hidr4c/youtube-ai-summarizer/actions/workflows/ci.yml/badge.svg)](https://github.com/Hidr4c/youtube-ai-summarizer/actions/workflows/ci.yml)
[![Chrome Web Store](https://img.shields.io/badge/Chrome_Web_Store-Available-blue?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/youtube-summarizer-ai-lm/pkjmoccofaflidcdmjelmbnlfeipadee)
[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/Hidr4c/youtube-ai-summarizer/releases)
[![Manifest](https://img.shields.io/badge/manifest-v3-success.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-Hidr4c-181717.svg?logo=github)](https://github.com/Hidr4c/youtube-ai-summarizer)
[![Browsers](https://img.shields.io/badge/browsers-Chrome%20%7C%20Brave%20%7C%20Edge-red.svg)](https://github.com/Hidr4c/youtube-ai-summarizer)

> **ClarifAI is a privacy-first browser extension for Chrome, Brave, and Edge** working across **all websites and YouTube** (Watch, Shorts & Channels). Summarize any webpage or video, verify trustworthiness against phishing and factual distortion, crawl sites for due-diligence transparency audits, inspect images with vision models, and ask questions in interactive Q&A chat.

Works **100% locally and offline** with your own hardware (**LM Studio**, **Ollama**, local Whisper STT) or with your own Cloud API keys for extended reasoning.

---

## 🚀 Key Features

- 🏠 **100% Local & Private** : Full native support for **LM Studio** and **Ollama** with 0-to-1M dynamic context slider and MV3 connection keepalive — zero data leaves your machine.
- 🌐 **Universal Web Summarizer, Anti-Phishing & Whole-Site Audit** :
  - Works on any webpage (with one-click popup activation, automatic SPA hydration recovery, universal layout shifting, and compact square expand/close header controls).
  - Client-side DOM threat detection (`WebThreatDetector`): catches unencrypted HTTP, raw IPs, Punycode/IDN homographs, visual typosquatting, brand impersonation, hidden iframes, ClickFix/clipboard hijacking, crypto seed phishing, deceptive links, executable downloads, and prompt injections.
  - Multi-level read-only **Site Audit** (`1`, `2`, `3` levels) crawling legal pages, direct contacts, `robots.txt`, and `sitemap.xml` with deduplicated Map-Reduce synthesis.
- 🔍 **Critical Logic & Fact-Checking Audits (Watch, Shorts & Web)** :
  - Interactive hero gauge with WCAG 2.1 host-adaptive contrast, 4-axis SVG radar scorecard, 5%-stepped granularity, calibrated response style selector, and `.md`/`.txt`/`.json` export.
- 📊 **Global Channel Audit & Videos vs Shorts Breakdown** :
  - Companion cards on YouTube channel pages plus dedicated breakdown separating long-form Videos vs Shorts (`avgScore`, `avgClickbait`, reliability tiers, and quality gap).
- 🖼️ **Multimodal Vision, Slicing & Tool-Use Q&A Protocol** :
  - Drag/paste images or trigger autonomous `[TOOL_CALL]` diagnostics (`INSPECT_PAGE_IMAGES`, `AUDIT_EXTERNAL_SITE`, `AUDIT_CHANNEL`), including vertical & horizontal slicing of oversized web/webtoon images with full concurrent tab streaming.
- 📱 **Mobile, YouTube Shorts & Host-Adaptive Theming** :
  - Seamless dark/light/tinted host theme matching (`ThemeManager` + WCAG contrast solver) across desktop YouTube, YouTube Shorts (`/shorts/<id>`), mobile `m.youtube.com`, and external sites.
- 💬 **Interactive Video & Channel Q&A Chat** :
  - Ask questions grounded in full video transcripts or enriched channel dossiers with rich Markdown formatting and instant localized prompt chips.
- 🛡️ **Multi-Layer Resilient Subtitle Extraction Pipeline** :
  - InnerTube `get_panel` transcript engine, native in-page DOM/player memory, Timedtext JSON3, XML standard, and TTML XML (`<p t>` and `<p begin>`), with automatic language fallback (`&tlang=`).
- 💾 **Local Cache Manager & Storage Controller** :
  - Real-time cache metrics in KB/MB accessible directly from the extension popup, with localized purge policies (all, > 7 days, > 30 days) and live tab sync (`CLEAR_CACHE`).
- ☁️ **Flexible Cloud AI Support** : Connect your preferred API provider (Gemini, Groq, OpenAI, Claude, DeepSeek, Grok, Qwen, Mistral, OpenRouter, Perplexity, Together AI).
- 🎙️ **Microphone Voice Dictation (STT)** :
  - **Native Web Speech API** on Chrome & Edge.
  - **Local Whisper Server** (e.g. `http://localhost:8000/v1/audio/transcriptions` or `whisper.cpp`) for 100% local, private voice recognition!
  - **Cloud Whisper via Groq** (ultra-fast 200ms, free) to seamlessly bypass Brave browser speech restrictions.
- 🔊 **Text-to-Speech (TTS) Audio Player** : Listen to summaries and chat replies with adjustable speech speed (`0.75x` to `2.0x`).
- ⏱️ **Clickable Interactive Timestamps** : Click any timestamp (`01:23`, `12:45`) in summaries or transcripts to jump the YouTube player directly to that moment!
- 🌍 **Instant Dynamic Multi-Language System (8 Languages)** : English 🇬🇧, French 🇫🇷, Spanish 🇪🇸, German 🇩🇪, Italian 🇮🇹, Russian 🇷🇺, Japanese 🇯🇵, Chinese 🇨🇳. Interface controls across Watch, Channel Companion, Settings, and Popup — plus audit/summary prompts — switch instantaneously without clearing active AI outputs.
- ⚙️ **Advanced Configuration Panel** :
  - AI Creativity (Temperature slider from `0.0` to `1.0`).
  - Max Token limits (`Auto` to `8,192`).
  - Auto-summarize when opening a new video.
  - Custom system prompt directives.
- 💾 **Multi-Format Export** : Save your summaries to Markdown (`.md`), Plain Text (`.txt`), or structured JSON (`.json`).

---

## 📦 Installation Guide

### Option 1: Chrome Web Store (Direct 1-Click Install)
Install directly from the official Google Chrome Web Store:
👉 **[Install YouTube Summarizer AI on Chrome Web Store](https://chromewebstore.google.com/detail/youtube-summarizer-ai-lm/pkjmoccofaflidcdmjelmbnlfeipadee)**

### Option 2 : Developer Mode (Unpacked)
1. Download the latest release package: [`youtube-summarizer-ai-v2.0.0.zip`](releases/youtube-summarizer-ai-v2.0.0.zip) or from the [GitHub Releases page](https://github.com/Hidr4c/youtube-ai-summarizer/releases).
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
2. Paste the key in the extension settings: live Flash/Pro models (such as `gemini-flash-latest` or `gemini-3.5-flash-lite`) are discovered automatically, with built-in fallback if a model hits a temporary overload.

### 4. Groq (Ultra-Fast Cloud & Whisper STT)
1. Get a free API key at [Groq Console](https://console.groq.com/keys).
2. Paste your key in the extension: this instantly enables lightning-fast inference and Whisper voice dictation!

---

## 🔒 Privacy & Security

- **No telemetry or data tracking** : 100% open-source, inspectable code.
- **Secure local storage** : Your API keys, model selections, and custom preferences stay strictly within your browser's `chrome.storage.local`.
- Read our full [Privacy Policy](docs/PRIVACY.md).

---

## 🧪 Automated Tests & Quality Assurance

The codebase is protected by Continuous Integration ([GitHub Actions CI](https://github.com/Hidr4c/youtube-ai-summarizer/actions/workflows/ci.yml)). Every commit and pull request runs an automated test suite enforcing JavaScript syntax integrity, bundle compilation, and high code coverage thresholds (> 80%).

Real-time test outcomes and detailed coverage metrics are generated dynamically on every CI run and can be inspected directly on the [GitHub Actions Run Summary](https://github.com/Hidr4c/youtube-ai-summarizer/actions/workflows/ci.yml).

### Running Tests Locally
```bash
# Run complete test suite with coverage report
npm test

# Run syntax and bundle verification
npm run check
```

---

## 🤝 Contributing

Contributions, bug reports, and suggestions are welcome!
- 📘 **[Contributing Guide](docs/CONTRIBUTING.md)** — Code style, development setup, and testing requirements.
- 🌿 **[Git Release Workflow Guide](docs/GIT_WORKFLOW.md)** — Strict candidate branch methodology (`candidate/vX.Y.Z` -> 1 commit per release on `main`).
- 🐛 **Report a bug** : [Open an Issue](https://github.com/Hidr4c/youtube-ai-summarizer/issues)
- ⭐ **Star the repository** : If you find this extension useful, consider giving it a star on GitHub!

---

## 📄 License

This project is open-source under the [MIT License](LICENSE) — Created with care by **[Hidr4c](https://github.com/Hidr4c)**.
