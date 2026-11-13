import { X } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useApp } from '../context/AppContext';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: number;
  scroll?: boolean;
  dark?: boolean;
}

export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 480,
  scroll = true,
  dark = false,
}: SheetProps) {
  const { theme } = useApp();
  const { width, height } = useWindowDimensions();
  const compact = width < 640;
  const panelBg = dark ? '#111b21' : theme.panel;
  const textColor = dark ? '#e9edef' : theme.text;
  const secondary = dark ? '#8696a0' : theme.textSecondary;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [visible, progress]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close dialog"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[
            styles.panel,
            {
              backgroundColor: panelBg,
              borderColor: dark ? '#222d34' : theme.border,
              width: compact ? width - 24 : Math.min(width - 48, maxWidth),
              maxHeight: compact ? height - 48 : height - 80,
              borderRadius: compact ? 20 : 18,
              opacity: progress,
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
                {
                  scale: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.97, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {title ? (
            <View style={[styles.header, { borderBottomColor: dark ? '#222d34' : theme.border }]}>
              <View style={styles.headerText}>
                <Text style={[styles.title, { color: textColor }]}>{title}</Text>
                {subtitle ? (
                  <Text style={[styles.subtitle, { color: secondary }]}>{subtitle}</Text>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={onClose}
                style={({ pressed }) => [
                  styles.closeButton,
                  { backgroundColor: dark ? '#202c33' : theme.chip },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <X color={secondary} size={18} />
              </Pressable>
            </View>
          ) : null}

          {scroll ? (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          ) : (
            <View style={styles.scrollContent}>{children}</View>
          )}

          {footer ? (
            <View style={[styles.footer, { borderTopColor: dark ? '#222d34' : theme.border }]}>
              {footer}
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 20, 26, 0.62)',
    padding: 12,
  },
  panel: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 40,
    elevation: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 16,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
