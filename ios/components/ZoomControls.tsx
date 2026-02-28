/**
 * ZoomControls — floating +/- buttons for map zoom control.
 *
 * Displays current zoom level and provides zoom in/out buttons.
 * Supports press-and-drag gesture: drag up = zoom in, drag down = zoom out.
 */

import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, PanResponder } from 'react-native';
import { Feather } from '@expo/vector-icons';

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
  const startYRef = useRef(0);
  const lastZoomRef = useRef(currentZoom);
  const isDraggingRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_e, gs) => Math.abs(gs.dy) > 8,
      onPanResponderGrant: (e) => {
        startYRef.current = e.nativeEvent.pageY;
        lastZoomRef.current = 0;
        isDraggingRef.current = true;
      },
      onPanResponderMove: (_e, gs) => {
        if (!onZoomDelta) return;
        // Every 30px of drag = 1 zoom level. Up = positive delta, down = negative.
        const delta = -gs.dy / 30;
        const rounded = Math.round(delta * 10) / 10;
        if (rounded !== lastZoomRef.current) {
          onZoomDelta(rounded - lastZoomRef.current);
          lastZoomRef.current = rounded;
        }
      },
      onPanResponderRelease: () => {
        isDraggingRef.current = false;
      },
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <TouchableOpacity style={styles.btn} onPress={onZoomIn} activeOpacity={0.7}>
        <Feather name="plus" size={18} color="#333" />
      </TouchableOpacity>

      <View style={styles.zoomDisplay}>
        <Text style={styles.zoomText}>{currentZoom.toFixed(1)}</Text>
      </View>

      <TouchableOpacity style={styles.btn} onPress={onZoomOut} activeOpacity={0.7}>
        <Feather name="minus" size={18} color="#333" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
    zIndex: 200,
  },
  btn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomDisplay: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
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
