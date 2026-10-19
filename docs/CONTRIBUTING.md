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

2. **Install Dependencies & Build**:
   ```bash
   npm ci
   npm run build
   ```

3. **Load into Browser**:
   - Open `chrome://extensions/` (or `brave://extensions/`, `edge://extensions/`).
   - Enable **Developer mode**.
   - Click **Load unpacked** and select the repository directory.

4. **Verify Syntax & Automated Tests**:
   ```bash
   npm run check
   npm test
   ```

---

## 📋 Code Style & Guidelines

- **Clean Architecture & DDD**: Organized into domain, services, config, locales, parsers, and UI.
- **Privacy-First**: Never collect, track, or leak user telemetry, API keys, or transcripts.
- **Internationalization (i18n)**: All UI strings must be added to all 8 supported language dictionaries (`en`, `fr`, `es`, `de`, `it`, `ru`, `ja`, `zh`) in `src/locales/`.
- **English Code & Comments**: Code, variables, and documentation must be written in English.
- **Strict Testing**: Maintain > 80% test coverage across all metrics.

---

## 🌿 Git Candidate & Release Workflow

We enforce a strict release candidate methodology to ensure `main` stays pristine with 1 commit per release:
- Read the complete [Git Workflow Guide](GIT_WORKFLOW.md).
- Create a candidate branch or feature branch:
  ```bash
  npm run candidate:start <version>
  ```
- Develop and commit atomically on the candidate branch.
- Finalize the release using automated quality gates:
  ```bash
  npm run candidate:finish <version>
  ```

---

## 🐛 Reporting Bugs & Requesting Features

- Use the [GitHub Issue Tracker](https://github.com/Hidr4c/youtube-ai-summarizer/issues) with our templates.
- Please provide browser version, model used, and URL of the video (if applicable).
