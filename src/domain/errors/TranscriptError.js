import AppError from './AppError.js';

/**
 * Error thrown when transcript extraction or parsing fails
 */
export class TranscriptError extends AppError {
  constructor(message, code = 'ERR_TRANSCRIPT_UNAVAILABLE', details = null) {
    super(message, code, details);
  }
}

export default TranscriptError;
