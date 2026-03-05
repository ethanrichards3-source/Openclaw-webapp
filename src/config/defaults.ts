import { AssistantConfig, Skill, ProactiveRule } from '../types';

export const DEFAULT_SYSTEM_PROMPT = `You are OpenClaw, a proactive AI assistant running 24/7 on the user's Samsung Galaxy Tab S10 FE. You are powered by Claude and have the following capabilities:

## Core Identity
- You are a personal, always-available AI assistant
- You run locally on the user's tablet and maintain persistent context
- You are self-evolving: you can modify your own behavior, skills, and prompts to better serve the user
- You are proactive: you don't just respond, you anticipate needs and offer help

## Capabilities
1. **Conversation**: Natural language chat with full context awareness
2. **Task Management**: Create, schedule, and manage tasks and reminders
3. **Self-Evolution**: Modify your own system prompt, add/remove skills, change behaviors
4. **Code Awareness**: You understand your own source code and can suggest modifications
5. **Proactive Monitoring**: Monitor conditions and notify the user when relevant
6. **Voice Interaction**: Listen and respond via voice
7. **Multi-Skill**: Execute specialized skills for different domains

## Self-Evolution Protocol
When you identify an improvement to make:
1. Describe the change clearly
2. Show what will be modified (before/after)
3. Wait for user approval (unless auto-approve is enabled)
4. Apply the change and log it
5. Verify the change works correctly

## Behavioral Guidelines
- Be concise but thorough
- Proactively suggest improvements to yourself and the user's workflow
- Remember context across conversations
- Prioritize the user's privacy and security
- Be transparent about your capabilities and limitations
- When modifying yourself, always explain why and what effect it will have`;

export const DEFAULT_CONFIG: AssistantConfig = {
  apiKey: '',
  model: 'claude-sonnet-4-20250514',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  maxTokens: 4096,
  temperature: 0.7,
  voiceEnabled: false,
  voiceSpeed: 1.0,
  alwaysOn: true,
  proactiveMode: true,
  selfEvolutionEnabled: true,
  autoApproveEvolution: false,
  notificationsEnabled: true,
  wakeWord: 'hey openclaw',
  theme: 'dark',
  fontSize: 16,
  tabletMode: true,
};

export const BUILT_IN_SKILLS: Skill[] = [
  {
    id: 'skill-summarize',
    name: 'Summarizer',
    description: 'Summarize long text, articles, or conversations',
    prompt: 'Summarize the following content concisely, highlighting key points:\n\n',
    enabled: true,
    triggers: ['summarize', 'tldr', 'summary'],
    createdAt: Date.now(),
    isBuiltIn: true,
  },
  {
    id: 'skill-code-review',
    name: 'Code Review',
    description: 'Review code for bugs, improvements, and best practices',
    prompt: 'Review the following code. Identify bugs, suggest improvements, and note best practices:\n\n',
    enabled: true,
    triggers: ['review code', 'code review', 'check code'],
    createdAt: Date.now(),
    isBuiltIn: true,
  },
  {
    id: 'skill-brainstorm',
    name: 'Brainstorm',
    description: 'Generate creative ideas and solutions',
    prompt: 'Brainstorm creative ideas and solutions for the following topic. Think outside the box:\n\n',
    enabled: true,
    triggers: ['brainstorm', 'ideas', 'creative'],
    createdAt: Date.now(),
    isBuiltIn: true,
  },
  {
    id: 'skill-debug',
    name: 'Debugger',
    description: 'Help debug issues with detailed analysis',
    prompt: 'Debug the following issue. Analyze the problem systematically, identify root causes, and suggest fixes:\n\n',
    enabled: true,
    triggers: ['debug', 'fix', 'troubleshoot'],
    createdAt: Date.now(),
    isBuiltIn: true,
  },
  {
    id: 'skill-explain',
    name: 'Explainer',
    description: 'Explain complex topics in simple terms',
    prompt: 'Explain the following topic in clear, simple terms. Use analogies where helpful:\n\n',
    enabled: true,
    triggers: ['explain', 'what is', 'how does'],
    createdAt: Date.now(),
    isBuiltIn: true,
  },
  {
    id: 'skill-task-planner',
    name: 'Task Planner',
    description: 'Break down goals into actionable tasks',
    prompt: 'Break down the following goal into specific, actionable tasks with priorities and estimated timeframes:\n\n',
    enabled: true,
    triggers: ['plan', 'break down', 'task plan'],
    createdAt: Date.now(),
    isBuiltIn: true,
  },
  {
    id: 'skill-self-evolve',
    name: 'Self Evolution',
    description: 'Analyze and improve own behavior and capabilities',
    prompt: `Analyze your current configuration, behavior patterns, and capabilities. Suggest specific improvements you could make to better serve the user. For each suggestion, provide:
1. What to change
2. Why it would help
3. The specific modification (before/after)
4. Risk assessment

Current system prompt: {{SYSTEM_PROMPT}}
Current skills: {{SKILLS_LIST}}`,
    enabled: true,
    triggers: ['evolve', 'improve yourself', 'self improve'],
    createdAt: Date.now(),
    isBuiltIn: true,
  },
];

export const DEFAULT_PROACTIVE_RULES: ProactiveRule[] = [
  {
    id: 'rule-morning',
    name: 'Morning Briefing',
    condition: 'time_between_7_8_am',
    action: 'Provide a morning briefing with weather, tasks, and suggestions for the day',
    cooldownMinutes: 1440,
    enabled: true,
  },
  {
    id: 'rule-idle',
    name: 'Idle Check-in',
    condition: 'idle_for_2_hours',
    action: 'Check in with the user and offer assistance or suggest a productive activity',
    cooldownMinutes: 120,
    enabled: false,
  },
  {
    id: 'rule-battery',
    name: 'Battery Alert',
    condition: 'battery_below_20',
    action: 'Notify user about low battery and suggest power-saving measures',
    cooldownMinutes: 60,
    enabled: true,
  },
  {
    id: 'rule-evolution',
    name: 'Self-Improvement Check',
    condition: 'every_24_hours',
    action: 'Analyze recent interactions and suggest self-improvements',
    cooldownMinutes: 1440,
    enabled: true,
  },
];

export const MODELS = [
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: 'Most capable, best for complex tasks' },
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Balanced performance and speed' },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', description: 'Fastest, best for quick responses' },
];

// Samsung Tab S10 FE optimized layout constants
export const TABLET_LAYOUT = {
  screenWidth: 1920,
  screenHeight: 1200,
  sidebarWidth: 320,
  chatMaxWidth: 900,
  fontSize: {
    small: 14,
    medium: 16,
    large: 18,
    xlarge: 22,
    title: 28,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
};
