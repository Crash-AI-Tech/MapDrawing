export class RequestBodyError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'RequestBodyError';
  }
}

/** Read and parse JSON without allowing the Worker to buffer an unbounded body. */
export async function readJsonBody(
  request: Request,
  maxBytes: number,
): Promise<unknown> {
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new RequestBodyError(`Request body exceeds ${maxBytes} bytes`, 413);
  }

  if (!request.body) {
    throw new RequestBodyError('Request body is required', 400);
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel('request body too large');
        throw new RequestBodyError(`Request body exceeds ${maxBytes} bytes`, 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new RequestBodyError('Invalid JSON body', 400);
  }
}
