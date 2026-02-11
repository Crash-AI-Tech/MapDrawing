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
    // Row 1: Grayscale
    '#000000', '#2C2C2C', '#555555', '#888888', '#BBBBBB', '#FFFFFF',
    // Row 2: Red → Orange
    '#5C0011', '#A8071A', '#E63946', '#FF4D4F', '#FF7A45', '#FFA940',
    // Row 3: Orange → Yellow
    '#FA8C16', '#FFC53D', '#FFD666', '#FFF1B8', '#FFFBE6', '#FCF6BD',
    // Row 4: Green
    '#135200', '#237804', '#389E0D', '#52C41A', '#73D13D', '#B7EB8F',
    // Row 5: Teal → Cyan
    '#00474F', '#006D75', '#08979C', '#36CFC9', '#5CDBD3', '#B5F5EC',
    // Row 6: Blue
    '#002C8C', '#0050B3', '#1677FF', '#4096FF', '#69B1FF', '#BAE0FF',
    // Row 7: Purple
    '#22075E', '#391085', '#722ED1', '#9254DE', '#B37FEB', '#D3ADF7',
    // Row 8: Pink → Magenta
    '#780650', '#9E1068', '#EB2F96', '#F759AB', '#FF85C0', '#FFD6E7',
    // Row 9: Skin / Earth tones
    '#613400', '#874D00', '#AD8B00', '#D48806', '#F5DEB3', '#FAEBD7',
] as const;

export const DEFAULT_COLOR = '#000000';
export const DEFAULT_SIZE = 3;
export const DEFAULT_OPACITY = 1.0;

/** Maximum brush size across all brush types */
export const MAX_BRUSH_SIZE = 10;

// ========================
// Map Defaults
// ========================

export const MAP_DEFAULT_CENTER: [number, number] = [116.4074, 39.9042]; // Beijing
export const MAP_DEFAULT_ZOOM = 14;
export const MAP_MIN_ZOOM = 1;
export const MAP_MAX_ZOOM = 22;

/** Minimum zoom level required to draw */
export const MIN_DRAW_ZOOM = 18;

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
    '#E63946', '#FF7A45', '#FFC53D', '#52C41A', '#36CFC9',
    '#1677FF', '#722ED1', '#EB2F96', '#333333', '#F5DEB3',
] as const;

// ========================
// Sync Constants
// ========================

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
