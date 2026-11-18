import { BaseAIProvider } from './BaseAIProvider.js';
import { PROVIDER_CONFIGS } from '../../../config/AIProviderPresets.js';

/**
 * AI Provider strategy for DeepSeek
 */
export class DeepSeekProvider extends BaseAIProvider {
  constructor() {
    super('deepseek', 'DeepSeek', false, PROVIDER_CONFIGS.deepseek.endpoint);
  }
}

export default DeepSeekProvider;
