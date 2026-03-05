import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { themes } from '../config/theme';

export function Sidebar() {
  const config = useStore(s => s.config);
  const colors = themes[config.theme].colors;
  const conversations = useStore(s => s.conversations);
  const activeConversationId = useStore(s => s.activeConversationId);
  const createConversation = useStore(s => s.createConversation);
  const setActiveConversation = useStore(s => s.setActiveConversation);
  const deleteConversation = useStore(s => s.deleteConversation);
  const isSidebarOpen = useStore(s => s.isSidebarOpen);
  const pendingEvolutions = useStore(s => s.pendingEvolutions);

  if (!isSidebarOpen) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderRightColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={[styles.logo, { backgroundColor: colors.primary }]}>
            <Text style={styles.logoText}>OC</Text>
          </View>
          <View>
            <Text style={[styles.brandName, { color: colors.text }]}>OpenClaw</Text>
            <Text style={[styles.brandSub, { color: colors.textSecondary }]}>AI Assistant</Text>
          </View>
        </View>

        {/* Status indicators */}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: config.apiKey ? colors.success : colors.error }]} />
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
            {config.apiKey ? 'Connected' : 'No API Key'}
          </Text>
        </View>
        {config.alwaysOn && (
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: colors.secondary }]} />
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Always On</Text>
          </View>
        )}
      </View>

      {/* New Chat Button */}
      <Pressable
        style={[styles.newChatButton, { backgroundColor: colors.primary }]}
        onPress={() => createConversation()}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.newChatText}>New Chat</Text>
      </Pressable>

      {/* Evolution badge */}
      {pendingEvolutions.length > 0 && (
        <View style={[styles.evolutionBanner, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}>
          <Text style={[styles.evolutionText, { color: colors.warning }]}>
            🧬 {pendingEvolutions.length} evolution{pendingEvolutions.length > 1 ? 's' : ''} pending
          </Text>
        </View>
      )}

      {/* Conversation List */}
      <ScrollView style={styles.conversationList} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>CONVERSATIONS</Text>
        {conversations.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No conversations yet. Start chatting!
          </Text>
        ) : (
          conversations.map(conv => (
            <Pressable
              key={conv.id}
              style={[
                styles.conversationItem,
                {
                  backgroundColor: conv.id === activeConversationId ? colors.surfaceHighlight : 'transparent',
                  borderColor: conv.id === activeConversationId ? colors.primary + '40' : 'transparent',
                },
              ]}
              onPress={() => setActiveConversation(conv.id)}
            >
              <View style={styles.conversationContent}>
                <Text
                  style={[
                    styles.conversationTitle,
                    { color: conv.id === activeConversationId ? colors.text : colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {conv.title}
                </Text>
                <Text style={[styles.conversationMeta, { color: colors.textMuted }]}>
                  {conv.messages.length} messages · {new Date(conv.updatedAt).toLocaleDateString()}
                </Text>
              </View>
              <Pressable
                style={styles.deleteButton}
                onPress={() => deleteConversation(conv.id)}
                hitSlop={8}
              >
                <Ionicons name="close-circle-outline" size={18} color={colors.textMuted} />
              </Pressable>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          Powered by Claude · v1.0
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 300,
    borderRightWidth: 1,
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 24,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  brandName: {
    fontSize: 20,
    fontWeight: '700',
  },
  brandSub: {
    fontSize: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 12,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  newChatText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  evolutionBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  evolutionText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  conversationList: {
    flex: 1,
    paddingHorizontal: 12,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 2,
    borderWidth: 1,
  },
  conversationContent: {
    flex: 1,
  },
  conversationTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  conversationMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
  },
});
