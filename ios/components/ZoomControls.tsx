/**
 * ZoomControls — floating +/- buttons for map zoom control.
 *
 * Displays current zoom level and provides zoom in/out buttons.
 * Matches web version's MapLibre NavigationControl position (top-left).
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ZoomControlsProps {
  currentZoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export default function ZoomControls({
  currentZoom,
  onZoomIn,
  onZoomOut,
}: ZoomControlsProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.btn} onPress={onZoomIn} activeOpacity={0.7}>
        <MaterialCommunityIcons name="plus" size={20} color="#333" />
      </TouchableOpacity>

      <View style={styles.zoomDisplay}>
        <Text style={styles.zoomText}>{currentZoom.toFixed(1)}</Text>
      </View>

      <TouchableOpacity style={styles.btn} onPress={onZoomOut} activeOpacity={0.7}>
        <MaterialCommunityIcons name="minus" size={20} color="#333" />
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
