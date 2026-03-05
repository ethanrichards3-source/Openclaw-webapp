import { Message, ToolCall } from '../types';

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

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

export class ClaudeService {
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private abortController: AbortController | null = null;

  constructor(apiKey: string, model: string, maxTokens = 4096, temperature = 0.7) {
    this.apiKey = apiKey;
    this.model = model;
    this.maxTokens = maxTokens;
    this.temperature = temperature;
  }

  updateConfig(config: { apiKey?: string; model?: string; maxTokens?: number; temperature?: number }) {
    if (config.apiKey) this.apiKey = config.apiKey;
    if (config.model) this.model = config.model;
    if (config.maxTokens) this.maxTokens = config.maxTokens;
    if (config.temperature !== undefined) this.temperature = config.temperature;
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

  async sendMessage(
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
        callbacks.onComplete(fullText || '', { input: 0, output: 0 });
        return;
      }
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async sendMessageSync(
    messages: Message[],
    systemPrompt: string
  ): Promise<{ text: string; usage: { input: number; output: number } }> {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    const { system, messages: formattedMessages } = this.formatMessages(messages, systemPrompt);

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
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = `API error (${response.status})`;
      try {
        const parsed = JSON.parse(errorBody);
        errorMessage = parsed.error?.message || errorMessage;
      } catch {
        // use default
      }
      throw new Error(errorMessage);
    }

    const data: ClaudeResponse = await response.json();
    const text = data.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    return {
      text,
      usage: {
        input: data.usage.input_tokens,
        output: data.usage.output_tokens,
      },
    };
  }

  cancelRequest() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

let claudeInstance: ClaudeService | null = null;

export function getClaudeService(apiKey: string, model: string, maxTokens?: number, temperature?: number): ClaudeService {
  if (!claudeInstance) {
    claudeInstance = new ClaudeService(apiKey, model, maxTokens, temperature);
  } else {
    claudeInstance.updateConfig({ apiKey, model, maxTokens, temperature });
  }
  return claudeInstance;
}
