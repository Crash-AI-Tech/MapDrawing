/**
 * MapPinOverlay — renders pin markers on a View layer ABOVE the Skia canvas.
 *
 * Converts geo coordinates → screen positions using MercatorProjection.
 * Each pin shows:
 *   - A colored circle/pin icon
 *   - A small tooltip bubble above with truncated message
 *   - Tapping expands the bubble to show full details + Report / Block User
 *
 * This replaces the previous ShapeSource + CircleLayer approach so that
 * pins render above the Skia drawing overlay.
 */

import React, { useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  type LayoutChangeEvent,
} from 'react-native';
import { Compliance } from '@/utils/compliance';
import type { MercatorProjection } from '@/core/MercatorProjection';
import type { CameraState } from '@/core/types';

export interface PinData {
  id: string;
  userId: string;
  userName: string;
  lng: number;
  lat: number;
  message: string;
  color: string;
  createdAt: number;
}

interface MapPinOverlayProps {
  /** Array of visible pins */
  pins: PinData[];
  /** Projection for geo → screen conversion */
  projection: MercatorProjection;
  /** Current camera for dependency tracking */
  cameraState: CameraState;
  /** Screen dimensions */
  screenWidth: number;
  screenHeight: number;
}

/** Format relative time */
function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

/** Truncate message for preview */
function truncate(msg: string, max: number = 10): string {
  return msg.length > max ? msg.slice(0, max) + '…' : msg;
}

// Max pins to render for performance
const MAX_VISIBLE_PINS = 60;

/**
 * Individual pin marker with expandable callout
 */
function PinMarker({
  pin,
  screenX,
  screenY,
  expanded,
  onPress,
  onDismiss,
}: {
  pin: PinData;
  screenX: number;
  screenY: number;
  expanded: boolean;
  onPress: () => void;
  onDismiss: () => void;
}) {
  const handleReport = useCallback(() => {
    Compliance.reportContent(pin.id, 'pin', 'Inappropriate content');
    onDismiss();
  }, [pin.id, onDismiss]);

  const handleBlockUser = useCallback(() => {
    Compliance.blockUser(pin.userId);
    onDismiss();
  }, [pin.userId, onDismiss]);

  return (
    <View
      style={[
        styles.pinContainer,
        {
          left: screenX,
          top: screenY,
          // Anchor at bottom-center: offset left by half width, up by full height
          transform: [{ translateX: -14 }, { translateY: -48 }],
        },
      ]}
      pointerEvents="box-none"
    >
      {/* Tooltip bubble */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={[styles.tooltip, expanded && styles.tooltipExpanded]}
      >
        {expanded ? (
          <View>
            {/* Full message */}
            <Text style={styles.tooltipMessageFull}>{pin.message}</Text>
            {/* Meta: author + time */}
            <View style={styles.tooltipMeta}>
              <Text style={styles.tooltipAuthor}>{pin.userName || '匿名'}</Text>
              <Text style={styles.tooltipTime}>{timeAgo(pin.createdAt)}</Text>
            </View>
            {/* Actions */}
            <View style={styles.tooltipActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleReport}>
                <Text style={styles.actionReport}>🚩 Report</Text>
              </TouchableOpacity>
              <View style={styles.actionDivider} />
              <TouchableOpacity style={styles.actionBtn} onPress={handleBlockUser}>
                <Text style={styles.actionBlock}>🚫 Block</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={styles.tooltipText} numberOfLines={1}>
            {truncate(pin.message)}
          </Text>
        )}
        {/* Arrow */}
        <View style={styles.tooltipArrow} />
      </TouchableOpacity>

      {/* Pin icon */}
      <View style={[styles.pinDot, { backgroundColor: pin.color }]} />
    </View>
  );
}

/**
 * Overlay that renders all visible pins above the Skia canvas.
 */
export default function MapPinOverlay({
  pins,
  projection,
  cameraState,
  screenWidth,
  screenHeight,
}: MapPinOverlayProps) {
  const [expandedPinId, setExpandedPinId] = useState<string | null>(null);

  // Convert pins to screen positions, filter off-screen
  const visiblePins = useMemo(() => {
    const margin = 60; // px margin outside screen to keep partially visible pins
    const result: { pin: PinData; x: number; y: number }[] = [];

    for (const pin of pins) {
      const pos = projection.geoToScreen(pin.lng, pin.lat);
      if (
        pos.x >= -margin &&
        pos.x <= screenWidth + margin &&
        pos.y >= -margin &&
        pos.y <= screenHeight + margin
      ) {
        result.push({ pin, x: pos.x, y: pos.y });
      }
      if (result.length >= MAX_VISIBLE_PINS) break;
    }
    return result;
    // Re-compute when camera or pins change
  }, [pins, projection, cameraState.center, cameraState.zoom, cameraState.bearing, screenWidth, screenHeight]);

  const handlePinPress = useCallback((pinId: string) => {
    setExpandedPinId((prev) => (prev === pinId ? null : pinId));
  }, []);

  const handleDismiss = useCallback(() => {
    setExpandedPinId(null);
  }, []);

  if (visiblePins.length === 0) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Tap background to dismiss expanded pin */}
      {expandedPinId && (
        <TouchableWithoutFeedback onPress={handleDismiss}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
      )}
      {visiblePins.map(({ pin, x, y }) => (
        <PinMarker
          key={pin.id}
          pin={pin}
          screenX={x}
          screenY={y}
          expanded={expandedPinId === pin.id}
          onPress={() => handlePinPress(pin.id)}
          onDismiss={handleDismiss}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 15, // Above Skia canvas (10) but below UI controls (200)
  },
  pinContainer: {
    position: 'absolute',
    alignItems: 'center',
    width: 28,
  },
  // --- Tooltip ---
  tooltip: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    maxWidth: 120,
    alignSelf: 'center',
  },
  tooltipExpanded: {
    maxWidth: 200,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tooltipText: {
    fontSize: 11,
    lineHeight: 16,
    color: '#333',
  },
  tooltipMessageFull: {
    fontSize: 13,
    lineHeight: 18,
    color: '#222',
    marginBottom: 6,
  },
  tooltipMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tooltipAuthor: {
    fontSize: 10,
    color: '#999',
  },
  tooltipTime: {
    fontSize: 10,
    color: '#999',
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -5,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fff',
  },
  tooltipActions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
    paddingTop: 6,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  actionDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#eee',
  },
  actionReport: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF3B30',
  },
  actionBlock: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF9500',
  },
  // --- Pin dot ---
  pinDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2.5,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
