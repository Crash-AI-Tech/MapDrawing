<template>
    <div class="relative w-full h-full group">
        <!-- Info Text -->
        <div class="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] p-2 bg-white/60 backdrop-blur-md rounded-lg shadow-md text-sm text-gray-700 font-semibold pointer-events-none select-none border border-white/40">
            {{ infoText }}
        </div>

        <!-- Map Container -->
        <div id="map" class="w-full h-full outline-none"></div>

        <!-- Marker Text Input Modal -->
        <div v-if="showMarkerInput" class="absolute inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm" @click.stop>
            <div class="bg-white p-6 rounded-xl shadow-2xl w-96 animate-fade-in-up">
                <h3 class="text-lg font-bold mb-4 text-gray-800">Add Note to Marker</h3>
                <textarea 
                    v-model="markerText" 
                    maxlength="150"
                    rows="4"
                    class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none mb-2"
                    placeholder="Enter description (max 150 chars)..."
                    ref="markerInputRef"
                ></textarea>
                <div class="flex justify-between items-center text-xs text-gray-500 mb-4">
                    <span>{{ markerText.length }}/150</span>
                </div>
                <div class="flex gap-3 justify-end">
                    <button 
                        @click="cancelMarker"
                        class="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        @click="confirmMarker"
                        class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium transition-colors shadow-lg shadow-blue-500/30"
                    >
                        Add Marker
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, shallowRef, onMounted, onUnmounted, watch, computed, nextTick, markRaw } from 'vue';
import L from 'leaflet';
import { INITIAL_CENTER, INITIAL_ZOOM, MAX_ZOOM, DrawingTool, TOOL_ICONS } from '../constants.js';

// The map allows zooming beyond the base MAX_ZOOM (18) up to 20.
// We only show popups at the absolute maximum zoom level.
const MAP_MAX_ZOOM = MAX_ZOOM + 2;

// Base size for markers at MAX_ZOOM (Level 18) in pixels
const MARKER_BASE_SIZE_MAX_ZOOM = 5;

const props = defineProps({
  drawings: Array,
  tool: String,
  color: String,
  brushSize: Number,
  user: String,
  userEmail: String,
  isTransparent: Boolean
});

const emit = defineEmits(['add-drawing', 'remove-drawing']);

const mapInstance = shallowRef(null);
const drawingLayerGroup = shallowRef(null);
const tempLayer = shallowRef(null);

const currentPoints = ref([]);

const isDrawingActive = ref(false);
const isPanning = ref(false);
const lastPanPos = ref(null);
const isErasing = ref(false);
const lastTouchLatLng = ref(null); // Add this for touch handling

const showMarkerInput = ref(false);
const markerText = ref('');
const pendingMarkerPos = ref(null);
const markerInputRef = ref(null);

const infoText = computed(() => {
    if (props.tool === DrawingTool.HAND) return 'Drag to move map';
    if (props.tool === DrawingTool.BRUSH) return 'Hold LEFT button to draw. Hold MIDDLE button to pan.';
    if (props.tool === DrawingTool.MARKER) return 'Click to place marker. Hold MIDDLE button to pan.';
    if (props.tool === DrawingTool.ERASER) return 'Hold LEFT button and drag over items to erase. Hold MIDDLE button to pan.';
    return '';
});

const truncateText = (text, limit) => {
    if (!text) return '';
    return text.length > limit ? text.substring(0, limit) + '...' : text;
};

const createColoredMarkerIcon = (color, size) => {
    const safeSize = Math.max(0.1, size);
    const strokeColor = color.toLowerCase() === '#ffffff' ? '#999999' : 'white';

    const svgHtml = `
        <svg viewBox="0 0 24 24" fill="${color}" stroke="${strokeColor}" stroke-width="1" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 1px 1px rgba(0,0,0,0.2)); width: 100%; height: 100%;">
            <path d="${TOOL_ICONS.MARKER.path}" />
        </svg>
    `;
    
    return L.divIcon({
        className: 'custom-colored-marker', 
        html: svgHtml,
        iconSize: [safeSize, safeSize],
        iconAnchor: [safeSize/2, safeSize], 
        popupAnchor: [0, -safeSize],
        tooltipAnchor: [0, -safeSize]
    });
};

