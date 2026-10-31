import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

// O mailer é trocado por um espião: os testes conferem o que seria enviado,
// sem depender de SMTP.
const enviados = [];
vi.mock('@/lib/mailer.js', () => ({
  isMailConfigured: () => true,
  sendMail: async (message) => {
    enviados.push(message);
    return { delivered: true };
  },
}));

const { prisma, resetDatabase, makeCapela, makeMusician } = await import('../helpers/db.js');
const { requestPasswordReset, resetPassword, checkResetToken } = await import(
  '@/services/passwordReset.js'
);
const { authenticate } = await import('@/services/users.js');
const { hashResetToken } = await import('@/domain/auth/reset-token.js');
const bcrypt = (await import('bcryptjs')).default;

const SENHA_ANTIGA = 'senha-antiga-123';
const SENHA_NOVA = 'salmo23aleluia';

let musico;

beforeEach(async () => {
  await resetDatabase();
  enviados.length = 0;
  const capela = await makeCapela();
  musico = await makeMusician({
    capelaId: capela.id,
    email: 'maria@paroquia.org',
    name: 'Maria Soprano',
    passwordHash: await bcrypt.hash(SENHA_ANTIGA, 4),
  });
});
afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

/** Lê o token em claro do último link enviado. */
function tokenDoEmail() {
  const match = /token=([^\s&"]+)/.exec(enviados.at(-1).text);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Afasta o createdAt do token para driblar o anti-reenvio de 1 minuto. */
async function envelhecerPedidos(userId) {
  await prisma.passwordResetToken.updateMany({
    where: { userId },
    data: { createdAt: new Date(Date.now() - 5 * 60 * 1000) },
  });
}

describe('requestPasswordReset', () => {
  it('envia um e-mail com o link para quem tem conta', async () => {
    await requestPasswordReset({ email: 'maria@paroquia.org' });

    expect(enviados).toHaveLength(1);
    expect(enviados[0].to).toBe('maria@paroquia.org');
    expect(enviados[0].subject).toMatch(/senha/i);
    expect(tokenDoEmail()).toBeTruthy();
  });

  it('aceita o e-mail com outra caixa e espaços em volta', async () => {
    await requestPasswordReset({ email: '  MARIA@Paroquia.ORG ' });
    expect(enviados).toHaveLength(1);
  });

  it('guarda apenas o hash do token — nunca o valor do link', async () => {
    await requestPasswordReset({ email: 'maria@paroquia.org' });
    const token = tokenDoEmail();

    const registros = await prisma.passwordResetToken.findMany();
    expect(registros).toHaveLength(1);
    expect(registros[0].tokenHash).toBe(hashResetToken(token));
    expect(registros[0].tokenHash).not.toBe(token);
  });

  it('não revela se o e-mail existe, e não envia nada', async () => {
    const comConta = await requestPasswordReset({ email: 'maria@paroquia.org' });
    enviados.length = 0;
    const semConta = await requestPasswordReset({ email: 'ninguem@paroquia.org' });

    expect(semConta.message).toBe(comConta.message);
    expect(enviados).toHaveLength(0);
    expect(await prisma.passwordResetToken.count()).toBe(1);
  });

  it('recusa e-mail mal escrito', async () => {
    await expect(requestPasswordReset({ email: 'nao-e-email' })).rejects.toThrow(
      /Verifique os campos/,
    );
    expect(enviados).toHaveLength(0);
  });

  it('não reenvia a cada clique repetido', async () => {
    await requestPasswordReset({ email: 'maria@paroquia.org' });
    await requestPasswordReset({ email: 'maria@paroquia.org' });

    expect(enviados).toHaveLength(1);
    expect(await prisma.passwordResetToken.count()).toBe(1);
  });

  it('um pedido novo invalida o link anterior', async () => {
    await requestPasswordReset({ email: 'maria@paroquia.org' });
    const primeiro = tokenDoEmail();
    await envelhecerPedidos(musico.id);

    await requestPasswordReset({ email: 'maria@paroquia.org' });
    const segundo = tokenDoEmail();

    expect(segundo).not.toBe(primeiro);
    expect((await checkResetToken(primeiro)).valid).toBe(false);
    expect((await checkResetToken(segundo)).valid).toBe(true);
    expect(await prisma.passwordResetToken.count()).toBe(1);
  });

  it('o link aponta para a página de redefinição da aplicação', async () => {
    await requestPasswordReset({ email: 'maria@paroquia.org' });
    expect(enviados[0].text).toMatch(/https?:\/\/[^\s]+\/redefinir-senha\?token=/);
  });
});

describe('checkResetToken', () => {
  it('aprova um token recém-criado', async () => {
    await requestPasswordReset({ email: 'maria@paroquia.org' });
    expect(await checkResetToken(tokenDoEmail())).toEqual({ valid: true });
  });

  it('reprova token inexistente, vazio ou nulo', async () => {
    for (const valor of ['token-inventado', '', '   ', null, undefined]) {
      expect((await checkResetToken(valor)).valid).toBe(false);
    }
  });

  it('reprova token expirado, com o motivo', async () => {
    await requestPasswordReset({ email: 'maria@paroquia.org' });
    const token = tokenDoEmail();
    await prisma.passwordResetToken.updateMany({
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const resultado = await checkResetToken(token);
    expect(resultado.valid).toBe(false);
    expect(resultado.reason).toMatch(/expirou/i);
  });
});

describe('resetPassword', () => {
  async function pedirToken() {
    await requestPasswordReset({ email: 'maria@paroquia.org' });
    return tokenDoEmail();
  }

  it('troca a senha: a nova entra e a antiga para de valer', async () => {
    const token = await pedirToken();
    const resultado = await resetPassword({ token, password: SENHA_NOVA });

    expect(resultado.email).toBe('maria@paroquia.org');
    expect(await authenticate({ email: 'maria@paroquia.org', password: SENHA_NOVA })).toBeTruthy();
    expect(await authenticate({ email: 'maria@paroquia.org', password: SENHA_ANTIGA })).toBeNull();
  });

  it('não guarda a senha em texto puro', async () => {
    const token = await pedirToken();
    await resetPassword({ token, password: SENHA_NOVA });

    const atualizado = await prisma.user.findUnique({ where: { id: musico.id } });
    expect(atualizado.passwordHash).not.toBe(SENHA_NOVA);
    expect(await bcrypt.compare(SENHA_NOVA, atualizado.passwordHash)).toBe(true);
  });

  it('o mesmo link não serve duas vezes', async () => {
    const token = await pedirToken();
    await resetPassword({ token, password: SENHA_NOVA });

    await expect(resetPassword({ token, password: 'outra-senha-123' })).rejects.toThrow(/já foi usado/i);
    // A primeira troca continua valendo.
    expect(await authenticate({ email: 'maria@paroquia.org', password: SENHA_NOVA })).toBeTruthy();
  });

  it('recusa token inventado', async () => {
    await expect(resetPassword({ token: 'nao-existe', password: SENHA_NOVA })).rejects.toThrow(
      /não é válido/i,
    );
    expect(await authenticate({ email: 'maria@paroquia.org', password: SENHA_ANTIGA })).toBeTruthy();
  });

  it('recusa token expirado', async () => {
    const token = await pedirToken();
    await prisma.passwordResetToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    await expect(resetPassword({ token, password: SENHA_NOVA })).rejects.toThrow(/expirou/i);
    expect(await authenticate({ email: 'maria@paroquia.org', password: SENHA_ANTIGA })).toBeTruthy();
  });

  it('exige senha de pelo menos 8 caracteres e mantém o link válido', async () => {
    const token = await pedirToken();
    await expect(resetPassword({ token, password: 'curta' })).rejects.toThrow(/Verifique os campos/);

    // A validação falhou antes de consumir o token: a pessoa tenta de novo.
    expect((await checkResetToken(token)).valid).toBe(true);
    await resetPassword({ token, password: SENHA_NOVA });
    expect(await authenticate({ email: 'maria@paroquia.org', password: SENHA_NOVA })).toBeTruthy();
  });

  it('a troca apaga os pedidos pendentes da conta', async () => {
    const token = await pedirToken();
    await resetPassword({ token, password: SENHA_NOVA });

    const pendentes = await prisma.passwordResetToken.count({
      where: { userId: musico.id, usedAt: null },
    });
    expect(pendentes).toBe(0);
  });

  it('não mexe na senha de outra pessoa', async () => {
    const outra = await makeMusician({
      email: 'joao@paroquia.org',
      passwordHash: await bcrypt.hash('senha-do-joao-1', 4),
    });
    const token = await pedirToken();
    await resetPassword({ token, password: SENHA_NOVA });

    expect(await authenticate({ email: 'joao@paroquia.org', password: 'senha-do-joao-1' })).toBeTruthy();
    expect(await authenticate({ email: 'joao@paroquia.org', password: SENHA_NOVA })).toBeNull();
    expect(outra.id).not.toBe(musico.id);
  });

  it('apagar a conta leva embora os pedidos pendentes', async () => {
    await pedirToken();
    await prisma.user.delete({ where: { id: musico.id } });
    expect(await prisma.passwordResetToken.count()).toBe(0);
  });
});
