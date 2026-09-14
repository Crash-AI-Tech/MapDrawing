export class QueryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QueryValidationError';
  }
}

function requiredFinite(params: URLSearchParams, name: string): number {
  const raw = params.get(name);
  if (raw == null || raw.trim() === '') {
    throw new QueryValidationError(`${name} is required`);
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new QueryValidationError(`${name} must be finite`);
  return value;
}

export function parseViewport(
  params: URLSearchParams,
  maxSpanDegrees: number,
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const minLat = requiredFinite(params, 'minLat');
  const maxLat = requiredFinite(params, 'maxLat');
  const minLng = requiredFinite(params, 'minLng');
  const maxLng = requiredFinite(params, 'maxLng');

  if (minLat < -85.05112878 || maxLat > 85.05112878 || minLng < -180 || maxLng > 180) {
    throw new QueryValidationError('Viewport is outside Web Mercator bounds');
  }
  if (minLat > maxLat || minLng > maxLng) {
    throw new QueryValidationError('Viewport bounds are reversed');
  }
  if (maxLat - minLat > maxSpanDegrees || maxLng - minLng > maxSpanDegrees) {
    throw new QueryValidationError('Viewport is too large');
  }
  return { minLat, maxLat, minLng, maxLng };
}

export function parseInteger(
  params: URLSearchParams,
  name: string,
  defaultValue: number,
  min: number,
  max: number,
): number {
  const raw = params.get(name);
  if (raw == null) return defaultValue;
  if (!/^\d+$/.test(raw)) throw new QueryValidationError(`${name} must be an integer`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new QueryValidationError(`${name} must be between ${min} and ${max}`);
  }
  return value;
}

export function parseCursor(params: URLSearchParams): { createdAt: number; id: string } | undefined {
  const rawCreatedAt = params.get('cursorCreatedAt');
  const id = params.get('cursorId');
  if (rawCreatedAt == null && id == null) return undefined;
  if (rawCreatedAt == null || id == null || !/^\d+$/.test(rawCreatedAt)) {
    throw new QueryValidationError('Both cursor fields are required');
  }
  const createdAt = Number(rawCreatedAt);
  if (!Number.isSafeInteger(createdAt) || createdAt < 0 || !/^[A-Za-z0-9._:-]{1,128}$/.test(id)) {
    throw new QueryValidationError('Cursor is invalid');
  }
  return { createdAt, id };
}
