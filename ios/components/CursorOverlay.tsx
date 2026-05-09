/**
 * CursorOverlay — renders remote user cursors on the map.
 *
 * Uses MercatorProjection.geoToScreen() to convert geo coords → screen coords.
 * Re-renders when cameraState or cursors change.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MercatorProjection } from '@/core/MercatorProjection';
import type { RemoteCursor } from '@/hooks/usePresence';

interface CursorOverlayProps {
  projection: MercatorProjection;
  cursors: RemoteCursor[];
}

function CursorOverlayInner({ projection, cursors }: CursorOverlayProps) {
  if (cursors.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {cursors.map((c) => {
        const pos = projection.geoToScreen(c.lng, c.lat);
        const age = Date.now() - c.ts;
        const opacity = age > 10_000 ? 0.4 : 1;

        return (
          <View
            key={c.userId}
            style={[
              styles.cursor,
              {
                left: pos.x - 6,
                top: pos.y - 6,
                opacity,
              },
            ]}
          >
            {/* Colored dot */}
            <View
              style={[
                styles.dot,
                { backgroundColor: c.color, shadowColor: c.color },
              ]}
            />
            {/* Name label */}
            <View style={[styles.label, { backgroundColor: c.color }]}>
              <Text style={styles.labelText} numberOfLines={1}>
                {c.userName}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    overflow: 'hidden',
  },
  cursor: {
    position: 'absolute',
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 3,
  },
  label: {
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    alignSelf: 'center',
  },
  labelText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500',
    lineHeight: 16,
  },
});

export const CursorOverlay = memo(CursorOverlayInner);
