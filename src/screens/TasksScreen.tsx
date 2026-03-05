import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Switch, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { themes } from '../config/theme';
import { ScheduledTask, ProactiveRule } from '../types';

export function TasksScreen() {
  const config = useStore(s => s.config);
  const colors = themes[config.theme].colors;
  const scheduledTasks = useStore(s => s.scheduledTasks);
  const proactiveRules = useStore(s => s.proactiveRules);
  const addTask = useStore(s => s.addTask);
  const removeTask = useStore(s => s.removeTask);
  const toggleTask = useStore(s => s.toggleTask);
  const updateProactiveRule = useStore(s => s.updateProactiveRule);
  const addProactiveRule = useStore(s => s.addProactiveRule);

  const [activeTab, setActiveTab] = useState<'tasks' | 'proactive'>('tasks');
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newTask, setNewTask] = useState({ name: '', description: '', cron: '', action: '' });
  const [newRule, setNewRule] = useState({ name: '', condition: '', action: '', cooldown: '60' });

  const handleAddTask = () => {
    if (!newTask.name.trim() || !newTask.action.trim()) return;
    const task: ScheduledTask = {
      id: `task-${Date.now()}`,
      name: newTask.name.trim(),
      description: newTask.description.trim(),
      cronExpression: newTask.cron.trim() || '0 * * * *',
      action: newTask.action.trim(),
      enabled: true,
      createdAt: Date.now(),
    };
    addTask(task);
    setNewTask({ name: '', description: '', cron: '', action: '' });
    setShowAddTask(false);
  };

  const handleAddRule = () => {
    if (!newRule.name.trim() || !newRule.action.trim()) return;
    const rule: ProactiveRule = {
      id: `rule-${Date.now()}`,
      name: newRule.name.trim(),
      condition: newRule.condition.trim() || 'every_hour',
      action: newRule.action.trim(),
      cooldownMinutes: parseInt(newRule.cooldown) || 60,
      enabled: true,
    };
    addProactiveRule(rule);
    setNewRule({ name: '', condition: '', action: '', cooldown: '60' });
    setShowAddRule(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Tasks & Automation</Text>
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <Pressable
          style={[styles.tab, activeTab === 'tasks' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('tasks')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'tasks' ? colors.primary : colors.textMuted }]}>
            Scheduled Tasks ({scheduledTasks.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'proactive' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('proactive')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'proactive' ? colors.primary : colors.textMuted }]}>
            Proactive Rules ({proactiveRules.length})
          </Text>
        </Pressable>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {activeTab === 'tasks' ? (
          <>
            <Pressable
              style={[styles.addCard, { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]}
              onPress={() => setShowAddTask(true)}
            >
              <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
              <Text style={[styles.addCardText, { color: colors.primary }]}>Add Scheduled Task</Text>
            </Pressable>

            {scheduledTasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No scheduled tasks. Add one to automate recurring actions.
                </Text>
              </View>
            ) : (
              scheduledTasks.map(task => (
                <View key={task.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardInfo}>
                      <Text style={[styles.cardName, { color: colors.text }]}>{task.name}</Text>
                      <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{task.description}</Text>
                    </View>
                    <Switch
                      value={task.enabled}
                      onValueChange={() => toggleTask(task.id)}
                      trackColor={{ false: colors.surfaceHighlight, true: colors.primary + '60' }}
                      thumbColor={task.enabled ? colors.primary : colors.textMuted}
                    />
                  </View>
                  <View style={[styles.cronRow, { backgroundColor: colors.codeBackground }]}>
                    <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                    <Text style={[styles.cronText, { color: colors.textSecondary }]}>{task.cronExpression}</Text>
                  </View>
                  <Text style={[styles.actionText, { color: colors.textSecondary }]}>{task.action}</Text>
                  <Pressable
                    style={[styles.removeBtn, { borderColor: colors.error + '40' }]}
                    onPress={() => removeTask(task.id)}
                  >
                    <Ionicons name="trash-outline" size={14} color={colors.error} />
                    <Text style={[styles.removeBtnText, { color: colors.error }]}>Remove</Text>
                  </Pressable>
                </View>
              ))
            )}
          </>
        ) : (
          <>
            <Pressable
              style={[styles.addCard, { borderColor: colors.secondary, backgroundColor: colors.secondary + '10' }]}
              onPress={() => setShowAddRule(true)}
            >
              <Ionicons name="add-circle-outline" size={24} color={colors.secondary} />
              <Text style={[styles.addCardText, { color: colors.secondary }]}>Add Proactive Rule</Text>
            </Pressable>

            {proactiveRules.map(rule => (
              <View key={rule.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardName, { color: colors.text }]}>{rule.name}</Text>
                    <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                      Condition: {rule.condition.replace(/_/g, ' ')}
                    </Text>
                  </View>
                  <Switch
                    value={rule.enabled}
                    onValueChange={() => updateProactiveRule(rule.id, { enabled: !rule.enabled })}
                    trackColor={{ false: colors.surfaceHighlight, true: colors.secondary + '60' }}
                    thumbColor={rule.enabled ? colors.secondary : colors.textMuted}
                  />
                </View>
                <Text style={[styles.actionText, { color: colors.textSecondary }]}>{rule.action}</Text>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>
                    Cooldown: {rule.cooldownMinutes}min
                  </Text>
                  {rule.lastTriggered && (
                    <Text style={[styles.metaText, { color: colors.textMuted }]}>
                      Last: {new Date(rule.lastTriggered).toLocaleString()}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Add Task Modal */}
      <Modal visible={showAddTask} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Scheduled Task</Text>
            {[
              { label: 'Name', key: 'name', placeholder: 'e.g., Daily Summary' },
              { label: 'Description', key: 'description', placeholder: 'What does this task do?' },
              { label: 'Cron Expression', key: 'cron', placeholder: '0 9 * * * (9 AM daily)' },
              { label: 'Action', key: 'action', placeholder: 'Generate a daily summary of tasks...', multiline: true },
            ].map(field => (
              <View key={field.key}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{field.label}</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    field.multiline && styles.multilineInput,
                    { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border },
                  ]}
                  value={(newTask as any)[field.key]}
                  onChangeText={v => setNewTask(s => ({ ...s, [field.key]: v }))}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.textMuted}
                  multiline={field.multiline}
                />
              </View>
            ))}
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalBtn, { borderColor: colors.border }]} onPress={() => setShowAddTask(false)}>
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={handleAddTask}>
                <Text style={styles.modalBtnTextPrimary}>Add Task</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Rule Modal */}
      <Modal visible={showAddRule} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Proactive Rule</Text>
            {[
              { label: 'Name', key: 'name', placeholder: 'e.g., Evening Summary' },
              { label: 'Condition', key: 'condition', placeholder: 'e.g., time_between_9_10_pm, idle_for_30_minutes' },
              { label: 'Action', key: 'action', placeholder: 'What should OpenClaw do?', multiline: true },
              { label: 'Cooldown (minutes)', key: 'cooldown', placeholder: '60' },
            ].map(field => (
              <View key={field.key}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{field.label}</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    field.multiline && styles.multilineInput,
                    { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border },
                  ]}
                  value={(newRule as any)[field.key]}
                  onChangeText={v => setNewRule(s => ({ ...s, [field.key]: v }))}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.textMuted}
                  multiline={field.multiline}
                  keyboardType={field.key === 'cooldown' ? 'numeric' : 'default'}
                />
              </View>
            ))}
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalBtn, { borderColor: colors.border }]} onPress={() => setShowAddRule(false)}>
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.secondary }]} onPress={handleAddRule}>
                <Text style={styles.modalBtnTextPrimary}>Add Rule</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  title: { fontSize: 22, fontWeight: '700' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 20 },
  tab: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 14, fontWeight: '600' },
  content: { flex: 1 },
  contentInner: { padding: 20, gap: 12 },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  addCardText: { fontSize: 15, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', maxWidth: 280 },
  card: { borderRadius: 12, borderWidth: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardInfo: { flex: 1, marginRight: 12 },
  cardName: { fontSize: 16, fontWeight: '600' },
  cardDesc: { fontSize: 13, marginTop: 4 },
  cronRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 6, marginTop: 10 },
  cronText: { fontSize: 13, fontFamily: 'monospace' },
  actionText: { fontSize: 13, marginTop: 8, lineHeight: 18 },
  metaRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  metaText: { fontSize: 11 },
  removeBtn: {
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
  removeBtnText: { fontSize: 12, fontWeight: '500' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modal: { width: '90%', maxWidth: 500, borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4, marginTop: 12 },
  modalInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  multilineInput: { minHeight: 80, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24, justifyContent: 'flex-end' },
  modalBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  modalBtnText: { fontSize: 15, fontWeight: '600' },
  modalBtnTextPrimary: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
