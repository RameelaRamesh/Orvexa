import * as crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/[\s-]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/**
 * Generate 6-digit TOTP code (RFC 6238)
 */
export function generateTOTP(secretBase32: string, timeStepOffset: number = 0, timestampMs?: number): string {
  const key = base32Decode(secretBase32);
  const now = timestampMs !== undefined ? timestampMs : Date.now();
  const epoch = Math.floor(now / 1000);
  const timeStep = Math.floor(epoch / 30) + timeStepOffset;

  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(timeStep));

  const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return code.toString().padStart(6, '0');
}

/**
 * Verify 6-digit TOTP code with +/- 1 time step window for clock drift tolerance
 */
export function verifyTOTP(secretBase32: string, token: string, timestampMs?: number): boolean {
  if (!token || typeof token !== 'string') return false;
  const cleanToken = token.trim();
  if (cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) return false;

  // Check current window (0), previous window (-1), and next window (+1)
  for (const windowOffset of [0, -1, 1]) {
    const expected = generateTOTP(secretBase32, windowOffset, timestampMs);
    if (expected === cleanToken) {
      return true;
    }
  }
  return false;
}

/**
 * Generate secure random base32 MFA secret
 */
export function generateMfaSecret(): string {
  const randomBytes = crypto.randomBytes(20);
  return base32Encode(randomBytes);
}

/**
 * Generate 8 single-use recovery codes
 */
export function generateRecoveryCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
  }
  return codes;
}

export const TotpUtil = {
  generateSecret: generateMfaSecret,
  generateToken: (secret: string, offset: number = 0) => generateTOTP(secret, offset),
  verifyToken: (secret: string, token: string, window: number = 1) => verifyTOTP(secret, token),
  generateRecoveryCodes: (count: number = 8) => generateRecoveryCodes(count),
};

