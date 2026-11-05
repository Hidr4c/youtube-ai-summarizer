import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InPageTTSService } from '../src/content/services/InPageTTSService.js';

describe('InPageTTSService Voice & Language Adaptation', () => {
  const mockVoices = [
    { name: 'Google Deutsch', lang: 'de-DE', voiceURI: 'Google Deutsch' },
    { name: 'Google US English', lang: 'en-US', voiceURI: 'Google US English' },
    { name: 'Google español', lang: 'es-ES', voiceURI: 'Google español' },
    { name: 'Google français', lang: 'fr-FR', voiceURI: 'Google français' },
    { name: 'Microsoft Hortense', lang: 'fr-FR', voiceURI: 'Microsoft Hortense' }
  ];

  function setupSpeechMock() {
    let spokenUtterances = [];
    globalThis.window = globalThis.window || {};
    globalThis.window.speechSynthesis = {
      speaking: false,
      getVoices: () => mockVoices,
      speak: (u) => { spokenUtterances.push(u); },
      cancel: () => {},
      pause: () => {},
      resume: () => {}
    };

    globalThis.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
        this.lang = '';
        this.rate = 1.0;
        this.voice = null;
      }
    };

    globalThis.document = {
      getElementById: (id) => {
        if (id === 'ytAiLangSelect') return { value: 'en' };
        if (id === 'ytAiVoiceSelect') return null;
        return null;
      }
    };

    return {
      getSpoken: () => spokenUtterances,
      clear: () => { spokenUtterances = []; }
    };
  }

  it('automatically selects English voice when options.lang is en', () => {
    const mock = setupSpeechMock();
    const tts = new InPageTTSService();

    tts.speakText('This is a test answer.', null, { lang: 'en' });
    const spoken = mock.getSpoken();

    assert.equal(spoken.length, 1, 'Must dispatch one utterance');
    assert.equal(spoken[0].lang, 'en-US', 'Utterance lang must be en-US');
    assert.equal(spoken[0].voice?.name, 'Google US English', 'Must match Google US English voice');
    tts.stopSpeech();
  });

  it('automatically selects French voice when options.lang is fr', () => {
    const mock = setupSpeechMock();
    const tts = new InPageTTSService();

    tts.speakText('Ceci est un test en français.', null, { lang: 'fr' });
    const spoken = mock.getSpoken();

    assert.equal(spoken.length, 1);
    assert.equal(spoken[0].lang, 'fr-FR');
    assert.equal(spoken[0].voice?.lang, 'fr-FR');
    tts.stopSpeech();
  });

  it('automatically selects Spanish voice when options.lang is es', () => {
    const mock = setupSpeechMock();
    const tts = new InPageTTSService();

    tts.speakText('Esta es una prueba.', null, { lang: 'es' });
    const spoken = mock.getSpoken();

    assert.equal(spoken.length, 1);
    assert.equal(spoken[0].lang, 'es-ES');
    assert.equal(spoken[0].voice?.name, 'Google español');
    tts.stopSpeech();
  });

  it('switches voice immediately when language changes without retaining mismatched voice', () => {
    const mock = setupSpeechMock();
    const tts = new InPageTTSService();

    // First speak in French
    tts.speakText('Bonjour', null, { lang: 'fr' });
    assert.equal(mock.getSpoken()[0].voice?.lang, 'fr-FR');
    tts.stopSpeech();
    mock.clear();

    // Now speak in English: must NOT use previous French voice
    tts.speakText('Hello', null, { lang: 'en' });
    assert.equal(mock.getSpoken()[0].voice?.lang, 'en-US');
    assert.equal(mock.getSpoken()[0].voice?.name, 'Google US English');
    tts.stopSpeech();
  });
});
