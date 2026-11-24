import { I18N } from '../../locales/index.js';

/**
 * Interactive accessible TTS transport bar (#ytAiSpeechPlayerBar):
 * supports Pause/Resume, Restart from start, Stop, and Seek playhead across text chunks.
 */
export class SpeechPlayerBar {
  static bind(audioController, getLang = () => 'en') {
    if (!audioController || typeof document === 'undefined') return () => {};
    const bar = document.getElementById('ytAiSpeechPlayerBar');
    if (!bar) return () => {};

    const unsub = audioController.subscribeSpeechState?.((st) => {
      SpeechPlayerBar.render(bar, st, audioController, getLang());
    });
    const current = audioController.getSpeechState?.();
    if (current) SpeechPlayerBar.render(bar, current, audioController, getLang());
    return unsub || (() => {});
  }

  static render(bar, state, audioController, lang = 'en') {
    if (!bar || typeof document === 'undefined' || typeof document.createElement !== 'function') return;
    if (!state?.isActive || !state.totalChunks) {
      bar.classList?.add('yt-ai-hidden');
      while (bar.firstChild) bar.removeChild?.(bar.firstChild);
      if ('innerHTML' in bar && !bar.removeChild) bar.innerHTML = '';
      return;
    }

    const activeLang = document.getElementById('ytAiLangSelect')?.value || lang || 'en';
    const t = I18N[activeLang] || I18N.en;
    bar.classList?.remove('yt-ai-hidden');
    bar.setAttribute?.('role', 'region');
    bar.setAttribute?.('aria-label', t.speechBarAriaLabel || 'Audio playback controls');
    while (bar.firstChild) bar.removeChild?.(bar.firstChild);

    const topRow = document.createElement('div');
    topRow.className = 'yt-ai-speech-controls';

    const restartBtn = SpeechPlayerBar._makeBtn(
      t.speechRestartBtn || '⏮ Start',
      t.speechRestartTitle || 'Restart playback from beginning',
      'ytAiSpeechRestartBtn',
      () => audioController.restartSpeech?.()
    );
    const pauseResumeLabel = state.isPaused
      ? (t.speechResumeBtn || '▶ Resume')
      : (t.speechPauseBtn || '⏸ Pause');
    const pauseBtn = SpeechPlayerBar._makeBtn(
      pauseResumeLabel,
      pauseResumeLabel,
      'ytAiSpeechPauseBtn',
      () => audioController.togglePauseResume?.()
    );
    const stopBtn = SpeechPlayerBar._makeBtn(
      t.speechStopBtn || '⏹ Stop',
      t.stopListenBtn || 'Stop playback',
      'ytAiSpeechStopBtn',
      () => audioController.stopSpeech?.(),
      'is-stop'
    );

    const counter = document.createElement('span');
    counter.className = 'yt-ai-speech-counter';
    counter.textContent = `${state.currentIndex + 1} / ${state.totalChunks}`;

    topRow.appendChild?.(restartBtn);
    topRow.appendChild?.(pauseBtn);
    topRow.appendChild?.(stopBtn);
    topRow.appendChild?.(counter);

    const sliderRow = document.createElement('div');
    sliderRow.className = 'yt-ai-speech-scrubber';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = 'ytAiSpeechSeekSlider';
    slider.className = 'yt-ai-speech-slider';
    slider.min = '0';
    slider.max = String(Math.max(0, state.totalChunks - 1));
    slider.step = '1';
    slider.value = String(state.currentIndex);
    slider.setAttribute?.('aria-label', t.speechSeekLabel || 'Move reading position in text');
    slider.addEventListener?.('change', (e) => {
      const idx = parseInt(e?.target?.value ?? slider.value, 10) || 0;
      audioController.seekSpeechToChunk?.(idx);
    });
    slider.addEventListener?.('input', (e) => {
      const idx = parseInt(e?.target?.value ?? slider.value, 10) || 0;
      counter.textContent = `${idx + 1} / ${state.totalChunks}`;
    });

    const snippet = document.createElement('span');
    snippet.className = 'yt-ai-speech-snippet';
    snippet.id = 'ytAiSpeechSnippet';
    snippet.textContent = state.currentText || '';

    sliderRow.appendChild?.(slider);
    sliderRow.appendChild?.(snippet);

    bar.appendChild?.(topRow);
    bar.appendChild?.(sliderRow);
  }

  static _makeBtn(label, title, id, onClick, extraClass = '') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = id;
    btn.className = `yt-ai-chat-action-mini ${extraClass}`.trim();
    btn.textContent = label;
    btn.title = title;
    btn.setAttribute?.('aria-label', title);
    btn.addEventListener?.('click', (e) => {
      e?.stopPropagation?.();
      onClick?.();
    });
    return btn;
  }
}

export default SpeechPlayerBar;
