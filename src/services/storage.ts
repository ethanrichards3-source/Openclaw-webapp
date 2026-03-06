import AsyncStorage from '@react-native-async-storage/async-storage';
import { Conversation, AssistantConfig, Skill, ScheduledTask, ProactiveRule, EvolutionLog, MemoryEntry } from '../types';

const KEYS = {
  CONFIG: '@openclaw:config',
  CONVERSATIONS: '@openclaw:conversations',
  ACTIVE_CONVERSATION: '@openclaw:activeConversation',
  SKILLS: '@openclaw:skills',
  TASKS: '@openclaw:tasks',
  PROACTIVE_RULES: '@openclaw:proactiveRules',
  EVOLUTION_LOG: '@openclaw:evolutionLog',
  FIRST_LAUNCH: '@openclaw:firstLaunch',
  MEMORIES: '@openclaw:memories',
};

async function getJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function setJSON<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// Config
export async function loadConfig(): Promise<AssistantConfig | null> {
  return getJSON(KEYS.CONFIG, null);
}

export async function saveConfig(config: AssistantConfig): Promise<void> {
  return setJSON(KEYS.CONFIG, config);
}

// Conversations
export async function loadConversations(): Promise<Conversation[]> {
  return getJSON(KEYS.CONVERSATIONS, []);
}

export async function saveConversations(conversations: Conversation[]): Promise<void> {
  return setJSON(KEYS.CONVERSATIONS, conversations);
}

export async function loadActiveConversationId(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.ACTIVE_CONVERSATION);
}

export async function saveActiveConversationId(id: string): Promise<void> {
  return AsyncStorage.setItem(KEYS.ACTIVE_CONVERSATION, id);
}

// Skills
export async function loadSkills(): Promise<Skill[]> {
  return getJSON(KEYS.SKILLS, []);
}

export async function saveSkills(skills: Skill[]): Promise<void> {
  return setJSON(KEYS.SKILLS, skills);
}

// Scheduled Tasks
export async function loadScheduledTasks(): Promise<ScheduledTask[]> {
  return getJSON(KEYS.TASKS, []);
}

export async function saveScheduledTasks(tasks: ScheduledTask[]): Promise<void> {
  return setJSON(KEYS.TASKS, tasks);
}

// Proactive Rules
export async function loadProactiveRules(): Promise<ProactiveRule[]> {
  return getJSON(KEYS.PROACTIVE_RULES, []);
}

export async function saveProactiveRules(rules: ProactiveRule[]): Promise<void> {
  return setJSON(KEYS.PROACTIVE_RULES, rules);
}

// Evolution Log
export async function loadEvolutionLog(): Promise<EvolutionLog[]> {
  return getJSON(KEYS.EVOLUTION_LOG, []);
}

export async function saveEvolutionLog(log: EvolutionLog[]): Promise<void> {
  return setJSON(KEYS.EVOLUTION_LOG, log);
}

export async function appendEvolutionLog(entry: EvolutionLog): Promise<void> {
  const log = await loadEvolutionLog();
  log.push(entry);
  // Keep last 100 entries
  if (log.length > 100) log.splice(0, log.length - 100);
  return saveEvolutionLog(log);
}

// Memories
export async function loadMemories(): Promise<MemoryEntry[]> {
  return getJSON(KEYS.MEMORIES, []);
}

export async function saveMemories(memories: MemoryEntry[]): Promise<void> {
  return setJSON(KEYS.MEMORIES, memories);
}

// First launch check
export async function isFirstLaunch(): Promise<boolean> {
  const launched = await AsyncStorage.getItem(KEYS.FIRST_LAUNCH);
  return launched === null;
}

export async function markLaunched(): Promise<void> {
  return AsyncStorage.setItem(KEYS.FIRST_LAUNCH, 'true');
}

// Clear all data
export async function clearAllData(): Promise<void> {
  const keys = Object.values(KEYS);
  await AsyncStorage.multiRemove(keys);
}
