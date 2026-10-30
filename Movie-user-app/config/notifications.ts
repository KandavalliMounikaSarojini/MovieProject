
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { endpoints } from '../config/api';

export async function registerForPushNotificationsAsync() {

    // Expo Go does not support remote push notifications (SDK 53+).
    const isExpoGo =
        Constants.executionEnvironment === 'storeClient' ||
        Constants.appOwnership === 'expo';

    if (isExpoGo) {
        console.log(
            'Push notifications are disabled in Expo Go. Use a development build.'
        );
        return null;
    }

    if (!Device.isDevice) {
        console.log('Push notifications require a physical device.');
        return null;
    }

    if (Platform.OS === 'web') {
        return null;
    }

    try {
        // Load native notification module only when supported.
        const Notifications = require('expo-notifications');

        let token;

        const { status: existingStatus } =
            await Notifications.getPermissionsAsync();

        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } =
                await Notifications.requestPermissionsAsync();

            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Notification permission not granted.');
            return null;
        }

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        token = (await Notifications.getExpoPushTokenAsync()).data;

        console.log('Expo Push Token:', token);

        return token;

    } catch (error) {
        console.warn('Notification registration failed:', error);
        return null;
    }
}

export async function savePushToken(token: string) {
    try {
        if (!token) return;

        const authToken = await SecureStore.getItemAsync('token');

        if (!authToken) return;

        const response = await fetch(endpoints.profile, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({
                push_token: token,
            }),
        });

        if (response.ok) {
            console.log('Push token saved to server');
        } else {
            console.log('Failed to save push token:', response.status);
        }

    } catch (error) {
        console.error('Failed to save push token:', error);
    }
}
