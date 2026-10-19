/**
 * Interface for Audio Speech Services (TTS & STT)
 */
export class ISpeechService {
  /**
   * Speaks text aloud
   * @param {string} text
   * @param {Object} options - rate, pitch, voiceURI
   * @param {Function} onEnd
   */
  speak(text, options = {}, onEnd = null) {
    throw new Error('Not implemented');
  }

  /**
   * Stops any currently active speech synthesis
   */
  stop() {
    throw new Error('Not implemented');
  }

  /**
   * Starts speech-to-text dictation
   * @param {Object} options
   * @param {Function} onResult
   * @param {Function} onError
   */
  startDictation(options, onResult, onError) {
    throw new Error('Not implemented');
  }

  /**
   * Stops active dictation
   */
  stopDictation() {
    throw new Error('Not implemented');
  }
}

export default ISpeechService;
