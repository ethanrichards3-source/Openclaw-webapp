export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: MessageMetadata;
  channel?: ChannelSource;
}

export interface MessageMetadata {
  model?: string;
  tokensUsed?: number;
  toolCalls?: ToolCall[];
  isProactive?: boolean;
  evolutionAction?: EvolutionAction;
  memoryHits?: MemoryEntry[];
  stylusInput?: boolean;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
  systemPrompt?: string;
}

export interface EvolutionAction {
  type: 'prompt_update' | 'behavior_change' | 'skill_add' | 'skill_remove' | 'config_change';
  description: string;
  before?: string;
  after?: string;
  timestamp: number;
  approved: boolean;
}

export interface EvolutionLog {
  id: string;
  action: EvolutionAction;
  success: boolean;
  rollbackData?: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  prompt: string;
  enabled: boolean;
  triggers?: string[];
  createdAt: number;
  isBuiltIn: boolean;
}

export interface ScheduledTask {
  id: string;
  name: string;
  description: string;
  cronExpression: string;
  action: string;
  enabled: boolean;
  lastRun?: number;
  nextRun?: number;
  createdAt: number;
}

export interface ProactiveRule {
  id: string;
  name: string;
  condition: string;
  action: string;
  cooldownMinutes: number;
  lastTriggered?: number;
  enabled: boolean;
}

// --- Memory System ---
export interface MemoryEntry {
  id: string;
  content: string;
  embedding?: number[];
  tags: string[];
  source: 'conversation' | 'user_note' | 'evolution' | 'proactive' | 'channel';
  conversationId?: string;
  timestamp: number;
  importance: number;
}

export interface MemorySearchResult {
  entry: MemoryEntry;
  score: number;
}

// --- Channel System ---
export type ChannelType = 'local' | 'telegram' | 'discord';

export interface ChannelSource {
  type: ChannelType;
  channelId?: string;
  username?: string;
  messageId?: string;
}

export interface TelegramConfig {
  botToken: string;
  enabled: boolean;
  allowedChatIds: string[];
}

export interface DiscordConfig {
  botToken: string;
  enabled: boolean;
  allowedGuildIds: string[];
  allowedChannelIds: string[];
}

// --- Browser Automation ---
export interface BrowserAction {
  id: string;
  type: 'navigate' | 'click' | 'type' | 'screenshot' | 'extract' | 'script';
  target?: string;
  value?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  timestamp: number;
}

export interface BrowserSession {
  id: string;
  url: string;
  title?: string;
  actions: BrowserAction[];
  createdAt: number;
  isActive: boolean;
}

// --- Auth System ---
export type AuthMethod = 'session_cookie' | 'api_key';

export interface AssistantConfig {
  // Auth - supports both session cookie (claude.ai login) and API key
  authMethod: AuthMethod;
  apiKey: string;
  sessionCookie: string;
  organizationId: string;

  // Model
  model: string;
  systemPrompt: string;
  maxTokens: number;
  temperature: number;

  // Features
  voiceEnabled: boolean;
  voiceSpeed: number;
  alwaysOn: boolean;
  proactiveMode: boolean;
  selfEvolutionEnabled: boolean;
  autoApproveEvolution: boolean;
  notificationsEnabled: boolean;
  wakeWord: string;

  // Memory
  persistentMemoryEnabled: boolean;
  memoryMaxEntries: number;
  autoMemorize: boolean;

  // Channels
  telegramConfig: TelegramConfig;
  discordConfig: DiscordConfig;

  // Browser
  browserAutomationEnabled: boolean;

  // S Pen
  sPenEnabled: boolean;
  sPenPressureSensitivity: boolean;

  // Appearance
  theme: 'dark' | 'light' | 'amoled';
  fontSize: number;
  tabletMode: boolean;
}

export interface DeviceInfo {
  model: string;
  osVersion: string;
  screenWidth: number;
  screenHeight: number;
  batteryLevel?: number;
  isCharging?: boolean;
  networkType?: string;
  hasSPen?: boolean;
}

export type NavigationTab = 'chat' | 'skills' | 'evolution' | 'tasks' | 'memory' | 'channels' | 'settings';