// Core logic: Input size is pixel width at MAX_ZOOM (18).
// Scale formula: base * 2^(currentZoom - MAX_ZOOM)
const getPhysicalDimension = (baseSizeAtMaxZoom, currentZoom) => {
    if (!baseSizeAtMaxZoom) return 0;
    const scale = Math.pow(2, currentZoom - MAX_ZOOM);
    return baseSizeAtMaxZoom * scale;
};

const updateLayerStyles = () => {
    if (!mapInstance.value || !drawingLayerGroup.value) return;
    const currentZoom = mapInstance.value.getZoom();
    const opacity = props.isTransparent ? 0.5 : 1.0;
    const isMaxZoom = currentZoom >= MAP_MAX_ZOOM;
    
    if (!isMaxZoom) {
        mapInstance.value.closePopup();
    }

    drawingLayerGroup.value.eachLayer((layer) => {
        const d = layer.options.drawingData;
        if (!d) return;

        // Case 1: Icon Markers
        if (layer instanceof L.Marker) {
            // ...existing code...
            const currentSize = getPhysicalDimension(MARKER_BASE_SIZE_MAX_ZOOM, currentZoom);
            layer.setIcon(createColoredMarkerIcon(d.color, currentSize));
            const verticalOffset = -currentSize / 5;

            if (layer.getTooltip()) {
                layer.getTooltip().options.offset = [0, verticalOffset];
                if (isMaxZoom) {
                    if (!layer.isTooltipOpen()) layer.openTooltip();
                    const tooltipEl = layer.getTooltip().getElement();
                    if (tooltipEl) tooltipEl.classList.add('zoom-visible');
                } else {
                    layer.closeTooltip();
                }
            }
            
            // Popup Management: Only bind/show at MAX_ZOOM
            if (isMaxZoom) {
                if (!layer.getPopup() && layer.options.customPopupContent) {
                    layer.bindPopup(layer.options.customPopupContent, {
                        ...layer.options.customPopupOptions,
                        offset: [0, verticalOffset]
                    });
                } else if (layer.getPopup()) {
                    layer.getPopup().options.offset = [0, verticalOffset];
                }
            } else {
                if (layer.getPopup()) {
                    layer.unbindPopup();
                }
            }
            
            const iconEl = layer.getElement();
            if (iconEl) iconEl.style.opacity = opacity;
        } 
        // Case 2: Dots (L.Circle - Geographic)
        // L.Circle extends L.CircleMarker, so we must check L.Circle first
        else if (layer instanceof L.Circle) {
             layer.setStyle({ 
                opacity: opacity, 
                fillOpacity: opacity 
            });
            // Do NOT update radius manually for L.Circle, it scales geographically automatically
        }
        // Case 3: Dots (L.CircleMarker - Pixel based)
        else if (layer instanceof L.CircleMarker) {
            const baseWeight = d.weight || 1.0;
            // Width at this zoom
            const currentWeight = getPhysicalDimension(baseWeight, currentZoom);
            layer.setRadius(Math.max(0.01, currentWeight / 2));
            layer.setStyle({ 
                opacity: opacity, 
                fillOpacity: opacity 
            });
        }
        // Case 4: Lines (Polyline)
        else if (layer instanceof L.Polyline) {
            const baseWeight = d.weight || 1.0;
            const currentWeight = getPhysicalDimension(baseWeight, currentZoom);
            layer.setStyle({ 
                weight: Math.max(0.1, currentWeight), 
                opacity: opacity,
                fillOpacity: opacity
            });
        }
    });

    // Temp Layer Update
    if (tempLayer.value) {
            const currentWeight = getPhysicalDimension(props.brushSize, currentZoom);
            const style = { opacity: opacity, fillOpacity: opacity };

            if (tempLayer.value instanceof L.Circle) {
                 tempLayer.value.setStyle(style);
            } else if (tempLayer.value instanceof L.CircleMarker) {
                tempLayer.value.setRadius(Math.max(0.01, currentWeight / 2));
                tempLayer.value.setStyle(style);
            } else if (tempLayer.value instanceof L.Polyline) {
                tempLayer.value.setStyle({ 
                ...style,
                weight: Math.max(0.1, currentWeight)
            });
            }
    }
};

