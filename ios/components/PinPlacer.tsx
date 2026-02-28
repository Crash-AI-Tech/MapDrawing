/**
 * PinPlacer — floating panel for creating a map pin.
 *
 * Shows when user taps the map in pin mode.
 * Contains: message input, color picker, place button, cancel button.
 * Matches web version's PinPlacer behavior.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
} from 'react-native';
import { PIN_COLORS, PIN_MAX_MESSAGE_LENGTH, PIN_INK_COST } from '@niubi/shared';
import { useLang, ts, tf } from '@/lib/i18n';

// ---------- HSV ↔ Hex helpers ----------
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

interface PinPlacerProps {
  /** Coordinates where the user tapped */
  coordinates: { lng: number; lat: number };
  /** Called when user confirms pin placement */
  onPlace: (data: { message: string; color: string }) => void;
  /** Called when user cancels */
  onCancel: () => void;
  /** Whether the place request is in progress */
  loading?: boolean;
}

export default function PinPlacer({
  coordinates,
  onPlace,
  onCancel,
  loading = false,
}: PinPlacerProps) {
  const [lang] = useLang();
  const [message, setMessage] = useState('');
  const [color, setColor] = useState<string>(PIN_COLORS[0]);
  const [showCustom, setShowCustom] = useState(false);
  const [hue, setHue] = useState(0);
  const [customHex, setCustomHex] = useState('#FF6600');
  const hueBarRef = useRef<View>(null);

  const huePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        hueBarRef.current?.measure((_x, _y, w, _h, px) => {
          const h = Math.max(0, Math.min(360, ((e.nativeEvent.pageX - px) / w) * 360));
          // eslint-disable-next-line react-compiler/react-compiler
          hueRef.current = h;
          const hex = hsvToHex(h, 1, 1);
          setHue(h);
          setCustomHex(hex);
          setColor(hex);
        });
      },
      onPanResponderMove: (e) => {
        hueBarRef.current?.measure((_x, _y, w, _h, px) => {
          const h = Math.max(0, Math.min(360, ((e.nativeEvent.pageX - px) / w) * 360));
          hueRef.current = h;
          const hex = hsvToHex(h, 1, 1);
          setHue(h);
          setCustomHex(hex);
          setColor(hex);
        });
      },
    })
  ).current;
  const hueRef = useRef(hue);

  const canPlace = message.trim().length > 0 && !loading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.wrapper}
      pointerEvents="box-none"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{ts('placePin', lang)}</Text>
          <Text style={styles.coords}>
            {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
          </Text>
        </View>

        {/* Message input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={ts('pinPlaceholder', lang)}
            placeholderTextColor="#999"
            value={message}
            onChangeText={(text) =>
              setMessage(text.slice(0, PIN_MAX_MESSAGE_LENGTH))
            }
            maxLength={PIN_MAX_MESSAGE_LENGTH}
            multiline
            autoFocus
          />
          <Text style={styles.charCount}>
            {message.length}/{PIN_MAX_MESSAGE_LENGTH}
          </Text>
        </View>

        {/* Color picker */}
        <View style={styles.colorRow}>
          {PIN_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.colorSwatch,
                { backgroundColor: c },
                color === c && styles.activeSwatch,
              ]}
              onPress={() => { setColor(c); setShowCustom(false); }}
            />
          ))}
          {/* Custom color toggle */}
          <TouchableOpacity
            style={[
              styles.colorSwatch,
              styles.customSwatch,
              showCustom && styles.activeSwatch,
            ]}
            onPress={() => setShowCustom(!showCustom)}
          >
            <Text style={styles.customSwatchText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Custom color picker */}
        {showCustom && (
          <View style={styles.customColorSection}>
            {/* Hue bar */}
            <View
              ref={hueBarRef}
              style={styles.hueBar}
              {...huePanResponder.panHandlers}
            >
              {Array.from({ length: 36 }, (_, i) => (
                <View key={i} style={{ flex: 1, backgroundColor: hsvToHex(i * 10, 1, 1) }} />
              ))}
              <View style={[styles.hueCursor, { left: (hue / 360) * 100 + '%' as any }]}>
                <View style={[styles.hueCursorInner, { backgroundColor: customHex }]} />
              </View>
            </View>
            {/* Hex input + preview */}
            <View style={styles.hexRow}>
              <View style={[styles.hexPreview, { backgroundColor: customHex }]} />
              <TextInput
                style={styles.hexInput}
                value={customHex}
                onChangeText={(t) => {
                  setCustomHex(t);
                  if (/^#[0-9A-Fa-f]{6}$/.test(t)) {
                    setColor(t);
                  }
                }}
                placeholder="#FF6600"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={7}
              />
            </View>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>{ts('cancel', lang)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.placeBtn, !canPlace && styles.disabledBtn]}
            onPress={() => canPlace && onPlace({ message: message.trim(), color })}
            disabled={!canPlace}
          >
            <Text style={[styles.placeText, !canPlace && styles.disabledText]}>
              {loading ? ts('placing', lang) : tf('placeWithCost', lang)(PIN_INK_COST)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 300,
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
  },
  coords: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  inputRow: {
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 60,
    maxHeight: 100,
    textAlignVertical: 'top',
    color: '#333',
  },
  charCount: {
    textAlign: 'right',
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  activeSwatch: {
    borderWidth: 2.5,
    borderColor: '#000',
    transform: [{ scale: 1.15 }],
  },
  customSwatch: {
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
    borderColor: '#999',
  },
  customSwatchText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  customColorSection: {
    marginBottom: 12,
  },
  hueBar: {
    width: '100%',
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    position: 'relative',
  },
  hueCursor: {
    position: 'absolute',
    top: -2,
    marginLeft: -8,
    width: 16,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hueCursorInner: {
    width: 14,
    height: 26,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  hexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  hexPreview: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  hexInput: {
    flex: 1,
    height: 32,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  placeBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
  },
  disabledBtn: {
    backgroundColor: '#d1d5db',
  },
  placeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  disabledText: {
    color: '#9ca3af',
  },
});
