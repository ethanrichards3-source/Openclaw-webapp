import { ProactiveRule, AssistantConfig, Message } from '../types';
import { getClaudeService } from './claude';

/**
 * Proactive Assistant Engine
 *
 * Monitors conditions and triggers proactive actions:
 * - Time-based rules (morning briefing, evening summary)
 * - Device state rules (battery, network changes)
 * - Idle detection (check-in after inactivity)
 * - Periodic self-improvement checks
 */
export class ProactiveEngine {
  private rules: ProactiveRule[];
  private config: AssistantConfig;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onProactiveMessage: (message: string, rule: ProactiveRule) => void;
  private lastActivity: number = Date.now();

  constructor(
    rules: ProactiveRule[],
    config: AssistantConfig,
    onProactiveMessage: (message: string, rule: ProactiveRule) => void
  ) {
    this.rules = rules;
    this.config = config;
    this.onProactiveMessage = onProactiveMessage;
  }

  start() {
    if (this.intervalId) return;
    // Check rules every 60 seconds
    this.intervalId = setInterval(() => this.checkRules(), 60000);
    // Initial check after 5 seconds
    setTimeout(() => this.checkRules(), 5000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  updateRules(rules: ProactiveRule[]) {
    this.rules = rules;
  }

  updateConfig(config: AssistantConfig) {
    this.config = config;
  }

  recordActivity() {
    this.lastActivity = Date.now();
  }

  private async checkRules() {
    if (!this.config.proactiveMode || !this.config.apiKey) return;

    const now = Date.now();

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      // Check cooldown
      if (rule.lastTriggered) {
        const cooldownMs = rule.cooldownMinutes * 60 * 1000;
        if (now - rule.lastTriggered < cooldownMs) continue;
      }

      const shouldTrigger = this.evaluateCondition(rule.condition, now);
      if (!shouldTrigger) continue;

      // Mark as triggered
      rule.lastTriggered = now;

      // Generate proactive message
      try {
        await this.executeProactiveAction(rule);
      } catch (error) {
        console.error(`Proactive rule "${rule.name}" failed:`, error);
      }
    }
  }

  private evaluateCondition(condition: string, now: number): boolean {
    const hour = new Date(now).getHours();
    const minutesSinceActivity = (now - this.lastActivity) / 60000;

    switch (condition) {
      case 'time_between_7_8_am':
        return hour >= 7 && hour < 8;

      case 'time_between_9_10_pm':
        return hour >= 21 && hour < 22;

      case 'idle_for_2_hours':
        return minutesSinceActivity >= 120;

      case 'idle_for_30_minutes':
        return minutesSinceActivity >= 30;

      case 'battery_below_20':
        // Would check actual battery in native module
        return false;

      case 'battery_below_10':
        return false;

      case 'every_24_hours':
        return true; // Cooldown handles the frequency

      case 'every_6_hours':
        return true;

      case 'every_hour':
        return true;

      default:
        // Custom condition - try to evaluate as time check
        const timeMatch = condition.match(/time_(\d+)_(\d+)/);
        if (timeMatch) {
          const startHour = parseInt(timeMatch[1]);
          const endHour = parseInt(timeMatch[2]);
          return hour >= startHour && hour < endHour;
        }
        return false;
    }
  }

  private async executeProactiveAction(rule: ProactiveRule) {
    const claude = getClaudeService(this.config.apiKey, this.config.model);

    const proactivePrompt = `You are executing a proactive action as the OpenClaw AI assistant.

Rule: ${rule.name}
Action: ${rule.action}
Current time: ${new Date().toLocaleString()}

Generate an appropriate proactive message for the user. Be helpful, concise, and natural.
Don't be overly formal or robotic. Act like a helpful companion who noticed something relevant.`;

    try {
      const response = await claude.sendMessageSync(
        [{ id: 'proactive-1', role: 'user', content: proactivePrompt, timestamp: Date.now() }],
        this.config.systemPrompt,
      );

      this.onProactiveMessage(response.text, rule);
    } catch (error) {
      console.error('Proactive action failed:', error);
    }
  }

  getActiveRules(): ProactiveRule[] {
    return this.rules.filter(r => r.enabled);
  }

  getNextTriggerTimes(): Map<string, number | null> {
    const times = new Map<string, number | null>();
    const now = Date.now();

    for (const rule of this.rules) {
      if (!rule.enabled) {
        times.set(rule.id, null);
        continue;
      }

      if (rule.lastTriggered) {
        const nextTrigger = rule.lastTriggered + rule.cooldownMinutes * 60 * 1000;
        times.set(rule.id, nextTrigger > now ? nextTrigger : now);
      } else {
        times.set(rule.id, now);
      }
    }

    return times;
  }
}
