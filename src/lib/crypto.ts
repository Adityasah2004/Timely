import CryptoJS from 'crypto-js';

const ENVELOPE_PREFIX = '__E2EE__::';

/**
 * Derives a strong 256-bit key from a user passcode using SHA-256
 */
export function deriveKey(passcode: string): string {
  return CryptoJS.SHA256(passcode.trim()).toString(CryptoJS.enc.Hex);
}

/**
 * Encrypts plain text using AES-256-CBC.
 * Uses a deterministic Initialization Vector (IV) derived from the key itself
 * to bypass React Native's missing native cryptographically secure random generator in Expo Go.
 */
export function encryptText(text: string, keyHex: string): string {
  if (!text) return '';
  try {
    const key = CryptoJS.enc.Hex.parse(keyHex);
    // Derive a 128-bit (16-byte) IV from the first 32 characters of the hex key
    const ivHex = keyHex.substring(0, 32);
    const iv = CryptoJS.enc.Hex.parse(ivHex);

    const encrypted = CryptoJS.AES.encrypt(text, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    return `${ENVELOPE_PREFIX}${encrypted.toString()}`;
  } catch (err) {
    console.warn('Encryption error:', err);
    return text;
  }
}

/**
 * Decrypts E2EE ciphertext using AES-256-CBC with the derived IV.
 * If the message is unencrypted (legacy history), it bypasses decryption.
 */
export function decryptText(text: string, keyHex: string): string {
  if (!text) return '';
  
  // Check if it is encrypted with our E2EE envelope
  if (!text.startsWith(ENVELOPE_PREFIX)) {
    return text; // Graceful backward compatibility for legacy plain text messages
  }
  
  try {
    const cipherText = text.substring(ENVELOPE_PREFIX.length);
    const key = CryptoJS.enc.Hex.parse(keyHex);
    const ivHex = keyHex.substring(0, 32);
    const iv = CryptoJS.enc.Hex.parse(ivHex);

    const decrypted = CryptoJS.AES.decrypt(cipherText, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    const plainText = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!plainText) {
      return '🔒 [Decryption failed: wrong war room key]';
    }
    return plainText;
  } catch (err) {
    return '🔒 [Decryption failed: wrong war room key]';
  }
}
