import { create } from 'zustand';
import {
  Message,
  Conversation,
  AssistantConfig,
  Skill,
  ScheduledTask,
  ProactiveRule,
  EvolutionLog,
  EvolutionAction,
} from '../types';
import { DEFAULT_CONFIG, BUILT_IN_SKILLS, DEFAULT_PROACTIVE_RULES } from '../config/defaults';
import * as storage from '../services/storage';
import { getClaudeService } from '../services/claude';
import { EvolutionEngine } from '../services/evolution';
import { ProactiveEngine } from '../services/proactive';

interface AppState {
  // Config
  config: AssistantConfig;
  isConfigLoaded: boolean;

  // Conversations
  conversations: Conversation[];
  activeConversationId: string | null;
  isStreaming: boolean;
  streamingText: string;

  // Skills
  skills: Skill[];

  // Tasks
  scheduledTasks: ScheduledTask[];

  // Proactive
  proactiveRules: ProactiveRule[];

  // Evolution
  evolutionLog: EvolutionLog[];
  pendingEvolutions: EvolutionAction[];

  // Engines
  evolutionEngine: EvolutionEngine | null;
  proactiveEngine: ProactiveEngine | null;

  // UI State
  isSidebarOpen: boolean;
  activeTab: string;

  // Actions
  initialize: () => Promise<void>;
  updateConfig: (updates: Partial<AssistantConfig>) => Promise<void>;

  // Conversation actions
  createConversation: (title?: string) => string;
  setActiveConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  sendMessage: (content: string) => Promise<void>;
  cancelStreaming: () => void;
  getActiveConversation: () => Conversation | undefined;

  // Skill actions
  addSkill: (skill: Skill) => void;
  removeSkill: (id: string) => void;
  updateSkill: (id: string, updates: Partial<Skill>) => void;
  toggleSkill: (id: string) => void;

  // Task actions
  addTask: (task: ScheduledTask) => void;
  removeTask: (id: string) => void;
  toggleTask: (id: string) => void;

  // Proactive actions
  updateProactiveRule: (id: string, updates: Partial<ProactiveRule>) => void;
  addProactiveRule: (rule: ProactiveRule) => void;

  // Evolution actions
  requestEvolution: (context?: string) => Promise<EvolutionAction[]>;
  approveEvolution: (action: EvolutionAction) => Promise<void>;
  rejectEvolution: (index: number) => void;
  rollbackEvolution: (logEntry: EvolutionLog) => Promise<boolean>;

