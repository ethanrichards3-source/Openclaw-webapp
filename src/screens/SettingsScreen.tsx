import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { themes, ThemeName } from '../config/theme';
import { MODELS, DEFAULT_SYSTEM_PROMPT } from '../config/defaults';
import { clearAllData } from '../services/storage';

export function SettingsScreen() {
  const config = useStore(s => s.config);
  const updateConfig = useStore(s => s.updateConfig);
  const colors = themes[config.theme].colors;
  const [showApiKey, setShowApiKey] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptDraft, setPromptDraft] = useState(config.systemPrompt);

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
      <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );

  const SettingRow = ({
    icon,
    label,
    description,
    children,
    last,
  }: {
    icon: string;
    label: string;
    description?: string;
    children: React.ReactNode;
    last?: boolean;
  }) => (
    <View style={[styles.settingRow, !last && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon as any} size={20} color={colors.primary} />
        <View style={styles.settingLabels}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
          {description && (
            <Text style={[styles.settingDesc, { color: colors.textMuted }]}>{description}</Text>
          )}
        </View>
      </View>
      <View style={styles.settingRight}>{children}</View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* API Configuration */}
        <Section title="API CONFIGURATION">
          <SettingRow icon="key-outline" label="API Key" description="Your Anthropic Claude API key">
            <View style={styles.apiKeyRow}>
              <TextInput
                style={[styles.apiKeyInput, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                value={config.apiKey}
                onChangeText={v => updateConfig({ apiKey: v })}
                placeholder="sk-ant-..."
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showApiKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable onPress={() => setShowApiKey(!showApiKey)}>
                <Ionicons name={showApiKey ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
              </Pressable>
            </View>
          </SettingRow>

          <SettingRow icon="hardware-chip-outline" label="Model" description="Claude model to use" last>
            <View style={styles.modelList}>
              {MODELS.map(model => (
                <Pressable
                  key={model.id}
                  style={[
                    styles.modelOption,
                    {
                      backgroundColor: config.model === model.id ? colors.primary + '20' : colors.surfaceHighlight,
                      borderColor: config.model === model.id ? colors.primary : 'transparent',
                    },
                  ]}
                  onPress={() => updateConfig({ model: model.id })}
                >
                  <Text style={[styles.modelName, { color: config.model === model.id ? colors.primary : colors.text }]}>
                    {model.name}
                  </Text>
                  <Text style={[styles.modelDesc, { color: colors.textMuted }]}>{model.description}</Text>
                </Pressable>
              ))}
            </View>
          </SettingRow>
        </Section>

        {/* Assistant Behavior */}
        <Section title="ASSISTANT BEHAVIOR">
          <SettingRow icon="flash-outline" label="Proactive Mode" description="Let OpenClaw initiate conversations">
            <Switch
              value={config.proactiveMode}
              onValueChange={v => updateConfig({ proactiveMode: v })}
              trackColor={{ false: colors.surfaceHighlight, true: colors.primary + '60' }}
              thumbColor={config.proactiveMode ? colors.primary : colors.textMuted}
            />
          </SettingRow>

          <SettingRow icon="git-branch-outline" label="Self-Evolution" description="Allow self-modification of behavior">
            <Switch
              value={config.selfEvolutionEnabled}
              onValueChange={v => updateConfig({ selfEvolutionEnabled: v })}
              trackColor={{ false: colors.surfaceHighlight, true: colors.primary + '60' }}
              thumbColor={config.selfEvolutionEnabled ? colors.primary : colors.textMuted}
            />
          </SettingRow>

          <SettingRow icon="checkmark-done-outline" label="Auto-Approve Evolution" description="Skip approval for evolution changes">
            <Switch
              value={config.autoApproveEvolution}
              onValueChange={v => updateConfig({ autoApproveEvolution: v })}
              trackColor={{ false: colors.surfaceHighlight, true: colors.warning + '60' }}
              thumbColor={config.autoApproveEvolution ? colors.warning : colors.textMuted}
            />
          </SettingRow>

          <SettingRow icon="moon-outline" label="Always On" description="Keep assistant running 24/7" last>
            <Switch
              value={config.alwaysOn}
              onValueChange={v => updateConfig({ alwaysOn: v })}
              trackColor={{ false: colors.surfaceHighlight, true: colors.secondary + '60' }}
              thumbColor={config.alwaysOn ? colors.secondary : colors.textMuted}
            />
          </SettingRow>
        </Section>

        {/* Generation */}
        <Section title="GENERATION">
          <SettingRow icon="speedometer-outline" label="Temperature" description={`${config.temperature}`}>
            <View style={styles.sliderRow}>
              {[0.0, 0.3, 0.5, 0.7, 1.0].map(t => (
                <Pressable
                  key={t}
                  style={[
                    styles.tempButton,
                    {
                      backgroundColor: config.temperature === t ? colors.primary : colors.surfaceHighlight,
                    },
                  ]}
                  onPress={() => updateConfig({ temperature: t })}
                >
                  <Text style={{ color: config.temperature === t ? '#fff' : colors.textSecondary, fontSize: 13 }}>
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>
          </SettingRow>

          <SettingRow icon="resize-outline" label="Max Tokens" description={`${config.maxTokens}`} last>
            <View style={styles.sliderRow}>
              {[1024, 2048, 4096, 8192].map(t => (
                <Pressable
                  key={t}
                  style={[
                    styles.tempButton,
                    {
                      backgroundColor: config.maxTokens === t ? colors.primary : colors.surfaceHighlight,
                    },
                  ]}
                  onPress={() => updateConfig({ maxTokens: t })}
                >
                  <Text style={{ color: config.maxTokens === t ? '#fff' : colors.textSecondary, fontSize: 12 }}>
                    {t >= 1024 ? `${t / 1024}k` : t}
                  </Text>
                </Pressable>
              ))}
            </View>
          </SettingRow>
        </Section>

        {/* Appearance */}
        <Section title="APPEARANCE">
          <SettingRow icon="color-palette-outline" label="Theme" last>
            <View style={styles.themeRow}>
              {(['dark', 'amoled', 'light'] as ThemeName[]).map(theme => (
                <Pressable
                  key={theme}
                  style={[
                    styles.themeButton,
                    {
                      backgroundColor: themes[theme].colors.background,
                      borderColor: config.theme === theme ? colors.primary : colors.border,
                      borderWidth: config.theme === theme ? 2 : 1,
                    },
                  ]}
                  onPress={() => updateConfig({ theme })}
                >
                  <Text style={{ color: themes[theme].colors.text, fontSize: 12, fontWeight: '600' }}>
                    {themes[theme].name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </SettingRow>
        </Section>

        {/* System Prompt */}
        <Section title="SYSTEM PROMPT">
          <View style={styles.promptSection}>
            {editingPrompt ? (
              <>
                <TextInput
                  style={[styles.promptInput, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                  value={promptDraft}
                  onChangeText={setPromptDraft}
                  multiline
                  textAlignVertical="top"
                />
                <View style={styles.promptButtons}>
                  <Pressable
                    style={[styles.promptBtn, { borderColor: colors.border }]}
                    onPress={() => {
                      setPromptDraft(config.systemPrompt);
                      setEditingPrompt(false);
                    }}
                  >
                    <Text style={[styles.promptBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.promptBtn, { borderColor: colors.warning }]}
                    onPress={() => {
                      setPromptDraft(DEFAULT_SYSTEM_PROMPT);
                    }}
                  >
                    <Text style={[styles.promptBtnText, { color: colors.warning }]}>Reset</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.promptBtn, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      updateConfig({ systemPrompt: promptDraft });
                      setEditingPrompt(false);
                    }}
                  >
                    <Text style={[styles.promptBtnText, { color: '#fff' }]}>Save</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.promptPreview, { color: colors.textSecondary }]} numberOfLines={8}>
                  {config.systemPrompt}
                </Text>
                <Pressable
                  style={[styles.editPromptBtn, { borderColor: colors.primary }]}
                  onPress={() => {
                    setPromptDraft(config.systemPrompt);
                    setEditingPrompt(true);
                  }}
                >
                  <Ionicons name="create-outline" size={16} color={colors.primary} />
                  <Text style={[styles.editPromptText, { color: colors.primary }]}>Edit System Prompt</Text>
                </Pressable>
              </>
            )}
          </View>
        </Section>

        {/* Danger Zone */}
        <Section title="DANGER ZONE">
          <Pressable
            style={[styles.dangerButton, { borderColor: colors.error }]}
            onPress={() => {
              Alert.alert(
                'Clear All Data',
                'This will delete all conversations, skills, tasks, and settings. This cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete Everything',
                    style: 'destructive',
                    onPress: async () => {
                      await clearAllData();
                      // Reinitialize
                      useStore.getState().initialize();
                    },
                  },
                ]
              );
            }}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={[styles.dangerText, { color: colors.error }]}>Clear All Data</Text>
          </Pressable>
        </Section>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            OpenClaw Assistant v1.0.0
          </Text>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Powered by Claude · Built for Samsung Tab S10 FE
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  title: { fontSize: 22, fontWeight: '700' },
  content: { flex: 1 },
  contentInner: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 8, paddingHorizontal: 4 },
  sectionContent: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingLabels: { flex: 1 },
  settingLabel: { fontSize: 15, fontWeight: '500' },
  settingDesc: { fontSize: 12, marginTop: 2 },
  settingRight: { marginLeft: 12 },
  apiKeyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  apiKeyInput: { width: 200, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  modelList: { gap: 6 },
  modelOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5 },
  modelName: { fontSize: 14, fontWeight: '600' },
  modelDesc: { fontSize: 11, marginTop: 2 },
  sliderRow: { flexDirection: 'row', gap: 6 },
  tempButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  themeRow: { flexDirection: 'row', gap: 8 },
  themeButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  promptSection: { padding: 16 },
  promptPreview: { fontSize: 13, lineHeight: 20, fontFamily: 'monospace' },
  editPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  editPromptText: { fontSize: 13, fontWeight: '600' },
  promptInput: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 13, minHeight: 200, fontFamily: 'monospace', lineHeight: 20 },
  promptButtons: { flexDirection: 'row', gap: 8, marginTop: 12, justifyContent: 'flex-end' },
  promptBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  promptBtnText: { fontSize: 14, fontWeight: '600' },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  dangerText: { fontSize: 15, fontWeight: '600' },
  footer: { alignItems: 'center', paddingVertical: 24, gap: 4 },
  footerText: { fontSize: 12 },
});
