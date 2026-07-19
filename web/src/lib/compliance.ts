/**
 * Web compliance utilities — Report & Block User.
 * Server-authoritative report and block operations.
 */
import type { BlockedUsersResponse } from '@niubi/shared';
import { getI18nText } from '@/lib/i18n';

export const Compliance = {
  /**
   * Report inappropriate content (user / pin / drawing).
   * Sends a server-side report and shows a browser alert.
   */
  reportContent: async (
    contentId: string,
    type: 'user' | 'pin' | 'drawing',
    reason: string
  ) => {
    let submitted = false;
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, type, reason }),
      });
      if (!res.ok) {
        console.error('[Compliance] Report failed:', res.status);
      } else {
        submitted = true;
      }
    } catch (e) {
      console.error('[Compliance] Report error:', e);
    }
    window.alert(getI18nText(submitted ? 'reportSubmitted' : 'reportFailed'));
  },

  /**
   * Block a user in the server-authoritative list.
   */
  blockUser: async (userId: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedId: userId }),
      });
      if (!res.ok) {
        console.error('[Compliance] Block API failed:', res.status);
        return false;
      }
      return true;
    } catch (e) {
      console.error('[Compliance] Block error:', e);
      return false;
    }
  },

  /** Fetch the current server-authoritative blocked-user IDs. */
  syncBlockedUsers: async (): Promise<string[]> => {
    try {
      const res = await fetch('/api/block');
      if (!res.ok) return [];
      const data = (await res.json()) as BlockedUsersResponse;
      return data.items.map((i) => i.userId);
    } catch {
      return [];
    }
  },

  /**
   * Unblock a user in the server-authoritative list.
   */
  unblockUser: async (userId: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/block', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedId: userId }),
      });
      if (!res.ok) {
        console.error('[Compliance] Unblock API failed:', res.status);
        return false;
      }
      return true;
    } catch (e) {
      console.error('[Compliance] Unblock error:', e);
      return false;
    }
  },
};
