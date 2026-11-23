/**
 * Lightweight, model-agnostic LLM tool-calling protocol for Q&A chat.
 * Allows the model to request on-demand page/site/video/channel audits
 * only when it judges existing context insufficient to answer reliably.
 */
export class ChatToolProtocol {
  static buildToolDirective(tools = []) {
    if (!Array.isArray(tools) || tools.length === 0) return '';
    const lines = tools.map((t) => `- [TOOL_CALL:${t.name}] — ${t.description}`);
    return [
      '\n=== AVAILABLE DIAGNOSTIC TOOLS ===',
      'Answer the user directly whenever the provided context is sufficient.',
      'ONLY if you genuinely need deeper verification to answer accurately (trustworthiness, scam/phishing risk, publisher identity, or deep fact-checking), reply ONLY with one or more exact tool tags below and NO other text:',
      ...lines,
      'The system will execute the requested tool(s) and re-invoke you with the results.'
    ].join('\n');
  }

  static parseToolInvocations(text = '', allowedTools = []) {
    const clean = String(text || '');
    const allowed = new Set(allowedTools);
    const found = [];
    const seen = new Set();
    const re = /\[TOOL_CALL:\s*([A-Z0-9_]+)(?:\s*[:|]\s*([^\]\r\n]+))?\s*\]/gi;
    let m;
    while ((m = re.exec(clean)) !== null) {
      const name = m[1].toUpperCase();
      const arg = (m[2] || '').trim();
      const key = `${name}|${arg}`;
      if (allowed.has(name) && !seen.has(key)) {
        seen.add(key);
        found.push({ name, arg });
      }
    }
    return found;
  }

  static parseToolCalls(text = '', allowedTools = []) {
    return [...new Set(ChatToolProtocol.parseToolInvocations(text, allowedTools).map((t) => t.name))];
  }

  static isPotentialToolPrefix(text = '') {
    const trimmed = String(text || '').trimStart();
    if (!trimmed) return true;
    if (trimmed.startsWith('<think>')) {
      const endIdx = trimmed.indexOf('</think>');
      if (endIdx === -1) return trimmed.length <= 4096;
      const afterThink = trimmed.slice(endIdx + 8).trimStart();
      if (!afterThink) return true;
      return afterThink.startsWith('[') && afterThink.length <= 1024 && !/\n\s*[^[\s]/.test(afterThink);
    }
    if (!trimmed.startsWith('[')) return false;
    return trimmed.length <= 1024 && !/\n\s*[^[\s]/.test(trimmed);
  }

  /**
   * Executes a chat stream with configurable multi-round tool interception.
   */
  static runStream({
    streamClient,
    streamConfig,
    allowedTools = [],
    maxToolRounds = 1,
    onExecuteTools,
    rebuildSystemPrompt,
    rebuildMessages,
    onStreamChunk,
    onToolStatus,
    onComplete,
    onError
  }) {
    const executedKeys = new Set();
    let round = 0;

    const startPass = (systemPrompt, messages, allowTools) => {
      let fullText = '';
      let flushedPrefix = !allowTools;

      streamClient.startStream({
        ...streamConfig,
        systemPrompt,
        messages,
        onChunk: (chunk) => {
          fullText += chunk;
          if (!flushedPrefix) {
            if (ChatToolProtocol.isPotentialToolPrefix(fullText)) return;
            flushedPrefix = true;
          }
          onStreamChunk?.(fullText);
        },
        onDone: async () => {
          const parsed = allowTools ? ChatToolProtocol.parseToolInvocations(fullText, allowedTools) : [];
          const fresh = parsed.filter((i) => !executedKeys.has(`${i.name}|${i.arg}`));
          const requested = [...new Set(fresh.map((i) => i.name))];
          if (fresh.length > 0 && typeof onExecuteTools === 'function') {
            try {
              round += 1;
              fresh.forEach((i) => executedKeys.add(`${i.name}|${i.arg}`));
              const modelNotes = fullText.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/\[TOOL_CALL:[^\]]+\]/gi, '').trim();
              onToolStatus?.(requested, fresh);
              await onExecuteTools(requested, fresh, modelNotes);
              const canContinue = round < maxToolRounds;
              const nextPrompt = typeof rebuildSystemPrompt === 'function' ? rebuildSystemPrompt(canContinue) : systemPrompt;
              const nextMsgs = typeof rebuildMessages === 'function' ? rebuildMessages() : messages;
              startPass(nextPrompt, nextMsgs, canContinue);
              return;
            } catch (_) {
              // Fall through to normal completion if tool execution fails
            }
          }
          const cleanOut = fullText.replace(/\[TOOL_CALL:\s*[A-Z0-9_]+(?:\s*[:|]\s*[^\]\r\n]+)?\s*\]/gi, '').trim() || fullText;
          onStreamChunk?.(cleanOut);
          onComplete?.(cleanOut);
        },
        onError: (err) => onError?.(err)
      });
    };

    startPass(streamConfig.systemPrompt, streamConfig.messages, allowedTools.length > 0 && maxToolRounds > 0);
  }
}

export default ChatToolProtocol;
