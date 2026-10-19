# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.1] - 2026-10-19

### Added
- **Git Candidate & Release Methodology**: Implemented a strict candidate branching workflow (`candidate/vX.Y.Z` -> squash merge to `main`) ensuring `main` maintains a pristine history with exactly 1 commit per release tagged `vX.Y.Z`.
- **Workflow Automation Tooling**: Added CLI commands `npm run candidate:start`, `candidate:status`, and `candidate:finish` backed by [`scripts/git_workflow.js`](../scripts/git_workflow.js) and [`scripts/git_workflow.ps1`](../scripts/git_workflow.ps1).
- **Dynamic Cross-Platform Packager**: Added [`scripts/package.js`](../scripts/package.js) to dynamically package zip distribution archives based on `manifest.json` version without hardcoded paths.
- **Dynamic CI Test & Coverage Reporting**: Integrated [`scripts/ci_reporter.js`](../scripts/ci_reporter.js) into GitHub Actions workflow to publish live test results and coverage breakdowns directly into `$GITHUB_STEP_SUMMARY`.
- **Workflow Documentation**: Added [`docs/GIT_WORKFLOW.md`](GIT_WORKFLOW.md) and updated [`docs/CONTRIBUTING.md`](CONTRIBUTING.md).

### Changed
- **CI Trigger Scopes**: Updated GitHub Actions CI to automatically test pushes to candidate branches (`candidate/**`) and release tags (`v*`).
- **Cleaned README**: Removed static hardcoded test counts and coverage tables from `README.md` to prevent maintenance toil, redirecting to live CI reports.

### Removed
- **Obsolete Legacy Scripts**: Purged legacy `.bat` files (`deploy-github.bat`, `deploy.bat`, `package-zip.bat`) and cleaned up unused `.gitignore` patterns.

---

## [1.3.0] - 2026-10-19

### Added
- **Local Whisper STT Endpoint**: Direct integration with local speech-to-text servers (e.g. `http://localhost:8000/v1/audio/transcriptions` or `whisper.cpp`).
- **Interactive Clickable Timestamps**: Timestamps in summaries and transcripts (`01:23`) are now clickable links that synchronize the YouTube video player in real-time.
- **Dynamic 8-Language i18n Parity**: Full multilingual support for English, French, Spanish, German, Italian, Russian, Japanese, and Chinese.
- **Advanced AI Controls**: Configurable temperature (0.0 to 1.0), max token limits, and custom system prompt directives.
- **Multi-Format Exports**: Export summaries as Markdown (`.md`), Plain Text (`.txt`), or JSON (`.json`).
- **Text-to-Speech Speed Control**: Adjustable TTS playback rates from `0.75x` to `2.0x`.
- **Open-Source Quality Suite**: GitHub CI workflows, release automation, issue templates, and contribution guides.

### Changed
- Default interface language set to English (`en`).
- Updated Chrome Web Store compliant description and manifest metadata.

### Removed
- Removed automatic clipboard copy on summary completion to respect user clipboard privacy.

---

## [1.2.0] - 2026-10-18

### Added
- Multi-provider Cloud AI support: Google Gemini, Groq, OpenAI GPT-4o, Anthropic Claude, DeepSeek, xAI Grok, Alibaba Qwen, Mistral AI.
- In-page embedded banner directly below YouTube video player.
- Thinking / reasoning display box for reasoning models (DeepSeek R1, OpenAI o3-mini).
- Interactive Q&A Chat tab with prompt suggestion chips.

---

## [1.0.0] - 2026-10-17

### Added
- Initial release with LM Studio & Ollama local server support.
- YouTube transcript extraction with automatic language fallbacks.
- Markdown summary streaming and local storage persistence.
