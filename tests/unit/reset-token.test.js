import { describe, it, expect } from 'vitest';
import {
  RESET_TTL_MINUTES,
  generateResetToken,
  hashResetToken,
  resetTokenExpiry,
  resetTokenState,
} from '@/domain/auth/reset-token.js';
import { buildPasswordResetEmail } from '@/domain/auth/reset-email.js';

describe('generateResetToken', () => {
  it('gera tokens distintos', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateResetToken()));
    expect(tokens.size).toBe(50);
  });

  it('usa só caracteres seguros numa URL', () => {
    for (let i = 0; i < 20; i += 1) {
      const token = generateResetToken();
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(encodeURIComponent(token)).toBe(token);
    }
  });

  it('tem entropia suficiente (32 bytes em base64url)', () => {
    expect(generateResetToken().length).toBeGreaterThanOrEqual(43);
  });
});

describe('hashResetToken', () => {
  it('é determinístico', () => {
    const token = generateResetToken();
    expect(hashResetToken(token)).toBe(hashResetToken(token));
  });

  it('não devolve o token em claro', () => {
    const token = generateResetToken();
    const hash = hashResetToken(token);
    expect(hash).not.toBe(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('muda por completo com um caractere diferente', () => {
    expect(hashResetToken('abc')).not.toBe(hashResetToken('abd'));
  });
});

describe('resetTokenExpiry', () => {
  it('expira depois do prazo combinado', () => {
    const agora = new Date('2026-03-10T12:00:00Z');
    expect(resetTokenExpiry(agora).toISOString()).toBe(
      new Date(agora.getTime() + RESET_TTL_MINUTES * 60_000).toISOString(),
    );
  });
});

describe('resetTokenState', () => {
  const agora = new Date('2026-03-10T12:00:00Z');
  const futuro = new Date('2026-03-10T12:30:00Z');
  const passado = new Date('2026-03-10T11:30:00Z');

  it('aceita um token novo, dentro do prazo', () => {
    expect(resetTokenState({ expiresAt: futuro, usedAt: null }, agora)).toBe('valido');
  });

  it('recusa token que não existe', () => {
    expect(resetTokenState(null, agora)).toBe('inexistente');
    expect(resetTokenState(undefined, agora)).toBe('inexistente');
  });

  it('recusa token já usado, mesmo dentro do prazo', () => {
    expect(resetTokenState({ expiresAt: futuro, usedAt: passado }, agora)).toBe('usado');
  });

  it('recusa token expirado', () => {
    expect(resetTokenState({ expiresAt: passado, usedAt: null }, agora)).toBe('expirado');
  });

  it('trata o instante exato da expiração como expirado', () => {
    expect(resetTokenState({ expiresAt: agora, usedAt: null }, agora)).toBe('expirado');
  });
});

describe('buildPasswordResetEmail', () => {
  const link = 'https://paroquiasfranciscoxavier.com.br/redefinir-senha?token=abc123';

  it('põe o link no texto e no HTML', () => {
    const email = buildPasswordResetEmail({ name: 'Maria Soprano', link });
    expect(email.text).toContain(link);
    expect(email.html).toContain(link);
  });

  it('chama a pessoa pelo primeiro nome', () => {
    const email = buildPasswordResetEmail({ name: 'Maria Soprano', link });
    expect(email.text).toContain('Olá, Maria.');
    expect(email.text).not.toContain('Soprano');
  });

  it('avisa a validade e que o link é de uso único', () => {
    const email = buildPasswordResetEmail({ name: 'Maria', link });
    expect(email.text).toContain(`${RESET_TTL_MINUTES} minutos`);
    expect(email.text).toContain('uma vez');
  });

  it('escapa HTML vindo do nome cadastrado', () => {
    const email = buildPasswordResetEmail({ name: '<script>alert(1)</script>', link });
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
  });

  it('não quebra com nome vazio', () => {
    const email = buildPasswordResetEmail({ name: '   ', link });
    expect(email.text).toContain('Olá, olá.');
  });

  it('tem assunto', () => {
    expect(buildPasswordResetEmail({ name: 'Maria', link }).subject).toMatch(/senha/i);
  });
});
