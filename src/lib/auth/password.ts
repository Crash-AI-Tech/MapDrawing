/**
 * 密码哈希工具
 * 使用 Argon2id (OWASP 推荐)
 *
 * 注意: @node-rs/argon2 在 Edge Runtime 中可能不可用，
 * 备选方案: 使用 Web Crypto API 实现 PBKDF2
 */

// Argon2 配置 (OWASP 推荐参数)
const ARGON2_OPTIONS = {
  memoryCost: 19456, // 19 MB
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

/**
 * 哈希密码
 * 优先使用 Argon2，降级到 PBKDF2
 */
export async function hashPassword(password: string): Promise<string> {
  // 直接使用 Web Crypto PBKDF2 (Edge Runtime 兼容)
  // Argon2 (@node-rs/argon2) 不兼容 Edge Runtime / Turbopack，故统一使用 PBKDF2
  return hashWithPBKDF2(password);
}

/**
 * 验证密码
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  // PBKDF2 格式: pbkdf2:iterations:salt:hash
  if (hashedPassword.startsWith('pbkdf2:')) {
    return verifyWithPBKDF2(password, hashedPassword);
  }

  // 不支持 Argon2 格式 (Edge Runtime 不兼容)
  return false;
}

// ==========================================
// PBKDF2 备选方案 (Edge Runtime 兼容)
// ==========================================

const PBKDF2_ITERATIONS = 600_000; // OWASP 2024 推荐

async function hashWithPBKDF2(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const saltHex = bufferToHex(salt);
  const hashHex = bufferToHex(new Uint8Array(hashBuffer));

  return `pbkdf2:${PBKDF2_ITERATIONS}:${saltHex}:${hashHex}`;
}

async function verifyWithPBKDF2(
  password: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split(':');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;

  const iterations = parseInt(parts[1], 10);
  const salt = hexToBuffer(parts[2]);
  const expectedHash = parts[3];

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const hashHex = bufferToHex(new Uint8Array(hashBuffer));
  return timingSafeEqual(hashHex, expectedHash);
}

function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * 时间安全的字符串比较（防止时序攻击）
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
