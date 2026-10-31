/**
 * Token de redefinição de senha.
 *
 * O valor em claro vai só no link do e-mail; no banco guardamos o SHA-256.
 * Como o token é aleatório e longo (32 bytes), o hash simples basta — não há
 * o que adivinhar por força bruta, diferente de uma senha escolhida por
 * pessoa, que precisa de bcrypt.
 */
import { createHash, randomBytes } from 'node:crypto';

/** Quanto tempo o link do e-mail continua valendo. */
export const RESET_TTL_MINUTES = 60;

/** Token em claro, seguro para viajar numa URL. */
export function generateResetToken() {
  return randomBytes(32).toString('base64url');
}

/** @param {string} token @returns {string} hash guardado no banco */
export function hashResetToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

/** Instante de expiração de um token criado agora. */
export function resetTokenExpiry(now = new Date()) {
  return new Date(now.getTime() + RESET_TTL_MINUTES * 60 * 1000);
}

/**
 * Em que estado está um pedido de redefinição.
 * @param {{expiresAt: Date, usedAt: Date|null}|null|undefined} record
 * @returns {'valido'|'inexistente'|'usado'|'expirado'}
 */
export function resetTokenState(record, now = new Date()) {
  if (!record) return 'inexistente';
  if (record.usedAt) return 'usado';
  if (record.expiresAt <= now) return 'expirado';
  return 'valido';
}
