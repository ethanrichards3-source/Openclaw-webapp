import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { themes } from '../config/theme';

export function EvolutionScreen() {
  const config = useStore(s => s.config);
  const colors = themes[config.theme].colors;
  const pendingEvolutions = useStore(s => s.pendingEvolutions);
  const evolutionLog = useStore(s => s.evolutionLog);
  const requestEvolution = useStore(s => s.requestEvolution);
  const approveEvolution = useStore(s => s.approveEvolution);
  const rejectEvolution = useStore(s => s.rejectEvolution);
  const rollbackEvolution = useStore(s => s.rollbackEvolution);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'log'>('pending');

  const handleRequestEvolution = async () => {
    setIsAnalyzing(true);
    try {
      await requestEvolution();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const typeIcons: Record<string, string> = {
    prompt_update: 'document-text-outline',
    behavior_change: 'swap-horizontal-outline',
    skill_add: 'add-circle-outline',
    skill_remove: 'remove-circle-outline',
    config_change: 'settings-outline',
  };

  const typeColors: Record<string, string> = {
    prompt_update: colors.primary,
    behavior_change: colors.secondary,
    skill_add: colors.success,
    skill_remove: colors.warning,
    config_change: colors.accent,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Self-Evolution</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            OpenClaw can analyze and improve itself
          </Text>
        </View>
        <Pressable
          style={[styles.analyzeButton, { backgroundColor: isAnalyzing ? colors.surfaceHighlight : colors.primary }]}
          onPress={handleRequestEvolution}
          disabled={isAnalyzing || !config.apiKey}
        >
          {isAnalyzing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="flask-outline" size={18} color="#fff" />
          )}
          <Text style={styles.analyzeButtonText}>
            {isAnalyzing ? 'Analyzing...' : 'Analyze & Evolve'}
          </Text>
        </Pressable>
      </View>

      {/* Info Banner */}
      <View style={[styles.infoBanner, { backgroundColor: colors.surfaceElevated }]}>
        <Ionicons name="information-circle-outline" size={20} color={colors.secondary} />
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Self-evolution lets OpenClaw modify its own prompts, skills, and behaviors to better serve you.
          All changes are logged and can be rolled back.
        </Text>
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.tab, activeTab === 'pending' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'pending' ? colors.primary : colors.textMuted }]}>
            Pending ({pendingEvolutions.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'log' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('log')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'log' ? colors.primary : colors.textMuted }]}>
            History ({evolutionLog.length})
          </Text>
        </Pressable>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {activeTab === 'pending' ? (
          pendingEvolutions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="flask-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No Pending Evolutions</Text>
              <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                Tap "Analyze & Evolve" to let OpenClaw suggest improvements
              </Text>
            </View>
          ) : (
            pendingEvolutions.map((evo, index) => (
              <View key={index} style={[styles.evolutionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.evoHeader}>
                  <Ionicons
                    name={typeIcons[evo.type] as any || 'flash-outline'}
                    size={20}
                    color={typeColors[evo.type] || colors.primary}
                  />
                  <Text style={[styles.evoType, { color: typeColors[evo.type] || colors.primary }]}>
                    {evo.type.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.evoDesc, { color: colors.text }]}>{evo.description}</Text>

                {evo.before && (
                  <View style={[styles.diffBlock, { backgroundColor: colors.error + '10' }]}>
                    <Text style={[styles.diffLabel, { color: colors.error }]}>Before:</Text>
                    <Text style={[styles.diffText, { color: colors.textSecondary }]} numberOfLines={5}>
                      {evo.before}
                    </Text>
                  </View>
                )}
                {evo.after && (
                  <View style={[styles.diffBlock, { backgroundColor: colors.success + '10' }]}>
                    <Text style={[styles.diffLabel, { color: colors.success }]}>After:</Text>
                    <Text style={[styles.diffText, { color: colors.textSecondary }]} numberOfLines={5}>
                      {evo.after}
                    </Text>
                  </View>
                )}

                <View style={styles.evoActions}>
                  <Pressable
                    style={[styles.evoButton, { backgroundColor: colors.success }]}
                    onPress={() => approveEvolution(evo)}
                  >
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.evoButtonText}>Approve</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.evoButton, { backgroundColor: colors.error }]}
                    onPress={() => rejectEvolution(index)}
                  >
                    <Ionicons name="close" size={18} color="#fff" />
                    <Text style={styles.evoButtonText}>Reject</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )
        ) : (
          evolutionLog.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No Evolution History</Text>
              <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                Approved evolutions will appear here
              </Text>
            </View>
          ) : (
            [...evolutionLog].reverse().map(entry => (
              <View key={entry.id} style={[styles.logCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.logHeader}>
                  <View style={[styles.logStatus, { backgroundColor: entry.success ? colors.success : colors.error }]} />
                  <Text style={[styles.logType, { color: colors.textSecondary }]}>
                    {entry.action.type.replace(/_/g, ' ')}
                  </Text>
                  <Text style={[styles.logTime, { color: colors.textMuted }]}>
                    {new Date(entry.action.timestamp).toLocaleString()}
                  </Text>
                </View>
                <Text style={[styles.logDesc, { color: colors.text }]}>{entry.action.description}</Text>
                {entry.rollbackData && (
                  <Pressable
                    style={[styles.rollbackButton, { borderColor: colors.warning }]}
                    onPress={() => rollbackEvolution(entry)}
                  >
                    <Ionicons name="arrow-undo-outline" size={14} color={colors.warning} />
                    <Text style={[styles.rollbackText, { color: colors.warning }]}>Rollback</Text>
                  </Pressable>
                )}
              </View>
            ))
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  analyzeButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    margin: 16,
    padding: 14,
    borderRadius: 10,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 20,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: { fontSize: 14, fontWeight: '600' },
  content: { flex: 1 },
  contentInner: { padding: 20, gap: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptyDesc: { fontSize: 14, textAlign: 'center', maxWidth: 300 },
  evolutionCard: { borderRadius: 12, borderWidth: 1, padding: 16 },
  evoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  evoType: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  evoDesc: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  diffBlock: { padding: 12, borderRadius: 8, marginBottom: 8 },
  diffLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  diffText: { fontSize: 13, fontFamily: 'monospace' },
  evoActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  evoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  evoButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  logCard: { borderRadius: 12, borderWidth: 1, padding: 14 },
  logHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  logStatus: { width: 8, height: 8, borderRadius: 4 },
  logType: { fontSize: 13, fontWeight: '600', flex: 1 },
  logTime: { fontSize: 11 },
  logDesc: { fontSize: 14, lineHeight: 20 },
  rollbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  rollbackText: { fontSize: 12, fontWeight: '600' },
});
