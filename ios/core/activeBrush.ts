import { BRUSH_IDS } from '@niubi/shared';

export type SkStrokeCap = 'butt' | 'round' | 'square';
export type SkStrokeJoin = 'bevel' | 'miter' | 'round';
export type SkBlendMode =
  | 'clear' | 'src' | 'dst' | 'srcOver' | 'dstOver'
  | 'srcIn' | 'dstIn' | 'srcOut' | 'dstOut'
  | 'srcATop' | 'dstATop' | 'xor' | 'plus' | 'modulate'
  | 'screen' | 'overlay' | 'darken' | 'lighten'
  | 'colorDodge' | 'colorBurn' | 'hardLight' | 'softLight'
  | 'difference' | 'exclusion' | 'multiply'
  | 'hue' | 'saturation' | 'color' | 'luminosity';

export interface ActiveBrushConfig {
  strokeWidth: (baseSize: number) => number;
  opacity: number;
  blendMode: SkBlendMode;
  strokeCap: SkStrokeCap;
  strokeJoin: SkStrokeJoin;
}
/** Live-stroke rendering contract for the current protocol. */
export function getActiveBrushConfig(brushId: string): ActiveBrushConfig {
  switch (brushId) {
    case BRUSH_IDS.PENCIL:
      return {
        strokeWidth: (size) => size,
        opacity: 1,
        blendMode: 'srcOver',
        strokeCap: 'round',
        strokeJoin: 'round',
      };
    case BRUSH_IDS.ERASER:
      return {
        strokeWidth: (size) => size * 5,
        opacity: 1,
        blendMode: 'clear',
        strokeCap: 'round',
        strokeJoin: 'round',
      };
    default:
      return {
        strokeWidth: (size) => size,
        opacity: 1,
        blendMode: 'srcOver',
        strokeCap: 'round',
        strokeJoin: 'round',
      };
  }
}
