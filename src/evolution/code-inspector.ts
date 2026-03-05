/**
 * Code Inspector
 *
 * Part of the self-evolution system. This module allows the AI to:
 * 1. Inspect its own source code structure
 * 2. Generate diffs for proposed changes
 * 3. Provide context about the codebase to the evolution engine
 *
 * In a full implementation, this would integrate with the device's
 * file system to read actual source files. For the bundled app,
 * it maintains a registry of component descriptions and configs.
 */

export interface CodeModule {
  name: string;
  path: string;
  description: string;
  modifiable: boolean;
  dependencies: string[];
}

export const CODE_REGISTRY: CodeModule[] = [
  {
    name: 'ClaudeService',
    path: 'src/services/claude.ts',
    description: 'Handles all communication with the Claude API including streaming responses',
    modifiable: false,
    dependencies: ['types'],
  },
  {
    name: 'EvolutionEngine',
    path: 'src/services/evolution.ts',
    description: 'Self-evolution engine that proposes and applies changes to the assistant',
    modifiable: true,
    dependencies: ['types', 'claude', 'storage'],
  },
  {
    name: 'ProactiveEngine',
    path: 'src/services/proactive.ts',
    description: 'Monitors conditions and triggers proactive actions',
    modifiable: true,
    dependencies: ['types', 'claude'],
  },
  {
    name: 'VoiceService',
    path: 'src/services/voice.ts',
    description: 'Text-to-speech and speech-to-text capabilities',
    modifiable: false,
    dependencies: ['expo-speech', 'expo-av'],
  },
  {
    name: 'BackgroundService',
    path: 'src/services/background.ts',
    description: 'Manages background tasks, keep-awake, and notifications',
    modifiable: false,
    dependencies: ['expo-task-manager', 'expo-background-fetch'],
  },
  {
    name: 'Store',
    path: 'src/store/index.ts',
    description: 'Zustand state management store for the entire application',
    modifiable: true,
    dependencies: ['types', 'claude', 'evolution', 'proactive', 'storage'],
  },
  {
    name: 'SystemPrompt',
    path: 'src/config/defaults.ts',
    description: 'Default system prompt and built-in skill definitions',
    modifiable: true,
    dependencies: ['types'],
  },
  {
    name: 'Theme',
    path: 'src/config/theme.ts',
    description: 'UI theme definitions with dark, AMOLED, and light modes',
    modifiable: true,
    dependencies: [],
  },
];

/**
 * Get a description of the codebase for the AI to understand
 */
export function getCodebaseDescription(): string {
  return `# OpenClaw Codebase Structure

## Architecture
React Native Expo app with TypeScript, using Zustand for state management.
Built specifically for Android tablets (Samsung Tab S10 FE).

## Modules
${CODE_REGISTRY.map(m =>
    `### ${m.name} (${m.path})
${m.description}
Modifiable: ${m.modifiable ? 'Yes' : 'No (core infrastructure)'}
Dependencies: ${m.dependencies.join(', ') || 'none'}`
  ).join('\n\n')}

## Key Design Decisions
1. Streaming responses for real-time chat feel
2. Proactive engine runs on a 60-second check interval
3. Evolution changes are logged and rollbackable
4. Skills are triggered by keyword matching in user messages
5. All data persisted via AsyncStorage
6. Theme system supports dark/AMOLED/light modes
7. Sidebar layout optimized for 10.9" tablet landscape mode`;
}

/**
 * Generate a list of modifiable components for the evolution engine
 */
export function getModifiableComponents(): CodeModule[] {
  return CODE_REGISTRY.filter(m => m.modifiable);
}

/**
 * Create a diff representation for proposed code changes
 */
export function createDiff(before: string, after: string): string {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  const diff: string[] = [];

  const maxLen = Math.max(beforeLines.length, afterLines.length);
  for (let i = 0; i < maxLen; i++) {
    const b = beforeLines[i];
    const a = afterLines[i];

    if (b === a) {
      diff.push(`  ${b || ''}`);
    } else {
      if (b !== undefined) diff.push(`- ${b}`);
      if (a !== undefined) diff.push(`+ ${a}`);
    }
  }

  return diff.join('\n');
}

/**
 * Validate that a proposed evolution change is safe
 */
export function validateEvolutionSafety(change: {
  type: string;
  target?: string;
  newCode?: string;
}): { safe: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check for dangerous patterns
  if (change.newCode) {
    if (change.newCode.includes('eval(')) {
      warnings.push('Contains eval() - potential security risk');
    }
    if (change.newCode.includes('Function(')) {
      warnings.push('Contains Function constructor - potential security risk');
    }
    if (change.newCode.includes('require(') && change.type !== 'config_change') {
      warnings.push('Contains dynamic require - may cause bundling issues');
    }
  }

  // Check target is modifiable
  if (change.target) {
    const module = CODE_REGISTRY.find(m => m.path === change.target || m.name === change.target);
    if (module && !module.modifiable) {
      warnings.push(`Module ${module.name} is not marked as modifiable`);
      return { safe: false, warnings };
    }
  }

  return { safe: warnings.length === 0, warnings };
}
