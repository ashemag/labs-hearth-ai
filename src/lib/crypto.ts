// lib/crypto.ts
// AES-256-GCM encryption for API keys stored in Supabase
// Uses ENCRYPTION_KEY env var (32-byte hex string)

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm" as const;

function getKey(): Uint8Array {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key.length !== 64) {
        throw new Error("ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
    }
    return new Uint8Array(Buffer.from(key, "hex"));
}

/**
 * Encrypt a plaintext string.
 * Returns base64 string: iv:authTag:ciphertext
 */
export function encrypt(plaintext: string): string {
    const key = getKey();
    const ivBuffer = randomBytes(12);
    const iv = new Uint8Array(ivBuffer);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, "utf8", "base64");
    encrypted += cipher.final("base64");
    const authTag = cipher.getAuthTag();

    return `${ivBuffer.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
}

/**
 * Decrypt a string produced by encrypt().
 */
export function decrypt(encryptedStr: string): string {
    const key = getKey();
    const [ivB64, authTagB64, ciphertext] = encryptedStr.split(":");

    if (!ivB64 || !authTagB64 || !ciphertext) {
        throw new Error("Invalid encrypted string format");
    }

    const iv = new Uint8Array(Buffer.from(ivB64, "base64"));
    const authTag = new Uint8Array(Buffer.from(authTagB64, "base64"));
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
}
