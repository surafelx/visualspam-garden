const PASSPHRASE = "vsg-garden-2025";
const SALT = new Uint8Array([118, 115, 103, 45, 115, 97, 108, 116]); // "vsg-salt"
const ITERATIONS = 100000;

async function deriveKey() {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(PASSPHRASE), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: SALT, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptText(plaintext) {
  if (!plaintext) return "";
  const key = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
  const buf = new Uint8Array(ciphertext);
  const combined = new Uint8Array(iv.length + buf.length);
  combined.set(iv, 0);
  combined.set(buf, iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptText(ciphertext) {
  if (!ciphertext) return "";
  try {
    const key = await deriveKey();
    const raw = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
    const iv = raw.slice(0, 12);
    const data = raw.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch {
    return "";
  }
}
