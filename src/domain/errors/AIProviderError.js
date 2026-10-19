import AppError from './AppError.js';

/**
 * Error thrown when AI provider invocation or streaming fails
 */
export class AIProviderError extends AppError {
  constructor(message, code = 'ERR_AI_PROVIDER', details = null) {
    super(message, code, details);
  }
}

export default AIProviderError;
