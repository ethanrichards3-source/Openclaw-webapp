import React, { useState, useRef } from 'react';
import { View, TextInput, StyleSheet, Pressable, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { themes } from '../config/theme';

export function ChatInput() {
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const sendMessage = useStore(s => s.sendMessage);
  const isStreaming = useStore(s => s.isStreaming);
  const cancelStreaming = useStore(s => s.cancelStreaming);
  const config = useStore(s => s.config);
  const memoryCount = useStore(s => s.memoryCount);
  const colors = themes[config.theme].colors;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 50, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    sendMessage(trimmed);
    setText('');
  };

  const handleStop = () => {
    cancelStreaming();
  };

  const authLabel = config.authMethod === 'session_cookie' ? 'Session' : 'API';

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.inputBackground,
            borderColor: isFocused ? colors.primary : colors.border,
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: colors.text, fontSize: config.fontSize }]}
          value={text}
          onChangeText={setText}
          placeholder="Message OpenClaw..."
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={10000}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          editable={!isStreaming}
        />

        {isStreaming ? (
          <Pressable style={[styles.sendButton, { backgroundColor: colors.error }]} onPress={handleStop}>
            <Ionicons name="stop" size={22} color="#fff" />
          </Pressable>
        ) : (
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Pressable
              style={[
                styles.sendButton,
                {
                  backgroundColor: text.trim() ? colors.primary : colors.surfaceHighlight,
                },
              ]}
              onPress={handleSend}
              disabled={!text.trim()}
            >
              <Ionicons name="send" size={20} color={text.trim() ? '#fff' : colors.textMuted} />
            </Pressable>
          </Animated.View>
        )}
      </View>

      <View style={styles.statusRow}>
        <Text style={[styles.statusText, { color: colors.textMuted }]}>
          {isStreaming ? 'Generating...' : `${config.model.split('-').slice(0, 2).join(' ')} (${authLabel})`}
        </Text>
        {config.persistentMemoryEnabled && memoryCount > 0 && (
          <Text style={[styles.statusBadge, { color: colors.primary }]}>
            {memoryCount} memories
          </Text>
        )}
        {config.selfEvolutionEnabled && (
          <Text style={[styles.statusBadge, { color: colors.secondary }]}>
            Self-Evolving
          </Text>
        )}
        {config.telegramConfig.enabled && (
          <Text style={[styles.statusBadge, { color: colors.warning }]}>
            TG
          </Text>
        )}
        {config.discordConfig.enabled && (
          <Text style={[styles.statusBadge, { color: colors.warning }]}>
            Discord
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 1.5,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 48,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    paddingVertical: 8,
    lineHeight: 22,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 12,
  },
  statusText: {
    fontSize: 12,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
});
