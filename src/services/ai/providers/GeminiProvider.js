import { BaseAIProvider } from './BaseAIProvider.js';
import { PROVIDER_CONFIGS } from '../../../config/AIProviderPresets.js';

/**
 * AI Provider strategy for Google Gemini (supports dynamic live model discovery).
 */
export class GeminiProvider extends BaseAIProvider {
  constructor() {
    super('gemini', 'Google Gemini', false, PROVIDER_CONFIGS.gemini.endpoint);
  }
}

export default GeminiProvider;
