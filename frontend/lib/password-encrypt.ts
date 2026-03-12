/**
 * Encrypt generated password and wrap the data encryption key (DEK) with a master key.
 * You need the master key to unwrap the key; only then can you decrypt the blob.
 */

const AES_GCM_IV_LEN = 12;
const AES_GCM_TAG_LEN = 16;
const KEY_LEN = 32;

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToB64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

async function aesGcmEncrypt(
  plaintext: Uint8Array,
  key: CryptoKey,
  iv: Uint8Array
): Promise<Uint8Array> {
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource, tagLength: 128 },
    key,
    plaintext as BufferSource
  );
  return new Uint8Array(ciphertext);
}

async function aesGcmDecrypt(
  ciphertext: Uint8Array,
  key: CryptoKey,
  iv: Uint8Array
): Promise<Uint8Array> {
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource, tagLength: 128 },
    key,
    ciphertext as BufferSource
  );
  return new Uint8Array(plaintext);
}

async function importKey(bytes: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", bytes as BufferSource, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export type EncryptResult = {
  /** Encrypted password (base64: IV || ciphertext+tag) */
  encryptedBlob: string;
  /** DEK wrapped with master key (base64: IV || ciphertext+tag). Retrieve DEK only with master key. */
  key: string;
  /** Master key (base64). Save this; needed to unwrap key and decrypt. */
  masterKey: string;
};

export type EncryptForLitResult = {
  /** Encrypted password (base64: IV || ciphertext+tag) */
  encryptedBlob: string;
  /** Raw DEK (base64) to be encrypted & stored with Lit */
  dekB64: string;
};

/**
 * Encrypt the password: produce encrypted blob and a wrapped key.
 * The key can only be unwrapped (to get the data encryption key) if you have the master key.
 */
export async function encryptPassword(password: string): Promise<EncryptResult> {
  const passwordBytes = new TextEncoder().encode(password);

  // Data encryption key (DEK) - random, used only to encrypt the password
  const dek = crypto.getRandomValues(new Uint8Array(KEY_LEN));
  const dekKey = await importKey(dek);

  // Encrypt password with DEK → encrypted blob (IV || ciphertext)
  const blobIv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LEN));
  const ciphertext = await aesGcmEncrypt(passwordBytes, dekKey, blobIv);
  const encryptedBlob = bytesToB64(
    new Uint8Array([...blobIv, ...ciphertext])
  );

  // Master key - random; user must save it to later unwrap the key
  const masterKeyBytes = crypto.getRandomValues(new Uint8Array(KEY_LEN));
  const masterKey = bytesToB64(masterKeyBytes);
  const masterKeyCrypto = await importKey(masterKeyBytes);

  // Wrap DEK with master key → key (IV || ciphertext). Without master key you cannot get DEK.
  const wrapIv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LEN));
  const wrappedDek = await aesGcmEncrypt(dek, masterKeyCrypto, wrapIv);
  const key = bytesToB64(new Uint8Array([...wrapIv, ...wrappedDek]));

  console.log("🔒 Encrypted password: encryptedBlob length", encryptedBlob.length, "key length", key.length);
  console.log("🔒 Master key (base64) - save this to decrypt later");

  return { encryptedBlob, key, masterKey };
}

/**
 * Encrypt the password for the Lit flow:
 * - Encrypt password with a random DEK (AES-GCM) → encryptedBlob
 * - Return the raw DEK so it can be encrypted + gated by Lit access control conditions
 */
export async function encryptPasswordForLit(password: string): Promise<EncryptForLitResult> {
  const passwordBytes = new TextEncoder().encode(password);

  const dek = crypto.getRandomValues(new Uint8Array(KEY_LEN));
  const dekKey = await importKey(dek);

  const blobIv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LEN));
  const ciphertext = await aesGcmEncrypt(passwordBytes, dekKey, blobIv);
  const encryptedBlob = bytesToB64(new Uint8Array([...blobIv, ...ciphertext]));

  console.log("🔒 Encrypted (Lit flow): encryptedBlob length", encryptedBlob.length);
  return { encryptedBlob, dekB64: bytesToB64(dek) };
}

/** Decrypt encrypted blob using a DEK (base64). */
export async function decryptBlobWithDek(encryptedBlob: string, dekB64: string): Promise<string> {
  const blobBytes = b64ToBytes(encryptedBlob);
  const dek = b64ToBytes(dekB64);

  const blobIv = blobBytes.slice(0, AES_GCM_IV_LEN);
  const blobCiphertext = blobBytes.slice(AES_GCM_IV_LEN);

  const dekKey = await importKey(dek);
  const passwordBytes = await aesGcmDecrypt(blobCiphertext, dekKey, blobIv);
  return new TextDecoder().decode(passwordBytes);
}

/**
 * Retrieve the password from encrypted blob + key using the master key.
 * Unwraps key with master key to get DEK, then decrypts blob with DEK.
 */
export async function decryptPassword(
  encryptedBlob: string,
  key: string,
  masterKey: string
): Promise<string> {
  const blobBytes = b64ToBytes(encryptedBlob);
  const keyBytes = b64ToBytes(key);
  const masterKeyBytes = b64ToBytes(masterKey);

  const blobIv = blobBytes.slice(0, AES_GCM_IV_LEN);
  const blobCiphertext = blobBytes.slice(AES_GCM_IV_LEN);

  const wrapIv = keyBytes.slice(0, AES_GCM_IV_LEN);
  const wrappedDek = keyBytes.slice(AES_GCM_IV_LEN);

  const masterKeyCrypto = await importKey(masterKeyBytes);
  const dek = await aesGcmDecrypt(wrappedDek, masterKeyCrypto, wrapIv);
  const dekKey = await importKey(dek);

  const passwordBytes = await aesGcmDecrypt(blobCiphertext, dekKey, blobIv);
  return new TextDecoder().decode(passwordBytes);
}
