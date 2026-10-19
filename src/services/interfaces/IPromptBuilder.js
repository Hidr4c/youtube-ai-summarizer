/**
 * Interface for AI Prompt Construction and Context Compression
 */
export class IPromptBuilder {
  /**
   * Condenses a long transcript if it exceeds character limits
   * @param {string} text
   * @param {number} maxChars
   * @returns {string}
   */
  condenseTranscript(text, maxChars) {
    throw new Error('Not implemented');
  }

  /**
   * Builds system and user prompts for video summarization
   * @param {string} title
   * @param {string} author
   * @param {string} transcriptText
   * @param {string} targetLang
   * @param {string} formatMode
   * @param {string} [customDirectives]
   * @param {Object} [extraContext]
   * @returns {{ systemPrompt: string, userPrompt: string }}
   */
  buildSummaryPrompts(title, author, transcriptText, targetLang, formatMode, customDirectives = '', extraContext = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Builds system and user prompts for Q&A chat
   * @param {string} title
   * @param {string} transcriptText
   * @param {string} targetLang
   * @param {Array<Object>} chatHistory
   * @param {string} userQuestion
   * @param {Object} [extraContext]
   * @returns {{ systemPrompt: string, messages: Array<Object> }}
   */
  buildChatPrompts(title, transcriptText, targetLang, chatHistory, userQuestion, extraContext = {}) {
    throw new Error('Not implemented');
  }
}

export default IPromptBuilder;