// Helper to calculate meters from pixels at current view
const calculateMetersFromPixels = (map, latlng, pixels) => {
    if (!map || !latlng) return 0;
    try {
        const point = map.latLngToContainerPoint(latlng);
        const targetPoint = L.point(point.x + pixels, point.y);
        const targetLatLng = map.containerPointToLatLng(targetPoint);
        return map.distance(latlng, targetLatLng);
    } catch (e) {
        console.warn('Error calculating meters:', e);
        return 0;
    }
};

// Expose method to center map
// ...existing code...

// Expose method to center map
const setView = (center, zoom) => {
    if (mapInstance.value) {
        mapInstance.value.setView(center, zoom);
    }
};

defineExpose({ setView });

// ...existing code...
const renderDrawings = () => {
    if (!drawingLayerGroup.value || !mapInstance.value) return;
    
    drawingLayerGroup.value.clearLayers();
    const currentZoom = mapInstance.value.getZoom();
    const opacity = props.isTransparent ? 0.5 : 1.0;

    props.drawings.forEach(drawing => {
        try {
            const currentMarkerSize = getPhysicalDimension(MARKER_BASE_SIZE_MAX_ZOOM, currentZoom);
            const verticalOffset = -currentMarkerSize / 5;
            const isSyncing = drawing.isSyncing; // Check for syncing state

            let layer;

            if (drawing.tool === DrawingTool.MARKER) {
                    const icon = createColoredMarkerIcon(drawing.color, currentMarkerSize);
                    // Add glow class to icon if syncing
                    if (isSyncing) {
                        icon.options.className += ' syncing-glow-marker';
                    }

                    layer = L.marker(drawing.points[0], {
                        icon: icon,
                        drawingData: drawing
                    });
                    
                    if (drawing.text) {
                    const displayText = truncateText(drawing.text, 7);
                    const tooltipContent = `<div class="tooltip-inner-content">${displayText}</div>`;
                    layer.bindTooltip(tooltipContent, { 
                        permanent: true, 
                        direction: 'top', 
                        offset: [0, verticalOffset],
                        className: 'marker-tooltip-wrapper'
                    });
                    }

                    let dateObj = new Date(drawing.created_at || drawing.id); // Use created_at if available
                    if (isNaN(dateObj.getTime())) dateObj = new Date();
                    const timeStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
                    
                    const popupContent = `
                    <div class="px-2 py-1 min-w-[80px] max-w-[180px]">
                        <div class="font-bold text-[10px] text-gray-900 mb-0.5">${drawing.user_name || drawing.author || 'Unknown'}</div>
                        <div class="text-[10px] font-medium text-gray-800 mb-0.5 whitespace-normal break-words leading-tight">${drawing.text || ''}</div>
                        <div class="text-[9px] text-gray-400">${timeStr}</div>
                        ${isSyncing ? '<div class="text-[9px] text-amber-500 font-bold mt-1">Saving...</div>' : ''}
                    </div>
                    `;

                    const popupOptions = {
                        closeButton: false,
                        offset: [0, verticalOffset],
                        className: 'custom-popup marker-popup-custom'
                    };

                    layer.options.customPopupContent = popupContent;
                    layer.options.customPopupOptions = popupOptions;

                    layer.bindPopup(popupContent, popupOptions);

                    let closeTimer = null;
                    
                    // Click handler for mobile/tablet support and explicit interaction
                    layer.on('click', function(e) {
                        L.DomEvent.stopPropagation(e);
                        if (closeTimer) {
                            clearTimeout(closeTimer);
                            closeTimer = null;
                        }
                        this.openPopup();
                        
                        // Add visual feedback
                        requestAnimationFrame(() => {
                            const popup = this.getPopup();
                            if (popup) {
                                const el = popup.getElement();
                                if (el) el.classList.add('popup-visible');
                            }
                        });
                    });

                    layer.on('mouseover', function() {
                    if (mapInstance.value.getZoom() < MAP_MAX_ZOOM) return;
                    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
                    const tooltip = this.getTooltip();
                    if (tooltip) {
                        const el = tooltip.getElement();
                        if (el) el.classList.add('hover-hidden');
                    }
                    this.openPopup();
                    requestAnimationFrame(() => {
                        const popup = this.getPopup();
                        if (popup) {
                            const el = popup.getElement();
                            if (el) el.classList.add('popup-visible');
                        }
                    });
                    });

                    layer.on('mouseout', function() {
                        const popup = this.getPopup();
                        const tooltip = this.getTooltip();
                        if (popup) {
                            const el = popup.getElement();
                            if (el) el.classList.remove('popup-visible');
                        }
                        closeTimer = setTimeout(() => {
                            this.closePopup();
                            if (tooltip) {
                                const el = tooltip.getElement();
                                if (el && mapInstance.value.getZoom() >= MAP_MAX_ZOOM) {
                                    el.classList.remove('hover-hidden');
                                }
                            }
                        }, 300); 
                    });
            } 
            else if (drawing.tool === DrawingTool.BRUSH) {
                // Calculate width at current zoom
                const currentWeight = getPhysicalDimension(drawing.weight || 1.0, currentZoom);
                const pathOptions = { 
                    color: drawing.color, 
                    // Ensure consistent visual properties
                    weight: Math.max(0.1, currentWeight),
                    lineCap: 'round', 
                    lineJoin: 'round',
                    opacity: opacity, 
                    fillOpacity: opacity,
                    drawingData: drawing,
                    className: isSyncing ? 'syncing-glow-path' : '' // Add glow class for paths
                };

                if (drawing.points.length === 1) {
                    // Single point: Use L.Circle for smooth geographic scaling
                    // Calculate radius in meters to match the visual width
                    const radiusPixels = Math.max(0.01, currentWeight / 2);
                    let radiusMeters = calculateMetersFromPixels(mapInstance.value, drawing.points[0], radiusPixels);
                    
                    // Fallback if calculation fails (e.g. map not ready or invalid latlng)
                    if (!radiusMeters || radiusMeters <= 0) {
                        radiusMeters = 0.1; 
                    }

                    layer = L.circle(drawing.points[0], {
                        ...pathOptions,
                        stroke: false,
                        radius: radiusMeters, 
                    });
                } else {
                    // Multiple points: Polyline
                    layer = L.polyline(drawing.points, pathOptions);
                }
            }

            if (layer) {
                const checkErase = (e) => {
                    if (props.tool === DrawingTool.ERASER) {
                        L.DomEvent.stopPropagation(e);
                        const isLeftClickHeld = (e.originalEvent.buttons & 1) === 1;
                        if (isLeftClickHeld || e.type === 'mousedown') {
                                // Check ownership
                                if (drawing.user_id === props.user || drawing.author === props.user || (props.userEmail && drawing.author === props.userEmail)) { // Support both new and old format
                                emit('remove-drawing', drawing.id);
                            }
                        }
                    }
                };
                layer.on('mousedown', checkErase);
                layer.on('mouseover', checkErase);
                layer.addTo(drawingLayerGroup.value);
            }
        } catch (err) {
            console.error('Error rendering drawing:', drawing.id, err);
        }
    });
    
    nextTick(() => {
        updateLayerStyles();
    });
};