  // UI actions
  toggleSidebar: () => void;
  setActiveTab: (tab: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  config: DEFAULT_CONFIG,
  isConfigLoaded: false,
  conversations: [],
  activeConversationId: null,
  isStreaming: false,
  streamingText: '',
  skills: [...BUILT_IN_SKILLS],
  scheduledTasks: [],
  proactiveRules: [...DEFAULT_PROACTIVE_RULES],
  evolutionLog: [],
  pendingEvolutions: [],
  evolutionEngine: null,
  proactiveEngine: null,
  isSidebarOpen: true,
  activeTab: 'chat',

  initialize: async () => {
    try {
      const [savedConfig, savedConversations, savedSkills, savedTasks, savedRules, savedLog] =
        await Promise.all([
          storage.loadConfig(),
          storage.loadConversations(),
          storage.loadSkills(),
          storage.loadScheduledTasks(),
          storage.loadProactiveRules(),
          storage.loadEvolutionLog(),
        ]);

      const config = savedConfig || DEFAULT_CONFIG;
      const skills = savedSkills.length > 0 ? savedSkills : [...BUILT_IN_SKILLS];
      const rules = savedRules.length > 0 ? savedRules : [...DEFAULT_PROACTIVE_RULES];

      // Initialize evolution engine
      const evolutionEngine = new EvolutionEngine(config, {
        onConfigUpdate: (updates) => get().updateConfig(updates),
        onSkillAdd: (skill) => get().addSkill(skill),
        onSkillRemove: (id) => get().removeSkill(id),
        onSkillUpdate: (id, updates) => get().updateSkill(id, updates),
      });

      // Initialize proactive engine
      const proactiveEngine = new ProactiveEngine(rules, config, (message, rule) => {
        const state = get();
        const activeConv = state.getActiveConversation();
        if (activeConv) {
          const proactiveMsg: Message = {
            id: `msg-proactive-${Date.now()}`,
            role: 'assistant',
            content: `🔔 **Proactive: ${rule.name}**\n\n${message}`,
            timestamp: Date.now(),
            metadata: { isProactive: true },
          };

          const updatedConversations = state.conversations.map(c =>
            c.id === activeConv.id
              ? { ...c, messages: [...c.messages, proactiveMsg], updatedAt: Date.now() }
              : c
          );

          set({ conversations: updatedConversations });
          storage.saveConversations(updatedConversations);
        }
      });

      if (config.proactiveMode && config.apiKey) {
        proactiveEngine.start();
      }

      set({
        config,
        conversations: savedConversations,
        skills,
        scheduledTasks: savedTasks,
        proactiveRules: rules,
        evolutionLog: savedLog,
        evolutionEngine,
        proactiveEngine,
        isConfigLoaded: true,
        activeConversationId: savedConversations.length > 0 ? savedConversations[0].id : null,
      });
    } catch (error) {
      console.error('Initialization failed:', error);
      set({ isConfigLoaded: true });
    }
  },

  updateConfig: async (updates) => {
    const newConfig = { ...get().config, ...updates };
    set({ config: newConfig });
    await storage.saveConfig(newConfig);

    // Update engines
    const { evolutionEngine, proactiveEngine } = get();
    evolutionEngine?.updateConfig(newConfig);
    proactiveEngine?.updateConfig(newConfig);

    // Start/stop proactive engine based on config
    if (newConfig.proactiveMode && newConfig.apiKey) {
      proactiveEngine?.start();
    } else {
      proactiveEngine?.stop();
    }
  },

  createConversation: (title) => {
    const id = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const conversation: Conversation = {
      id,
      title: title || `Chat ${new Date().toLocaleDateString()}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isActive: true,
    };

    const conversations = [conversation, ...get().conversations];
    set({ conversations, activeConversationId: id });
    storage.saveConversations(conversations);
    return id;
  },

  setActiveConversation: (id) => {
    set({ activeConversationId: id });
    storage.saveActiveConversationId(id);
  },

  deleteConversation: (id) => {
    const conversations = get().conversations.filter(c => c.id !== id);
    const activeId = get().activeConversationId === id
      ? (conversations[0]?.id || null)
      : get().activeConversationId;
    set({ conversations, activeConversationId: activeId });
    storage.saveConversations(conversations);
  },

  getActiveConversation: () => {
    const { conversations, activeConversationId } = get();
    return conversations.find(c => c.id === activeConversationId);
  },

  sendMessage: async (content) => {
    const state = get();
    let conversationId = state.activeConversationId;

    // Create conversation if none exists
    if (!conversationId) {
      conversationId = get().createConversation();
    }

    // Record activity for proactive engine
    state.proactiveEngine?.recordActivity();

    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    // Check if a skill should be triggered
    let effectivePrompt = state.config.systemPrompt;
    const matchedSkill = state.skills.find(
      s => s.enabled && s.triggers?.some(t => content.toLowerCase().includes(t.toLowerCase()))
    );
    if (matchedSkill) {
      effectivePrompt += `\n\n## Active Skill: ${matchedSkill.name}\n${matchedSkill.prompt}`;
    }

    // Add user message to conversation
    let conversations = state.conversations.map(c =>
      c.id === conversationId
        ? { ...c, messages: [...c.messages, userMessage], updatedAt: Date.now() }
        : c
    );
    set({ conversations, isStreaming: true, streamingText: '' });

    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    const claude = getClaudeService(
      state.config.apiKey,
      state.config.model,
      state.config.maxTokens,
      state.config.temperature
    );

    let fullText = '';
    await claude.sendMessage(conversation.messages, effectivePrompt, {
      onToken: (token) => {
        fullText += token;
        set({ streamingText: fullText });
      },
      onComplete: (text, usage) => {
        const assistantMessage: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: text,
          timestamp: Date.now(),
          metadata: {
            model: state.config.model,
            tokensUsed: usage.input + usage.output,
          },
        };

        const updatedConversations = get().conversations.map(c =>
          c.id === conversationId
            ? {
                ...c,
                messages: [...c.messages, assistantMessage],
                updatedAt: Date.now(),
                title: c.messages.length <= 1 ? content.slice(0, 50) : c.title,
              }
            : c
        );

        set({
          conversations: updatedConversations,
          isStreaming: false,
          streamingText: '',
        });
        storage.saveConversations(updatedConversations);

        // Check for self-evolution triggers in the response
        if (state.config.selfEvolutionEnabled && text.includes('[EVOLVE]')) {
          get().requestEvolution(text);
        }
      },
      onError: (error) => {
        const errorMessage: Message = {
          id: `msg-${Date.now()}-error`,
          role: 'assistant',
          content: `⚠️ ${error.message}`,
          timestamp: Date.now(),
        };

        const updatedConversations = get().conversations.map(c =>
          c.id === conversationId
            ? { ...c, messages: [...c.messages, errorMessage], updatedAt: Date.now() }
            : c
        );

        set({
          conversations: updatedConversations,
          isStreaming: false,
          streamingText: '',
        });
        storage.saveConversations(updatedConversations);
      },
    });
  },

