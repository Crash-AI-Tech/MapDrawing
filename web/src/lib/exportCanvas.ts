/**
 * exportCanvas — merges map tiles + drawing overlay into a single image.
 */

/**
 * Capture the current view (map + drawings) as a Blob.
 * @param mapCanvas - The MapLibre GL canvas (WebGL)
 * @param compositeCanvas - The drawing composite canvas (2D)
 * @param format - Image format ('image/png' or 'image/jpeg')
 * @param quality - JPEG quality (0-1), ignored for PNG
 */
export async function captureCanvasBlob(
  mapCanvas: HTMLCanvasElement,
  compositeCanvas: HTMLCanvasElement,
  format: 'image/png' | 'image/jpeg' = 'image/png',
  quality = 0.92
): Promise<Blob> {
  const width = mapCanvas.width;
  const height = mapCanvas.height;

  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext('2d');
  if (!ctx) throw new Error('Failed to create offscreen canvas context');

  // Layer 1: Map tiles (WebGL canvas — must use drawImage directly)
  ctx.drawImage(mapCanvas, 0, 0);

  // Layer 2: Drawing overlay
  ctx.drawImage(compositeCanvas, 0, 0);

  return new Promise<Blob>((resolve, reject) => {
    offscreen.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob returned null'));
      },
      format,
      quality
    );
  });
}

/**
 * Download a Blob as a file.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  // Clean up after a short delay to ensure download starts
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 100);
}

/**
 * Copy a Blob to clipboard as an image.
 */
export async function copyBlobToClipboard(blob: Blob): Promise<void> {
  if (!navigator.clipboard?.write) {
    throw new Error('Clipboard API not available');
  }
  const item = new ClipboardItem({ [blob.type]: blob });
  await navigator.clipboard.write([item]);
}

/**
 * Generate a timestamped filename for export.
 */
export function generateExportFilename(format: 'png' | 'jpeg' = 'png'): string {
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `drawmap-${ts}.${format}`;
}
