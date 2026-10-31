import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

// As rotas de redefinição são públicas (sem sessão), mas o módulo de sessão
// ainda é carregado pela cadeia de imports — o duplo evita tocar no NextAuth.
vi.mock('@/lib/session.js', () => ({ currentUser: async () => null }));

const enviados = [];
vi.mock('@/lib/mailer.js', () => ({
  isMailConfigured: () => true,
  sendMail: async (message) => {
    enviados.push(message);
    return { delivered: true };
  },
}));

const { prisma, resetDatabase, makeCapela, makeMusician } = await import('../helpers/db.js');
const requestRoute = await import('@/app/api/password-reset/route.js');
const confirmRoute = await import('@/app/api/password-reset/confirm/route.js');
const { authenticate } = await import('@/services/users.js');
const bcrypt = (await import('bcryptjs')).default;

const SENHA_ANTIGA = 'senha-antiga-123';
const SENHA_NOVA = 'salmo23aleluia';

const post = (body) =>
  new Request('http://localhost/api', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(async () => {
  await resetDatabase();
  enviados.length = 0;
  const capela = await makeCapela();
  await makeMusician({
    capelaId: capela.id,
    email: 'maria@paroquia.org',
    passwordHash: await bcrypt.hash(SENHA_ANTIGA, 4),
  });
});
afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

function tokenDoEmail() {
  const match = /token=([^\s&"]+)/.exec(enviados.at(-1).text);
  return decodeURIComponent(match[1]);
}

describe('POST /api/password-reset', () => {
  it('aceita o pedido e dispara o e-mail', async () => {
    const response = await requestRoute.POST(post({ email: 'maria@paroquia.org' }));
    expect(response.status).toBe(200);
    expect((await response.json()).message).toMatch(/link/i);
    expect(enviados).toHaveLength(1);
  });

  it('responde igual para e-mail sem conta', async () => {
    const comConta = await requestRoute.POST(post({ email: 'maria@paroquia.org' }));
    enviados.length = 0;
    const semConta = await requestRoute.POST(post({ email: 'ninguem@paroquia.org' }));

    expect(semConta.status).toBe(comConta.status);
    expect(await semConta.json()).toEqual(await comConta.json());
    expect(enviados).toHaveLength(0);
  });

  it('devolve 422 com o campo errado quando o e-mail é inválido', async () => {
    const response = await requestRoute.POST(post({ email: 'nao-e-email' }));
    expect(response.status).toBe(422);
    expect((await response.json()).details).toHaveProperty('email');
  });

  it('devolve 400 se o corpo não for JSON', async () => {
    const response = await requestRoute.POST(
      new Request('http://localhost/api', { method: 'POST', body: 'xpto' }),
    );
    expect(response.status).toBe(400);
  });
});

describe('POST /api/password-reset/confirm', () => {
  async function pedirToken() {
    await requestRoute.POST(post({ email: 'maria@paroquia.org' }));
    return tokenDoEmail();
  }

  it('troca a senha e devolve o e-mail para o login automático', async () => {
    const token = await pedirToken();
    const response = await confirmRoute.POST(post({ token, password: SENHA_NOVA }));

    expect(response.status).toBe(200);
    expect((await response.json()).email).toBe('maria@paroquia.org');
    expect(await authenticate({ email: 'maria@paroquia.org', password: SENHA_NOVA })).toBeTruthy();
  });

  it('devolve 422 para token já usado', async () => {
    const token = await pedirToken();
    await confirmRoute.POST(post({ token, password: SENHA_NOVA }));

    const repetido = await confirmRoute.POST(post({ token, password: 'outra-senha-123' }));
    expect(repetido.status).toBe(422);
    expect((await repetido.json()).details).toHaveProperty('token');
  });

  it('devolve 422 para token inventado, sem mexer na senha', async () => {
    const response = await confirmRoute.POST(post({ token: 'nao-existe', password: SENHA_NOVA }));
    expect(response.status).toBe(422);
    expect(await authenticate({ email: 'maria@paroquia.org', password: SENHA_ANTIGA })).toBeTruthy();
  });

  it('devolve 422 para senha curta', async () => {
    const token = await pedirToken();
    const response = await confirmRoute.POST(post({ token, password: 'curta' }));
    expect(response.status).toBe(422);
    expect((await response.json()).details).toHaveProperty('password');
  });

  it('nunca devolve o hash da senha na resposta', async () => {
    const token = await pedirToken();
    const body = await (await confirmRoute.POST(post({ token, password: SENHA_NOVA }))).json();
    expect(JSON.stringify(body)).not.toMatch(/\$2[aby]\$/);
  });
});
