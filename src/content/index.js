import { ContentController } from './ContentController.js';
import { PromptBuilder } from '../services/implementations/PromptBuilder.js';
import { I18N } from '../locales/index.js';
import {
  CLOUD_MODELS,
  API_KEY_PORTALS,
  CONTEXT_LIMITS,
  PROVIDER_NAMES,
  LANG_LOCALES
} from '../config/AIProviderPresets.js';

// Expose constants and functions on window/global for tests and external scripts
const promptBuilder = new PromptBuilder();

if (typeof window !== 'undefined') {
  window.I18N = I18N;
  window.CLOUD_MODELS = CLOUD_MODELS;
  window.API_KEY_PORTALS = API_KEY_PORTALS;
  window.CONTEXT_LIMITS = CONTEXT_LIMITS;
  window.PROVIDER_NAMES = PROVIDER_NAMES;
  window.LANG_LOCALES = LANG_LOCALES;

  window.condenseTranscriptForContext = function (transcript, maxChars) {
    return promptBuilder.condenseTranscript(transcript, maxChars);
  };

  window.buildPrompts = function (title, author, safeTranscript, lang, mode) {
    return promptBuilder.buildSummaryPrompts(title, author, safeTranscript, lang, mode);
  };
}

(function () {
  if (typeof window !== 'undefined') {
    if (window.__ytAiSummarizerInjected) return;
    window.__ytAiSummarizerInjected = true;

    const controller = new ContentController();
    controller.init();
  }
})();
