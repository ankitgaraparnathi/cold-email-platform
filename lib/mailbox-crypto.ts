import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function getEncryptionKey(): Buffer {
  const encodedKey = process.env.MAILBOX_ENCRYPTION_KEY || "";
  const key = Buffer.from(encodedKey, "base64");

  if (key.length !== 32) {
    throw new Error(
      "MAILBOX_ENCRYPTION_KEY must be a base64-encoded 32-byte key.",
    );
  }

  return key;
}

export function encryptMailboxPassword(password: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(password, "utf8"),
    cipher.final(),
  ]);

  return [
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}

export function decryptMailboxPassword(encrypted: string): string {
  const [ivEncoded, authTagEncoded, ciphertextEncoded] = encrypted.split(".");

  if (!ivEncoded || !authTagEncoded || !ciphertextEncoded) {
    throw new Error("Stored mailbox credentials are invalid.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivEncoded, "base64"),
  );
  decipher.setAuthTag(Buffer.from(authTagEncoded, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextEncoded, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