  cancelStreaming: () => {
    const claude = getClaudeService(get().config.apiKey, get().config.model);
    claude.cancelRequest();
    set({ isStreaming: false, streamingText: '' });
  },

  // Skills
  addSkill: (skill) => {
    const skills = [...get().skills, skill];
    set({ skills });
    storage.saveSkills(skills);
  },

  removeSkill: (id) => {
    const skills = get().skills.filter(s => s.id !== id);
    set({ skills });
    storage.saveSkills(skills);
  },

  updateSkill: (id, updates) => {
    const skills = get().skills.map(s => (s.id === id ? { ...s, ...updates } : s));
    set({ skills });
    storage.saveSkills(skills);
  },

  toggleSkill: (id) => {
    const skills = get().skills.map(s => (s.id === id ? { ...s, enabled: !s.enabled } : s));
    set({ skills });
    storage.saveSkills(skills);
  },

  // Tasks
  addTask: (task) => {
    const tasks = [...get().scheduledTasks, task];
    set({ scheduledTasks: tasks });
    storage.saveScheduledTasks(tasks);
  },

  removeTask: (id) => {
    const tasks = get().scheduledTasks.filter(t => t.id !== id);
    set({ scheduledTasks: tasks });
    storage.saveScheduledTasks(tasks);
  },

  toggleTask: (id) => {
    const tasks = get().scheduledTasks.map(t =>
      t.id === id ? { ...t, enabled: !t.enabled } : t
    );
    set({ scheduledTasks: tasks });
    storage.saveScheduledTasks(tasks);
  },

  // Proactive
  updateProactiveRule: (id, updates) => {
    const rules = get().proactiveRules.map(r => (r.id === id ? { ...r, ...updates } : r));
    set({ proactiveRules: rules });
    storage.saveProactiveRules(rules);
    get().proactiveEngine?.updateRules(rules);
  },

  addProactiveRule: (rule) => {
    const rules = [...get().proactiveRules, rule];
    set({ proactiveRules: rules });
    storage.saveProactiveRules(rules);
    get().proactiveEngine?.updateRules(rules);
  },

  // Evolution
  requestEvolution: async (context) => {
    const engine = get().evolutionEngine;
    if (!engine) return [];

    const proposals = await engine.proposeEvolution(
      context || 'General self-improvement check'
    );
    set({ pendingEvolutions: [...get().pendingEvolutions, ...proposals] });
    return proposals;
  },

  approveEvolution: async (action) => {
    const engine = get().evolutionEngine;
    if (!engine) return;

    const result = await engine.applyEvolution(action);
    const pendingEvolutions = get().pendingEvolutions.filter(e => e !== action);
    const evolutionLog = [...get().evolutionLog, result];
    set({ pendingEvolutions, evolutionLog });
  },

  rejectEvolution: (index) => {
    const pendingEvolutions = get().pendingEvolutions.filter((_, i) => i !== index);
    set({ pendingEvolutions });
  },

  rollbackEvolution: async (logEntry) => {
    const engine = get().evolutionEngine;
    if (!engine) return false;
    return engine.rollback(logEntry);
  },

  // UI
  toggleSidebar: () => set({ isSidebarOpen: !get().isSidebarOpen }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
