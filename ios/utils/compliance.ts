import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const BLOCKED_USERS_KEY = 'user_blocked_ids';

export const Compliance = {
    /**
     * Report inappropriate content (User/Pin).
     * In a real app, this would send an API request.
     */
    reportContent: async (contentId: string, type: 'user' | 'pin', reason: string) => {
        // Mock API call
        console.log(`[Report] Reporting ${type} ${contentId}: ${reason}`);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        Alert.alert(
            'Report Submitted',
            'Thank you for your report. We will review this content within 24 hours and take appropriate action if it violates our guidelines.',
            [{ text: 'OK' }]
        );
    },

    /**
     * Block a user.
     * Stores the user ID locally to filter their content.
     */
    blockUser: async (userId: string) => {
        try {
            const stored = await AsyncStorage.getItem(BLOCKED_USERS_KEY);
            const blocked = stored ? JSON.parse(stored) : [];
            if (!blocked.includes(userId)) {
                blocked.push(userId);
                await AsyncStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(blocked));
            }
            return true;
        } catch (e) {
            console.error('Failed to block user', e);
            return false;
        }
    },

    /**
     * Get list of blocked user IDs.
     */
    getBlockedUsers: async (): Promise<string[]> => {
        try {
            const stored = await AsyncStorage.getItem(BLOCKED_USERS_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    },

    /**
     * Unblock a user.
     */
    unblockUser: async (userId: string) => {
        try {
            const stored = await AsyncStorage.getItem(BLOCKED_USERS_KEY);
            if (stored) {
                const blocked = JSON.parse(stored);
                const newBlocked = blocked.filter((id: string) => id !== userId);
                await AsyncStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(newBlocked));
            }
            return true;
        } catch (e) {
            return false;
        }
    }
};
