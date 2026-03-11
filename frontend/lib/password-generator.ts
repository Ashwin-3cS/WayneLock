/**
 * WayneLock client-side password generator.
 * Multi-layer crypto: device entropy (C) + placeholder R1/R2 (drand later) → HKDF → scrypt → final password.
 */

import { scrypt } from "scrypt-js";

// App salts (deterministic, app-specific)
const APP_SALT1 = new Uint8Array(32);
const APP_SALT2 = new Uint8Array(32);
for (let i = 0; i < 32; i++) {
  APP_SALT1[i] = i;
  APP_SALT2[i] = i + 32;
}

const CONTEXT_LOCAL = "local_raw_v1";
const CONTEXT_SEED = "seed_v1";

// Scrypt params (memory-hard): N=2^14, r=8, p=1
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

export type GenerateOptions = {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
};

function arrayToBase64(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr));
}

/** Step 1: Device secret (C) - 32 bytes, never leaves device */
function generateDeviceSecret(): Uint8Array {
  const deviceSecret = crypto.getRandomValues(new Uint8Array(32));
  console.log("🔐 Step 1: Generated device secret (C):", arrayToBase64(deviceSecret));
  return deviceSecret;
}

/** Placeholder R1/R2 (replace with drand later) - 32 bytes each */
function getPlaceholderR1(): Uint8Array {
  const r1 = crypto.getRandomValues(new Uint8Array(32));
  console.log("🎲 Step 2 (placeholder): R1 bytes:", arrayToBase64(r1));
  return r1;
}

function getPlaceholderR2(): Uint8Array {
  const r2 = crypto.getRandomValues(new Uint8Array(32));
  console.log("🎲 Step 5 (placeholder): R2 bytes:", arrayToBase64(r2));
  return r2;
}

/** HKDF-SHA256 using Web Crypto API (browser-native) */
async function hkdf(
  ikm: Uint8Array,
  lengthBytes: number,
  salt: Uint8Array,
  info: string
): Promise<Uint8Array> {
  const infoBytes = new TextEncoder().encode(info);
  const key = await crypto.subtle.importKey("raw", ikm, { name: "HKDF" }, false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt,
      info: infoBytes,
    },
    key,
    lengthBytes * 8
  );
  return new Uint8Array(derived);
}

/** Step 3: Mix R1 + C → local_raw (HKDF) */
async function generateLocalRaw(r1: Uint8Array, deviceSecret: Uint8Array): Promise<Uint8Array> {
  const ikm = new Uint8Array(r1.length + deviceSecret.length + CONTEXT_LOCAL.length);
  ikm.set(r1, 0);
  ikm.set(deviceSecret, r1.length);
  ikm.set(new TextEncoder().encode(CONTEXT_LOCAL), r1.length + deviceSecret.length);

  console.log("🔗 HKDF Step 3: IKM length:", ikm.length, "salt=app_salt1, info=local_raw_v1");
  const localRaw = await hkdf(ikm, 32, APP_SALT1, CONTEXT_LOCAL);
  console.log("🔗 Step 3: local_raw (HKDF):", arrayToBase64(localRaw));
  return localRaw;
}

/** Step 4: Harden local_raw → LocalKey (scrypt) */
async function generateLocalKey(localRaw: Uint8Array): Promise<{ localKey: Uint8Array; salt1: Uint8Array }> {
  const salt1 = crypto.getRandomValues(new Uint8Array(16));
  console.log("🛡️ Step 4: scrypt(local_raw, salt1), N=", SCRYPT_N, "r=", SCRYPT_R, "p=", SCRYPT_P);

  const localKey = await scryptAsync(localRaw, salt1, SCRYPT_N, SCRYPT_R, SCRYPT_P, 32);
  console.log("🛡️ Step 4: LocalKey:", arrayToBase64(localKey), "salt1:", arrayToBase64(salt1));
  return { localKey, salt1 };
}