const renderTempDrawing = () => {
    if (!mapInstance.value) return;

    if (tempLayer.value) {
        tempLayer.value.remove();
        tempLayer.value = null;
    }
    if (currentPoints.value.length === 0) return;

    const currentZoom = mapInstance.value.getZoom();
    // Consistent Width Calculation
    const currentWeight = getPhysicalDimension(props.brushSize, currentZoom);

    const pathOptions = { 
        color: props.color, 
        weight: Math.max(0.1, currentWeight),
        lineCap: 'round',
        lineJoin: 'round',
        opacity: props.isTransparent ? 0.5 : 1,
        fillOpacity: props.isTransparent ? 0.5 : 1,
    };
    
    if (props.tool === DrawingTool.BRUSH) {
        if (currentPoints.value.length === 1) {
            // Dot: Use L.Circle
            const radiusPixels = Math.max(0.01, currentWeight / 2);
            let radiusMeters = calculateMetersFromPixels(mapInstance.value, currentPoints.value[0], radiusPixels);
            
            if (!radiusMeters || radiusMeters <= 0) radiusMeters = 0.1;

            tempLayer.value = L.circle(currentPoints.value[0], {
                ...pathOptions,
                stroke: false,
                radius: radiusMeters
            }).addTo(mapInstance.value);
        } else {
            // Line: Weight = Width
            tempLayer.value = L.polyline(currentPoints.value, pathOptions).addTo(mapInstance.value);
        }
    }
};


