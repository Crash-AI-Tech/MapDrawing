/**
 * PinPlacer — floating panel for creating a map pin.
 *
 * Shows when user taps the map in pin mode.
 * Contains: message input, color picker, place button, cancel button.
 * Matches web version's PinPlacer behavior.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { PIN_COLORS, PIN_MAX_MESSAGE_LENGTH } from '@niubi/shared';

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
  const [message, setMessage] = useState('');
  const [color, setColor] = useState<string>(PIN_COLORS[0]);

  const canPlace = message.trim().length > 0 && !loading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.wrapper}
      pointerEvents="box-none"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>📌 放置图钉</Text>
          <Text style={styles.coords}>
            {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
          </Text>
        </View>

        {/* Message input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="写点什么… (最多50字)"
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
              onPress={() => setColor(c)}
            />
          ))}
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.placeBtn, !canPlace && styles.disabledBtn]}
            onPress={() => canPlace && onPlace({ message: message.trim(), color })}
            disabled={!canPlace}
          >
            <Text style={[styles.placeText, !canPlace && styles.disabledText]}>
              {loading ? '放置中…' : '放置 (−50 墨水)'}
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
