// src/lib/session.ts
// HMAC-SHA256 session token, ditandatangani dengan Web Crypto (crypto.subtle)
// supaya jalan di runtime Proxy (Node.js) maupun Route Handler tanpa dependency baru.

export interface SessionPayload {
  uid: string;
  sid: string;
  iat: number;
  exp: number;
}

export const SESSION_COOKIE_NAME = 'hl_session';

const SESSION_DURATION_MS = {
  DEFAULT: 12 * 60 * 60 * 1000, // 12 jam
  VIEWER: 7 * 24 * 60 * 60 * 1000, // 7 hari
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'SESSION_SECRET belum diset (atau kurang dari 32 karakter). Set env SESSION_SECRET sebelum menjalankan aplikasi.'
    );
  }
  return secret;
}

async function getHmacKey(): Promise<CryptoKey> {
  const secret = getSessionSecret();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export function createSessionPayload(uid: string, role: string): SessionPayload {
  const now = Date.now();
  const duration = role === 'VIEWER' ? SESSION_DURATION_MS.VIEWER : SESSION_DURATION_MS.DEFAULT;
  return {
    uid,
    sid: crypto.randomUUID(),
    iat: now,
    exp: now + duration,
  };
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const key = await getHmacKey();
  const body = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const sig = bytesToBase64Url(new Uint8Array(signature));
  return `${body}.${sig}`;
}

export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  // Sengaja di LUAR try/catch: kalau SESSION_SECRET hilang/tidak valid, ini harus
  // melempar error yang jelas ke pemanggil (proxy/getCurrentUser), bukan tertelan
  // jadi "session tidak valid" yang bikin semua orang diam-diam dilempar ke /login
  // tanpa pesan apa pun.
  const key = await getHmacKey();

  try {
    const signatureBytes = base64UrlToBytes(sig);
    const valid = await crypto.subtle.verify('HMAC', key, signatureBytes.buffer as ArrayBuffer, encoder.encode(body));
    if (!valid) return null;

    const payload = JSON.parse(decoder.decode(base64UrlToBytes(body))) as Partial<SessionPayload>;
    if (typeof payload.uid !== 'string' || typeof payload.sid !== 'string' || typeof payload.exp !== 'number') {
      return null;
    }
    if (Date.now() >= payload.exp) return null;

    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export function sessionMaxAgeSeconds(payload: SessionPayload): number {
  return Math.round((payload.exp - payload.iat) / 1000);
}
