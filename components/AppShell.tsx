import { useRouter } from 'expo-router';
import {
  CircleDashed,
  MessageCircle,
  Moon,
  Phone,
  Settings,
  ShieldCheck,
  Sun,
  Users,
} from 'lucide-react-native';
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './Avatar';

export type TabKey = 'chats' | 'updates' | 'communities' | 'calls' | 'settings';

interface NavItem {
  key: TabKey;
  label: string;
  href: string;
  icon: React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'chats', label: 'Chats', href: '/(tabs)', icon: MessageCircle },
  { key: 'updates', label: 'Status', href: '/(tabs)/updates', icon: CircleDashed },
  { key: 'communities', label: 'Communities', href: '/(tabs)/communities', icon: Users },
  { key: 'calls', label: 'Calls', href: '/(tabs)/calls', icon: Phone },
  { key: 'settings', label: 'Settings', href: '/(tabs)/settings', icon: Settings },
];

interface AppShellProps {
  active: TabKey;
  children: React.ReactNode;
}

export function AppShell({ active, children }: AppShellProps) {
  const { theme, state, toggleTheme } = useApp();
  const { isAdmin } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const desktop = width >= 900;

  const unread = state.chats.reduce(
    (total, chat) => total + (chat.archived ? 0 : chat.unread),
    0,
  );

  const navigate = (item: NavItem) => {
    if (item.key === active) return;
    router.replace(item.href as never);
  };

  if (desktop) {
    return (
      <View style={[styles.shell, { backgroundColor: theme.bg }]}>
        <View
          style={[
            styles.rail,
            {
              backgroundColor: theme.rail,
              borderRightColor: theme.mode === 'dark' ? '#222d34' : '#2a3942',
              paddingTop: Math.max(insets.top, 12),
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View style={styles.brand}>
            <View style={[styles.brandCircle, { backgroundColor: theme.accent }]}>
              <MessageCircle color="#ffffff" size={24} strokeWidth={2.4} />
            </View>
          </View>

          <View style={styles.railNav}>
            {NAV_ITEMS.map((item) => {
              const isActive = item.key === active;
              const Icon = item.icon;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  onPress={() => navigate(item)}
                  style={({ pressed }) => [
                    styles.railItem,
                    isActive && { backgroundColor: theme.railSoft },
                    pressed && { opacity: 0.72 },
                  ]}
                >
                  <View>
                    <Icon
                      color={isActive ? theme.accent : theme.railText}
                      size={22}
                      strokeWidth={isActive ? 2.4 : 1.9}
                    />
                    {item.key === 'chats' && unread > 0 ? (
                      <View style={[styles.railBadge, { backgroundColor: theme.accent }]}>
                        <Text style={styles.railBadgeText}>{unread > 99 ? '99+' : unread}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.railLabel,
                      { color: isActive ? theme.accent : theme.railText },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.railBottom}>
            {isAdmin ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open admin panel"
                onPress={() => router.push('/admin' as never)}
                style={({ pressed }) => [
                  styles.themeButton,
                  { backgroundColor: theme.accentSoft },
                  pressed && { opacity: 0.72 },
                ]}
              >
                <ShieldCheck color={theme.accentDark} size={18} />
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Toggle dark mode"
              onPress={toggleTheme}
              style={({ pressed }) => [
                styles.themeButton,
                { backgroundColor: theme.railSoft },
                pressed && { opacity: 0.72 },
              ]}
            >
              {theme.mode === 'dark' ? (
                <Sun color={theme.railText} size={18} />
              ) : (
                <Moon color={theme.railText} size={18} />
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open profile and settings"
              onPress={() => router.replace('/(tabs)/settings' as never)}
              style={({ pressed }) => [styles.profileButton, pressed && { opacity: 0.78 }]}
            >
              <Avatar name={state.user.name} uri={state.user.avatar} size={40} showOnline online />
            </Pressable>
          </View>
        </View>
        <View style={styles.content}>{children}</View>
      </View>
    );
  }

  return (
    <View style={[styles.mobileShell, { backgroundColor: theme.bg }]}>
      <View style={[styles.mobileContent, { paddingTop: insets.top }]}>{children}</View>
      <View
        style={[
          styles.mobileNav,
          {
            backgroundColor: theme.panel,
            borderTopColor: theme.border,
            paddingBottom: Math.max(insets.bottom, 6),
          },
        ]}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === active;
          const Icon = item.icon;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={() => navigate(item)}
              style={({ pressed }) => [styles.mobileItem, pressed && { opacity: 0.7 }]}
            >
              <View>
                <View
                  style={[
                    styles.mobileIconWrap,
                    isActive && { backgroundColor: theme.chipActive },
                  ]}
                >
                  <Icon
                    color={isActive ? theme.accentDark : theme.textSecondary}
                    size={21}
                    strokeWidth={isActive ? 2.4 : 1.9}
                  />
                </View>
                {item.key === 'chats' && unread > 0 ? (
                  <View style={[styles.mobileBadge, { backgroundColor: theme.accent }]}>
                    <Text style={styles.mobileBadgeText}>{unread > 99 ? '99+' : unread}</Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={[
                  styles.mobileLabel,
                  {
                    color: isActive ? theme.accentDark : theme.textSecondary,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
  },
  rail: {
    width: 78,
    alignItems: 'center',
    borderRightWidth: 1,
  },
  brand: {
    marginBottom: 16,
  },
  brandCircle: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railNav: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  railItem: {
    width: 62,
    minHeight: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
  },
  railLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.15,
  },
  railBadge: {
    position: 'absolute',
    top: -5,
    right: -9,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  railBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  railBottom: {
    alignItems: 'center',
    gap: 12,
  },
  themeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileButton: {
    borderRadius: 999,
  },
  content: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  mobileShell: {
    flex: 1,
    minHeight: 0,
  },
  mobileContent: {
    flex: 1,
    minHeight: 0,
  },
  mobileNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 7,
    minHeight: 61,
  },
  mobileItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  mobileIconWrap: {
    minWidth: 38,
    height: 27,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileLabel: {
    fontSize: 10.5,
  },
  mobileBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  mobileBadgeText: {
    color: '#ffffff',
    fontSize: 8.5,
    fontWeight: '800',
  },
});
