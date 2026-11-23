/**
 * Detects whether a given AI model supports image / multimodal inputs
 * using server-reported capabilities first and known multimodal families as fallback.
 */
const TEXT_ONLY_RE = /(?:embed|whisper|tts|codellama|starcoder|qwen[\d.]*-coder|deepseek-(?:r1|chat|coder|v2|v3)|sqlcoder)/i;

const MULTIMODAL_MODEL_RE = new RegExp([
  'vision', '-vl(?:$|[-_:\\s])', 'multimodal', 'llava', 'bakllava', 'moondream',
  'minicpm-?v', 'internvl', 'molmo', 'smolvlm', 'pixtral', 'paligemma',
  'phi-?3\\.5-?vision', 'phi-?4-?multimodal', 'kimi-?vl', 'glm-?4v',
  // Natively multimodal families without "vision" in their model ID
  'qwen3\\.[589]', 'qwen3-?vl', 'qwen2\\.5-?vl', 'qwen2-?vl', 'qwen-?vl',
  'gemma-?3(?!n)', 'gemma3',
  'llama-?4', 'llama4',
  'gpt-?4o', 'gpt-?4\\.1', 'gpt-?4\\.5', 'gpt-?5', '(?:^|[/:_-])o[134](?:$|[-_:\\s])',
  'claude-?3', 'claude-?(?:sonnet|opus|haiku)-?4',
  'gemini-?1\\.5', 'gemini-?2', 'gemini-?3',
  'mistral-?small-?3', 'magistral', 'grok-?3', 'grok-?4'
].join('|'), 'i');

export class ModelCapabilities {
  /**
   * Determines whether the model accepts image attachments.
   * @param {string} provider
   * @param {string} modelId
   * @param {Object|null} [meta=null] Optional server-reported metadata ({ type, capabilities, architecture, supportsImages })
   * @returns {boolean}
   */
  static supportsImages(provider, modelId, meta = null) {
    if (meta && typeof meta === 'object') {
      if (typeof meta.supportsImages === 'boolean') return meta.supportsImages;
      if (String(meta.type || '').toLowerCase() === 'vlm') return true;
      if (Array.isArray(meta.capabilities)) {
        const caps = meta.capabilities.map((c) => String(c).toLowerCase());
        if (caps.includes('vision') || caps.includes('image') || caps.includes('multimodal')) return true;
      }
      const modality = String(meta.architecture?.modality || meta.modality || '').toLowerCase();
      if (modality.includes('image')) return true;
    }

    const id = String(modelId || '').trim();
    if (!id) return false;
    if (TEXT_ONLY_RE.test(id)) return false;

    return MULTIMODAL_MODEL_RE.test(id);
  }

  /**
   * Extracts normalized capability metadata from a raw LM Studio / Ollama / OpenRouter model entry.
   * @param {Object} rawModel
   * @returns {{ supportsImages: boolean } | null}
   */
  static extractMeta(rawModel) {
    if (!rawModel || typeof rawModel !== 'object') return null;
    const type = String(rawModel.type || '').toLowerCase();
    const caps = Array.isArray(rawModel.capabilities) ? rawModel.capabilities.map((c) => String(c).toLowerCase()) : [];
    const modality = String(rawModel.architecture?.modality || rawModel.modality || '').toLowerCase();

    if (type === 'vlm' || caps.includes('vision') || caps.includes('image') || caps.includes('multimodal') || modality.includes('image')) {
      return { supportsImages: true };
    }
    if (type === 'llm' && caps.length > 0 && !caps.includes('vision')) {
      return { supportsImages: false };
    }
    return null;
  }
}

export default ModelCapabilities;