const finishDrawing = () => {
    if (!mapInstance.value) return;
    if (currentPoints.value.length === 0) return;
    
    emit('add-drawing', {
        tool: props.tool,
        color: props.color,
        weight: props.brushSize, 
        points: [...currentPoints.value],
        createdZoom: mapInstance.value.getZoom() 
    });
    
    currentPoints.value = [];
    renderTempDrawing();
};

const cancelMarker = () => {
    showMarkerInput.value = false;
    markerText.value = '';
    pendingMarkerPos.value = null;
};

const confirmMarker = () => {
    if (!pendingMarkerPos.value || !mapInstance.value) return;
    emit('add-drawing', {
        tool: DrawingTool.MARKER,
        color: props.color,
        weight: 0, 
        points: [pendingMarkerPos.value],
        text: markerText.value,
        createdZoom: mapInstance.value.getZoom()
    });
    cancelMarker();
};

const handleMouseDown = (e) => {
    if (e.originalEvent.button === 1) {
        isPanning.value = true;
        lastPanPos.value = { x: e.originalEvent.clientX, y: e.originalEvent.clientY };
        mapInstance.value.getContainer().style.cursor = 'grabbing';
        L.DomEvent.stopPropagation(e);
        e.originalEvent.preventDefault();
        return;
    }
    if (e.originalEvent.button === 2) return;

    if (props.tool === DrawingTool.HAND) return;

    L.DomEvent.stopPropagation(e);
    L.DomEvent.preventDefault(e);

    if (props.tool === DrawingTool.ERASER) {
        isErasing.value = true;
    } 
    else if (props.tool === DrawingTool.BRUSH) {
        isDrawingActive.value = true;
        const newPoint = [e.latlng.lat, e.latlng.lng];
        currentPoints.value = [newPoint];
        renderTempDrawing();
    } 
    else if (props.tool === DrawingTool.MARKER) {
    }
};

const handleMouseMove = (e) => {
    if (isPanning.value) {
        if ((e.originalEvent.buttons & 4) === 0) {
            isPanning.value = false;
            lastPanPos.value = null;
            updateMapInteraction();
            return;
        }
        if (lastPanPos.value && mapInstance.value) {
            const x = e.originalEvent.clientX;
            const y = e.originalEvent.clientY;
            const deltaX = lastPanPos.value.x - x;
            const deltaY = lastPanPos.value.y - y;
            mapInstance.value.panBy([deltaX, deltaY], { animate: false });
            lastPanPos.value = { x, y };
        }
        return;
    }

    if (isDrawingActive.value && props.tool === DrawingTool.BRUSH) {
        if ((e.originalEvent.buttons & 1) === 0) {
            isDrawingActive.value = false;
            finishDrawing();
            return;
        }
        const newPoint = [e.latlng.lat, e.latlng.lng];
        currentPoints.value.push(newPoint);
        
        if (tempLayer.value && mapInstance.value) {
            // Check explicit types for optimized updates
            if (tempLayer.value instanceof L.Polyline && !(tempLayer.value instanceof L.CircleMarker)) {
                    try {
                    tempLayer.value.setLatLngs(currentPoints.value);
                    } catch (err) {
                    renderTempDrawing();
                    }
            } else {
                renderTempDrawing();
            }
        }
    }
};

