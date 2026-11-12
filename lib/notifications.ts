import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiRequest } from './client';

let handlerInstalled = false;
let registered = false;

export function installNotificationHandler() {
  if (handlerInstalled || Platform.OS === 'web') return;
  handlerInstalled = true;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {
    // Notifications are unavailable in this runtime.
  }
}

export async function registerPushNotifications() {
  if (Platform.OS === 'web' || registered) return;
  registered = true;
  try {
    installNotificationHandler();

    const permissions = await Notifications.getPermissionsAsync();
    let status = permissions.status;
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        description: 'New message and call notifications',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'notification.wav',
        vibrationPattern: [0, 250, 180, 250],
        lightColor: '#00a884',
      });
    }

    let projectId: string | undefined =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;

    const device = await Notifications.getDevicePushTokenAsync().catch(() => null);
    if (!projectId && !device) return;

    const token = projectId
      ? (await Notifications.getExpoPushTokenAsync({ projectId })).data
      : (await Notifications.getExpoPushTokenAsync()).data;

    await apiRequest('/api/push', {
      method: 'POST',
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
  } catch {
    // Push is optional; messaging keeps working without it.
  }
}

export async function showIncomingNotification(title: string, body: string) {
  try {
    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        typeof window.Notification !== 'undefined' &&
        window.Notification.permission === 'granted'
      ) {
        new window.Notification(title, { body, icon: '/favicon.png' });
      }
      return;
    }

    installNotificationHandler();
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'notification.wav',
      },
      trigger: null,
    });
  } catch {
    // Best-effort only.
  }
}
