'use client';

import { MapPin as MapPinType } from '@/stores/pinStore';
import { X } from 'lucide-react';

interface PinPopupProps {
  pin: MapPinType;
  onClose: () => void;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

/**
 * PinPopup — shown when an existing map pin is clicked.
 * Displays the message, user name, and relative time.
 */
export default function PinPopup({ pin, onClose }: PinPopupProps) {
  return (
    <div className="absolute top-20 left-1/2 z-40 w-72 -translate-x-1/2 rounded-xl border bg-background p-4 shadow-xl">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: pin.color }}
        />
        <button onClick={onClose} className="rounded p-1 hover:bg-accent">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Message */}
      <p className="mb-3 text-sm leading-relaxed break-words">{pin.message}</p>

      {/* Meta */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{pin.userName || '匿名'}</span>
        <span>{timeAgo(pin.createdAt)}</span>
      </div>
    </div>
  );
}