const handleMouseUp = (e) => {
    if (e.originalEvent.button === 1) {
        isPanning.value = false;
        lastPanPos.value = null;
        updateMapInteraction(); 
        return;
    }
    if (props.tool === DrawingTool.HAND) return;

    if (props.tool === DrawingTool.ERASER) {
        isErasing.value = false;
    } 
    else if (props.tool === DrawingTool.BRUSH) {
        if (isDrawingActive.value) {
            isDrawingActive.value = false;
            finishDrawing();
        }
    } 
    else if (props.tool === DrawingTool.MARKER) {
        if (e.originalEvent.button === 0) {
            const newPoint = [e.latlng.lat, e.latlng.lng];
            pendingMarkerPos.value = newPoint;
            markerText.value = ''; 
            showMarkerInput.value = true;
            nextTick(() => {
                if (markerInputRef.value) markerInputRef.value.focus();
            });
        }
    }
};

const handleGlobalMouseUp = () => {
    if (isPanning.value) {
        isPanning.value = false;
        lastPanPos.value = null;
        updateMapInteraction();
    }
    if (isDrawingActive.value) {
        isDrawingActive.value = false;
        finishDrawing();
    }
    if (isErasing.value) {
        isErasing.value = false;
    }
};

const handleGlobalTouchEnd = () => {
    if (isDrawingActive.value) {
        isDrawingActive.value = false;
        finishDrawing();
    }
    if (isErasing.value) {
        isErasing.value = false;
    }
};

const updateMapInteraction = () => {
    if (!mapInstance.value) return;
    const container = mapInstance.value.getContainer();

    if (props.tool === DrawingTool.HAND) {
        mapInstance.value.dragging.enable();
        container.style.cursor = 'grab';
        container.style.touchAction = 'auto';
    } else {
        mapInstance.value.dragging.disable(); 
        if (props.tool === DrawingTool.ERASER) {
            container.style.cursor = 'not-allowed'; 
        } else {
            container.style.cursor = 'crosshair';
        }
        container.style.touchAction = 'none';
    }
};

// ...existing code...
// Touch Event Handlers
const checkEraserHit = (latlng) => {
    if (!mapInstance.value || !drawingLayerGroup.value) return;
    
    const point = mapInstance.value.latLngToContainerPoint(latlng);
    const tolerance = 15; // Increased tolerance for touch

    drawingLayerGroup.value.eachLayer((layer) => {
        const d = layer.options.drawingData;
        if (!d) return;
        
        // Check ownership
        const isOwner = d.user_id === props.user || d.author === props.user || (props.userEmail && d.author === props.userEmail);
        if (!isOwner) return;

        if (layer instanceof L.Marker || layer instanceof L.CircleMarker || layer instanceof L.Circle) {
            const layerPoint = mapInstance.value.latLngToContainerPoint(layer.getLatLng());
            const dist = layerPoint.distanceTo(point);
            if (dist < tolerance + 10) { 
                emit('remove-drawing', d.id);
            }
        } else if (layer instanceof L.Polyline) {
            const points = layer.getLatLngs();
            // Handle potential nested arrays
            const flatPoints = (points.length > 0 && Array.isArray(points[0])) ? points.flat() : points;
            
            for (let i = 0; i < flatPoints.length - 1; i++) {
                const p1 = mapInstance.value.latLngToContainerPoint(flatPoints[i]);
                const p2 = mapInstance.value.latLngToContainerPoint(flatPoints[i+1]);
                const dist = L.LineUtil.pointToSegmentDistance(point, p1, p2);
                if (dist < tolerance + (layer.options.weight || 5) / 2) {
                    emit('remove-drawing', d.id);
                    return; 
                }
            }
        }
    });
};

