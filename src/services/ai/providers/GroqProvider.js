import { BaseAIProvider } from './BaseAIProvider.js';
import { PROVIDER_CONFIGS } from '../../../config/AIProviderPresets.js';

/**
 * AI Provider strategy for Groq
 */
export class GroqProvider extends BaseAIProvider {
  constructor() {
    super('groq', 'Groq (Ultra-Fast)', false, PROVIDER_CONFIGS.groq.endpoint);
  }
}

export default GroqProvider;
