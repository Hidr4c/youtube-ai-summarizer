/**
 * Entity representing an AI Prompt or Chat Completion Request
 */
export class AIRequest {
  /**
   * @param {Object} params
   */
  constructor({
    provider = 'lmstudio',
    model = '',
    messages = [],
    temperature = 0.3,
    maxTokens = null,
    serverUrl = '',
    apiKey = '',
    stream = true
  } = {}) {
    this.provider = provider;
    this.model = model;
    this.messages = messages;
    this.temperature = Number(temperature) || 0.3;
    this.maxTokens = maxTokens ? Number(maxTokens) : null;
    this.serverUrl = serverUrl;
    this.apiKey = apiKey;
    this.stream = Boolean(stream);
  }

  /**
   * Factory method to build request from prompt strings
   * @param {string} systemPrompt
   * @param {string} userPrompt
   * @param {Object} options
   * @returns {AIRequest}
   */
  static fromPrompts(systemPrompt, userPrompt, options = {}) {
    const messages = [];
    if (systemPrompt && systemPrompt.trim()) {
      messages.push({ role: 'system', content: systemPrompt.trim() });
    }
    if (userPrompt && userPrompt.trim()) {
      messages.push({ role: 'user', content: userPrompt.trim() });
    }
    return new AIRequest({ ...options, messages });
  }
}

export default AIRequest;
