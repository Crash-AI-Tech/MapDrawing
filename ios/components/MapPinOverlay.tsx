
import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  GestureResponderEvent,
} from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { Compliance } from '@/utils/compliance';

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
  pins: PinData[];
  onPinPress: (pinId: string) => void;
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
function truncate(msg: string, max: number = 15): string {
  return msg.length > max ? msg.slice(0, max) + '…' : msg;
}

/**
 * MapPinTooltip - Renders OUTSIDE the MapView as an absolute overlay.
 */
export function MapPinTooltip({
  pin,
  screenX,
  screenY,
  onDismiss,
}: {
  pin: PinData;
  screenX: number;
  screenY: number;
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
        styles.absoluteContainer,
        {
          left: screenX,
          top: screenY,
        },
      ]}
      pointerEvents="box-none"
    >
      {/* 
         Structure:
         The container is at the exact screen coordinate of the pin center.
         We render the dot centered here.
         We render the tooltip above it using absolute positioning.
      */}

      {/* Selected Pin Highlight (White ring) - Centered */}
      <View style={[styles.pinDotSelected, { backgroundColor: pin.color }]} />

      {/* Tooltip bubble - Positioned above */}
      <TouchableOpacity
        activeOpacity={1}
        style={[styles.tooltip]}
        onPress={(e) => e.stopPropagation()}
      >
        <View>
          <Text style={styles.tooltipMessageFull}>{pin.message}</Text>
          <View style={styles.tooltipMeta}>
            <Text style={styles.tooltipAuthor}>{pin.userName || '匿名'}</Text>
            <Text style={styles.tooltipTime}>{timeAgo(pin.createdAt)}</Text>
          </View>
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
        <View style={styles.tooltipArrow} />
      </TouchableOpacity>
    </View>
  );
}

/**
 * MapPinOverlay - Renders INSIDE the MapView.
 * Only responsible for the dots (ShapeSource).
 */
export default function MapPinOverlay({ pins, onPinPress }: MapPinOverlayProps) {
  // Convert pins to GeoJSON FeatureCollection
  const shape = useMemo(() => {
    if (!pins || pins.length === 0) {
      return { type: 'FeatureCollection', features: [] };
    }

    const features = pins.map((pin) => ({
      type: 'Feature',
      id: pin.id,
      properties: {
        id: pin.id,
        color: pin.color,
        message: truncate(pin.message, 10), // Short message for label
      },
      geometry: {
        type: 'Point',
        coordinates: [pin.lng, pin.lat],
      },
    }));

    return {
      type: 'FeatureCollection',
      features,
    };
  }, [pins]);

  const handleLayerPress = useCallback(
    (e: any) => {
      const feature = e.features?.[0];
      if (feature?.properties?.id) {
        onPinPress(feature.properties.id);
      }
    },
    [onPinPress]
  );

  return (
    <MapLibreGL.ShapeSource
      id="pins-source"
      shape={shape as any}
      onPress={handleLayerPress}
      hitbox={{ width: 44, height: 44 }}
    >
      <MapLibreGL.CircleLayer
        id="pins-layer"
        style={{
          circleRadius: 8,
          circleColor: ['get', 'color'],
          circleStrokeWidth: 2,
          circleStrokeColor: '#ffffff',
          circlePitchAlignment: 'map',
        }}
      />
      {/* Label Layer - uses Noto Sans Regular to avoid 404 */}
      <MapLibreGL.SymbolLayer
        id="pins-label"
        style={{
          textField: ['get', 'message'],
          textFont: ['Noto Sans Regular'], // Explicitly set supported font
          textSize: 11,
          textOffset: [0, -2], // Above the dot
          textColor: '#333',
          textHaloColor: '#fff',
          textHaloWidth: 2,
          textAnchor: 'bottom',
          textAllowOverlap: false,
          textIgnorePlacement: false,
        }}
      />
    </MapLibreGL.ShapeSource>
  );
}

const styles = StyleSheet.create({
  // Container for Tooltip (absolute positioning context is the MapScreen)
  absoluteContainer: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100, // Above everything
    overflow: 'visible',
  },

  // --- Tooltip ---
  tooltip: {
    position: 'absolute',
    bottom: 22, // Distance from center anchor (13px radius + 9px spacing)
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    minWidth: 140,
    maxWidth: 240,
    alignSelf: 'center', // Horizontal centering relative to absoluteContainer
  },
  tooltipExpanded: {
    // Shared style
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
    bottom: -6, // Arrow sticks out bottom
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
  // --- Selected Pin Dot (Native View) ---
  pinDotSelected: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    position: 'absolute',
    top: -13, // Center vertically (26/2)
    left: -13, // Center horizontally
  },
});
