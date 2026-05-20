// Password-derived AES-GCM encryption for the SpacetimeDB session token.
// Used so credential rows can be stored in a public SpacetimeDB table without
// exposing the plaintext token — only someone who knows the password can
// decrypt. The server never sees the password or the unencrypted token.

const PBKDF2_ITERATIONS = 150_000;
const KEY_LENGTH_BITS = 256;
const IV_LENGTH_BYTES = 12;

type EncryptedBundle = {
  v: 1;
  iter: number;
  salt: string;
  iv: string;
  ct: string;
};

export async function encryptToken(plaintextToken: string, password: string, salt: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("WebCrypto not available");
  }
  const enc = new TextEncoder();
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: bytesToArrayBuffer(iv) },
    key,
    enc.encode(plaintextToken)
  );
  const bundle: EncryptedBundle = {
    v: 1,
    iter: PBKDF2_ITERATIONS,
    salt,
    iv: bytesToBase64(iv),
    ct: bytesToBase64(new Uint8Array(ciphertext))
  };
  return JSON.stringify(bundle);
}

export async function decryptToken(encrypted: string, password: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("WebCrypto not available");
  }
  const bundle = parseBundle(encrypted);
  const key = await deriveKey(password, bundle.salt, bundle.iter);
  const iv = base64ToBytes(bundle.iv);
  const ct = base64ToBytes(bundle.ct);
  let plaintextBuffer: ArrayBuffer;
  try {
    plaintextBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytesToArrayBuffer(iv) },
      key,
      bytesToArrayBuffer(ct)
    );
  } catch {
    throw new InvalidPasswordError();
  }
  return new TextDecoder().decode(plaintextBuffer);
}

export class InvalidPasswordError extends Error {
  constructor() {
    super("incorrect password");
    this.name = "InvalidPasswordError";
  }
}

async function deriveKey(password: string, salt: string, iterations: number): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: KEY_LENGTH_BITS },
    false,
    ["encrypt", "decrypt"]
  );
}

function parseBundle(raw: string): EncryptedBundle {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("malformed encrypted token");
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    (parsed as { v?: unknown }).v !== 1
  ) {
    throw new Error("unsupported encrypted token version");
  }
  return parsed as EncryptedBundle;
}

function bytesToBase64(bytes: Uint8Array): string {
  let str = "";
  for (let i = 0; i < bytes.length; i += 1) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const str = atob(b64);
  const buffer = new ArrayBuffer(str.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < str.length; i += 1) {
    bytes[i] = str.charCodeAt(i);
  }
  return bytes;
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  const view = new Uint8Array(buffer);
  view.set(bytes);
  return buffer;
}
