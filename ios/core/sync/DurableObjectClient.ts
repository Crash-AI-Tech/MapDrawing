import type { SyncState, DrawEvent, SyncMessage } from '../types';
import { deserializeEvent } from './EventStream';
import 'react-native-get-random-values';
import uuid from 'react-native-uuid';

export type DOConnectionListener = (state: SyncState) => void;
export type DOMessageListener = (event: DrawEvent, senderId: string) => void;

export interface DOClientConfig {
    /** WebSocket URL for the Durable Objects worker */
    baseUrl: string;
    /** Auth token for the connection */
    accessToken: string;
    /** Current user ID */
    userId: string;
}

/**
 * DurableObjectClient — WebSocket client for connecting to Cloudflare DO rooms.
 * Validates connection state and handles reconnection logic.
 */
export class DurableObjectClient {
    private ws: WebSocket | null = null;
    private config: DOClientConfig;
    private currentRoom: string | null = null;
    private state: SyncState = 'disconnected';
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private reconnectBaseDelay = 1000; // ms

    private connectionListeners = new Set<DOConnectionListener>();
    private messageListeners = new Set<DOMessageListener>();

    constructor(config: DOClientConfig) {
        this.config = config;
    }

    /** Connect to a specific room (tile key) */
    connect(room: string): void {
        if (this.currentRoom === room && this.ws?.readyState === WebSocket.OPEN) {
            return;
        }

        if (this.currentRoom !== room) {
            this.disconnect();
        }

        this.currentRoom = room;
        this.setState('connecting');

        try {
            const protocol = this.config.baseUrl.startsWith('http')
                ? this.config.baseUrl.replace('http', 'ws')
                : this.config.baseUrl;

            // Ensure trailing slash is handled correctly
            const baseUrl = protocol.endsWith('/') ? protocol.slice(0, -1) : protocol;
            const url = `${baseUrl}/ws/${encodeURIComponent(room)}?token=${this.config.accessToken}&userId=${this.config.userId}`;

            // React Native global WebSocket
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                this.reconnectAttempts = 0;
                this.setState('connected');
            };

            this.ws.onmessage = (event) => {
                this.handleMessage(event.data);
            };

            this.ws.onclose = (event) => {
                if (event.code !== 1000) {
                    this.setState('disconnected');
                    this.scheduleReconnect();
                } else {
                    this.setState('disconnected');
                }
            };

            this.ws.onerror = (e) => {
                console.warn('[DOClient] WebSocket error:', e);
                this.setState('error');
            };
        } catch (e) {
            console.error('[DOClient] Connection error:', e);
            this.setState('error');
            this.scheduleReconnect();
        }
    }

    send(event: DrawEvent): boolean {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.currentRoom) {
            return false;
        }

        const message: SyncMessage = {
            room: this.currentRoom,
            msgId: uuid.v4() as string,
            event,
            senderId: this.config.userId,
        };

        try {
            this.ws.send(JSON.stringify(message));
            return true;
        } catch {
            return false;
        }
    }

    disconnect(): void {
        this.cancelReconnect();
        if (this.ws) {
            this.ws.onopen = null;
            this.ws.onmessage = null;
            this.ws.onclose = null;
            this.ws.onerror = null;
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.close(1000, 'Client disconnect');
            }
            this.ws = null;
        }
        this.currentRoom = null;
        this.setState('disconnected');
    }

    getState(): SyncState {
        return this.state;
    }

    onStateChange(listener: DOConnectionListener): () => void {
        this.connectionListeners.add(listener);
        return () => this.connectionListeners.delete(listener);
    }

    onMessage(listener: DOMessageListener): () => void {
        this.messageListeners.add(listener);
        return () => this.messageListeners.delete(listener);
    }

    updateToken(token: string): void {
        this.config.accessToken = token;
    }

    dispose(): void {
        this.disconnect();
        this.connectionListeners.clear();
        this.messageListeners.clear();
    }

    // ========================
    // Internals
    // ========================

    private handleMessage(data: string | ArrayBuffer): void {
        if (typeof data !== 'string') return;

        try {
            const message: SyncMessage = JSON.parse(data);

            if (message.senderId === this.config.userId) return;

            const event = message.event;
            if (event) {
                this.messageListeners.forEach((l) => l(event, message.senderId));
            }
        } catch {
            const event = deserializeEvent(data);
            if (event) {
                this.messageListeners.forEach((l) => l(event, ''));
            }
        }
    }

    private setState(state: SyncState): void {
        if (this.state === state) return;
        this.state = state;
        this.connectionListeners.forEach((l) => l(state));
    }

    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.setState('error');
            return;
        }

        this.cancelReconnect();

        const delay =
            this.reconnectBaseDelay * Math.pow(2, this.reconnectAttempts) +
            Math.random() * 1000;

        this.reconnectTimer = setTimeout(() => {
            this.reconnectAttempts++;
            if (this.currentRoom) {
                this.connect(this.currentRoom);
            }
        }, delay);
    }

    private cancelReconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
}
