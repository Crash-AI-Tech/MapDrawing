import { BRUSH_IDS, LEGACY_BRUSH_IDS } from '@niubi/shared';

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
  useLayer?: boolean;
  layerOpacity?: number;
  isSpray?: boolean;
}
/** Live-stroke rendering contract; legacy cases are read-only compatibility. */
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
    case LEGACY_BRUSH_IDS.MARKER:
      return {
        strokeWidth: (size) => size * 3,
        opacity: 1,
        blendMode: 'srcOver',
        strokeCap: 'round',
        strokeJoin: 'round',
        useLayer: true,
        layerOpacity: 0.3,
      };
    case LEGACY_BRUSH_IDS.HIGHLIGHTER:
      return {
        strokeWidth: (size) => size * 2.5,
        opacity: 0.4,
        blendMode: 'multiply',
        strokeCap: 'butt',
        strokeJoin: 'bevel',
      };
    case LEGACY_BRUSH_IDS.SPRAY:
      return {
        strokeWidth: (size) => size,
        opacity: 0.5,
        blendMode: 'srcOver',
        strokeCap: 'round',
        strokeJoin: 'round',
        isSpray: true,
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
