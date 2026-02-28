/**
 * DrawingToolbar — enhanced floating toolbar for the drawing screen.
 *
 * Features:
 * - Mode switching (hand / draw / pin)
 * - Brush toggle button (pencil ↔ eraser)
 * - Color picker: 54 preset colors + custom hex input + recent colors
 * - Size / Opacity via Slider controls
 * - Undo / Redo
 * - Ink bar (gradient + numeric value)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  Pressable,
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { MIN_DRAW_ZOOM, MIN_PIN_ZOOM } from '@niubi/shared';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Feather,
  MaterialCommunityIcons,
  Ionicons,
} from '@expo/vector-icons';
import {
  BRUSH_IDS,
  type BrushId,
  COLOR_PRESETS,
  MAX_BRUSH_SIZE,
  MIN_OPACITY,
  OPACITY_STEP,
} from '@niubi/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PanResponder, type GestureResponderEvent } from 'react-native';

const RECENT_COLORS_KEY = 'niubi-recent-colors';
const MAX_RECENT_COLORS = 6;
const REGEN_INTERVAL_S = 18;

// ---------- HSV ↔ Hex helpers ----------
function hexToHsv(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  const s = max === 0 ? 0 : d / max;
  return [h, s, max];
}

function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r1 = 0, g1 = 0, b1 = 0;
  if (h < 60) { r1 = c; g1 = x; }
  else if (h < 120) { r1 = x; g1 = c; }
  else if (h < 180) { g1 = c; b1 = x; }
  else if (h < 240) { g1 = x; b1 = c; }
  else if (h < 300) { r1 = x; b1 = c; }
  else { r1 = c; b1 = x; }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
}

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
  strokesTransparent: boolean;
  onToggleTransparency: () => void;
  syncState?: 'connecting' | 'connected' | 'disconnected' | 'error';
}

const BRUSH_ICONS: Record<string, { lib: 'feather' | 'mci'; name: string }> = {
  [BRUSH_IDS.PENCIL]: { lib: 'feather', name: 'edit-2' },
  [BRUSH_IDS.ERASER]: { lib: 'mci', name: 'eraser' },
} as const;

/** Only these two brushes are supported */
const SUPPORTED_BRUSHES: BrushId[] = [BRUSH_IDS.PENCIL, BRUSH_IDS.ERASER];

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
  strokesTransparent,
  onToggleTransparency,
  syncState = 'connected',
}: DrawingToolbarProps) {
  const [showColorPanel, setShowColorPanel] = useState(false);
  const [customHex, setCustomHex] = useState(currentColor);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [countdown, setCountdown] = useState(REGEN_INTERVAL_S);

  // HSV state for visual color picker
  const [hsv, setHsv] = useState<[number, number, number]>(() => hexToHsv(currentColor));
  const svBoxRef = useRef<View>(null);
  const hueBarRef = useRef<View>(null);
  const SV_SIZE = 230; // width & height of SV area
  const HUE_HEIGHT = 20;

  // Ink recovery countdown
  useEffect(() => {
    if (ink >= maxInk) {
      setCountdown(REGEN_INTERVAL_S);
      return;
    }
    setCountdown(REGEN_INTERVAL_S);
    const timer = setInterval(() => {
      setCountdown((c) => (c <= 1 ? REGEN_INTERVAL_S : c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [ink, maxInk]);

  // Load recent colors on mount
  useEffect(() => {
    AsyncStorage.getItem(RECENT_COLORS_KEY).then((raw) => {
      if (raw) {
        try { setRecentColors(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  const addRecentColor = useCallback((color: string) => {
    setRecentColors((prev) => {
      const next = [color, ...prev.filter((c) => c !== color)].slice(0, MAX_RECENT_COLORS);
      AsyncStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleColorSelect = useCallback((color: string) => {
    onColorSelect(color);
    setCustomHex(color);
    setHsv(hexToHsv(color));
    addRecentColor(color);
  }, [onColorSelect, addRecentColor]);

  const handleCustomHexSubmit = useCallback(() => {
    const hex = customHex.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      handleColorSelect(hex);
    }
  }, [customHex, handleColorSelect]);

  // SV area touch handler
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;
  const onColorSelectRef = useRef(onColorSelect);
  onColorSelectRef.current = onColorSelect;
  const customHexRef = useRef(customHex);
  customHexRef.current = customHex;
  const addRecentColorRef = useRef(addRecentColor);
  addRecentColorRef.current = addRecentColor;

  const svPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        svBoxRef.current?.measure((_x, _y, w, h, px, py) => {
          const s = Math.max(0, Math.min(1, (e.nativeEvent.pageX - px) / w));
          const v = Math.max(0, Math.min(1, 1 - (e.nativeEvent.pageY - py) / h));
          const newHsv: [number, number, number] = [hsvRef.current[0], s, v];
          setHsv(newHsv);
          hsvRef.current = newHsv;
          const hex = hsvToHex(newHsv[0], newHsv[1], newHsv[2]);
          setCustomHex(hex);
          customHexRef.current = hex;
          onColorSelectRef.current(hex);
        });
      },
      onPanResponderMove: (e) => {
        svBoxRef.current?.measure((_x, _y, w, h, px, py) => {
          const s = Math.max(0, Math.min(1, (e.nativeEvent.pageX - px) / w));
          const v = Math.max(0, Math.min(1, 1 - (e.nativeEvent.pageY - py) / h));
          const newHsv: [number, number, number] = [hsvRef.current[0], s, v];
          setHsv(newHsv);
          hsvRef.current = newHsv;
          const hex = hsvToHex(newHsv[0], newHsv[1], newHsv[2]);
          setCustomHex(hex);
          customHexRef.current = hex;
          onColorSelectRef.current(hex);
        });
      },
      onPanResponderRelease: () => { addRecentColorRef.current(customHexRef.current); },
    })
  ).current;

  // Hue bar touch handler
  const huePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        hueBarRef.current?.measure((_x, _y, w, _h, px) => {
          const hue = Math.max(0, Math.min(360, ((e.nativeEvent.pageX - px) / w) * 360));
          const newHsv: [number, number, number] = [hue, hsvRef.current[1], hsvRef.current[2]];
          setHsv(newHsv);
          hsvRef.current = newHsv;
          const hex = hsvToHex(newHsv[0], newHsv[1], newHsv[2]);
          setCustomHex(hex);
          customHexRef.current = hex;
          onColorSelectRef.current(hex);
        });
      },
      onPanResponderMove: (e) => {
        hueBarRef.current?.measure((_x, _y, w, _h, px) => {
          const hue = Math.max(0, Math.min(360, ((e.nativeEvent.pageX - px) / w) * 360));
          const newHsv: [number, number, number] = [hue, hsvRef.current[1], hsvRef.current[2]];
          setHsv(newHsv);
          hsvRef.current = newHsv;
          const hex = hsvToHex(newHsv[0], newHsv[1], newHsv[2]);
          setCustomHex(hex);
          customHexRef.current = hex;
          onColorSelectRef.current(hex);
        });
      },
      onPanResponderRelease: () => { addRecentColorRef.current(customHexRef.current); },
    })
  ).current;

  const Divider = () => <View style={styles.divider} />;

  const toggleColorPanel = () => {
    setShowColorPanel(!showColorPanel);
  };

  const adjustOpacity = (delta: number) => {
    const newOpacity = Math.max(MIN_OPACITY, Math.min(1, currentOpacity + delta));
    onOpacityChange(Math.round(newOpacity * 100) / 100);
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
    setShowColorPanel(false);
  };

  return (
    <>
      {/* Full screen overlay to close panels */}
      {showColorPanel && (
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
              <Ionicons
                name="hand-left-outline"
                size={18}
                color={currentMode === 'hand' ? '#fff' : '#666'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, currentMode === 'pin' && styles.activeBtn]}
              onPress={() => handleModeChange('pin')}
            >
              <Feather
                name="map-pin"
                size={16}
                color={currentMode === 'pin' ? '#fff' : '#666'}
              />
            </TouchableOpacity>
          </View>

          <Divider />

          {/* Group 2: Brush toggle (pencil/eraser) + Color panel */}
          <View style={styles.group}>
            <TouchableOpacity
              style={[
                styles.btn,
                currentMode === 'draw' && currentBrush !== BRUSH_IDS.ERASER && styles.activeBtn, // Highlight pencil if in draw mode
                currentBrush === BRUSH_IDS.ERASER && styles.eraserBtn,
              ]}
              onPress={() => {
                // If not in draw mode, switch to draw
                if (currentMode !== 'draw') {
                  handleModeChange('draw');
                  return;
                }
                // Toggle between pencil and eraser
                onBrushSelect(
                  currentBrush === BRUSH_IDS.ERASER
                    ? BRUSH_IDS.PENCIL
                    : BRUSH_IDS.ERASER
                );
              }}
            >
              {(BRUSH_ICONS[currentBrush]?.lib === 'mci') ? (
                <MaterialCommunityIcons
                  name={BRUSH_ICONS[currentBrush]?.name ?? 'eraser'}
                  size={16}
                  color={(currentMode === 'draw' || currentBrush === BRUSH_IDS.ERASER) ? '#fff' : '#333'}
                />
              ) : (
                <Feather
                  name={(BRUSH_ICONS[currentBrush]?.name ?? 'edit-2') as any}
                  size={16}
                  color={(currentMode === 'draw' || currentBrush === BRUSH_IDS.ERASER) ? '#fff' : '#333'}
                />
              )}
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
              <Feather
                name="rotate-ccw"
                size={16}
                color={!canUndo ? '#ccc' : '#333'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, !canRedo && styles.disabledBtn]}
              onPress={onRedo}
              disabled={!canRedo}
            >
              <Feather
                name="rotate-cw"
                size={16}
                color={!canRedo ? '#ccc' : '#333'}
              />
            </TouchableOpacity>
          </View>

          <Divider />

          {/* Group 4: Transparency toggle */}
          <TouchableOpacity
            style={[styles.btn, strokesTransparent && styles.activeBtn]}
            onPress={onToggleTransparency}
          >
            <Feather
              name={strokesTransparent ? 'eye-off' : 'eye'}
              size={16}
              color={strokesTransparent ? '#fff' : '#333'}
            />
          </TouchableOpacity>
        </View>

        {/* Ink Droplet hovering above toolbar */}
        <View style={styles.inkDropletContainer}>
          <View style={styles.inkDroplet}>
            <MaterialCommunityIcons name="water" size={12} color={inkColor} />
            <Text style={[styles.inkDropletText, { color: inkColor }]}>
              {Math.round(inkPercent * 100)}%
            </Text>
            {ink < maxInk && (
              <Text style={styles.inkCountdown}>
                {countdown}s
              </Text>
            )}
          </View>
          {/* Sync status dot */}
          <View style={[
            styles.syncDot,
            { backgroundColor: syncState === 'connected' ? '#22c55e'
              : syncState === 'connecting' ? '#eab308'
              : '#ef4444' }
          ]} />
        </View>

        {/* ===== Color Panel (bottom sheet style) with custom color, recent, size/opacity sliders ===== */}
        {showColorPanel && (
          <View style={styles.panel}>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
              {/* Recent colors */}
              {recentColors.length > 0 && (
                <>
                  <Text style={styles.panelTitle}>最近使用</Text>
                  <View style={styles.recentRow}>
                    {recentColors.map((color) => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: color },
                          currentColor === color && styles.activeSwatch,
                        ]}
                        onPress={() => handleColorSelect(color)}
                      />
                    ))}
                  </View>
                </>
              )}

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
                    onPress={() => handleColorSelect(color)}
                  />
                ))}
              </View>

              {/* Visual HSV color picker */}
              <Text style={styles.panelTitle}>自定义</Text>
              {/* SV gradient area */}
              <View
                ref={svBoxRef}
                style={{ width: SV_SIZE, height: SV_SIZE * 0.65, borderRadius: 8, overflow: 'hidden', alignSelf: 'center' }}
                {...svPanResponder.panHandlers}
              >
                {/* Base hue */}
                <View style={{ position: 'absolute', inset: 0, backgroundColor: hsvToHex(hsv[0], 1, 1) }} />
                {/* White → transparent (saturation) */}
                <View style={{ position: 'absolute', inset: 0, backgroundColor: 'white', opacity: 1 }}>
                  <View style={{
                    flex: 1,
                    background: undefined,
                    // Use linear gradient via React Native styling workaround
                  }} />
                </View>
                {/* Saturation gradient left-to-right: white → pure hue */}
                <View style={{
                  position: 'absolute', inset: 0,
                  backgroundColor: 'transparent',
                  borderRadius: 8,
                  // We simulate the SV gradient with two overlapping semi-transparent views
                }} />
                {/* White-to-transparent horizontal */}
                <View style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: 'white',
                  opacity: 1 - Math.max(0.01, hsv[1]) * 0, // always show white layer
                }} />
                {/* Actual SV rendering: use background image approach via absolute colored layers */}
                {/* Layer 1: Hue base */}
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: hsvToHex(hsv[0], 1, 1) }} />
                {/* Layer 2: White-to-transparent (left to right = low to high saturation) */}
                {Array.from({ length: 20 }, (_, i) => (
                  <View key={`s${i}`} style={{
                    position: 'absolute',
                    top: 0, bottom: 0,
                    left: `${i * 5}%` as any,
                    width: '5%',
                    backgroundColor: `rgba(255,255,255,${1 - i / 19})`,
                  }} />
                ))}
                {/* Layer 3: Black-to-transparent (bottom to top = low to high value) */}
                {Array.from({ length: 20 }, (_, i) => (
                  <View key={`v${i}`} style={{
                    position: 'absolute',
                    left: 0, right: 0,
                    top: `${i * 5}%` as any,
                    height: '5%',
                    backgroundColor: `rgba(0,0,0,${i / 19})`,
                  }} />
                ))}
                {/* Picker cursor */}
                <View style={{
                  position: 'absolute',
                  left: hsv[1] * SV_SIZE - 8,
                  top: (1 - hsv[2]) * SV_SIZE * 0.65 - 8,
                  width: 16, height: 16, borderRadius: 8,
                  borderWidth: 2, borderColor: '#fff',
                  backgroundColor: customHex,
                  shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 2,
                }} />
              </View>

              {/* Hue bar */}
              <View
                ref={hueBarRef}
                style={{
                  width: SV_SIZE, height: HUE_HEIGHT, borderRadius: 10,
                  overflow: 'hidden', marginTop: 8, alignSelf: 'center',
                  flexDirection: 'row',
                }}
                {...huePanResponder.panHandlers}
              >
                {Array.from({ length: 36 }, (_, i) => (
                  <View key={`h${i}`} style={{
                    flex: 1,
                    backgroundColor: hsvToHex(i * 10, 1, 1),
                  }} />
                ))}
                {/* Hue cursor */}
                <View style={{
                  position: 'absolute',
                  left: (hsv[0] / 360) * SV_SIZE - 6,
                  top: -2,
                  width: 12, height: HUE_HEIGHT + 4, borderRadius: 6,
                  borderWidth: 2, borderColor: '#fff',
                  backgroundColor: hsvToHex(hsv[0], 1, 1),
                  shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 2,
                }} />
              </View>

              {/* Hex input + preview */}
              <View style={styles.customColorRow}>
                <View style={[styles.customColorPreview, { backgroundColor: customHex }]} />
                <TextInput
                  style={styles.hexInput}
                  value={customHex}
                  onChangeText={setCustomHex}
                  onSubmitEditing={handleCustomHexSubmit}
                  onBlur={handleCustomHexSubmit}
                  placeholder="#000000"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={7}
                />
              </View>

              {/* Size slider */}
              <View style={styles.sliderRow}>
                <Text style={styles.sliderLabel}>大小</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0.5}
                  maximumValue={MAX_BRUSH_SIZE}
                  step={0.5}
                  value={currentSize}
                  onValueChange={onSizeChange}
                  minimumTrackTintColor="#7c3aed"
                  maximumTrackTintColor="#e5e5e5"
                  thumbTintColor="#7c3aed"
                />
                <Text style={styles.sliderValue}>{currentSize.toFixed(1)}</Text>
              </View>

              {/* Opacity slider */}
              <View style={styles.sliderRow}>
                <Text style={styles.sliderLabel}>透明度</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={MIN_OPACITY}
                  maximumValue={1}
                  step={OPACITY_STEP}
                  value={currentOpacity}
                  onValueChange={(v: number) => onOpacityChange(Math.round(v * 100) / 100)}
                  minimumTrackTintColor="#7c3aed"
                  maximumTrackTintColor="#e5e5e5"
                  thumbTintColor="#7c3aed"
                />
                <Text style={styles.sliderValue}>{Math.round(currentOpacity * 100)}%</Text>
              </View>
            </ScrollView>
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
  eraserBtn: {
    backgroundColor: '#f97316',
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

  // Ink Droplet (Glassmorphism badge)
  inkDropletContainer: {
    position: 'absolute',
    top: -28, // Hover above the toolbar
    left: '50%',
    transform: [{ translateX: -24 }], // Center horizontally (half of width 48)
    alignItems: 'center',
  },
  inkDroplet: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    gap: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  inkDropletText: {
    fontSize: 10,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  inkCountdown: {
    fontSize: 8,
    fontWeight: '600',
    color: '#999',
    fontVariant: ['tabular-nums'],
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 4,
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
    width: 290,
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
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

  // Recent colors row
  recentRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },

  // Custom color input
  customColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 8,
  },
  customColorPreview: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  hexInput: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    paddingHorizontal: 10,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#333',
    backgroundColor: '#f9fafb',
  },

  // Slider controls
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 4,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    width: 46,
  },
  slider: {
    flex: 1,
    height: 28,
  },
  sliderValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    minWidth: 38,
    textAlign: 'right',
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
