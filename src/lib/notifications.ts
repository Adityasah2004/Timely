import { Platform } from 'react-native';
import Constants from 'expo-constants';

const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

function getN() {
  if (IS_EXPO_GO) return null;
  try {
    return require('expo-notifications') as typeof import('expo-notifications');
  } catch {
    return null;
  }
}

export const VIBRATE_PATTERN = [0, 500, 100, 500, 100, 500, 200, 800, 200, 800];

export async function scheduleNotif(
  secondsFromNow: number,
  title: string,
  body: string,
): Promise<string | null> {
  const N = getN();
  if (!N || secondsFromNow <= 0) return null;
  try {
    const { status } = await N.requestPermissionsAsync();
    if (status !== 'granted') return null;
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('reminders', {
        name: 'Event reminders',
        importance: N.AndroidImportance.MAX,
        vibrationPattern: VIBRATE_PATTERN,
        enableVibrate: true,
        sound: 'default',
      });
    }
    return await N.scheduleNotificationAsync({
      content: { title, body, sound: 'default', priority: 'max' },
      trigger: {
        type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, secondsFromNow),
      },
    });
  } catch {
    return null;
  }
}

export async function cancelNotif(id: string | null) {
  const N = getN();
  if (N && id) await N.cancelScheduledNotificationAsync(id).catch(() => {});
}

// Compute seconds from now until event_date + HH:MM minus offsetMinutes
export function secondsUntil(eventDate: string, startTime: string, offsetMinutes: number): number {
  const [h, m] = startTime.split(':').map(Number);
  const target = new Date(eventDate);
  target.setHours(h, m - offsetMinutes, 0, 0);
  return Math.floor((target.getTime() - Date.now()) / 1000);
}
