import React, { useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { Canvas, Path, Skia, SkPath, StrokeCap, StrokeJoin, BlendMode } from '@shopify/react-native-skia';
import { useAuth } from '@/context/AuthContext';
// import { Button } from 'react-native'; // Removed old controls
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import DrawingToolbar from '../../components/DrawingToolbar';
import { BRUSH_IDS, BrushId, DEFAULT_COLOR, DEFAULT_SIZE } from '@niubi/shared';

// Set your MapLibre access token here if needed, or use a free tile server
MapLibreGL.setAccessToken(null);

interface PathData {
    path: SkPath;
    color: string;
    strokeWidth: number;
    brush: BrushId;
    opacity: number;
    blendMode?: BlendMode;
}

export default function MapScreen() {
    const { signOut } = useAuth();

    // State
    const [mode, setMode] = useState<'hand' | 'draw' | 'pin'>('draw'); // Default to draw for testing
    const [paths, setPaths] = useState<PathData[]>([]);
    const [currentPath, setCurrentPath] = useState<PathData | null>(null);
    const [currentColor, setCurrentColor] = useState<string>(DEFAULT_COLOR);
    const [currentBrush, setCurrentBrush] = useState<BrushId>(BRUSH_IDS.PENCIL);
    const [currentSize, setCurrentSize] = useState<number>(DEFAULT_SIZE);

    // Brush Settings Logic
    const getBrushSettings = (brush: BrushId, color: string, baseSize: number) => {
        switch (brush) {
            case BRUSH_IDS.MARKER:
                return { width: baseSize * 3, opacity: 0.8, blendMode: BlendMode.SrcOver };
            case BRUSH_IDS.HIGHLIGHTER:
                return { width: baseSize * 8, opacity: 0.4, blendMode: BlendMode.SrcOver }; // Multiply doesn't work well on transparent layer over map
            case BRUSH_IDS.ERASER:
                return { width: baseSize * 5, opacity: 1, blendMode: BlendMode.Clear };
            case BRUSH_IDS.SPRAY: // Simple implementation for now
                return { width: baseSize * 10, opacity: 0.5, blendMode: BlendMode.SrcOver };
            case BRUSH_IDS.PENCIL:
            default:
                return { width: baseSize, opacity: 1, blendMode: BlendMode.SrcOver };
        }
    };

    const pan = Gesture.Pan()
        .minDistance(1)
        .enabled(mode === 'draw') // Only enable gestures in draw mode!
        .onStart((g) => {
            const newPath = Skia.Path.Make();
            newPath.moveTo(g.x, g.y);

            const settings = getBrushSettings(currentBrush, currentColor, currentSize);

            const newPathData: PathData = {
                path: newPath,
                color: currentColor,
                strokeWidth: settings.width,
                brush: currentBrush,
                opacity: settings.opacity,
                blendMode: settings.blendMode
            };

            setCurrentPath(newPathData);
        })
        .onUpdate((g) => {
            if (currentPath) {
                currentPath.path.lineTo(g.x, g.y);
                setCurrentPath({ ...currentPath });
            }
        })
        .onEnd(() => {
            if (currentPath) {
                setPaths((prev) => [...prev, currentPath]);
                setCurrentPath(null);
            }
        })
        .runOnJS(true);

    // Actions
    const handleUndo = () => {
        setPaths((prev) => prev.slice(0, -1));
    };

    return (
        <View style={styles.page}>
            <MapLibreGL.MapView
                style={styles.map}
                // Use verifiable public Demo Tiles to rule out OpenFreeMap issues
                styleURL="https://demotiles.maplibre.org/style.json"
                logoEnabled={false}
                attributionEnabled={false}
                scrollEnabled={mode === 'hand' || mode === 'pin'}
                zoomEnabled={mode === 'hand' || mode === 'pin'}
                rotateEnabled={mode === 'hand' || mode === 'pin'}
                pitchEnabled={mode === 'hand' || mode === 'pin'}
            >
                <MapLibreGL.Camera
                    defaultSettings={{
                        centerCoordinate: [116.4074, 39.9042],
                        zoomLevel: 10, // Lower zoom to ensure tiles load
                    }}
                />
            </MapLibreGL.MapView>

            <GestureDetector gesture={pan}>
                {/* 
                    Fix: Move pointerEvents to the outer View to ensure touches pass through 
                    strictly when not in 'draw' mode.
                */}
                <View
                    style={[styles.overlay, { zIndex: mode === 'draw' ? 100 : 0 }]}
                    pointerEvents={mode === 'draw' ? 'auto' : 'none'}
                >
                    <Canvas style={{ flex: 1 }}>
                        {paths.map((p, index) => (
                            <Path
                                key={index}
                                path={p.path}
                                color={p.color}
                                style="stroke"
                                strokeWidth={p.strokeWidth}
                                strokeCap={StrokeCap.Round}
                                strokeJoin={StrokeJoin.Round}
                                opacity={p.opacity}
                                blendMode={p.blendMode}
                            />
                        ))}
                        {currentPath && (
                            <Path
                                path={currentPath.path}
                                color={currentPath.color}
                                style="stroke"
                                strokeWidth={currentPath.strokeWidth}
                                strokeCap={StrokeCap.Round}
                                strokeJoin={StrokeJoin.Round}
                                opacity={currentPath.opacity}
                                blendMode={currentPath.blendMode}
                            />
                        )}
                    </Canvas>
                </View>
            </GestureDetector>

            <DrawingToolbar
                currentMode={mode}
                onModeChange={setMode}
                currentColor={currentColor}
                onColorSelect={setCurrentColor}
                currentBrush={currentBrush}
                onBrushSelect={setCurrentBrush}
                onUndo={handleUndo}
                canUndo={paths.length > 0}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        // Background color: Ensure it's not "green" by default. 
        // If MapLibre fails, it shows this.
        backgroundColor: '#ffffff',
    },
    map: {
        flex: 1,
        alignSelf: 'stretch',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
        zIndex: 10 // Ensure it's above map but below toolbar
    },
});
