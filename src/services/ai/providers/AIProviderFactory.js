import { LMStudioProvider } from './LMStudioProvider.js';
import { OllamaProvider } from './OllamaProvider.js';
import { GeminiProvider } from './GeminiProvider.js';
import { GroqProvider } from './GroqProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';
import { ClaudeProvider } from './ClaudeProvider.js';
import { DeepSeekProvider } from './DeepSeekProvider.js';
import { BaseAIProvider } from './BaseAIProvider.js';

/**
 * Factory for creating and retrieving AI inference provider instances
 */
export class AIProviderFactory {
  static instances = new Map();

  /**
   * Retrieves or instantiates provider strategy by ID
   * @param {string} providerId
   * @returns {BaseAIProvider}
   */
  static getProvider(providerId = 'lmstudio') {
    const id = providerId.toLowerCase();
    if (this.instances.has(id)) {
      return this.instances.get(id);
    }

    let instance;
    switch (id) {
      case 'lmstudio':
        instance = new LMStudioProvider();
        break;
      case 'ollama':
        instance = new OllamaProvider();
        break;
      case 'gemini':
        instance = new GeminiProvider();
        break;
      case 'groq':
        instance = new GroqProvider();
        break;
      case 'openai':
        instance = new OpenAIProvider();
        break;
      case 'claude':
        instance = new ClaudeProvider();
        break;
      case 'deepseek':
        instance = new DeepSeekProvider();
        break;
      default:
        instance = new BaseAIProvider(id, id.toUpperCase(), false);
        break;
    }

    this.instances.set(id, instance);
    return instance;
  }
}

export default AIProviderFactory;
