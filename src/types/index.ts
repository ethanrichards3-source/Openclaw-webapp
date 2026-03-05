export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  model?: string;
  tokensUsed?: number;
  toolCalls?: ToolCall[];
  isProactive?: boolean;
  evolutionAction?: EvolutionAction;
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

export interface AssistantConfig {
  apiKey: string;
  model: string;
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
  voiceEnabled: boolean;
  voiceSpeed: number;
  alwaysOn: boolean;
  proactiveMode: boolean;
  selfEvolutionEnabled: boolean;
  autoApproveEvolution: boolean;
  notificationsEnabled: boolean;
  wakeWord: string;
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
}

export type NavigationTab = 'chat' | 'skills' | 'evolution' | 'tasks' | 'settings';
