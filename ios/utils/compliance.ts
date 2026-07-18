import { Alert } from 'react-native';
import { apiFetch, blockUserApi } from '@/lib/api';

export const Compliance = {
    /**
     * Report inappropriate content (User/Pin).
     * Sends to real backend /api/report endpoint.
     */
    reportContent: async (contentId: string, type: 'user' | 'pin' | 'drawing', reason: string) => {
        try {
            await apiFetch('/api/report', {
                method: 'POST',
                auth: true,
                body: JSON.stringify({ contentId, type, reason }),
            });
        } catch (e) {
            // Silently swallow errors for UX - report is best-effort
            console.warn('[Report] failed to submit report', e);
        }

        Alert.alert(
            'Report Submitted',
            'Thank you for your report. We will review this content within 24 hours and take appropriate action if it violates our guidelines.',
            [{ text: 'OK' }]
        );
    },

    /**
     * Block a user via the real backend API.
     * The blocked user's pins/drawings will be filtered out server-side.
     */
    blockUser: async (userId: string) => {
        try {
            await blockUserApi(userId, { silent: true });
            Alert.alert('User Blocked', 'This user has been blocked. You will no longer see their content.', [{ text: 'OK' }]);
            return true;
        } catch (e: any) {
            const isSelfBlock = e?.status === 400 && /cannot block yourself/i.test(e?.message || '');

            if (isSelfBlock) {
                Alert.alert('无法拉黑自己', '不能拉黑自己的账号。', [{ text: '确定' }]);
                return false;
            }

            console.error('[Block] Failed to block user', e);
            Alert.alert('拉黑失败', '请稍后再试。');
            return false;
        }
    },
};
