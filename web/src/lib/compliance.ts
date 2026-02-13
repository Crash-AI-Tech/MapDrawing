/**
 * Web compliance utilities — Report & Block User.
 * Mirrors ios/utils/compliance.ts but uses localStorage + fetch API.
 */

const BLOCKED_USERS_KEY = 'niubi-blocked-users';

export const Compliance = {
  /**
   * Report inappropriate content (user / pin).
   * Sends a server-side report and shows a browser alert.
   */
  reportContent: async (
    contentId: string,
    type: 'user' | 'pin',
    reason: string
  ) => {
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, type, reason }),
      });
      if (!res.ok) {
        console.error('[Compliance] Report failed:', res.status);
      }
    } catch (e) {
      console.error('[Compliance] Report error:', e);
    }
    // Always show confirmation to user (even if API fails, to prevent re-reports)
    window.alert(
      'Report Submitted\n\nThank you for your report. We will review this content within 24 hours and take appropriate action if it violates our guidelines.'
    );
  },

  /**
   * Block a user. Stores user ID in localStorage.
   */
  blockUser: (userId: string): boolean => {
    try {
      const blocked = Compliance.getBlockedUsers();
      if (!blocked.includes(userId)) {
        blocked.push(userId);
        localStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(blocked));
      }
      return true;
    } catch (e) {
      console.error('[Compliance] Block failed:', e);
      return false;
    }
  },

  /**
   * Get list of blocked user IDs.
   */
  getBlockedUsers: (): string[] => {
    try {
      const stored = localStorage.getItem(BLOCKED_USERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  /**
   * Unblock a user.
   */
  unblockUser: (userId: string): boolean => {
    try {
      const blocked = Compliance.getBlockedUsers();
      const updated = blocked.filter((id: string) => id !== userId);
      localStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(updated));
      return true;
    } catch {
      return false;
    }
  },
};
