# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.3] - 2026-11-18

### Added
- **Visual Video Audit Dashboard**: Replaced plain-text critical audits with an editorial dashboard featuring a 4-axis SVG radar chart, dual reliability & sensationalism gauges, status verdict badges, genre classification tags, and collapsible detail accordions across all 8 languages.
- **Universal Live Cloud Model Discovery & Automatic Failover**: Added dynamic `/models` catalog lookup (`CloudModelDiscovery`), provider-specific capability filtering, smart ranking, and automatic `404`/`503`/`529` failover across all 11 Cloud AI providers (including Gemini `AQ.` `x-goog-api-key` native fallback, Together raw array parsing, Mistral chat filtering, OpenRouter free-tier tagging, and Anthropic Claude streaming failover).
- **Unified HTTP Error Classification (`CloudErrorClassifier`)**: Unwraps Google array-wrapped `[{ "error": ... }]` and Anthropic JSON errors into clear diagnostics, separating invalid API key authentication errors (`401`/`403`) from temporary server saturation (`503`/`429` "Server busy" header badge).
- **API Key Inspection & Refresh Controls**: Added an inline show/hide API key visibility toggle (`#ytAiToggleKeyVisBtn`), a manual Cloud model refresh button (`#ytAiRefreshCloudModelsBtn`), debounced auto-validation on paste/input, and live `MODEL_RESOLVED` state persistence across streaming clients.

### Fixed
- **Cloud Provider Persistence & Async Race Guards**: Persisted API keys, active models, and `keyVerified` badges across all 13 local and Cloud providers in `InPageState`, eliminated stale async `FETCH_MODELS` overwrites via sequence guards, synchronized header model pills on Watch and Channel views, and resolved Chrome Web Store `v1.5.1` Gemini `404` failures caused by retired default model presets.
- **Expanded Hermetic Test Suite**: Added comprehensive unit and integration suites covering Cloud discovery, failover, array error unwrapping, and API settings concurrency (`327` automated tests passing with `0` failures and `91.79%` line coverage).

---

## [1.5.2] - 2026-11-16

### Fixed
- **Hermetic CI Test Isolation**: Refactored `tests/lmstudio-port-configuration.test.js` to run against ephemeral `127.0.0.1:0` loopback HTTP servers instead of probing live local service ports, resolving `fetch failed` failures on Linux CI runners.
- **GitHub Actions CI/CD Workflows**: Upgraded `.github/workflows/ci.yml` and `.github/workflows/release.yml` to `actions/checkout@v7`, `actions/setup-node@v7`, `softprops/action-gh-release@v3` (Node 24), `fail_on_unmatched_files: true`, and Node.js `[22.x, 24.x]` matrix.

### Added
- **Expanded Branch & Controller Test Coverage**: Added 6 test suites covering prompt/i18n helpers, watch & channel audit controllers, summary views, stream relay, and local server discovery, raising test coverage above 90% line and 80% branch thresholds across 302 automated tests.

---

## [1.5.1] - 2026-11-15

### Added
- **Fullscreen Auto-Hide & Mobile Support (`m.youtube.com`)**: Automatically hides in-page UI during fullscreen video playback and anchors natively on mobile YouTube layouts.
- **Persistent Background Channel Audits & Stop Controls**: Channel audits survive SPA navigation across tabs/pages with live progress restoration and instant Stop buttons across summaries, video audits, and channel audits.
- **5% Graded Reliability Spectrum & Sensationalism Chart**: Replaces coarse 3-tier channel scoring with fine-grained 5% color buckets and a dual histogram + sensationalism index indicator.
- **Dynamic Sample Limits & Full Catalog Pagination**: Filters max-video presets dynamically to match each channel's actual video count, supporting 100 / 500 / 1,000 / All catalog audits.
- **Channel Q&A Markdown Formatting & Unified Header/Footer**: Aligns Channel Companion header (YouTube SVG logo, mixed-case title, inline language picker, centered CTA) and attribution footer with the Watch banner.

### Fixed
- **Instant Live 8-Language Switching**: Switching language dynamically translates all Watch, Channel Companion, Settings Drawer, and Popup UI controls without resetting generated AI summaries, audit bullets, or chat history.
- **Non-French Audit Language Enforcement**: Enforces target language cleanly in video, channel, and Map-Reduce audit prompts without French chrome leakage.
- **Chrome Web Store Metadata Compliance**: Shortened Russian `_locales/ru/messages.json` description within the 132-character store limit and fixed Settings Drawer voice label/optgroup localization keys.

---

## [1.5.0] - 2026-11-08

### Added
- **Global Channel Audit & In-Page Companion Card**: Embedded companion card on YouTube channel headers (`@handle`, `/channel/`, `/c/`, `/user/`) providing statistical sampling (recent ~65%, legacy ~35%), 4 temporal periods (*All*, *1 Year*, *6 Months*, *30 Days*), 100-point reliability gauge, clickbait index, and multi-year editorial trajectory analysis.
- **Critical Logic & Fact-Checking Video Audit**: In-depth fallacy detection and argumentation rigor evaluation (`AuditPromptBuilder`, `AuditReport`, `AuditService`), dynamic real-world temporal reference preventing anachronisms, balanced creator monetization framing, active honesty verification, and community consensus signals.
- **10-Layer Subtitle Extraction Pipeline**: Resilient transcript retrieval supporting JSON3, standard XML, TTML XML (`<p t="..." d="...">` & `<p begin="...">`), and automatic language translation fallback (`&tlang=`), verified across 50 international channels with 96.4% success rate.
- **Popup Local Cache Manager & Storage Controller**: Real-time memory metrics in KB/MB, granular purge policies (all, > 7 days, > 30 days), and cross-tab in-page cache invalidation broadcast (`CLEAR_CACHE`).
- **Rich Video Dossier & Community Reactions**: Extraction of top 3 community comments and structured chapters injected into audit prompts.
- **Test Suite Expansion**: Suite expanded to 213 unit, integration, and BDD tests passing with 0 failures and > 85% line coverage.
- **Chrome Web Store Showcase Assets**: 5 high-resolution (1280x800) promotional presentation slides.

### Changed
- Refactored prompt directives to provide balanced nuance between legitimate creator book/course publishing and disguised marketing.
- Enhanced `AuditProgressBar` with security sanitization against XSS and dynamic detail element toggling.
- All 112 source files strictly conform to the <= 300 LOC clean architecture limit.

---

## [1.4.1] - 2026-11-06

### Changed
- Dynamically bind extension version from `manifest.json` across in-page banner and popup UI to avoid manual version drift.

---

## [1.4.0] - 2026-11-06

### Added
- **Channel Intelligence & In-Page Chat Bubble View**: Streamlined multi-video Q&A chat with in-page bubble interface.
- **Video Comments Extraction**: Retrieval and parsing of top video comments for context enrichment.
- **Quick Onboarding Helper**: Interactive step-by-step guidance for first-time extension setup.
- **In-Page TTS Service**: Direct text-to-speech synthesis controller integrated into in-page banner.
- **InnerTube Bridge**: Background subtitle extraction bridge for signed player endpoints.

---

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
