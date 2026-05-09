/**
 * Web compliance utilities — Report & Block User.
 * Uses server-side /api/block + /api/report with localStorage fallback.
 */

const BLOCKED_USERS_KEY = 'niubi-blocked-users';

/** Sync local cache from localStorage */
function getLocalBlocked(): string[] {
  try {
    const stored = localStorage.getItem(BLOCKED_USERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setLocalBlocked(ids: string[]) {
  try {
    localStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(ids));
  } catch { /* ignore */ }
}

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
   * Block a user. Syncs to server AND caches in localStorage.
   */
  blockUser: async (userId: string): Promise<boolean> => {
    // Optimistic local cache update
    const blocked = getLocalBlocked();
    if (!blocked.includes(userId)) {
      blocked.push(userId);
      setLocalBlocked(blocked);
    }

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

  /**
   * Get list of blocked user IDs.
   * Returns local cache immediately; use syncBlockedUsers() to refresh from server.
   */
  getBlockedUsers: (): string[] => {
    return getLocalBlocked();
  },

  /**
   * Fetch blocked users from server and update local cache.
   */
  syncBlockedUsers: async (): Promise<string[]> => {
    try {
      const res = await fetch('/api/block');
      if (!res.ok) return getLocalBlocked();
      const data = (await res.json()) as { items: { userId: string }[] };
      const ids = data.items.map((i) => i.userId);
      setLocalBlocked(ids);
      return ids;
    } catch {
      return getLocalBlocked();
    }
  },

  /**
   * Unblock a user. Syncs to server AND updates localStorage.
   */
  unblockUser: async (userId: string): Promise<boolean> => {
    // Optimistic local cache update
    const blocked = getLocalBlocked();
    const updated = blocked.filter((id: string) => id !== userId);
    setLocalBlocked(updated);

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
