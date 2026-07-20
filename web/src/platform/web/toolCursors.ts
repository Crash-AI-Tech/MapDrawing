function svgCursor(svg: string, hotspotX: number, hotspotY: number, fallback: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotspotX} ${hotspotY}, ${fallback}`;
}

/** Pencil-shaped cursor used by the canvas that captures drawing input. */
export function pencilToolCursor(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><path d="M20.3 2.8a3.1 3.1 0 0 1 4.4 4.4L9 22.9 2.8 25.2 5.1 19Z" fill="#374151" stroke="white" stroke-width="3" stroke-linejoin="round"/><path d="m17.8 5.3 4.9 4.9" fill="none" stroke="#f8fafc" stroke-width="1.5"/><path d="m5.1 19 3.9 3.9-6.2 2.3Z" fill="#f59e0b" stroke="#374151" stroke-width="1" stroke-linejoin="round"/></svg>`;
  return svgCursor(svg, 3, 25, 'crosshair');
}

/** Eraser-shaped cursor with its lower-right edge as the active erase point. */
export function eraserToolCursor(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><g transform="rotate(-45 14 14)"><rect x="7" y="2" width="14" height="24" rx="3" fill="white" stroke="white" stroke-width="4"/><rect x="7" y="2" width="14" height="24" rx="3" fill="#fb7185" stroke="#374151" stroke-width="1.5"/><path d="M7 16.5h14v6.5a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3Z" fill="#f8fafc"/><path d="M7 16.5h14" stroke="#374151" stroke-width="1.5"/></g></svg>`;
  return svgCursor(svg, 23, 23, 'crosshair');
}
