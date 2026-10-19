import { YouTubeContextExtractor } from './YouTubeContextExtractor.js';
import { InnerTubeParser } from '../parsers/InnerTubeParser.js';
import { TextCleaner } from '../parsers/TextCleaner.js';
import { TimedtextParser } from '../parsers/TimedtextParser.js';

(function () {
  if (window.__ytAiMainWorldInjected) return;
  window.__ytAiMainWorldInjected = true;

  new YouTubeContextExtractor();

  // Expose helpers for tests and backward compatibility
  window.formatMs = InnerTubeParser.formatMs;
  window.cleanTranscriptText = TextCleaner.cleanTranscriptText;
  window.parseTimedtextEvents = TimedtextParser.parseTimedtextEvents;
  window.extractSegmentsFromInnerTubeJson = InnerTubeParser.extractSegmentsFromInnerTubeJson;
})();
