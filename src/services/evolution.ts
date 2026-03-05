import { EvolutionAction, EvolutionLog, Skill, AssistantConfig } from '../types';
import { appendEvolutionLog } from './storage';
import { getClaudeService } from './claude';

/**
 * Self-Evolution Engine
 *
 * This service allows the AI assistant to modify its own behavior:
 * - Update system prompts
 * - Add/remove/modify skills
 * - Change configuration parameters
 * - Learn from interaction patterns
 *
 * All changes are logged and can be rolled back.
 */
export class EvolutionEngine {
  private config: AssistantConfig;
  private onConfigUpdate: (config: Partial<AssistantConfig>) => void;
  private onSkillAdd: (skill: Skill) => void;
  private onSkillRemove: (skillId: string) => void;
  private onSkillUpdate: (skillId: string, updates: Partial<Skill>) => void;

  constructor(
    config: AssistantConfig,
    callbacks: {
      onConfigUpdate: (config: Partial<AssistantConfig>) => void;
      onSkillAdd: (skill: Skill) => void;
      onSkillRemove: (skillId: string) => void;
      onSkillUpdate: (skillId: string, updates: Partial<Skill>) => void;
    }
  ) {
    this.config = config;
    this.onConfigUpdate = callbacks.onConfigUpdate;
    this.onSkillAdd = callbacks.onSkillAdd;
    this.onSkillRemove = callbacks.onSkillRemove;
    this.onSkillUpdate = callbacks.onSkillUpdate;
  }

  updateConfig(config: AssistantConfig) {
    this.config = config;
  }

  async proposeEvolution(
    context: string
  ): Promise<EvolutionAction[]> {
    const claude = getClaudeService(this.config.apiKey, this.config.model);

    const analysisPrompt = `You are the self-evolution engine of the OpenClaw AI assistant.
Analyze the following context and propose specific improvements.

Current system prompt:
${this.config.systemPrompt}

Context for evolution:
${context}

Respond with a JSON array of proposed changes. Each change should have:
- type: "prompt_update" | "behavior_change" | "skill_add" | "skill_remove" | "config_change"
- description: Clear explanation of the change
- before: Current state (if applicable)
- after: Proposed new state

Example:
[
  {
    "type": "skill_add",
    "description": "Add a weather briefing skill based on user's frequent weather queries",
    "after": "{ \\"name\\": \\"Weather Brief\\", \\"prompt\\": \\"Provide a weather briefing...\\", \\"triggers\\": [\\"weather\\", \\"forecast\\"] }"
  }
]

Only propose changes that would genuinely improve the assistant. Be conservative and specific.`;

    try {
      const response = await claude.sendMessageSync(
        [{ id: 'evo-1', role: 'user', content: analysisPrompt, timestamp: Date.now() }],
        'You are a self-improvement analysis engine. Respond only with valid JSON arrays.',
      );

      const jsonMatch = response.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const proposals: EvolutionAction[] = JSON.parse(jsonMatch[0]).map((p: any) => ({
        ...p,
        timestamp: Date.now(),
        approved: false,
      }));

      return proposals;
    } catch (error) {
      console.error('Evolution analysis failed:', error);
      return [];
    }
  }

  async applyEvolution(action: EvolutionAction): Promise<EvolutionLog> {
    const logEntry: EvolutionLog = {
      id: `evo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      action: { ...action, approved: true },
      success: false,
    };

    try {
      switch (action.type) {
        case 'prompt_update':
          logEntry.rollbackData = this.config.systemPrompt;
          if (action.after) {
            this.onConfigUpdate({ systemPrompt: action.after });
          }
          logEntry.success = true;
          break;

        case 'skill_add':
          if (action.after) {
            const skillData = JSON.parse(action.after);
            const newSkill: Skill = {
              id: `skill-evolved-${Date.now()}`,
              name: skillData.name,
              description: skillData.description || action.description,
              prompt: skillData.prompt,
              enabled: true,
              triggers: skillData.triggers || [],
              createdAt: Date.now(),
              isBuiltIn: false,
            };
            this.onSkillAdd(newSkill);
            logEntry.rollbackData = newSkill.id;
          }
          logEntry.success = true;
          break;

        case 'skill_remove':
          if (action.before) {
            logEntry.rollbackData = action.before;
            this.onSkillRemove(action.before);
          }
          logEntry.success = true;
          break;

        case 'behavior_change':
          if (action.after) {
            // Append behavior modification to system prompt
            const updatedPrompt = this.config.systemPrompt + '\n\n## Evolved Behavior\n' + action.after;
            logEntry.rollbackData = this.config.systemPrompt;
            this.onConfigUpdate({ systemPrompt: updatedPrompt });
          }
          logEntry.success = true;
          break;

        case 'config_change':
          if (action.after) {
            try {
              const configChanges = JSON.parse(action.after);
              logEntry.rollbackData = JSON.stringify(
                Object.keys(configChanges).reduce((acc, key) => {
                  acc[key] = (this.config as any)[key];
                  return acc;
                }, {} as any)
              );
              this.onConfigUpdate(configChanges);
              logEntry.success = true;
            } catch {
              logEntry.success = false;
            }
          }
          break;
      }
    } catch (error) {
      logEntry.success = false;
      console.error('Evolution application failed:', error);
    }

    await appendEvolutionLog(logEntry);
    return logEntry;
  }

  async rollback(logEntry: EvolutionLog): Promise<boolean> {
    if (!logEntry.rollbackData) return false;

    try {
      switch (logEntry.action.type) {
        case 'prompt_update':
        case 'behavior_change':
          this.onConfigUpdate({ systemPrompt: logEntry.rollbackData });
          return true;

        case 'skill_add':
          this.onSkillRemove(logEntry.rollbackData);
          return true;

        case 'skill_remove':
          const skillData = JSON.parse(logEntry.rollbackData);
          this.onSkillAdd(skillData);
          return true;

        case 'config_change':
          const configData = JSON.parse(logEntry.rollbackData);
          this.onConfigUpdate(configData);
          return true;
      }
    } catch (error) {
      console.error('Rollback failed:', error);
    }

    return false;
  }

  async analyzeInteractionPatterns(
    recentMessages: { role: string; content: string }[],
  ): Promise<string> {
    const claude = getClaudeService(this.config.apiKey, this.config.model);

    const analysis = await claude.sendMessageSync(
      [{
        id: 'pattern-1',
        role: 'user',
        content: `Analyze these recent interactions and identify patterns that could improve the assistant:

${recentMessages.map(m => `[${m.role}]: ${m.content.slice(0, 200)}`).join('\n')}

Summarize:
1. Common topics the user asks about
2. Interaction style preferences
3. Gaps in the assistant's capabilities
4. Suggested improvements`,
        timestamp: Date.now(),
      }],
      'You are an interaction pattern analyzer. Be concise and actionable.',
    );

    return analysis.text;
  }
}
