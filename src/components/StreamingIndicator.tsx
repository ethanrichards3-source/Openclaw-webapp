import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useStore } from '../store';
import { themes } from '../config/theme';

export function StreamingIndicator() {
  const isStreaming = useStore(s => s.isStreaming);
  const streamingText = useStore(s => s.streamingText);
  const config = useStore(s => s.config);
  const colors = themes[config.theme].colors;

  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isStreaming) return;

    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      );

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 150);
    const a3 = animate(dot3, 300);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [isStreaming]);

  if (!isStreaming) return null;

  if (streamingText) {
    return (
      <View style={[styles.streamingBubble, { backgroundColor: colors.assistantBubble }]}>
        <Text style={[styles.streamingText, { color: colors.text, fontSize: config.fontSize }]} selectable>
          {streamingText}
        </Text>
        <View style={[styles.cursor, { backgroundColor: colors.primary }]} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.assistantBubble }]}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: colors.primary,
              opacity: dot,
              transform: [{ scale: Animated.add(0.6, Animated.multiply(dot, 0.4)) }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    marginHorizontal: 16,
    marginVertical: 4,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  streamingBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    marginHorizontal: 16,
    marginVertical: 4,
    maxWidth: '80%',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  streamingText: {
    lineHeight: 24,
  },
  cursor: {
    width: 2,
    height: 20,
    marginLeft: 2,
    borderRadius: 1,
  },
});
