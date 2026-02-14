import type { DrawEvent } from '../types';

/**
 * EventStream — simple serialization helpers.
 * In the future this could use Protobuf or MessagePack.
 */

export function serializeEvent(event: DrawEvent): string {
    return JSON.stringify(event);
}

export function deserializeEvent(data: string): DrawEvent | null {
    try {
        return JSON.parse(data);
    } catch {
        return null;
    }
}
