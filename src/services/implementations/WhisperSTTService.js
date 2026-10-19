/**
 * Speech-to-Text (STT) Service with Local/Cloud Whisper endpoint integration
 */
export class WhisperSTTService {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
  }

  /**
   * Starts recording audio from selected microphone
   * @param {string} [deviceId]
   * @returns {Promise<void>}
   */
  async startRecording(deviceId = '') {
    if (this.isRecording) return;

    const constraints = deviceId
      ? { audio: { deviceId: { exact: deviceId } } }
      : { audio: true };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.audioChunks = [];

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4');

    this.mediaRecorder = new MediaRecorder(stream, { mimeType });
    this.mimeType = mimeType;

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.audioChunks.push(e.data);
      }
    };

    this.mediaRecorder.start();
    this.isRecording = true;
  }

  /**
   * Stops recording and returns the recorded audio Blob
   * @returns {Promise<Blob>}
   */
  stopRecording() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const stream = this.mediaRecorder.stream;
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
        }
        const blob = new Blob(this.audioChunks, { type: this.mimeType || 'audio/webm' });
        this.isRecording = false;
        this.mediaRecorder = null;
        resolve(blob);
      };

      try {
        this.mediaRecorder.stop();
      } catch (err) {
        this.isRecording = false;
        reject(err);
      }
    });
  }

  /**
   * Sends audio Blob to Whisper endpoint for transcription
   * @param {Blob} audioBlob
   * @param {string} endpoint
   * @param {string} [apiKey]
   * @param {string} [language]
   * @returns {Promise<string>}
   */
  async transcribe(audioBlob, endpoint, apiKey = '', language = 'en') {
    if (!audioBlob || audioBlob.size < 1000) {
      throw new Error('Audio recording too short');
    }

    const formData = new FormData();
    formData.append('file', audioBlob, 'speech.webm');
    formData.append('model', 'whisper-1');
    if (language) formData.append('language', language);

    const headers = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `HTTP ${res.status}`);
    }

    const json = await res.json();
    return json.text?.trim() || '';
  }
}

export default WhisperSTTService;
