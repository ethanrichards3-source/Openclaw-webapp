import { DiscordConfig, ChannelSource } from '../types';

type MessageHandler = (text: string, channel: ChannelSource) => Promise<string>;

const DISCORD_API = 'https://discord.com/api/v10';
const DISCORD_GATEWAY = 'wss://gateway.discord.gg/?v=10&encoding=json';

export class DiscordBotService {
  private config: DiscordConfig;
  private ws: WebSocket | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private sequenceNumber: number | null = null;
  private onMessage: MessageHandler | null = null;
  private reconnectAttempts = 0;
  private botUserId: string | null = null;

  constructor(config: DiscordConfig) {
    this.config = config;
  }

  updateConfig(config: DiscordConfig) {
    const wasRunning = !!this.ws;
    if (wasRunning) this.stop();
    this.config = config;
    if (wasRunning && config.enabled && config.botToken) this.start();
  }

  setMessageHandler(handler: MessageHandler) {
    this.onMessage = handler;
  }

  async start(): Promise<void> {
    if (!this.config.botToken || !this.config.enabled) return;
    this.connect();
  }

  stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.ws) {
      this.ws.close(1000, 'Shutdown');
      this.ws = null;
    }
    this.reconnectAttempts = 0;
  }

  private connect() {
    try {
      this.ws = new WebSocket(DISCORD_GATEWAY);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        this.handleGatewayMessage(JSON.parse(event.data));
      };

      this.ws.onclose = (event) => {
        this.cleanup();
        // Reconnect unless intentional close
        if (event.code !== 1000 && this.config.enabled) {
          this.reconnect();
        }
      };

      this.ws.onerror = () => {
        // Will trigger onclose
      };
    } catch (error) {
      console.error('Discord connect error:', error);
      this.reconnect();
    }
  }

  private cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private reconnect() {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    setTimeout(() => this.connect(), delay);
  }

  private handleGatewayMessage(data: any) {
    const { op, d, s, t } = data;

    if (s) this.sequenceNumber = s;

    switch (op) {
      case 10: // Hello
        this.startHeartbeat(d.heartbeat_interval);
        this.identify();
        break;

      case 11: // Heartbeat ACK
        break;

      case 0: // Dispatch
        this.handleDispatch(t, d);
        break;

      case 7: // Reconnect
        this.ws?.close();
        this.connect();
        break;

      case 9: // Invalid Session
        setTimeout(() => this.identify(), 5000);
        break;
    }
  }

  private startHeartbeat(interval: number) {
    this.heartbeatInterval = setInterval(() => {
      this.ws?.send(JSON.stringify({ op: 1, d: this.sequenceNumber }));
    }, interval);
  }

  private identify() {
    this.ws?.send(JSON.stringify({
      op: 2,
      d: {
        token: this.config.botToken,
        intents: 512 | 32768, // GUILD_MESSAGES | MESSAGE_CONTENT
        properties: {
          os: 'android',
          browser: 'openclaw',
          device: 'openclaw',
        },
      },
    }));
  }

  private async handleDispatch(event: string, data: any) {
    if (event === 'READY') {
      this.botUserId = data.user?.id;
      return;
    }

    if (event === 'MESSAGE_CREATE') {
      await this.handleIncomingMessage(data);
    }
  }

  private async handleIncomingMessage(data: any): Promise<void> {
    // Ignore bot's own messages
    if (data.author?.id === this.botUserId) return;
    if (data.author?.bot) return;
    if (!data.content || !this.onMessage) return;

    const guildId = data.guild_id;
    const channelId = data.channel_id;

    // Check allowed guilds/channels
    if (this.config.allowedGuildIds.length > 0 && guildId && !this.config.allowedGuildIds.includes(guildId)) {
      return;
    }
    if (this.config.allowedChannelIds.length > 0 && !this.config.allowedChannelIds.includes(channelId)) {
      return;
    }

    const channel: ChannelSource = {
      type: 'discord',
      channelId,
      username: data.author?.username || 'Unknown',
      messageId: data.id,
    };

    try {
      const reply = await this.onMessage(data.content, channel);
      await this.sendMessage(channelId, reply);
    } catch (error) {
      await this.sendMessage(channelId, 'Error processing your message.');
    }
  }

  async sendMessage(channelId: string, text: string): Promise<void> {
    if (!this.config.botToken) return;

    // Discord has a 2000 char limit
    const chunks = this.splitMessage(text, 2000);
    for (const chunk of chunks) {
      await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bot ${this.config.botToken}`,
        },
        body: JSON.stringify({ content: chunk }),
      });
    }
  }

  async testConnection(): Promise<{ ok: boolean; botName?: string; error?: string }> {
    try {
      const response = await fetch(`${DISCORD_API}/users/@me`, {
        headers: { 'Authorization': `Bot ${this.config.botToken}` },
      });
      const data = await response.json();
      if (data.id) {
        return { ok: true, botName: `${data.username}#${data.discriminator}` };
      }
      return { ok: false, error: data.message || 'Unknown error' };
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
      let splitIdx = remaining.lastIndexOf('\n', maxLen);
      if (splitIdx < maxLen / 2) splitIdx = maxLen;
      chunks.push(remaining.slice(0, splitIdx));
      remaining = remaining.slice(splitIdx);
    }
    return chunks;
  }

  isRunning(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

let discordInstance: DiscordBotService | null = null;

export function getDiscordService(config: DiscordConfig): DiscordBotService {
  if (!discordInstance) {
    discordInstance = new DiscordBotService(config);
  } else {
    discordInstance.updateConfig(config);
  }
  return discordInstance;
}