const handleTouchStart = (e) => {
    // Allow multi-touch (zoom/pan) if not drawing
    if (e.touches.length > 1) return;
    
    if (props.tool === DrawingTool.HAND) return;

    // Prevent default to stop scrolling/zooming while drawing
    if (e.cancelable) {
        e.preventDefault();
    }
    e.stopPropagation();

    const touch = e.touches[0];
    const container = mapInstance.value.getContainer();
    const rect = container.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const latlng = mapInstance.value.containerPointToLatLng([x, y]);

    lastTouchLatLng.value = latlng;

    if (props.tool === DrawingTool.BRUSH) {
        isDrawingActive.value = true;
        const newPoint = [latlng.lat, latlng.lng];
        currentPoints.value = [newPoint];
        renderTempDrawing();
    } else if (props.tool === DrawingTool.ERASER) {
        isErasing.value = true;
        checkEraserHit(latlng);
    }
};

const handleTouchMove = (e) => {
    if (e.touches.length > 1) return;
    if (props.tool === DrawingTool.HAND) return;

    if (e.cancelable) {
        e.preventDefault();
    }
    e.stopPropagation();

    const touch = e.touches[0];
    const container = mapInstance.value.getContainer();
    const rect = container.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const latlng = mapInstance.value.containerPointToLatLng([x, y]);

    lastTouchLatLng.value = latlng;

    if (isDrawingActive.value && props.tool === DrawingTool.BRUSH) {
        const newPoint = [latlng.lat, latlng.lng];
        currentPoints.value.push(newPoint);
        
        if (tempLayer.value && mapInstance.value) {
            // Check explicit types for optimized updates
            if (tempLayer.value instanceof L.Polyline && !(tempLayer.value instanceof L.CircleMarker) && !(tempLayer.value instanceof L.Circle)) {
                    try {
                    tempLayer.value.setLatLngs(currentPoints.value);
                    } catch (err) {
                    renderTempDrawing();
                    }
            } else {
                renderTempDrawing();
            }
        }
    } else if (isErasing.value && props.tool === DrawingTool.ERASER) {
        checkEraserHit(latlng);
    }
};

const handleTouchEnd = (e) => {
    if (props.tool === DrawingTool.HAND) return;

    if (isDrawingActive.value) {
        isDrawingActive.value = false;
        finishDrawing();
    }
    if (isErasing.value) {
        isErasing.value = false;
    }
    
    if (props.tool === DrawingTool.MARKER && lastTouchLatLng.value) {
        // Use the last known touch position for marker placement
        const newPoint = [lastTouchLatLng.value.lat, lastTouchLatLng.value.lng];
        pendingMarkerPos.value = newPoint;
        markerText.value = ''; 
        showMarkerInput.value = true;
        nextTick(() => {
            if (markerInputRef.value) markerInputRef.value.focus();
        });
        lastTouchLatLng.value = null;
    }
};

onMounted(() => {
    // ...existing code...
    // Try to load saved view state
    let initialCenter = INITIAL_CENTER;
    let initialZoom = INITIAL_ZOOM;
    
    try {
        const savedView = localStorage.getItem('geoCanvasViewState');
        if (savedView) {
            const parsed = JSON.parse(savedView);
            if (parsed.center && parsed.zoom) {
                initialCenter = parsed.center;
                initialZoom = parsed.zoom;
            }
        }
    } catch (e) {
        console.warn('Failed to load saved view state', e);
    }

    const map = markRaw(L.map('map', {
        center: initialCenter,
        zoom: initialZoom,
        zoomControl: false,
        attributionControl: false,
        renderer: L.canvas({ padding: 0.5 }),
    }));
    
    mapInstance.value = map;
    
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.attribution({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap, &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: MAP_MAX_ZOOM 
    }).addTo(map);

    drawingLayerGroup.value = markRaw(L.layerGroup().addTo(map));
    
    map.on('mousedown', handleMouseDown);
    map.on('mousemove', handleMouseMove);
    map.on('mouseup', handleMouseUp);
    
    // Add Native Touch Listeners to Container for better control
    const container = map.getContainer();
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });

    map.on('zoom', updateLayerStyles);
    
    // Save view state on moveend
    map.on('moveend', () => {
        const center = map.getCenter();
        const zoom = map.getZoom();
        localStorage.setItem('geoCanvasViewState', JSON.stringify({
            center: [center.lat, center.lng],
            zoom: zoom
        }));
    });
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalTouchEnd);

    renderDrawings();
    updateMapInteraction();

    // Fix for map not displaying fully on initial load
    setTimeout(() => {
        if (mapInstance.value) {
            mapInstance.value.invalidateSize();
        }
    }, 100);
});

