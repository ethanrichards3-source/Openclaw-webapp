import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Switch, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { themes } from '../config/theme';
import { Skill } from '../types';

export function SkillsScreen() {
  const config = useStore(s => s.config);
  const colors = themes[config.theme].colors;
  const skills = useStore(s => s.skills);
  const addSkill = useStore(s => s.addSkill);
  const removeSkill = useStore(s => s.removeSkill);
  const toggleSkill = useStore(s => s.toggleSkill);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSkill, setNewSkill] = useState({ name: '', description: '', prompt: '', triggers: '' });

  const handleAddSkill = () => {
    if (!newSkill.name.trim() || !newSkill.prompt.trim()) return;

    const skill: Skill = {
      id: `skill-custom-${Date.now()}`,
      name: newSkill.name.trim(),
      description: newSkill.description.trim(),
      prompt: newSkill.prompt.trim(),
      enabled: true,
      triggers: newSkill.triggers.split(',').map(t => t.trim()).filter(Boolean),
      createdAt: Date.now(),
      isBuiltIn: false,
    };

    addSkill(skill);
    setNewSkill({ name: '', description: '', prompt: '', triggers: '' });
    setShowAddModal(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Skills</Text>
        <Pressable
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Skill</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          Skills extend what OpenClaw can do. Triggered by keywords in your messages.
        </Text>

        {skills.map(skill => (
          <View
            key={skill.id}
            style={[styles.skillCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.skillHeader}>
              <View style={styles.skillInfo}>
                <View style={styles.skillNameRow}>
                  <Text style={[styles.skillName, { color: colors.text }]}>{skill.name}</Text>
                  {skill.isBuiltIn && (
                    <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.badgeText, { color: colors.primary }]}>Built-in</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.skillDesc, { color: colors.textSecondary }]}>
                  {skill.description}
                </Text>
              </View>
              <Switch
                value={skill.enabled}
                onValueChange={() => toggleSkill(skill.id)}
                trackColor={{ false: colors.surfaceHighlight, true: colors.primary + '60' }}
                thumbColor={skill.enabled ? colors.primary : colors.textMuted}
              />
            </View>

            {skill.triggers && skill.triggers.length > 0 && (
              <View style={styles.triggersRow}>
                <Text style={[styles.triggersLabel, { color: colors.textMuted }]}>Triggers: </Text>
                {skill.triggers.map((trigger, i) => (
                  <View key={i} style={[styles.triggerChip, { backgroundColor: colors.surfaceHighlight }]}>
                    <Text style={[styles.triggerText, { color: colors.textSecondary }]}>{trigger}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={[styles.promptPreview, { backgroundColor: colors.codeBackground }]}>
              <Text style={[styles.promptText, { color: colors.textSecondary }]} numberOfLines={3}>
                {skill.prompt}
              </Text>
            </View>

            {!skill.isBuiltIn && (
              <Pressable
                style={[styles.deleteButton, { borderColor: colors.error + '40' }]}
                onPress={() => removeSkill(skill.id)}
              >
                <Ionicons name="trash-outline" size={16} color={colors.error} />
                <Text style={[styles.deleteText, { color: colors.error }]}>Remove</Text>
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Add Skill Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add New Skill</Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Name</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
              value={newSkill.name}
              onChangeText={name => setNewSkill(s => ({ ...s, name }))}
              placeholder="e.g., Email Drafter"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Description</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
              value={newSkill.description}
              onChangeText={description => setNewSkill(s => ({ ...s, description }))}
              placeholder="What does this skill do?"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Prompt</Text>
            <TextInput
              style={[styles.modalInput, styles.multilineInput, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
              value={newSkill.prompt}
              onChangeText={prompt => setNewSkill(s => ({ ...s, prompt }))}
              placeholder="The prompt prepended when this skill is triggered..."
              placeholderTextColor={colors.textMuted}
              multiline
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Trigger Words (comma separated)</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
              value={newSkill.triggers}
              onChangeText={triggers => setNewSkill(s => ({ ...s, triggers }))}
              placeholder="e.g., email, draft, compose"
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, { borderColor: colors.border }]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleAddSkill}
              >
                <Text style={styles.modalButtonTextPrimary}>Add Skill</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 22, fontWeight: '700' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  list: { flex: 1 },
  listContent: { padding: 20, gap: 16 },
  sectionLabel: { fontSize: 14, marginBottom: 8 },
  skillCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  skillHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  skillInfo: { flex: 1, marginRight: 12 },
  skillNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  skillName: { fontSize: 16, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  skillDesc: { fontSize: 13, marginTop: 4 },
  triggersRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 12, gap: 4 },
  triggersLabel: { fontSize: 12 },
  triggerChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  triggerText: { fontSize: 12 },
  promptPreview: { marginTop: 12, padding: 12, borderRadius: 8 },
  promptText: { fontSize: 12, fontFamily: 'monospace' },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  deleteText: { fontSize: 13, fontWeight: '500' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modal: { width: '90%', maxWidth: 500, borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4, marginTop: 12 },
  modalInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  multilineInput: { minHeight: 100, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24, justifyContent: 'flex-end' },
  modalButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  modalButtonText: { fontSize: 15, fontWeight: '600' },
  modalButtonTextPrimary: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
