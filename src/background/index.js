import { MessageRouter } from './MessageRouter.js';
import { PROVIDER_CONFIGS } from '../config/AIProviderPresets.js';

// Expose PROVIDER_CONFIGS for test backward compatibility
if (typeof globalThis !== 'undefined') {
  globalThis.PROVIDER_CONFIGS = PROVIDER_CONFIGS;
}

MessageRouter.init();
