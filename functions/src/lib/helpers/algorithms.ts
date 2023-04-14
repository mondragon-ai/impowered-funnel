import * as crypto from "crypto";

const algorithm = "aes-256-cbc";
const key = Buffer.from("739cee5373d844885b8ba15815dc2899314d2a8bf836c5124b321c818b175d58", "hex"); //crypto.randomBytes(32);
const iv = Buffer.from("01ec86cf7ac60bcc0ef84f70be4ed6c5", "hex"); //crypto.randomBytes(16);

/**
 * Encrypts the given string
 * @param text the string to encrypt
 * @returns the encrypted string
 */
export const encryptToken = (text: string): string => {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

/**
 * Decrypts the given string
 * @param text the string to decrypt
 * @returns the decrypted string
 */
export const decryptToken = (text: string): string => {
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(text, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}