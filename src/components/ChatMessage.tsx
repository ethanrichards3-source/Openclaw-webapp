import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Message } from '../types';
import { useStore } from '../store';
import { themes } from '../config/theme';

interface ChatMessageProps {
  message: Message;
}

function ChatMessageComponent({ message }: ChatMessageProps) {
  const config = useStore(s => s.config);
  const colors = themes[config.theme].colors;
  const isUser = message.role === 'user';
  const isProactive = message.metadata?.isProactive;

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isUser ? colors.userBubble : colors.assistantBubble,
            borderColor: isProactive ? colors.warning : 'transparent',
            borderWidth: isProactive ? 1 : 0,
          },
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        {isProactive && (
          <View style={[styles.proactiveBadge, { backgroundColor: colors.warning }]}>
            <Text style={styles.proactiveBadgeText}>PROACTIVE</Text>
          </View>
        )}
        <Text
          style={[
            styles.messageText,
            {
              color: isUser ? '#ffffff' : colors.text,
              fontSize: config.fontSize,
            },
          ]}
          selectable
        >
          {message.content}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.timestamp, { color: isUser ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {message.metadata?.model && (
            <Text style={[styles.model, { color: colors.textMuted }]}>
              {message.metadata.model.split('-').slice(0, 2).join(' ')}
            </Text>
          )}
          {message.metadata?.tokensUsed && (
            <Text style={[styles.tokens, { color: colors.textMuted }]}>
              {message.metadata.tokensUsed} tokens
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

export const ChatMessage = memo(ChatMessageComponent);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    width: '100%',
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    minWidth: 60,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  timestamp: {
    fontSize: 11,
  },
  model: {
    fontSize: 11,
  },
  tokens: {
    fontSize: 11,
  },
  proactiveBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  proactiveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
  },
});
