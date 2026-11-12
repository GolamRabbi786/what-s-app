import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { Palette } from '../lib/theme';

const native = Platform.OS !== 'web';

function Shimmer({ style }: { style: object }) {
  const value = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 0.85,
          duration: 750,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: native,
        }),
        Animated.timing(value, {
          toValue: 0.35,
          duration: 750,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: native,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [value]);

  return <Animated.View style={[{ opacity: value }, style]} />;
}

export function ChatListSkeleton({ theme, rows = 7 }: { theme: Palette; rows?: number }) {
  return (
    <View accessibilityLabel="Loading conversations" style={styles.wrap}>
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index} style={styles.row}>
          <Shimmer
            style={[styles.avatar, { backgroundColor: theme.chip }]}
          />
          <View style={styles.lines}>
            <Shimmer
              style={[
                styles.line,
                { backgroundColor: theme.chip, width: `${58 + ((index * 13) % 30)}%` },
              ]}
            />
            <Shimmer
              style={[
                styles.lineSmall,
                { backgroundColor: theme.chip, width: `${38 + ((index * 17) % 34)}%` },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

export function MessageSkeleton({ theme }: { theme: Palette }) {
  return (
    <View style={styles.messages}>
      {[0, 1, 2, 3].map((index) => (
        <Shimmer
          key={index}
          style={[
            styles.bubble,
            {
              backgroundColor: theme.chip,
              alignSelf: index % 2 === 0 ? 'flex-start' : 'flex-end',
              width: `${42 + ((index * 19) % 32)}%`,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  avatar: {
    width: 49,
    height: 49,
    borderRadius: 25,
  },
  lines: {
    flex: 1,
    gap: 8,
  },
  line: {
    height: 12,
    borderRadius: 6,
  },
  lineSmall: {
    height: 10,
    borderRadius: 5,
  },
  messages: {
    flex: 1,
    justifyContent: 'center',
    gap: 14,
    padding: 24,
  },
  bubble: {
    height: 38,
    borderRadius: 12,
  },
});
