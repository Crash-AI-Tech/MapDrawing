/**
 * ZoomControls — floating +/- buttons for map zoom control.
 *
 * Displays current zoom level and provides zoom in/out buttons.
 * Supports press-and-drag gesture: drag up = zoom in, drag down = zoom out.
 */

import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, PanResponder } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { PlatformGlassView } from '@/components/ui/PlatformGlassView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang, ts } from '@/lib/i18n';

interface ZoomControlsProps {
  currentZoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  /** Continuous zoom: delta > 0 = zoom in, delta < 0 = zoom out */
  onZoomDelta?: (delta: number) => void;
}

export default function ZoomControls({
  currentZoom,
  onZoomIn,
  onZoomOut,
  onZoomDelta,
}: ZoomControlsProps) {
  const insets = useSafeAreaInsets();
  const [lang] = useLang();
  const lastDeltaRef = useRef(0);
  const isDraggingRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_e, gs) => Math.abs(gs.dy) > 8,
      onPanResponderGrant: () => {
        lastDeltaRef.current = 0;
        isDraggingRef.current = true;
      },
      onPanResponderMove: (_e, gs) => {
        if (!onZoomDelta) return;
        // Every 40px of drag = 1 zoom level. Up = positive delta, down = negative.
        const absDelta = Math.round((-gs.dy / 40) * 10) / 10;
        const increment = absDelta - lastDeltaRef.current;
        if (increment !== 0) {
          onZoomDelta(increment);
          lastDeltaRef.current = absDelta;
        }
      },
      onPanResponderRelease: () => {
        isDraggingRef.current = false;
        lastDeltaRef.current = 0;
      },
    })
  ).current;

  return (
    <PlatformGlassView
      testID="zoom-controls-glass"
      style={[styles.container, { top: insets.top + 8 }]}
      fallbackStyle={styles.containerFallback}
      glassEffectStyle="clear"
      isInteractive
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={styles.btn}
        onPress={onZoomIn}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={ts('zoomInControl', lang)}
      >
        <Feather name="plus" size={18} color="#333" />
      </TouchableOpacity>

      <View style={styles.zoomDisplay}>
        <Text style={styles.zoomText}>{currentZoom.toFixed(1)}</Text>
      </View>

      <TouchableOpacity
        style={styles.btn}
        onPress={onZoomOut}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={ts('zoomOutControl', lang)}
      >
        <Feather name="minus" size={18} color="#333" />
      </TouchableOpacity>
    </PlatformGlassView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 26,
    paddingHorizontal: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
    zIndex: 200,
  },
  containerFallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.76)',
  },
  btn: {
    width: 40,
    height: 40,
    marginHorizontal: 4,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomDisplay: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.62)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  zoomText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
    fontVariant: ['tabular-nums'],
  },
});
