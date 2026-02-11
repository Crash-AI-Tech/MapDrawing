import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { BRUSH_IDS, BrushId, COLOR_PRESETS } from '@niubi/shared';

interface DrawingToolbarProps {
    currentMode: 'hand' | 'draw' | 'pin';
    onModeChange: (mode: 'hand' | 'draw' | 'pin') => void;
    currentColor: string;
    onColorSelect: (color: string) => void;
    currentBrush: BrushId;
    onBrushSelect: (brush: BrushId) => void;
    onUndo: () => void;
    canUndo: boolean; // Added for visual state
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
    onUndo,
    canUndo
}: DrawingToolbarProps) {
    const [showBrushPanel, setShowBrushPanel] = useState(false);
    const [showColorPanel, setShowColorPanel] = useState(false);

    // Helper to render dividers
    const Divider = () => <View style={styles.divider} />;

    const toggleBrushPanel = () => {
        setShowBrushPanel(!showBrushPanel);
        setShowColorPanel(false);
    };

    const toggleColorPanel = () => {
        setShowColorPanel(!showColorPanel);
        setShowBrushPanel(false);
    };

    return (
        <SafeAreaView style={styles.safeArea} pointerEvents="box-none">
            <View style={styles.container}>
                {/* Group 1: Modes */}
                <View style={styles.group}>
                    <TouchableOpacity
                        style={[styles.btn, currentMode === 'hand' && styles.activeBtn]}
                        onPress={() => onModeChange('hand')}
                    >
                        {/* Changed to valid MaterialIcons 'pan-tool' */}
                        <MaterialIcons name="pan-tool" size={20} color={currentMode === 'hand' ? '#fff' : '#666'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.btn, currentMode === 'draw' && styles.activeBtn]}
                        onPress={() => onModeChange('draw')}
                    >
                        {/* Changed to valid MaterialCommunityIcons 'pencil' */}
                        <MaterialCommunityIcons name="pencil" size={20} color={currentMode === 'draw' ? '#fff' : '#666'} />
                    </TouchableOpacity>

                    {/* Pin Mode */}
                    <TouchableOpacity
                        style={[styles.btn, currentMode === 'pin' && styles.activeBtn]}
                        onPress={() => onModeChange('pin')}
                    >
                        <MaterialCommunityIcons name="map-marker" size={20} color={currentMode === 'pin' ? '#fff' : '#666'} />
                    </TouchableOpacity>
                </View>

                <Divider />

                {/* Group 2: Tools (Brush/Color) */}
                <View style={styles.group}>
                    <TouchableOpacity
                        style={[styles.btn, showBrushPanel && styles.activePanelBtn]}
                        onPress={toggleBrushPanel}
                        disabled={currentMode !== 'draw'} // Only enable in draw mode? specific requirement? Web enables but dims.
                    >
                        {/* Use FontAwesome5 for specific brushes, pencil-alt is safer */}
                        <FontAwesome5 name={BRUSH_ICONS[currentBrush]} size={16} color="#333" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.btn, showColorPanel && styles.activePanelBtn]}
                        onPress={toggleColorPanel}
                    >
                        <View style={[styles.colorDot, { backgroundColor: currentColor }]} />
                    </TouchableOpacity>
                </View>

                <Divider />

                {/* Group 3: Actions */}
                <View style={styles.group}>
                    <TouchableOpacity
                        style={[styles.btn, !canUndo && styles.disabledBtn]}
                        onPress={onUndo}
                        disabled={!canUndo}
                    >
                        <MaterialCommunityIcons name="undo" size={20} color={!canUndo ? '#ccc' : '#333'} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Floating Panels */}
            {showBrushPanel && (
                <View style={styles.panel}>
                    <Text style={styles.panelTitle}>Brush Type</Text>
                    <View style={styles.grid}>
                        {(Object.values(BRUSH_IDS) as BrushId[]).map((brush) => (
                            <TouchableOpacity
                                key={brush}
                                style={[
                                    styles.panelBtn,
                                    currentBrush === brush && styles.activePanelItem
                                ]}
                                onPress={() => {
                                    onBrushSelect(brush);
                                    setShowBrushPanel(false);
                                }}
                            >
                                <FontAwesome5
                                    name={BRUSH_ICONS[brush]}
                                    size={20}
                                    color={currentBrush === brush ? '#007AFF' : '#666'}
                                />
                                <Text style={[styles.panelLabel, currentBrush === brush && styles.activeLabel]}>
                                    {brush.charAt(0).toUpperCase() + brush.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {showColorPanel && (
                <View style={styles.panel}>
                    <Text style={styles.panelTitle}>Colors</Text>
                    <View style={styles.colorGrid}>
                        {COLOR_PRESETS.map((color) => (
                            <TouchableOpacity
                                key={color}
                                style={[
                                    styles.colorSwatch,
                                    { backgroundColor: color },
                                    currentColor === color && styles.activeSwatch
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
    );
}

const styles = StyleSheet.create({
    safeArea: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 100,
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
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)'
    },
    group: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    divider: {
        width: 1,
        height: 20,
        backgroundColor: '#e5e5e5',
        marginHorizontal: 4
    },
    btn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeBtn: {
        backgroundColor: '#7c3aed', // Violet-600 match
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 }
    },
    activePanelBtn: {
        backgroundColor: '#f3f4f6'
    },
    disabledBtn: {
        opacity: 0.5
    },
    colorDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)'
    },

    // Panels
    panel: {
        position: 'absolute',
        top: 70, // Below toolbar
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderRadius: 16,
        padding: 16,
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
        marginBottom: 12
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },
    panelBtn: {
        width: '30%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#eee'
    },
    activePanelItem: {
        borderColor: '#7c3aed',
        backgroundColor: '#7c3aed10'
    },
    panelLabel: {
        fontSize: 10,
        marginTop: 4,
        color: '#666'
    },
    activeLabel: {
        color: '#7c3aed',
        fontWeight: '600'
    },
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },
    colorSwatch: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)'
    },
    activeSwatch: {
        borderWidth: 2,
        borderColor: '#000',
        transform: [{ scale: 1.1 }]
    }
});
