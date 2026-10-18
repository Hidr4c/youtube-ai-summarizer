# Privacy Policy for YouTube Summarizer AI

**Last updated:** October 19, 2026  
**Author:** Hidr4c ([https://github.com/Hidr4c](https://github.com/Hidr4c))  
**Repository:** [https://github.com/Hidr4c/youtube-ai-summarizer](https://github.com/Hidr4c/youtube-ai-summarizer)

## 1. Overview
YouTube Summarizer AI is a browser extension designed with a **privacy-first** architecture. It enables users to summarize YouTube videos and chat interactively with video transcripts using either **100% local AI models** (via LM Studio or Ollama) or user-configured Cloud AI providers (Google Gemini, Groq, OpenAI, Anthropic, etc.).

## 2. Data Collection & Processing
- **No Personal Data Collected:** The extension does not collect, log, track, or sell any personal data, browsing history, or analytics.
- **Local Storage:** Your settings (selected language, model preferences, and API keys) are stored strictly inside your browser's local storage (`chrome.storage.local`). They never leave your device except when directly communicating with the AI service you have chosen.
- **Audio & Microphone Access:** Microphone access is requested solely when you deliberately click the dictation button to speak a question. 
  - On Chrome: Transcription is handled by your browser's native Web Speech API.
  - On Whisper STT / Local Whisper: Audio is recorded in-memory via `MediaRecorder` and sent directly to your configured local Whisper server (e.g., `http://localhost:8000/v1/audio/transcriptions`) or Groq/OpenAI if you provided an API key. No audio recordings are permanently stored on disk or shared with third parties.
- **YouTube Transcripts:** Transcripts are extracted on-the-fly directly from YouTube's public captions player in your browser for the currently viewed video.

## 3. Third-Party Services
If you choose to use Cloud AI providers (such as OpenAI, Google Gemini, Groq, Anthropic, DeepSeek, etc.):
- Your requests (the video transcript snippet and your question) are sent directly from your browser/extension service worker to that provider's official API endpoint using your personal API key.
- Each third-party provider processes data according to their respective privacy policies and terms of service.
- If you use **LM Studio** or **Ollama** locally, **zero data is transmitted over the Internet**.

## 4. Single Purpose & Permissions Justification
- `activeTab` & `scripting`: Required to inject the summarizer interface under the YouTube video player and read public transcript captions.
- `storage`: Required to save user preferences locally (model, language, voice, and API keys).
- `host_permissions`: Required to communicate with YouTube and your local or cloud AI endpoints.

## 5. Contact & Open Source
This extension is free and open-source under the MIT License.  
For inquiries, bug reports, or feature requests, visit:  
[https://github.com/Hidr4c/youtube-ai-summarizer/issues](https://github.com/Hidr4c/youtube-ai-summarizer/issues)
