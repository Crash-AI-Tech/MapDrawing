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
import { Slider } from '@/components/ui/slider';
import { MIN_OPACITY, OPACITY_STEP, MAX_BRUSH_SIZE } from '@/constants';
import { useI18n } from '@/lib/i18n';

/**
 * ColorPicker — color grid + custom hex input + Size/Opacity sliders.
 * Size and opacity controls were moved here from the old BrushPanel.
 */
export default function ColorPicker() {
  const { activeColor, activeSize, activeOpacity, colorPresets, selectColor, changeSize, changeOpacity } = useToolbar();
  const { t } = useI18n();
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
            <button aria-label={t('brushSettings')} className="flex h-9 w-9 items-center justify-center rounded-full border border-border shadow-sm transition-colors hover:bg-accent">
              <div
                className="h-5 w-5 rounded-full border border-border"
                style={{ backgroundColor: activeColor }}
              />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t('brushSettings')}</TooltipContent>
      </Tooltip>

      <PopoverContent side="bottom" align="start" className="liquid-glass-panel w-72 space-y-3">
        <p className="text-xs font-medium text-muted-foreground">{t('brushPresets')}</p>
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
              aria-label={`${t('brushPresets')} ${color}`}
            />
          ))}
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t('brushCustom')}</p>
          <div className="flex gap-2">
            <input
              type="color"
              value={customColor}
              onChange={(e) => {
                setCustomColor(e.target.value);
                selectColor(e.target.value);
              }}
              className="h-9 w-9 cursor-pointer rounded border-0 p-0"
              aria-label={t('brushCustom')}
            />
            <Input
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              onBlur={handleCustomSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
              placeholder="#000000"
              className="h-9 flex-1 font-mono text-xs"
              aria-label={t('brushCustom')}
            />
          </div>
        </div>

        {/* Size slider */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{t('brushSize')}</span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {activeSize.toFixed(1)}
            </span>
          </div>
          <Slider
            aria-label={t('brushSize')}
            value={[activeSize]}
            onValueChange={([v]) => changeSize(v)}
            min={0.5}
            max={MAX_BRUSH_SIZE}
            step={0.5}
          />
        </div>

        {/* Opacity slider */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{t('brushOpacity')}</span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {Math.round(activeOpacity * 100)}%
            </span>
          </div>
          <Slider
            aria-label={t('brushOpacity')}
            value={[activeOpacity]}
            onValueChange={([v]) => changeOpacity(v)}
            min={MIN_OPACITY}
            max={1}
            step={OPACITY_STEP}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
