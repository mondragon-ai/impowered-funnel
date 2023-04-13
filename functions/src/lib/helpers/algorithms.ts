import * as crypto from "crypto";

const algorithm = "aes-256-cbc";
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

/**
 * Encrypts the given string
 * @param text the string to encrypt
 * @returns the encrypted string
 */
export const encrypt = (text: string): string => {
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
export const decrypt = (text: string): string => {
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(text, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}