/** Step 6: seed_raw = HKDF(LocalKey || R2 || context2), then Password_bytes = scrypt(seed_raw, password_salt) */
async function generatePasswordBytes(
  localKey: Uint8Array,
  r2: Uint8Array
): Promise<{ passwordBytes: Uint8Array; passwordSalt: Uint8Array }> {
  const ikm = new Uint8Array(localKey.length + r2.length + CONTEXT_SEED.length);
  ikm.set(localKey, 0);
  ikm.set(r2, localKey.length);
  ikm.set(new TextEncoder().encode(CONTEXT_SEED), localKey.length + r2.length);

  console.log("🌱 HKDF Step 6a: seed_raw = HKDF(LocalKey||R2||seed_v1)");
  const seedRaw = await hkdf(ikm, 32, APP_SALT2, CONTEXT_SEED);
  console.log("🌱 Step 6a: seed_raw:", arrayToBase64(seedRaw));

  const passwordSalt = crypto.getRandomValues(new Uint8Array(16));
  console.log("🔑 Step 6b: Password_bytes = scrypt(seed_raw, password_salt)");
  const passwordBytes = await scryptAsync(seedRaw, passwordSalt, SCRYPT_N, SCRYPT_R, SCRYPT_P, 32);
  console.log("🔑 Step 6b: Password_bytes:", arrayToBase64(passwordBytes));
  return { passwordBytes, passwordSalt };
}

/** scrypt-js returns Promise<Uint8Array> */
async function scryptAsync(
  password: Uint8Array,
  salt: Uint8Array,
  N: number,
  r: number,
  p: number,
  dkLen: number
): Promise<Uint8Array> {
  return scrypt(password, salt, N, r, p, dkLen);
}

/** Build charset from options (94 chars full set, or subset) */
function buildCharset(opts: GenerateOptions): string {
  let charset = "";
  if (opts.uppercase) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (opts.lowercase) charset += "abcdefghijklmnopqrstuvwxyz";
  if (opts.numbers) charset += "0123456789";
  if (opts.symbols) charset += "!@#$%^&*()_+-=[]{}|;:,.<>?";
  if (charset.length === 0) charset = "abcdefghijklmnopqrstuvwxyz";
  return charset;
}

/** Map 32-byte password material to a string of given length and charset */
function bytesToPassword(passwordBytes: Uint8Array, length: number, charset: string): string {
  let password = "";
  for (let i = 0; i < length; i++) {
    const index = passwordBytes[i % passwordBytes.length]! % charset.length;
    password += charset[index];
  }
  console.log("🎯 Final password length:", length, "charset size:", charset.length);
  return password;
}

export type PasswordGenerationResult = {
  password: string;
  metadata: {
    deviceSecretB64: string;
    r1B64: string;
    r2B64: string;
    localRawB64: string;
    localKeyB64: string;
    passwordBytesB64: string;
  };
};

/**
 * Full pipeline: C → R1 (placeholder) → HKDF → local_raw → scrypt → LocalKey;
 * R2 (placeholder) → HKDF( LocalKey || R2 ) → seed_raw → scrypt → Password_bytes → human password.
 */
export async function generatePassword(opts: GenerateOptions): Promise<PasswordGenerationResult> {
  console.log("🚀 STARTING PASSWORD GENERATION (device entropy + placeholder R1/R2, drand later)");
  console.log("📊 Options:", opts);

  const deviceSecret = generateDeviceSecret();
  const r1 = getPlaceholderR1();

  const localRaw = await generateLocalRaw(r1, deviceSecret);
  const { localKey, salt1 } = await generateLocalKey(localRaw);

  const r2 = getPlaceholderR2();
  const { passwordBytes, passwordSalt } = await generatePasswordBytes(localKey, r2);

  const charset = buildCharset(opts);
  const password = bytesToPassword(passwordBytes, opts.length, charset);

  console.log("🎯 Final password (first 4 chars masked in log):", password.slice(0, 2) + "****");
  console.log("✅ PASSWORD GENERATION COMPLETED");

  return {
    password,
    metadata: {
      deviceSecretB64: arrayToBase64(deviceSecret),
      r1B64: arrayToBase64(r1),
      r2B64: arrayToBase64(r2),
      localRawB64: arrayToBase64(localRaw),
      localKeyB64: arrayToBase64(localKey),
      passwordBytesB64: arrayToBase64(passwordBytes),
    },
  };
}
