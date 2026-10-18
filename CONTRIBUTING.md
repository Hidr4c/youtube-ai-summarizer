# Contributing to YouTube Summarizer AI

First off, thank you for considering contributing to YouTube Summarizer AI! 🎉

This document outlines guidelines for contributing to this project.

---

## 🛠️ Development Setup

1. **Fork and Clone** the repository:
   ```bash
   git clone https://github.com/Hidr4c/youtube-ai-summarizer.git
   cd youtube-ai-summarizer
   ```

2. **Load into Browser**:
   - Open `chrome://extensions/` (or `brave://extensions/`, `edge://extensions/`).
   - Enable **Developer mode**.
   - Click **Load unpacked** and select the repository directory.

3. **Verify Syntax**:
   - Ensure you have Node.js installed to check syntax before committing:
     ```bash
     node --check content.js background.js main_world.js popup.js
     ```

---

## 📋 Code Style & Guidelines

- **Vanilla JavaScript**: Keep dependencies minimal. The extension uses pure, vanilla Manifest V3 APIs without heavy bundlers or node_modules overhead.
- **Privacy-First**: Never collect, track, or leak user telemetry, API keys, or transcripts.
- **Internationalization (i18n)**: All UI strings must be added to all 8 supported language dictionaries (`en`, `fr`, `es`, `de`, `it`, `ru`, `ja`, `zh`) in `I18N_DICTS`.
- **English Code & Comments**: Code, variables, and documentation must be written in English.

---

## 🚀 Submitting a Pull Request (PR)

1. Create a descriptive branch from `main`:
   ```bash
   git checkout -b feat/my-new-feature
   ```
2. Make your changes and test thoroughly on both standard videos and videos with different caption formats.
3. Validate syntax:
   ```bash
   node --check content.js background.js main_world.js popup.js
   ```
4. Commit with conventional commit messages:
   - `feat: add new cloud provider xyz`
   - `fix: resolve caption extraction error`
   - `docs: update setup instructions`
5. Push to your fork and submit a Pull Request to `main`.

---

## 🐛 Reporting Bugs & Requesting Features

- Use the [GitHub Issue Tracker](https://github.com/Hidr4c/youtube-ai-summarizer/issues) with our templates.
- Please provide browser version, model used, and URL of the video (if applicable).
