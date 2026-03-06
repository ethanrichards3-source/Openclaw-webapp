import { TelegramConfig, ChannelSource, Message } from '../types';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; first_name: string; username?: string };
    chat: { id: number; type: string };
    text?: string;
    date: number;
  };
}

type MessageHandler = (text: string, channel: ChannelSource) => Promise<string>;

const TELEGRAM_API = 'https://api.telegram.org/bot';

export class TelegramBotService {
  private config: TelegramConfig;
  private polling = false;
  private pollTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastUpdateId = 0;
  private onMessage: MessageHandler | null = null;

  constructor(config: TelegramConfig) {
    this.config = config;
  }

  updateConfig(config: TelegramConfig) {
    const wasRunning = this.polling;
    if (wasRunning) this.stop();
    this.config = config;
    if (wasRunning && config.enabled && config.botToken) this.start();
  }

  setMessageHandler(handler: MessageHandler) {
    this.onMessage = handler;
  }

  async start(): Promise<void> {
    if (!this.config.botToken || !this.config.enabled) return;
    this.polling = true;
    this.poll();
  }

  stop() {
    this.polling = false;
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }
  }

  private async poll(): Promise<void> {
    if (!this.polling) return;

    try {
      const url = `${TELEGRAM_API}${this.config.botToken}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=30`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error('Telegram poll error:', response.status);
        this.scheduleNextPoll(5000);
        return;
      }

      const data = await response.json();
      if (data.ok && data.result) {
        for (const update of data.result as TelegramUpdate[]) {
          this.lastUpdateId = update.update_id;
          await this.handleUpdate(update);
        }
      }
    } catch (error) {
      console.error('Telegram poll error:', error);
    }

    this.scheduleNextPoll(1000);
  }

  private scheduleNextPoll(delay: number) {
    if (!this.polling) return;
    this.pollTimeout = setTimeout(() => this.poll(), delay);
  }

  private async handleUpdate(update: TelegramUpdate): Promise<void> {
    if (!update.message?.text || !this.onMessage) return;

    const chatId = String(update.message.chat.id);

    // Check if this chat is allowed
    if (this.config.allowedChatIds.length > 0 && !this.config.allowedChatIds.includes(chatId)) {
      await this.sendMessage(chatId, 'Unauthorized. Your chat ID is not in the allowed list.');
      return;
    }

    const channel: ChannelSource = {
      type: 'telegram',
      channelId: chatId,
      username: update.message.from.username || update.message.from.first_name,
      messageId: String(update.message.message_id),
    };

    try {
      const reply = await this.onMessage(update.message.text, channel);
      await this.sendMessage(chatId, reply);
    } catch (error) {
      await this.sendMessage(chatId, 'Error processing your message. Please try again.');
    }
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    if (!this.config.botToken) return;

    // Telegram has a 4096 char limit, split if needed
    const chunks = this.splitMessage(text, 4096);
    for (const chunk of chunks) {
      await fetch(`${TELEGRAM_API}${this.config.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: chunk,
          parse_mode: 'Markdown',
        }),
      });
    }
  }

  async testConnection(): Promise<{ ok: boolean; botName?: string; error?: string }> {
    try {
      const response = await fetch(`${TELEGRAM_API}${this.config.botToken}/getMe`);
      const data = await response.json();
      if (data.ok) {
        return { ok: true, botName: data.result.username };
      }
      return { ok: false, error: data.description || 'Unknown error' };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  }

  private splitMessage(text: string, maxLen: number): string[] {
    if (text.length <= maxLen) return [text];
    const chunks: string[] = [];
    let remaining = text;
    while (remaining.length > 0) {
      if (remaining.length <= maxLen) {
        chunks.push(remaining);
        break;
      }
      // Try to split at a newline
      let splitIdx = remaining.lastIndexOf('\n', maxLen);
      if (splitIdx < maxLen / 2) splitIdx = maxLen;
      chunks.push(remaining.slice(0, splitIdx));
      remaining = remaining.slice(splitIdx);
    }
    return chunks;
  }

  isRunning(): boolean {
    return this.polling;
  }
}

let telegramInstance: TelegramBotService | null = null;

export function getTelegramService(config: TelegramConfig): TelegramBotService {
  if (!telegramInstance) {
    telegramInstance = new TelegramBotService(config);
  } else {
    telegramInstance.updateConfig(config);
  }
  return telegramInstance;
}
