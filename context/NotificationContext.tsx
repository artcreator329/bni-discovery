import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

interface NotificationContextType {
  expoPushToken: string | null;
  requestPermissions: () => Promise<boolean>;
  scheduleMeetingReminder: (title: string, body: string, date: Date) => Promise<void>;
  sendLocalNotification: (title: string, body: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      setExpoPushToken(token || null);
    });
  }, []);

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'web') return true;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  };

  const scheduleMeetingReminder = async (title: string, body: string, date: Date) => {
    if (Platform.OS === 'web') return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
      },
      trigger: {
        date: new Date(date.getTime() - 15 * 60 * 1000), // 15 minutes before
      },
    });
  };

  const sendLocalNotification = async (title: string, body: string) => {
    if (Platform.OS === 'web') return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
      },
      trigger: null,
    });
  };

  const value = {
    expoPushToken,
    requestPermissions,
    scheduleMeetingReminder,
    sendLocalNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return null;

  let token;
  
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    alert('Failed to get push token for push notification!');
    return null;
  }
  
  token = (await Notifications.getExpoPushTokenAsync()).data;
  
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
  
  return token;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}