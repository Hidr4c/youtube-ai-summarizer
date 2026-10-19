# YouTube AI Summarizer — English Promotional Video Script & Storyboard

This document contains the complete production script, storyboard breakdowns, timing cues, and narration texts for the **YouTube AI Summarizer** official promo video.

---

## 🎬 Video Overview

- **Target Duration**: ~45 seconds (ideal for Chrome Web Store and YouTube Short/Preview)
- **Resolution**: 1920 × 1080 (Full HD, 16:9)
- **Target Frame Rate**: 30 fps
- **Tone**: Modern, sleek, professional, high-energy tech showcase
- **Voiceover**: Clear, confident American English (Microsoft Zira or custom voice)
- **Audio Mix**: Voiceover narration + subtle ambient electronic background music

---

## 📋 Scene-by-Scene Storyboard

### **Scene 1: The Hook & The Problem** (0:00 – 0:08 | ~8s)
- **Visuals**:
  - Deep dark YouTube ambient background (`#080c14`) with glowing radial red pulse.
  - Animated extension icon in center with subtle breathing halo effect.
  - Top Badge: `🔥 NEW CHROME EXTENSION`
  - Big Typography: **"Spend Less Time Watching. Learn More."**
  - Subtitle: **"Meet YouTube AI Summarizer — Your Smart AI Companion"**
- **Voiceover (VO)**:
  > *"Tired of watching forty-minute videos just to find a single answer? Meet YouTube AI Summarizer — your intelligent video companion right inside YouTube."*
- **Key Badges**:
  - `⚡ Instant AI Summaries`
  - `🔒 100% Private`
  - `✨ Chrome & Brave`

---

### **Scene 2: Instant Smart Summaries** (0:08 – 0:17 | ~9s)
- **Visuals**:
  - Clean UI presentation showing the summary panel sliding in over YouTube.
  - Floating 3D card featuring `screenshot-1-instant-summary.png`.
  - Mode selector buttons glowing: **Quick**, **Standard**, **Detailed**.
  - Animated highlight on clickable video timestamps (`[02:15]`, `[05:40]`).
  - Headline: **"One-Click Instant Summaries"**
  - Subtitle: **"Key takeaways and clickable timestamps that take you straight to the point."**
- **Voiceover (VO)**:
  > *"Generate comprehensive summaries in seconds. Choose between quick bullet points or detailed breakdowns, complete with clickable timestamps that jump straight to the key moments."*
- **Key Badges**:
  - `⏱️ Jump to Timestamps`
  - `📝 3 Summary Depths`
  - `🎯 Key Takeaways`

---

### **Scene 3: Interactive Video Chat** (0:17 – 0:26 | ~9s)
- **Visuals**:
  - Transition into the conversational chat interface (`screenshot-2-interactive-chat.png`).
  - Dynamic user question appearing: *"What were the top 3 recommendations mentioned in the video?"*
  - Fast streaming AI answer with highlighted key points.
  - Interactive prompt suggestion chips pulsing: `💡 Key Insights`, `🔍 Fact Check`, `📋 Action Items`, `💻 Extract Code`.
  - Headline: **"Interactive Video Q&A"**
  - Subtitle: **"Chat directly with the video transcript in real time."**
- **Voiceover (VO)**:
  > *"Ask anything about the video in natural conversation. Search the transcript, extract code snippets, verify claims, and explore new ideas with smart suggestion chips."*
- **Key Badges**:
  - `💬 Chat with Transcript`
  - `⚡ Prompt Chips`
  - `💻 Code & Quote Extraction`

---

### **Scene 4: 100% Privacy & Local AI Freedom** (0:26 – 0:35 | ~9s)
- **Visuals**:
  - Focus on local AI privacy and flexibility (`screenshot-3-local-and-cloud-ai.png`).
  - Prominent cards for **LM Studio** and **Ollama** running locally on GPU.
  - Cloud provider support: **Google Gemini**, **Groq (ultra-fast)**, and **OpenAI**.
  - Headline: **"100% Private. Run Locally or in the Cloud."**
  - Subtitle: **"Your data stays on your machine. Zero tracking. Bring your own model."**
- **Voiceover (VO)**:
  > *"Your privacy comes first. Run models locally on your own machine with LM Studio or Ollama, or connect directly to Gemini, Groq, and OpenAI with your own API keys."*
- **Key Badges**:
  - `🛡️ 100% Private & Local`
  - `⚡ GPU Accelerated`
  - `🌐 Multi-Provider Freedom`

---

### **Scene 5: Multilingual Support & Call to Action** (0:35 – 0:45 | ~10s)
- **Visuals**:
  - Dynamic display of international flags: 🇺🇸 English, 🇫🇷 French, 🇪🇸 Spanish, 🇩🇪 German, 🇮🇹 Italian, 🇷🇺 Russian, 🇯🇵 Japanese, 🇨🇳 Chinese.
  - One-click export pill buttons: `Markdown (.md)`, `Plain Text (.txt)`, `JSON`.
  - Final call to action card:
    - Big glowing store badge: **"Available Now on Chrome Web Store"**
    - Star badge: `⭐ Free & Open Source on GitHub`
    - URL callout: `github.com/Hidr4c/youtube-ai-summarizer`
- **Voiceover (VO)**:
  > *"Supporting eight languages with instant export to Markdown and JSON. Add YouTube AI Summarizer to Chrome today — fast, free, and open source!"*
- **Key Badges**:
  - `🌍 8 Languages`
  - `📥 Instant Export`
  - `⭐ Free & Open Source`

---

## ⏱️ Condensed 30-Second Script (Alternative for Shorts/TikTok)

| Time | Visual | Voiceover |
| :--- | :--- | :--- |
| **0:00 - 0:06** | Problem hook + Extension branding | *"Stop wasting hours watching long YouTube videos! Meet YouTube AI Summarizer."* |
| **0:06 - 0:14** | One-click summary with timestamps | *"Get instant smart summaries with clickable timestamps that jump straight to what matters."* |
| **0:14 - 0:22** | Interactive chat + prompt chips | *"Chat directly with the video, extract code, and ask any question in real time."* |
| **0:22 - 0:30** | Local AI + Chrome Web Store CTA | *"Run it 100% locally with LM Studio or in the cloud. Get it free on the Chrome Web Store today!"* |

---

## 🛠️ Automated Video Generation

The video can be automatically rendered using the companion generation script:
```powershell
pwsh ./store-assets/promo-video/generate-promo.ps1
```
This produces:
- Individual scene HD renders (1920x1080)
- Synthesized English narration audio tracks (`scene-*.wav`)
- Master mixed MP4 video: `youtube-ai-summarizer-promo.mp4`
