'use client';

import { useEffect, useRef, memo } from 'react';
import type maplibregl from 'maplibre-gl';
import type { RemoteCursor } from '@/hooks/usePresence';

interface CursorOverlayProps {
  map: maplibregl.Map | null;
  cursors: RemoteCursor[];
}

/**
 * CursorOverlay — renders remote user cursors on the map.
 *
 * Uses MapLibre's `project()` to convert geo coords → screen coords.
 * Re-renders on map move/zoom events via requestAnimationFrame.
 */
function CursorOverlayInner({ map, cursors }: CursorOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const cursorsRef = useRef(cursors);
  cursorsRef.current = cursors;

  useEffect(() => {
    if (!map || !containerRef.current) return;

    function render() {
      const el = containerRef.current;
      if (!el || !map) return;

      const remote = cursorsRef.current;
      // Remove stale DOM nodes
      while (el.children.length > remote.length) {
        el.removeChild(el.lastChild!);
      }
      // Add missing DOM nodes
      while (el.children.length < remote.length) {
        const node = document.createElement('div');
        node.className = 'presence-cursor';
        node.style.position = 'absolute';
        node.style.pointerEvents = 'none';
        node.style.transform = 'translate(-50%, -100%)';
        node.style.willChange = 'left, top';
        node.style.transition = 'left 0.3s ease, top 0.3s ease, opacity 0.3s';

        // Cursor arrow SVG + name label
        node.innerHTML = `
          <svg width="20" height="24" viewBox="0 0 20 24" fill="currentColor" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">
            <path d="M3 1L17 12L10 13L13 22L9 23.5L6 15L3 18Z"/>
          </svg>
          <span style="display:block; margin-top:-2px; padding:1px 6px; border-radius:4px; font-size:11px; white-space:nowrap; color:#fff; font-weight:500; line-height:16px;"></span>
        `;
        el.appendChild(node);
      }

      // Update positions
      for (let i = 0; i < remote.length; i++) {
        const c = remote[i];
        const child = el.children[i] as HTMLDivElement;
        const pos = map.project([c.lng, c.lat]);
        child.style.left = `${pos.x}px`;
        child.style.top = `${pos.y}px`;
        child.style.color = c.color;

        // Update label bg + text
        const label = child.querySelector('span') as HTMLSpanElement;
        if (label) {
          label.style.backgroundColor = c.color;
          label.textContent = c.userName;
        }

        // Fade if stale (>10s)
        const age = Date.now() - c.ts;
        child.style.opacity = age > 10_000 ? '0.4' : '1';
      }
    }

    function onMove() {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(render);
    }

    map.on('move', onMove);
    render();

    return () => {
      map.off('move', onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [map]);

  // Re-render when cursors change
  useEffect(() => {
    if (!map) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = containerRef.current;
      if (!el || !map) return;
      // Trigger render cycle
      const remote = cursorsRef.current;
      while (el.children.length > remote.length) {
        el.removeChild(el.lastChild!);
      }
      while (el.children.length < remote.length) {
        const node = document.createElement('div');
        node.className = 'presence-cursor';
        node.style.position = 'absolute';
        node.style.pointerEvents = 'none';
        node.style.transform = 'translate(-50%, -100%)';
        node.style.willChange = 'left, top';
        node.style.transition = 'left 0.3s ease, top 0.3s ease, opacity 0.3s';
        node.innerHTML = `
          <svg width="20" height="24" viewBox="0 0 20 24" fill="currentColor" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">
            <path d="M3 1L17 12L10 13L13 22L9 23.5L6 15L3 18Z"/>
          </svg>
          <span style="display:block; margin-top:-2px; padding:1px 6px; border-radius:4px; font-size:11px; white-space:nowrap; color:#fff; font-weight:500; line-height:16px;"></span>
        `;
        el.appendChild(node);
      }
      for (let i = 0; i < remote.length; i++) {
        const c = remote[i];
        const child = el.children[i] as HTMLDivElement;
        const pos = map.project([c.lng, c.lat]);
        child.style.left = `${pos.x}px`;
        child.style.top = `${pos.y}px`;
        child.style.color = c.color;
        const label = child.querySelector('span') as HTMLSpanElement;
        if (label) {
          label.style.backgroundColor = c.color;
          label.textContent = c.userName;
        }
        const age = Date.now() - c.ts;
        child.style.opacity = age > 10_000 ? '0.4' : '1';
      }
    });
  }, [cursors, map]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
    />
  );
}

export const CursorOverlay = memo(CursorOverlayInner);
