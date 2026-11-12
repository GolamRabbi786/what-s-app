import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MessageCircle } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from '@/context/AppContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

function Splash() {
  const { theme } = useApp();
  return (
    <View style={[styles.splash, { backgroundColor: theme.mode === 'dark' ? '#0b141a' : '#f7f8fa' }]}>
      <View style={styles.splashLogo}>
        <MessageCircle color="#ffffff" size={34} strokeWidth={2.4} />
      </View>
      <Text style={[styles.splashTitle, { color: theme.text }]}>WhatsApp</Text>
      <Text style={[styles.splashSub, { color: theme.textSecondary }]}>
        Simple, reliable, private messaging
      </Text>
      <ActivityIndicator color={theme.accent} style={styles.splashSpinner} />
    </View>
  );
}

function SyncBanner() {
  const { syncError, dismissSyncError, theme } = useApp();

  if (!syncError) return null;

  return (
    <View style={[styles.syncBanner, { backgroundColor: theme.mode === 'dark' ? '#3a1a1c' : '#fdeceb' }]}>
      <Text style={[styles.syncText, { color: theme.danger }]} numberOfLines={3}>
        {syncError}
      </Text>
      <Pressable onPress={dismissSyncError} accessibilityRole="button" accessibilityLabel="Dismiss sync error">
        <Text style={[styles.syncClose, { color: theme.danger }]}>Dismiss</Text>
      </Pressable>
    </View>
  );
}

function RootNavigator() {
  useFrameworkReady();
  const { theme } = useApp();
  const { hydrated, currentUser } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    const onAuth = pathname.startsWith('/auth');
    const onAdmin = pathname.startsWith('/admin');

    if (!currentUser) {
      if (!onAuth) router.replace('/auth' as never);
      return;
    }

    if (onAuth) {
      router.replace((currentUser.role === 'admin' ? '/admin' : '/(tabs)') as never);
      return;
    }

    if (onAdmin && currentUser.role !== 'admin') {
      router.replace('/(tabs)' as never);
    }
  }, [hydrated, currentUser, pathname, router]);

  if (!hydrated) return <Splash />;

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <SyncBanner />
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppProvider>
          <RootNavigator />
        </AppProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  splashLogo: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: '#00a884',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  splashTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  splashSub: {
    fontSize: 12.5,
  },
  splashSpinner: {
    marginTop: 20,
  },
  syncBanner: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  syncText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
  },
  syncClose: {
    fontSize: 12.5,
    fontWeight: '800',
  },
});
