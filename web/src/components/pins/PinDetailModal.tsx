'use client';

import { useCallback } from 'react';
import { usePinStore, MapPin } from '@/stores/pinStore';
import { useAuthStore } from '@/stores/authStore';
import { Compliance } from '@/lib/compliance';
import { X, Flag, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Format a relative time string */
function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

/**
 * PinDetailModal — displays pin details in a modal dialog.
 * Shows avatar, username, timestamp, message, and Report/Block actions.
 * Mirrors the iOS PinDetailModal component.
 */
export default function PinDetailModal() {
  const selectedPin = usePinStore((s) => s.selectedPin);
  const setSelectedPin = usePinStore((s) => s.setSelectedPin);
  const refreshBlocked = usePinStore((s) => s.refreshBlocked);
  const user = useAuthStore((s) => s.user);

  const handleClose = useCallback(() => {
    setSelectedPin(null);
  }, [setSelectedPin]);

  const handleReport = useCallback(() => {
    if (!selectedPin) return;
    const reason = window.prompt('举报原因:');
    if (reason) {
      Compliance.reportContent(selectedPin.id, 'pin', reason);
      handleClose();
    }
  }, [selectedPin, handleClose]);

  const handleBlock = useCallback(() => {
    if (!selectedPin) return;
    if (window.confirm(`屏蔽 ${selectedPin.userName || '此用户'}？他们的图钉将被隐藏。`)) {
      Compliance.blockUser(selectedPin.userId);
      refreshBlocked();
      handleClose();
    }
  }, [selectedPin, refreshBlocked, handleClose]);

  if (!selectedPin) return null;

  const isOwnPin = user?.id === selectedPin.userId;
  const initial = (selectedPin.userName || '?').charAt(0).toUpperCase();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center gap-3 border-b-[3px] bg-gray-50 p-4"
          style={{ borderBottomColor: selectedPin.color }}
        >
          {/* Avatar */}
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
            style={{ backgroundColor: selectedPin.color }}
          >
            {initial}
          </div>

          {/* User info */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-gray-800">
              {selectedPin.userName || '匿名'}
            </p>
            <p className="text-xs text-gray-500">
              {timeAgo(selectedPin.createdAt)}
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex min-h-[80px] items-center justify-center p-5">
          <p className="text-center text-lg leading-relaxed text-gray-800">
            {selectedPin.message}
          </p>
        </div>

        {/* Actions (only for others' pins, when logged in) */}
        {user && !isOwnPin && (
          <div className="flex border-t border-gray-200">
            <button
              onClick={handleReport}
              className="flex flex-1 items-center justify-center gap-2 p-4 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50"
            >
              <Flag className="h-4 w-4" />
              举报
            </button>
            <div className="w-px bg-gray-200" />
            <button
              onClick={handleBlock}
              className="flex flex-1 items-center justify-center gap-2 p-4 text-sm font-semibold text-orange-500 transition-colors hover:bg-orange-50"
            >
              <Ban className="h-4 w-4" />
              屏蔽用户
            </button>
          </div>
        )}
      </div>
    </>
  );
}
