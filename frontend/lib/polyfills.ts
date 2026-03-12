// Browser polyfills needed by some Lit SDK internals under Next.js/Turbopack.
// Lit depends on the `buffer` package, but the global `Buffer` may not be defined.
import { Buffer } from "buffer";

if (!(globalThis as any).Buffer) {
  (globalThis as any).Buffer = Buffer;
}

// Some CJS deps expect `global` and `process` to exist in the browser bundle.
if (!(globalThis as any).global) {
  (globalThis as any).global = globalThis;
}
if (!(globalThis as any).process) {
  (globalThis as any).process = { env: {} };
}

// Some environments/polyfill builds may miss BigInt write helpers.
// Lit's internal E2EE uses writeBigUInt64BE.
const B: any = (globalThis as any).Buffer;
if (B?.prototype && typeof B.prototype.writeBigUInt64BE !== "function") {
  B.prototype.writeBigUInt64BE = function writeBigUInt64BE(value: any, offset = 0) {
    const v = typeof value === "bigint" ? value : BigInt(value);
    for (let i = 0; i < 8; i++) {
      this[offset + i] = Number((v >> BigInt(56 - i * 8)) & 255n);
    }
    return offset + 8;
  };
}
if (B?.prototype && typeof B.prototype.writeBigUInt64LE !== "function") {
  B.prototype.writeBigUInt64LE = function writeBigUInt64LE(value: any, offset = 0) {
    const v = typeof value === "bigint" ? value : BigInt(value);
    for (let i = 0; i < 8; i++) {
      this[offset + i] = Number((v >> BigInt(i * 8)) & 255n);
    }
    return offset + 8;
  };
}

// As a last resort, some bundler paths may hand Lit a plain Uint8Array and still call
// `writeBigUInt64BE` on it. Patch the prototype to avoid runtime crashes.
const U: any = Uint8Array.prototype as any;
if (typeof U.writeBigUInt64BE !== "function") {
  U.writeBigUInt64BE = function writeBigUInt64BE(value: any, offset = 0) {
    const v = typeof value === "bigint" ? value : BigInt(value);
    for (let i = 0; i < 8; i++) {
      this[offset + i] = Number((v >> BigInt(56 - i * 8)) & 255n);
    }
    return offset + 8;
  };
}
if (typeof U.writeBigUInt64LE !== "function") {
  U.writeBigUInt64LE = function writeBigUInt64LE(value: any, offset = 0) {
    const v = typeof value === "bigint" ? value : BigInt(value);
    for (let i = 0; i < 8; i++) {
      this[offset + i] = Number((v >> BigInt(i * 8)) & 255n);
    }
    return offset + 8;
  };
}

