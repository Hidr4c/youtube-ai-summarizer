import { I18N } from '../../locales/index.js';
import { LANG_LOCALES } from '../../config/AIProviderPresets.js';

/**
 * Speech-to-Text (STT) Service
 * Manages microphone enumeration, Web Speech API dictation, and Whisper STT recording/API calls.
 */
export class InPageSTTService {
  constructor() {
    this.isDictating = false;
    this.isWhisperRecording = false;
    this.activeMediaRecorder = null;
    this.recordedAudioChunks = [];
    this.selectedMicDeviceId = '';
    this.availableMicrophones = [];
    this.dictationBaseText = '';
    this.isBraveBrowser = false;
    this.onStopSpeechCallback = null;

    try {
      if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
        navigator.brave.isBrave().then(val => { this.isBraveBrowser = !!val; }).catch(() => {});
      }
    } catch (_) {}

    this.setupMainWorldListener();
  }

  async initMicrophoneDevices() {
    await this.refreshMicrophonesList();
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', () => this.refreshMicrophonesList());
    }
  }

  async refreshMicrophonesList() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableMicrophones = devices.filter(d => d.kind === 'audioinput');
      const micSelect = document.getElementById('ytAiMicSelect');
      if (!micSelect) return;

      micSelect.innerHTML = '<option value="">🎙️ Default mic</option>';
      this.availableMicrophones.forEach((dev, idx) => {
        const opt = document.createElement('option');
        opt.value = dev.deviceId;
        opt.textContent = `🎙️ ${dev.label || `Microphone ${idx + 1}`}`;
        if (dev.deviceId && dev.deviceId === this.selectedMicDeviceId) {
          opt.selected = true;
        }
        micSelect.appendChild(opt);
      });
    } catch (_) {}
  }

  setupMainWorldListener() {
    window.addEventListener('message', (event) => {
      if (event.source !== window || !event.data) return;
      const targetLang = document.getElementById('ytAiLangSelect')?.value || 'en';
      const t = I18N[targetLang] || I18N.en;

      if (event.data.type === 'YT_AI_SPEECH_STARTED') {
        this.isDictating = true;
        this.showMicNotice(t.micActiveNotice || '🎙️ Voice dictation active... Speak now.', false);
      } else if (event.data.type === 'YT_AI_SPEECH_RESULT') {
        const chatInput = document.getElementById('ytAiChatInput');
        if (chatInput && this.isDictating) {
          const prefix = this.dictationBaseText ? this.dictationBaseText.trim() + ' ' : '';
          const full = (prefix + (event.data.finalText || '') + (event.data.interimText || '')).trimStart();
          chatInput.value = full;
        }
      } else if (event.data.type === 'YT_AI_SPEECH_ERROR') {
        const err = event.data.error;
        if (err === 'not-allowed') this.showMicNotice(t.micBlockedNotice, true);
        else if (err === 'audio-capture') this.showMicNotice(t.micNoDeviceNotice, true);
        else if (err === 'network') this.showMicNotice(t.micNetworkNotice, true);
        else if (err === 'not-supported') this.showMicNotice(t.micNotSupportedNotice, true);
        else if (err !== 'no-speech') this.showMicNotice(`${t.micErrorNotice} ${err}`, true);
        this.stopDictation();
      } else if (event.data.type === 'YT_AI_SPEECH_ENDED') {
        if (this.isDictating) this.stopDictation();
      }
    });
  }

  showMicNotice(text, isError = false) {
    const notice = document.getElementById('ytAiMicNotice');
    if (!notice) return;
    notice.textContent = text;
    notice.className = `yt-ai-mic-notice ${isError ? 'is-error' : 'is-info'}`;
    notice.classList.remove('yt-ai-hidden');
    setTimeout(() => {
      if (notice.textContent === text) notice.classList.add('yt-ai-hidden');
    }, isError ? 9000 : 4000);
  }

  async toggleDictation(options = {}) {
    if (this.isDictating) {
      this.stopDictation();
      return;
    }

    if (options.localWhisperUrl) {
      await this.startWhisperRecording('', 'local', options.localWhisperUrl);
      return;
    }

    if (options.groqKey) {
      await this.startWhisperRecording(options.groqKey, 'groq');
      return;
    }
    if (options.openaiKey) {
      await this.startWhisperRecording(options.openaiKey, 'openai');
      return;
    }

    if (this.isBraveBrowser) {
      const targetLang = document.getElementById('ytAiLangSelect')?.value || 'en';
      const t = I18N[targetLang] || I18N.en;
      this.showMicNotice(t.braveMicNotice || 'On Brave Browser, please use Local Whisper or add a Groq/OpenAI key.', true);
      return;
    }

    await this.startDictation();
  }

  async startWhisperRecording(apiKey, provider, customUrl = '') {
    if (typeof this.onStopSpeechCallback === 'function') this.onStopSpeechCallback();
    const targetLang = document.getElementById('ytAiLangSelect')?.value || 'en';
    const t = I18N[targetLang] || I18N.en;

    try {
      const constraints = this.selectedMicDeviceId
        ? { audio: { deviceId: { exact: this.selectedMicDeviceId } } }
        : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      await this.refreshMicrophonesList();

      this.recordedAudioChunks = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4');

      this.activeMediaRecorder = new MediaRecorder(stream, { mimeType });
      this.activeMediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) this.recordedAudioChunks.push(e.data);
      };

      this.activeMediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(this.recordedAudioChunks, { type: mimeType });
        if (audioBlob.size > 1500) {
          await this.transcribeWithWhisperApi(audioBlob, apiKey, provider, targetLang, customUrl);
        } else {
          this.showMicNotice(t.whisperNoAudio || 'No audio recorded. Please speak into your microphone.', false);
        }
      };

      this.activeMediaRecorder.start();
      this.isDictating = true;
      this.isWhisperRecording = true;

      const micBtn = document.getElementById('ytAiMicBtn');
      const chatInput = document.getElementById('ytAiChatInput');
      if (micBtn) {
        micBtn.classList.add('is-recording');
        micBtn.title = t.micStopTitle || 'Stop dictation';
        micBtn.innerHTML = '<span class="yt-ai-mic-icon">🔴</span>';
      }
      if (chatInput) {
        chatInput.placeholder = t.whisperRecording || '🎙️ Whisper recording (Mic)...';
      }
      this.showMicNotice(t.whisperRecording || '🎙️ Whisper recording (Mic)...', false);
    } catch (err) {
      this.showMicNotice(`${t.micErrorNotice} ${err.message || err.name}`, true);
      this.stopDictation();
    }
  }

  async transcribeWithWhisperApi(audioBlob, apiKey, provider, targetLang, customUrl = '') {
    const micBtn = document.getElementById('ytAiMicBtn');
    const chatInput = document.getElementById('ytAiChatInput');
    const t = I18N[targetLang] || I18N.en;

    if (micBtn) micBtn.innerHTML = '<span class="yt-ai-spinner"></span>';
    this.showMicNotice(t.whisperTranscribing || '⏳ Transcribing audio with Whisper...', false);

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'speech.webm');
      formData.append('model', provider === 'groq' ? 'whisper-large-v3-turbo' : 'whisper-1');
      if (targetLang) formData.append('language', targetLang);

      const endpoint = provider === 'local'
        ? (customUrl || 'http://localhost:8000/v1/audio/transcriptions')
        : (provider === 'groq' ? 'https://api.groq.com/openai/v1/audio/transcriptions' : 'https://api.openai.com/v1/audio/transcriptions');

      const headers = {};
      if (provider !== 'local' && apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      const res = await fetch(endpoint, { method: 'POST', headers, body: formData });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `HTTP ${res.status}`);
      }
      const json = await res.json();
      const text = json.text?.trim() || '';
      if (text && chatInput) {
        chatInput.value = (chatInput.value ? chatInput.value.trim() + ' ' : '') + text;
        this.showMicNotice('✅ ' + (t.transcriptExtracted || 'Transcript extracted'), false);
      }
    } catch (err) {
      this.showMicNotice(`${t.errorLabel || 'Error: '}${err.message}`, true);
    } finally {
      if (micBtn) {
        micBtn.classList.remove('is-recording');
        micBtn.innerHTML = '<span class="yt-ai-mic-icon">🎤</span>';
      }
      if (chatInput) chatInput.placeholder = t.chatPlaceholder || 'Ask a question or dictate with mic...';
    }
  }

  async startDictation() {
    if (typeof this.onStopSpeechCallback === 'function') this.onStopSpeechCallback();
    const targetLang = document.getElementById('ytAiLangSelect')?.value || 'en';
    const t = I18N[targetLang] || I18N.en;

    try {
      const constraints = this.selectedMicDeviceId
        ? { audio: { deviceId: { exact: this.selectedMicDeviceId } } }
        : { audio: true };
      const testStream = await navigator.mediaDevices.getUserMedia(constraints);
      testStream.getTracks().forEach(track => track.stop());
      await this.refreshMicrophonesList();
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.showMicNotice(t.micBlockedNotice, true);
      } else {
        this.showMicNotice(`${t.micErrorNotice} ${err.message || err.name}`, true);
      }
      this.stopDictation();
      return;
    }

    this.isDictating = true;
    const micBtn = document.getElementById('ytAiMicBtn');
    const chatInput = document.getElementById('ytAiChatInput');
    this.dictationBaseText = chatInput ? chatInput.value : '';

    if (micBtn) {
      micBtn.classList.add('is-recording');
      micBtn.title = t.micStopTitle || 'Stop dictation';
      micBtn.innerHTML = '<span class="yt-ai-mic-icon">🔴</span>';
    }
    if (chatInput) {
      chatInput.placeholder = t.chatInputListening || '🎙️ Dictating... Speak into your microphone.';
    }
    this.showMicNotice(t.micActiveNotice || '🎙️ Voice dictation active... Speak now.', false);

    window.postMessage({
      type: 'YT_AI_START_SPEECH',
      lang: LANG_LOCALES[targetLang] || 'en-US'
    }, '*');
  }

  stopDictation() {
    this.isDictating = false;
    if (this.isWhisperRecording && this.activeMediaRecorder && this.activeMediaRecorder.state !== 'inactive') {
      this.isWhisperRecording = false;
      try { this.activeMediaRecorder.stop(); } catch (_) {}
      this.activeMediaRecorder = null;
      return;
    }

    window.postMessage({ type: 'YT_AI_STOP_SPEECH' }, '*');
    const micBtn = document.getElementById('ytAiMicBtn');
    const chatInput = document.getElementById('ytAiChatInput');
    const targetLang = document.getElementById('ytAiLangSelect')?.value || 'en';
    const t = I18N[targetLang] || I18N.en;

    if (micBtn) {
      micBtn.classList.remove('is-recording');
      micBtn.title = t.micTitle || 'Dictate your question with microphone';
      micBtn.innerHTML = '<span class="yt-ai-mic-icon">🎤</span>';
    }
    if (chatInput) {
      chatInput.placeholder = t.chatPlaceholder || 'Ask a question or dictate with mic... (Press Enter to send)';
    }
  }
}

export default InPageSTTService;
