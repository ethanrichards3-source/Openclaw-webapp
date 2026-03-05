import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { themes } from '../config/theme';

/**
 * CodeViewer - Displays the assistant's own source code
 * This is part of the self-evolution system, allowing the AI
 * to show users what code it wants to modify.
 */
interface CodeViewerProps {
  code: string;
  language?: string;
  title?: string;
  highlightLines?: number[];
  onModify?: (newCode: string) => void;
}

export function CodeViewer({ code, language = 'typescript', title, highlightLines = [], onModify }: CodeViewerProps) {
  const config = useStore(s => s.config);
  const colors = themes[config.theme].colors;
  const [isExpanded, setIsExpanded] = useState(false);
  const lines = code.split('\n');
  const displayLines = isExpanded ? lines : lines.slice(0, 20);
  const hasMore = lines.length > 20;

  return (
    <View style={[styles.container, { backgroundColor: colors.codeBackground, borderColor: colors.border }]}>
      {title && (
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Ionicons name="code-slash-outline" size={16} color={colors.secondary} />
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.lang, { color: colors.textMuted }]}>{language}</Text>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.codeBlock}>
          {displayLines.map((line, i) => (
            <View
              key={i}
              style={[
                styles.codeLine,
                highlightLines.includes(i + 1) && { backgroundColor: colors.warning + '15' },
              ]}
            >
              <Text style={[styles.lineNumber, { color: colors.textMuted }]}>
                {String(i + 1).padStart(3)}
              </Text>
              <Text style={[styles.lineText, { color: colors.text }]}>{line}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {hasMore && (
        <Pressable
          style={[styles.expandButton, { borderTopColor: colors.border }]}
          onPress={() => setIsExpanded(!isExpanded)}
        >
          <Text style={[styles.expandText, { color: colors.primary }]}>
            {isExpanded ? 'Show less' : `Show ${lines.length - 20} more lines`}
          </Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.primary}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  lang: {
    fontSize: 11,
  },
  codeBlock: {
    paddingVertical: 8,
  },
  codeLine: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 1,
    minHeight: 20,
  },
  lineNumber: {
    width: 36,
    fontSize: 12,
    fontFamily: 'monospace',
    textAlign: 'right',
    marginRight: 12,
  },
  lineText: {
    fontSize: 13,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  expandText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