onUnmounted(() => {
    if (mapInstance.value) {
        mapInstance.value.off('mousedown', handleMouseDown);
        mapInstance.value.off('mousemove', handleMouseMove);
        mapInstance.value.off('mouseup', handleMouseUp);
        
        // Remove Native Touch Listeners
        const container = mapInstance.value.getContainer();
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);

        mapInstance.value.remove();
        mapInstance.value = null;
    }
    window.removeEventListener('mouseup', handleGlobalMouseUp);
    window.removeEventListener('touchend', handleGlobalTouchEnd);
});


watch(() => props.drawings, renderDrawings, { deep: true });

watch(() => props.tool, () => {
    currentPoints.value = [];
    renderTempDrawing();
    updateMapInteraction();
});

watch(() => props.brushSize, () => {
    renderTempDrawing();
});

watch(() => props.isTransparent, () => {
    renderTempDrawing();
    updateLayerStyles();
});
</script>

<style>
/* 
    CUSTOM TOOLTIP STYLING 
*/
.marker-tooltip-wrapper {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
}
.marker-tooltip-wrapper::before { display: none; }

.marker-tooltip-wrapper .tooltip-inner-content {
    background-color: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(4px);
    border: 1px solid #d1d5db;
    border-radius: 0.75rem;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    padding: 2px 8px;
    font-size: 10px;
    font-weight: 500;
    color: #1f2937;
    white-space: nowrap;
    transform-origin: bottom center;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
    transform: scale(0);
    opacity: 0;
}

.marker-tooltip-wrapper.zoom-visible .tooltip-inner-content {
    transform: scale(1);
    opacity: 1;
}

.marker-tooltip-wrapper.hover-hidden .tooltip-inner-content {
    transform: scale(0);
    opacity: 0;
}

/* 
    CUSTOM POPUP STYLING 
*/
.marker-popup-custom .leaflet-popup-content-wrapper {
    background-color: rgba(255, 255, 255, 0.9) !important;
    backdrop-filter: blur(4px);
    border: 1px solid #d1d5db !important;
    border-radius: 0.75rem !important;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1) !important;
    padding: 0 !important; 
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
    transform-origin: bottom center;
    transform: scale(0);
    opacity: 0;
}

.marker-popup-custom .leaflet-popup-content {
    margin: 0 !important;
    width: auto !important;
    line-height: 1.2;
}

.marker-popup-custom .leaflet-popup-tip-container {
    display: none;
}

.marker-popup-custom.popup-visible .leaflet-popup-content-wrapper {
    transform: scale(1);
    opacity: 1;
}

/* Syncing Glow Effects */
@keyframes pulse-gold {
    0% { filter: drop-shadow(0 0 2px gold); }
    50% { filter: drop-shadow(0 0 8px gold); }
    100% { filter: drop-shadow(0 0 2px gold); }
}

.syncing-glow-marker {
    animation: pulse-gold 1.5s infinite;
}

/* For SVG Paths (Polylines) */
.leaflet-overlay-pane path.syncing-glow-path {
    stroke: gold !important; /* Override color temporarily */
    stroke-opacity: 0.8;
    filter: drop-shadow(0 0 4px gold);
    animation: pulse-gold-path 1.5s infinite;
}

@keyframes pulse-gold-path {
    0% { stroke-width: inherit; filter: drop-shadow(0 0 2px gold); }
    50% { stroke-width: inherit; filter: drop-shadow(0 0 6px gold); }
    100% { stroke-width: inherit; filter: drop-shadow(0 0 2px gold); }
}
</style>