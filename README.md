# OpenClaw Assistant

A self-evolving, always-on AI assistant app built with React Native Expo, powered by Claude. Optimized for the Samsung Galaxy Tab S10 FE.

## Features

### Core AI Chat
- Real-time streaming responses from Claude API
- Multi-conversation management with persistent history
- Tablet-optimized sidebar + chat layout
- Supports Claude Opus 4, Sonnet 4, and Haiku 4.5

### Self-Evolution System
- The AI can propose modifications to its own behavior
- Update system prompts, add/remove skills, change configurations
- All changes are logged with full rollback capability
- Approval workflow (or auto-approve mode)
- Code inspection system for transparency

### Proactive Assistant
- Time-based rules (morning briefings, evening summaries)
- Idle detection and check-ins
- Battery monitoring alerts
- Periodic self-improvement analysis
- Custom proactive rules

### Skills Platform
- 7 built-in skills (Summarizer, Code Review, Brainstorm, Debugger, Explainer, Task Planner, Self Evolution)
- Create custom skills with trigger words
- Skills are automatically activated by keyword detection

### Task Automation
- Scheduled tasks with cron expressions
- Proactive rules with condition evaluation
- Configurable cooldowns

### Always-On Operation
- Background fetch for periodic monitoring
- Keep-awake mode for always-on display
- Persistent notification for foreground service behavior
- Boot-start capability

### Voice Integration
- Text-to-speech for assistant responses
- Audio recording infrastructure for voice input

### Tablet-Optimized UI
- 3 themes: Dark, AMOLED (true black), Light
- Sidebar navigation for landscape tablet use
- Optimized for 10.9" 1920x1200 display
- Configurable font sizes

## Tech Stack

- **Framework**: React Native with Expo SDK 52
- **Language**: TypeScript
- **State Management**: Zustand
- **AI Model**: Claude API (Anthropic)
- **Storage**: AsyncStorage
- **Navigation**: React Navigation (bottom tabs)

## Getting Started

### Prerequisites
- Node.js >= 18
- Expo CLI
- Android device or emulator

### Installation

```bash
npm install
npx expo start
```

### Build APK for Samsung Tab S10 FE

```bash
npm install -g eas-cli
eas build --platform android --profile preview
```

### Configuration

1. Open the app on your tablet
2. Go to Settings tab
3. Enter your Claude API key
4. Select your preferred model
5. Enable/disable features as desired

## Architecture

```
src/
  components/     # Reusable UI components
  screens/        # Main app screens (Chat, Skills, Evolution, Tasks, Settings)
  services/       # Claude API, storage, evolution, proactive, voice, background
  store/          # Zustand state management
  config/         # Defaults, themes, constants
  evolution/      # Code inspection utilities
  types/          # TypeScript interfaces
  hooks/          # Custom React hooks
  utils/          # Helper functions
```

## License

MIT
