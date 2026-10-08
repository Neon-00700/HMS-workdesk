/* ─── Demo-grade password hashing (LOCAL-ONLY demo adapter) ─────
   This is NOT cryptographically secure — it only avoids storing plaintext
   passwords in the browser's localStorage. The real backend uses PBKDF2. */

const SALT = "hamyaran-demo-v1";

export function hashPassword(password: string): string {
  const s = `${SALT}:${password}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x811c9dc5) >>> 0;
  }
  return `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}

export function verifyPassword(password: string, hash?: string): boolean {
  if (!hash || password.length < 1) return false;
  return hashPassword(password) === hash;
}
