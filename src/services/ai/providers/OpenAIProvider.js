import { BaseAIProvider } from './BaseAIProvider.js';
import { PROVIDER_CONFIGS } from '../../../config/AIProviderPresets.js';

/**
 * AI Provider strategy for OpenAI
 */
export class OpenAIProvider extends BaseAIProvider {
  constructor() {
    super('openai', 'OpenAI', false, PROVIDER_CONFIGS.openai.endpoint);
  }
}

export default OpenAIProvider;
