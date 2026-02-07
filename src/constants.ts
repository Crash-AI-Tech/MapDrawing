// ========================
// Drawing Tool Constants
// ========================

export const BRUSH_IDS = {
  PENCIL: 'pencil',
  MARKER: 'marker',
  SPRAY: 'spray',
  HIGHLIGHTER: 'highlighter',
  ERASER: 'eraser',
} as const;

export type BrushId = (typeof BRUSH_IDS)[keyof typeof BRUSH_IDS];

// ========================
// Color Presets
// ========================

export const COLOR_PRESETS = [
  // Row 1: Neutrals
  '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF',
  // Row 2: Warm
  '#8B0000', '#E63946', '#FF6B35', '#F4A261', '#FFD166', '#FCF6BD',
  // Row 3: Cool
  '#2D6A4F', '#52B788', '#48CAE4', '#0077B6', '#3A0CA3', '#7209B7',
  // Row 4: Pastel/Vivid
  '#FF85A1', '#FFC8DD', '#BDE0FE', '#A2D2FF', '#CDB4DB', '#CAFFBF',
] as const;

export const DEFAULT_COLOR = '#000000';
export const DEFAULT_SIZE = 3;
export const DEFAULT_OPACITY = 1.0;

/** Maximum brush size across all brush types */
export const MAX_BRUSH_SIZE = 20;

// ========================
// Map Defaults
// ========================

export const MAP_DEFAULT_CENTER: [number, number] = [116.4074, 39.9042]; // Beijing
export const MAP_DEFAULT_ZOOM = 14;
export const MAP_MIN_ZOOM = 1;
export const MAP_MAX_ZOOM = 22;
export const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAPLIBRE_STYLE_URL ||
  'https://tiles.openfreemap.org/styles/liberty';

/** Minimum zoom level required to draw */
export const MIN_DRAW_ZOOM = 16;

/** How many zoom levels below createdZoom before a stroke is hidden */
export const STROKE_HIDE_ZOOM_DIFF = 3;

/** Minimum zoom level to show map pins */
export const MIN_PIN_ZOOM = 20;

/** Ink cost to place a map pin */
export const PIN_INK_COST = 50;

/** Max pin message length */
export const PIN_MAX_MESSAGE_LENGTH = 50;

/** Pin color presets */
export const PIN_COLORS = [
  '#E63946', '#F4A261', '#2D6A4F', '#0077B6', '#7209B7', '#FF85A1',
] as const;

// ========================
// Sync Constants
// ========================

export const DO_WEBSOCKET_URL = process.env.NEXT_PUBLIC_DO_WEBSOCKET_URL || '';
export const SYNC_FLUSH_INTERVAL = 5_000; // ms
export const SYNC_BATCH_SIZE = 100;

// ========================
// Performance
// ========================

export const TILE_SIZE = 512;
export const MAX_UNDO_STACK = 100;
export const VIEWPORT_LOAD_DEBOUNCE = 300; // ms
export const IDLE_TIMEOUT = 30_000; // 30s → observer
export const MAX_ACTIVE_DRAWERS_PER_ROOM = 500;

// ========================
// Rate Limiting
// ========================

export const USER_RATE_LIMIT = { max: 60, windowMs: 1_000 };
export const ROOM_RATE_LIMIT = { max: 2000, windowMs: 1_000 };
