import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, FlatList, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { themes } from '../config/theme';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import { StreamingIndicator } from '../components/StreamingIndicator';
import { Sidebar } from '../components/Sidebar';
import { Message } from '../types';

export function ChatScreen() {
  const config = useStore(s => s.config);
  const colors = themes[config.theme].colors;
  const conversation = useStore(s => s.getActiveConversation());
  const isStreaming = useStore(s => s.isStreaming);
  const isSidebarOpen = useStore(s => s.isSidebarOpen);
  const toggleSidebar = useStore(s => s.toggleSidebar);
  const createConversation = useStore(s => s.createConversation);
  const memoryCount = useStore(s => s.memoryCount);
  const flatListRef = useRef<FlatList>(null);

  const messages = conversation?.messages || [];

  const isAuthenticated = config.authMethod === 'session_cookie'
    ? !!config.sessionCookie
    : !!config.apiKey;

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, isStreaming]);

  const renderMessage = ({ item }: { item: Message }) => <ChatMessage message={item} />;

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '20' }]}>
        <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Welcome to OpenClaw</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Your always-on, self-evolving AI assistant
      </Text>
      <View style={styles.featureGrid}>
        {[
          { icon: 'flash-outline', label: 'Proactive', desc: 'Anticipates your needs' },
          { icon: 'git-branch-outline', label: 'Self-Evolving', desc: 'Improves over time' },
          { icon: 'library-outline', label: 'Memory', desc: `${memoryCount} memories` },
          { icon: 'globe-outline', label: 'Multi-Channel', desc: 'Telegram & Discord' },
          { icon: 'browsers-outline', label: 'Browser', desc: 'Web automation' },
          { icon: 'pencil-outline', label: 'S Pen', desc: 'Stylus support' },
        ].map((feature, i) => (
          <View key={i} style={[styles.featureCard, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name={feature.icon as any} size={24} color={colors.primary} />
            <Text style={[styles.featureLabel, { color: colors.text }]}>{feature.label}</Text>
            <Text style={[styles.featureDesc, { color: colors.textMuted }]}>{feature.desc}</Text>
          </View>
        ))}
      </View>
      {!isAuthenticated && (
        <View style={[styles.setupBanner, { backgroundColor: colors.warning + '15', borderColor: colors.warning }]}>
          <Ionicons name="log-in-outline" size={20} color={colors.warning} />
          <Text style={[styles.setupText, { color: colors.warning }]}>
            {config.authMethod === 'session_cookie'
              ? 'Paste your Claude session cookie in Settings to get started (no API key needed!)'
              : 'Add your Claude API key in Settings to get started'}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Sidebar />

      <View style={styles.chatArea}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable onPress={toggleSidebar} style={styles.menuButton} hitSlop={8}>
            <Ionicons
              name={isSidebarOpen ? 'menu' : 'menu-outline'}
              size={24}
              color={colors.text}
            />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {conversation?.title || 'OpenClaw'}
            </Text>
            {isStreaming && (
              <Text style={[styles.headerStatus, { color: colors.secondary }]}>Thinking...</Text>
            )}
          </View>
          <Pressable
            onPress={() => createConversation()}
            style={[styles.newButton, { backgroundColor: colors.surfaceHighlight }]}
          >
            <Ionicons name="add" size={20} color={colors.primary} />
          </Pressable>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.messageList,
            messages.length === 0 && styles.messageListEmpty,
          ]}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={<StreamingIndicator />}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
        />

        {/* Input */}
        <ChatInput />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  chatArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  menuButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  newButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageList: {
    paddingVertical: 16,
  },
  messageListEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 24,
  },
  featureCard: {
    width: 140,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
  },
  featureLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  featureDesc: {
    fontSize: 12,
    textAlign: 'center',
  },
  setupBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  setupText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});
