/**
 * DrawingToolbar — enhanced floating toolbar for the drawing screen.
 *
 * Matches the web version's feature set:
 * - Mode switching (hand / draw / pin)
 * - Brush type selection (5 types)
 * - Color picker (54 preset colors)
 * - Brush size control (+/- stepper with value display)
 * - Opacity control (+/- stepper)
 * - Undo / Redo
 * - Ink bar (gradient + numeric value)
 * - Zoom level display
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,

  Pressable,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import { MIN_DRAW_ZOOM, MIN_PIN_ZOOM } from '@niubi/shared';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  FontAwesome5,
  MaterialCommunityIcons,
  MaterialIcons,
} from '@expo/vector-icons';
import {
  BRUSH_IDS,
  type BrushId,
  COLOR_PRESETS,
  MAX_BRUSH_SIZE,
} from '@niubi/shared';

interface DrawingToolbarProps {
  currentMode: 'hand' | 'draw' | 'pin';
  onModeChange: (mode: 'hand' | 'draw' | 'pin') => void;
  currentColor: string;
  onColorSelect: (color: string) => void;
  currentBrush: BrushId;
  onBrushSelect: (brush: BrushId) => void;
  currentSize: number;
  onSizeChange: (size: number) => void;
  currentOpacity: number;
  onOpacityChange: (opacity: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  ink: number;
  maxInk: number;
  currentZoom: number;
}

const BRUSH_ICONS: Record<BrushId, string> = {
  [BRUSH_IDS.PENCIL]: 'pencil-alt',
  [BRUSH_IDS.MARKER]: 'marker',
  [BRUSH_IDS.SPRAY]: 'spray-can',
  [BRUSH_IDS.HIGHLIGHTER]: 'highlighter',
  [BRUSH_IDS.ERASER]: 'eraser',
} as const;

export default function DrawingToolbar({
  currentMode,
  onModeChange,
  currentColor,
  onColorSelect,
  currentBrush,
  onBrushSelect,
  currentSize,
  onSizeChange,
  currentOpacity,
  onOpacityChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  ink,
  maxInk,
  currentZoom,
}: DrawingToolbarProps) {
  const [showBrushPanel, setShowBrushPanel] = useState(false);
  const [showColorPanel, setShowColorPanel] = useState(false);

  const Divider = () => <View style={styles.divider} />;

  const toggleBrushPanel = () => {
    setShowBrushPanel(!showBrushPanel);
    setShowColorPanel(false);
  };

  const toggleColorPanel = () => {
    setShowColorPanel(!showColorPanel);
    setShowBrushPanel(false);
  };

  const adjustSize = (delta: number) => {
    const newSize = Math.max(0.5, Math.min(MAX_BRUSH_SIZE, currentSize + delta));
    onSizeChange(newSize);
  };

  const adjustOpacity = (delta: number) => {
    const newOpacity = Math.max(0.1, Math.min(1, currentOpacity + delta));
    onOpacityChange(Math.round(newOpacity * 10) / 10);
  };

  // Ink bar color: green → yellow → red
  const inkPercent = Math.max(0, Math.min(1, ink / maxInk));
  const inkColor =
    inkPercent > 0.5
      ? '#22c55e'
      : inkPercent > 0.2
        ? '#eab308'
        : '#ef4444';

  const handleModeChange = (newMode: 'hand' | 'draw' | 'pin') => {
    if (newMode === 'draw') {
      if (currentZoom < MIN_DRAW_ZOOM) {
        Alert.alert('Cannot Draw', `Please zoom in to level ${MIN_DRAW_ZOOM} or higher to draw.`);
        return;
      }
    } else if (newMode === 'pin') {
      if (currentZoom < MIN_PIN_ZOOM) {
        Alert.alert('Cannot Place Pin', `Please zoom in to level ${MIN_PIN_ZOOM} or higher to place a pin.`);
        return;
      }
    }
    onModeChange(newMode);
  };

  const closePanels = () => {
    setShowBrushPanel(false);
    setShowColorPanel(false);
  };

  return (
    <>
      {/* Full screen overlay to close panels */}
      {(showBrushPanel || showColorPanel) && (
        <Pressable style={styles.overlay} onPress={closePanels} />
      )}

      <SafeAreaView style={styles.safeArea} edges={['bottom']} pointerEvents="box-none">
        {/* Brush Panel */}
        <View style={styles.container}>
          {/* Group 1: Modes */}
          <View style={styles.group}>
            <TouchableOpacity
              style={[styles.btn, currentMode === 'hand' && styles.activeBtn]}
              onPress={() => handleModeChange('hand')}
            >
              <MaterialIcons
                name="pan-tool"
                size={18}
                color={currentMode === 'hand' ? '#fff' : '#666'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, currentMode === 'draw' && styles.activeBtn]}
              onPress={() => handleModeChange('draw')}
            >
              <MaterialCommunityIcons
                name="pencil"
                size={18}
                color={currentMode === 'draw' ? '#fff' : '#666'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, currentMode === 'pin' && styles.activeBtn]}
              onPress={() => handleModeChange('pin')}
            >
              <MaterialCommunityIcons
                name="map-marker"
                size={18}
                color={currentMode === 'pin' ? '#fff' : '#666'}
              />
            </TouchableOpacity>
          </View>

          <Divider />

          {/* Group 2: Tools (Brush / Color) */}
          <View style={styles.group}>
            <TouchableOpacity
              style={[styles.btn, showBrushPanel && styles.activePanelBtn]}
              onPress={toggleBrushPanel}
            >
              <FontAwesome5
                name={BRUSH_ICONS[currentBrush]}
                size={14}
                color="#333"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, showColorPanel && styles.activePanelBtn]}
              onPress={toggleColorPanel}
            >
              <View
                style={[styles.colorDot, { backgroundColor: currentColor }]}
              />
            </TouchableOpacity>
          </View>

          <Divider />

          {/* Group 3: Undo / Redo */}
          <View style={styles.group}>
            <TouchableOpacity
              style={[styles.btn, !canUndo && styles.disabledBtn]}
              onPress={onUndo}
              disabled={!canUndo}
            >
              <MaterialCommunityIcons
                name="undo"
                size={18}
                color={!canUndo ? '#ccc' : '#333'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, !canRedo && styles.disabledBtn]}
              onPress={onRedo}
              disabled={!canRedo}
            >
              <MaterialCommunityIcons
                name="redo"
                size={18}
                color={!canRedo ? '#ccc' : '#333'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ===== Ink Bar ===== */}
        <View style={styles.inkBarContainer}>
          <View style={styles.inkBarTrack}>
            <View
              style={[
                styles.inkBarFill,
                {
                  width: `${inkPercent * 100}%`,
                  backgroundColor: inkColor,
                },
              ]}
            />
          </View>
          <Text style={[styles.inkBarText, { color: inkColor }]}>
            {ink.toFixed(1)}
          </Text>
        </View>

        {/* ===== Brush Panel (floating) ===== */}
        {showBrushPanel && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>画笔</Text>
            <View style={styles.grid}>
              {(Object.values(BRUSH_IDS) as BrushId[]).map((brush) => (
                <TouchableOpacity
                  key={brush}
                  style={[
                    styles.panelBtn,
                    currentBrush === brush && styles.activePanelItem,
                  ]}
                  onPress={() => {
                    onBrushSelect(brush);
                    setShowBrushPanel(false);
                  }}
                >
                  <FontAwesome5
                    name={BRUSH_ICONS[brush]}
                    size={18}
                    color={currentBrush === brush ? '#7c3aed' : '#666'}
                  />
                  <Text
                    style={[
                      styles.panelLabel,
                      currentBrush === brush && styles.activeLabel,
                    ]}
                  >
                    {brush.charAt(0).toUpperCase() + brush.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Size stepper */}
            <View style={styles.stepperRow}>
              <Text style={styles.stepperLabel}>大小</Text>
              <View style={styles.stepper}>
                <Pressable
                  style={styles.stepperBtn}
                  onPress={() => adjustSize(-0.5)}
                >
                  <Text style={styles.stepperBtnText}>−</Text>
                </Pressable>
                <Text style={styles.stepperValue}>
                  {currentSize.toFixed(1)}
                </Text>
                <Pressable
                  style={styles.stepperBtn}
                  onPress={() => adjustSize(0.5)}
                >
                  <Text style={styles.stepperBtnText}>+</Text>
                </Pressable>
              </View>
            </View>

            {/* Opacity stepper */}
            <View style={styles.stepperRow}>
              <Text style={styles.stepperLabel}>透明度</Text>
              <View style={styles.stepper}>
                <Pressable
                  style={styles.stepperBtn}
                  onPress={() => adjustOpacity(-0.1)}
                >
                  <Text style={styles.stepperBtnText}>−</Text>
                </Pressable>
                <Text style={styles.stepperValue}>
                  {Math.round(currentOpacity * 100)}%
                </Text>
                <Pressable
                  style={styles.stepperBtn}
                  onPress={() => adjustOpacity(0.1)}
                >
                  <Text style={styles.stepperBtnText}>+</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* ===== Color Panel (floating) ===== */}
        {showColorPanel && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>颜色</Text>
            <View style={styles.colorGrid}>
              {COLOR_PRESETS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    currentColor === color && styles.activeSwatch,
                  ]}
                  onPress={() => {
                    onColorSelect(color);
                    setShowColorPanel(false);
                  }}
                />
              ))}
            </View>
          </View>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: -Dimensions.get('window').height, // Cover entire screen
    left: 0,
    right: 0,
    bottom: 0,
    height: Dimensions.get('window').height * 2, // Ensure coverage
    zIndex: 90, // Below toolbar zIndex (assuming toolbar is high) but above map
    backgroundColor: 'transparent',
  },
  safeArea: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100, // Ensure toolbar is above overlay
  },
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 6,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: '#e5e5e5',
    marginHorizontal: 2,
  },
  btn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeBtn: {
    backgroundColor: '#7c3aed',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  activePanelBtn: {
    backgroundColor: '#f3f4f6',
  },
  disabledBtn: {
    opacity: 0.4,
  },
  colorDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },

  // Ink bar
  inkBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  inkBarTrack: {
    width: 100,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  inkBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  inkBarText: {
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Panels
  panel: {
    position: 'absolute',
    bottom: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    width: 280,
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  panelBtn: {
    width: '30%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#eee',
  },
  activePanelItem: {
    borderColor: '#7c3aed',
    backgroundColor: '#7c3aed10',
  },
  panelLabel: {
    fontSize: 9,
    marginTop: 3,
    color: '#666',
  },
  activeLabel: {
    color: '#7c3aed',
    fontWeight: '600',
  },

  // Stepper controls
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  stepperLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  stepperBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    lineHeight: 18,
  },
  stepperValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    minWidth: 36,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },

  // Color grid
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  colorSwatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  activeSwatch: {
    borderWidth: 2,
    borderColor: '#000',
    transform: [{ scale: 1.1 }],
  },
});
