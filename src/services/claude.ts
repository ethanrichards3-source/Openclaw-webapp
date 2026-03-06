import { Message, ToolCall, AuthMethod } from '../types';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
  }>;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullText: string, usage: { input: number; output: number }) => void;
  onError: (error: Error) => void;
  onToolCall?: (toolCall: ToolCall) => void;
}

// Claude.ai web conversation API (session-based auth)
const CLAUDE_WEB_BASE = 'https://claude.ai/api';
// Anthropic API (API key auth)
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

export class ClaudeService {
  private authMethod: AuthMethod;
  private apiKey: string;
  private sessionCookie: string;
  private organizationId: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private abortController: AbortController | null = null;
  private webConversationId: string | null = null;

  constructor(
    authMethod: AuthMethod,
    apiKey: string,
    sessionCookie: string,
    organizationId: string,
    model: string,
    maxTokens = 4096,
    temperature = 0.7
  ) {
    this.authMethod = authMethod;
    this.apiKey = apiKey;
    this.sessionCookie = sessionCookie;
    this.organizationId = organizationId;
    this.model = model;
    this.maxTokens = maxTokens;
    this.temperature = temperature;
  }

  updateConfig(config: {
    authMethod?: AuthMethod;
    apiKey?: string;
    sessionCookie?: string;
    organizationId?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }) {
    if (config.authMethod) this.authMethod = config.authMethod;
    if (config.apiKey) this.apiKey = config.apiKey;
    if (config.sessionCookie) this.sessionCookie = config.sessionCookie;
    if (config.organizationId) this.organizationId = config.organizationId;
    if (config.model) this.model = config.model;
    if (config.maxTokens) this.maxTokens = config.maxTokens;
    if (config.temperature !== undefined) this.temperature = config.temperature;
  }

  isConfigured(): boolean {
    if (this.authMethod === 'session_cookie') {
      return !!this.sessionCookie;
    }
    return !!this.apiKey;
  }

  private formatMessages(messages: Message[], systemPrompt: string): { system: string; messages: ClaudeMessage[] } {
    const formattedMessages: ClaudeMessage[] = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    return {
      system: systemPrompt,
      messages: formattedMessages,
    };
  }

  // --- Session Cookie Auth (claude.ai login) ---

  private async createWebConversation(): Promise<string> {
    const response = await fetch(`${CLAUDE_WEB_BASE}/organizations/${this.organizationId}/chat_conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sessionKey=${this.sessionCookie}`,
      },
      body: JSON.stringify({
        name: '',
        uuid: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create conversation: ${response.status}`);
    }

    const data = await response.json();
    return data.uuid;
  }

  private async sendWebMessage(
    messages: Message[],
    systemPrompt: string,
    callbacks: StreamCallbacks
  ): Promise<void> {
    if (!this.sessionCookie) {
      callbacks.onError(new Error('Session cookie not configured. Go to Settings and paste your Claude session cookie.'));
      return;
    }

    this.abortController = new AbortController();

    try {
      // Create a conversation if we don't have one
      if (!this.webConversationId) {
        this.webConversationId = await this.createWebConversation();
      }

      // Build the prompt with system context prepended to first user message
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      if (!lastUserMessage) {
        callbacks.onError(new Error('No user message to send'));
        return;
      }

      // For session-based auth, we send through the claude.ai chat API
      const response = await fetch(
        `${CLAUDE_WEB_BASE}/organizations/${this.organizationId}/chat_conversations/${this.webConversationId}/completion`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `sessionKey=${this.sessionCookie}`,
            'Accept': 'text/event-stream',
          },
          body: JSON.stringify({
            prompt: lastUserMessage.content,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            model: this.model,
          }),
          signal: this.abortController.signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401 || response.status === 403) {
          this.webConversationId = null;
          throw new Error('Session expired. Please update your session cookie in Settings.');
        }
        throw new Error(`Claude.ai API error (${response.status}): ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') continue;

          try {
            const event = JSON.parse(data);

            // Claude.ai streams completion text
            if (event.completion) {
              const newText = event.completion.slice(fullText.length);
              if (newText) {
                fullText = event.completion;
                callbacks.onToken(newText);
              }
            } else if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
              const token = event.delta.text;
              fullText += token;
              callbacks.onToken(token);
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      callbacks.onComplete(fullText, { input: 0, output: 0 });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        callbacks.onComplete('', { input: 0, output: 0 });
        return;
      }
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // --- API Key Auth (standard Anthropic API) ---

  private async sendApiMessage(
    messages: Message[],
    systemPrompt: string,
    callbacks: StreamCallbacks
  ): Promise<void> {
    if (!this.apiKey) {
      callbacks.onError(new Error('API key not configured. Go to Settings to add your Claude API key.'));
      return;
    }

    this.abortController = new AbortController();
    const { system, messages: formattedMessages } = this.formatMessages(messages, systemPrompt);

    try {
      const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: this.maxTokens,
          temperature: this.temperature,
          system,
          messages: formattedMessages,
          stream: true,
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage = `API error (${response.status})`;
        try {
          const parsed = JSON.parse(errorBody);
          errorMessage = parsed.error?.message || errorMessage;
        } catch {
          // use default error message
        }
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullText = '';
      let inputTokens = 0;
      let outputTokens = 0;
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const event = JSON.parse(data);

            if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
              const token = event.delta.text;
              fullText += token;
              callbacks.onToken(token);
            } else if (event.type === 'message_delta' && event.usage) {
              outputTokens = event.usage.output_tokens;
            } else if (event.type === 'message_start' && event.message?.usage) {
              inputTokens = event.message.usage.input_tokens;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      callbacks.onComplete(fullText, { input: inputTokens, output: outputTokens });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        callbacks.onComplete('', { input: 0, output: 0 });
        return;
      }
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // --- Public API ---

  async sendMessage(
    messages: Message[],
    systemPrompt: string,
    callbacks: StreamCallbacks
  ): Promise<void> {
    if (this.authMethod === 'session_cookie') {
      return this.sendWebMessage(messages, systemPrompt, callbacks);
    }
    return this.sendApiMessage(messages, systemPrompt, callbacks);
  }

  async sendMessageSync(
    messages: Message[],
    systemPrompt: string
  ): Promise<{ text: string; usage: { input: number; output: number } }> {
    return new Promise((resolve, reject) => {
      let result = { text: '', usage: { input: 0, output: 0 } };
      this.sendMessage(messages, systemPrompt, {
        onToken: () => {},
        onComplete: (text, usage) => {
          result = { text, usage };
          resolve(result);
        },
        onError: reject,
      });
    });
  }

  resetWebConversation() {
    this.webConversationId = null;
  }

  cancelRequest() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

let claudeInstance: ClaudeService | null = null;

export function getClaudeService(
  authMethod: AuthMethod,
  apiKey: string,
  sessionCookie: string,
  organizationId: string,
  model: string,
  maxTokens?: number,
  temperature?: number
): ClaudeService {
  if (!claudeInstance) {
    claudeInstance = new ClaudeService(authMethod, apiKey, sessionCookie, organizationId, model, maxTokens, temperature);
  } else {
    claudeInstance.updateConfig({ authMethod, apiKey, sessionCookie, organizationId, model, maxTokens, temperature });
  }
  return claudeInstance;
}
