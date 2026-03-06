import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { themes } from '../config/theme';
import { MemoryEntry, MemorySearchResult } from '../types';

export function MemoryScreen() {
  const config = useStore(s => s.config);
  const colors = themes[config.theme].colors;
  const memoryCount = useStore(s => s.memoryCount);
  const searchMemory = useStore(s => s.searchMemory);
  const getAllMemories = useStore(s => s.getAllMemories);
  const addMemory = useStore(s => s.addMemory);
  const deleteMemory = useStore(s => s.deleteMemory);
  const clearMemories = useStore(s => s.clearMemories);

  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MemorySearchResult[] | null>(null);
  const [newMemory, setNewMemory] = useState('');
  const [newTags, setNewTags] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadMemories();
  }, [memoryCount]);

  const loadMemories = async () => {
    const all = await getAllMemories();
    setMemories(all);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const results = await searchMemory(searchQuery.trim());
    setSearchResults(results);
  };

  const handleAdd = async () => {
    if (!newMemory.trim()) return;
    const tags = newTags.split(',').map(t => t.trim()).filter(Boolean);
    await addMemory(newMemory.trim(), tags, 'user_note', 0.8);
    setNewMemory('');
    setNewTags('');
    setShowAddForm(false);
    loadMemories();
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Memory', 'Remove this memory?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMemory(id).then(loadMemories) },
    ]);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const displayData = searchResults
    ? searchResults.map(r => r.entry)
    : memories;

  const renderMemory = ({ item }: { item: MemoryEntry }) => (
    <View style={[styles.memoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.memoryHeader}>
        <View style={styles.memoryTags}>
          {item.tags.map((tag, i) => (
            <View key={i} style={[styles.tag, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
            </View>
          ))}
        </View>
        <Pressable onPress={() => handleDelete(item.id)} hitSlop={8}>
          <Ionicons name="close-circle-outline" size={18} color={colors.textMuted} />
        </Pressable>
      </View>
      <Text style={[styles.memoryContent, { color: colors.text }]}>{item.content}</Text>
      <View style={styles.memoryFooter}>
        <Text style={[styles.memoryMeta, { color: colors.textMuted }]}>
          {item.source} · {formatDate(item.timestamp)}
        </Text>
        <View style={[styles.importanceBadge, { backgroundColor: getImportanceColor(item.importance, colors) + '20' }]}>
          <Text style={[styles.importanceText, { color: getImportanceColor(item.importance, colors) }]}>
            {item.importance >= 0.8 ? 'High' : item.importance >= 0.5 ? 'Med' : 'Low'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: colors.text }]}>Memory</Text>
          <Text style={[styles.countBadge, { color: colors.primary }]}>{memoryCount} stored</Text>
        </View>

        {/* Search */}
        <View style={[styles.searchRow, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search memories..."
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery ? (
            <Pressable onPress={() => { setSearchQuery(''); setSearchResults(null); }}>
              <Ionicons name="close-outline" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.headerActions}>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: colors.primary + '15' }]}
            onPress={() => setShowAddForm(!showAddForm)}
          >
            <Ionicons name="add-outline" size={18} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Add Memory</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: colors.error + '15' }]}
            onPress={() => {
              Alert.alert('Clear All', 'Delete all memories?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: () => clearMemories().then(loadMemories) },
              ]);
            }}
          >
            <Ionicons name="trash-outline" size={16} color={colors.error} />
            <Text style={[styles.actionBtnText, { color: colors.error }]}>Clear</Text>
          </Pressable>
        </View>
      </View>

      {/* Add Memory Form */}
      {showAddForm && (
        <View style={[styles.addForm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            style={[styles.addInput, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
            value={newMemory}
            onChangeText={setNewMemory}
            placeholder="What should I remember?"
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <TextInput
            style={[styles.tagsInput, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
            value={newTags}
            onChangeText={setNewTags}
            placeholder="Tags (comma-separated)"
            placeholderTextColor={colors.textMuted}
          />
          <View style={styles.addActions}>
            <Pressable style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setShowAddForm(false)}>
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleAdd}>
              <Text style={styles.saveBtnText}>Save Memory</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Search Results Label */}
      {searchResults && (
        <View style={styles.resultsLabel}>
          <Text style={[styles.resultsText, { color: colors.textMuted }]}>
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
          </Text>
        </View>
      )}

      {/* Memory List */}
      <FlatList
        data={displayData}
        renderItem={renderMemory}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="library-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {searchResults ? 'No matching memories' : 'No memories yet. OpenClaw will remember important things automatically.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

function getImportanceColor(importance: number, colors: any): string {
  if (importance >= 0.8) return colors.error;
  if (importance >= 0.5) return colors.warning;
  return colors.textMuted;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: '700' },
  countBadge: { fontSize: 14, fontWeight: '600' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  searchInput: { flex: 1, fontSize: 15 },
  headerActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  addForm: { margin: 16, padding: 16, borderRadius: 12, borderWidth: 1, gap: 10 },
  addInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14, minHeight: 60 },
  tagsInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14 },
  addActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  cancelBtnText: { fontSize: 14, fontWeight: '500' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  resultsLabel: { paddingHorizontal: 20, paddingTop: 12 },
  resultsText: { fontSize: 13 },
  list: { padding: 16, gap: 10 },
  memoryCard: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 8 },
  memoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  memoryTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, flex: 1 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  tagText: { fontSize: 11, fontWeight: '600' },
  memoryContent: { fontSize: 14, lineHeight: 20 },
  memoryFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memoryMeta: { fontSize: 11 },
  importanceBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  importanceText: { fontSize: 11, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', maxWidth: 280 },
});
