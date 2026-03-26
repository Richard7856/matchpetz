import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '../supabase';

/**
 * Hook to register and handle push notifications on native platforms.
 * Stores the FCM token in the user's profile for server-side targeting.
 * Handles notification tap to navigate to the correct screen.
 */
export default function usePushNotifications(user) {
    const navigate = useNavigate();
    const registered = useRef(false);

    useEffect(() => {
        if (!user || registered.current) return;
        if (!Capacitor.isNativePlatform()) return; // Only on Android/iOS

        const setup = async () => {
            try {
                // Request permission
                const permResult = await PushNotifications.requestPermissions();
                if (permResult.receive !== 'granted') return;

                // Register with FCM/APNs
                await PushNotifications.register();
                registered.current = true;

                // Get the FCM token
                PushNotifications.addListener('registration', async (token) => {
                    // Save token to profile for server-side push
                    await supabase
                        .from('profiles')
                        .update({ push_token: token.value })
                        .eq('id', user.id);
                });

                PushNotifications.addListener('registrationError', () => {
                    // Push registration failed — silent
                });

                // Handle notification received while app is in foreground
                PushNotifications.addListener('pushNotificationReceived', () => {
                    // Could show an in-app toast here
                });

                // Handle notification tap (app was in background or closed)
                PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
                    const data = action.notification.data;
                    if (data?.type === 'adoption' && data?.entity_id) {
                        navigate(`/chat/${data.entity_id}`);
                    } else if (data?.type === 'event' && data?.entity_id) {
                        navigate(`/events/${data.entity_id}`);
                    } else if (data?.type === 'message' && data?.entity_id) {
                        navigate(`/chat/${data.entity_id}`);
                    } else if (data?.type === 'appointment') {
                        navigate('/appointments');
                    } else {
                        navigate('/notifications');
                    }
                });
            } catch {
                // Push setup failed — silent
            }
        };

        setup();

        return () => {
            PushNotifications.removeAllListeners();
        };
    }, [user, navigate]);
}
