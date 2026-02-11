'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { useToolbar } from '@/hooks/useToolbar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';

/**
 * ColorPicker — color grid + custom hex input.
 */
export default function ColorPicker() {
  const { activeColor, colorPresets, selectColor } = useToolbar();
  const [customColor, setCustomColor] = useState(activeColor);

  const handleCustomSubmit = () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(customColor)) {
      selectColor(customColor);
    }
  };

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button className="flex h-9 w-9 items-center justify-center rounded-full border border-border shadow-sm transition-colors hover:bg-accent">
              <div
                className="h-5 w-5 rounded-full border border-border"
                style={{ backgroundColor: activeColor }}
              />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Color</TooltipContent>
      </Tooltip>

      <PopoverContent side="bottom" align="start" className="w-72 space-y-3">
        <p className="text-xs font-medium text-muted-foreground">Presets</p>
        <div className="grid grid-cols-6 gap-1.5">
          {colorPresets.map((color) => (
            <button
              key={color}
              onClick={() => {
                selectColor(color);
                setCustomColor(color);
              }}
              className={cn(
                'h-7 w-7 rounded-full border-2 transition-all',
                activeColor === color
                  ? 'border-primary scale-110 shadow-sm'
                  : 'border-transparent hover:border-muted-foreground/30'
              )}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Custom</p>
          <div className="flex gap-2">
            <input
              type="color"
              value={customColor}
              onChange={(e) => {
                setCustomColor(e.target.value);
                selectColor(e.target.value);
              }}
              className="h-9 w-9 cursor-pointer rounded border-0 p-0"
            />
            <Input
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              onBlur={handleCustomSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
              placeholder="#000000"
              className="h-9 flex-1 font-mono text-xs"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
