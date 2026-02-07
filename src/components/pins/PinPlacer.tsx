'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';
import { PIN_COLORS, PIN_MAX_MESSAGE_LENGTH, PIN_INK_COST } from '@/constants';
import { MapPin, X } from 'lucide-react';

interface PinPlacerProps {
  /** The coordinates where the pin will be placed */
  lng: number;
  lat: number;
  /** Called with the message and color when the user confirms */
  onConfirm: (message: string, color: string) => void;
  /** Called when the user cancels */
  onCancel: () => void;
  /** Current ink level */
  ink: number;
}

/**
 * PinPlacer — floating input panel shown when placing a new map pin.
 * Allows user to type a message (max 50 chars) and pick a color.
 */
export default function PinPlacer({ lng, lat, onConfirm, onCancel, ink }: PinPlacerProps) {
  const [message, setMessage] = useState('');
  const [color, setColor] = useState<string>(PIN_COLORS[0]);
  const canAfford = ink >= PIN_INK_COST;

  return (
    <div className="absolute top-20 left-1/2 z-40 w-80 -translate-x-1/2 rounded-xl border bg-background p-4 shadow-xl">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">放置留言图钉</span>
        </div>
        <button onClick={onCancel} className="rounded p-1 hover:bg-accent">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Message input */}
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value.slice(0, PIN_MAX_MESSAGE_LENGTH))}
        placeholder="写一句话..."
        className="mb-2"
        maxLength={PIN_MAX_MESSAGE_LENGTH}
        autoFocus
      />
      <div className="mb-3 text-right text-[10px] text-muted-foreground">
        {message.length}/{PIN_MAX_MESSAGE_LENGTH}
      </div>

      {/* Color picker */}
      <div className="mb-3">
        <p className="mb-1.5 text-xs text-muted-foreground">图钉颜色</p>
        <div className="flex gap-2">
          {PIN_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn(
                'h-6 w-6 rounded-full border-2 transition-all',
                color === c ? 'border-primary scale-125 shadow-sm' : 'border-transparent'
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Cost notice */}
      <p className={cn('mb-3 text-xs', canAfford ? 'text-muted-foreground' : 'text-red-500 font-medium')}>
        消耗 {PIN_INK_COST} 墨水
        {!canAfford && ' — 墨水不足'}
      </p>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onCancel}>
          取消
        </Button>
        <Button
          size="sm"
          className="flex-1"
          disabled={!message.trim() || !canAfford}
          onClick={() => onConfirm(message.trim(), color)}
        >
          放置
        </Button>
      </div>
    </div>
  );
}
