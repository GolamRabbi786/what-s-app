import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet, View } from 'react-native';
import type { CallBackground } from '../lib/types';

const native = Platform.OS !== 'web';

export function AnimatedBackground({
  background,
  dim = 0.15,
}: {
  background: CallBackground;
  dim?: number;
}) {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 9000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: native,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 9000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: native,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [drift]);

  if (background.kind === 'image' && background.image) {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image source={{ uri: background.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(11,20,26,0.55)', 'rgba(11,20,26,0.72)']}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }

  const colors = background.colors ?? ['#061b20', '#0d3b3a', '#155e63'];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={colors} style={StyleSheet.absoluteFill} />
      <Animated.View
        style={[
          styles.blob,
          styles.blobOne,
          {
            backgroundColor: colors[1],
            transform: [
              {
                translateX: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-28, 34],
                }),
              },
              {
                translateY: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, -30],
                }),
              },
              {
                scale: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.22],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.blob,
          styles.blobTwo,
          {
            backgroundColor: colors[2],
            transform: [
              {
                translateX: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [26, -38],
                }),
              },
              {
                translateY: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-18, 26],
                }),
              },
              {
                scale: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1.18, 0.96],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.blob,
          styles.blobThree,
          {
            backgroundColor: colors[2],
            opacity: drift.interpolate({
              inputRange: [0, 1],
              outputRange: [0.24, 0.42],
            }),
            transform: [
              {
                translateY: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, -14],
                }),
              },
            ],
          },
        ]}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(6,12,16,${dim})` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.34,
  },
  blobOne: {
    width: 480,
    height: 480,
    top: '-18%',
    left: '-22%',
  },
  blobTwo: {
    width: 420,
    height: 420,
    bottom: '-24%',
    right: '-18%',
  },
  blobThree: {
    width: 320,
    height: 320,
    top: '38%',
    left: '36%',
  },
});
