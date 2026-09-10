import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma, resetDatabase, makeCoordinator, makeMusician } from '../helpers/db.js';
import {
  registerUser,
  authenticate,
  listMembers,
  changeRole,
  toPublicUser,
} from '@/services/users.js';

beforeEach(resetDatabase);
afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

const novoCadastro = {
  name: 'Maria Soprano',
  email: 'Maria@Paroquia.org',
  password: 'salmo23aleluia',
  voiceOrInstrument: 'Soprano',
};

describe('registerUser', () => {
  it('grava o usuário com e-mail normalizado, senha em hash e papel de músico', async () => {
    const user = await registerUser(novoCadastro);

    expect(user.email).toBe('maria@paroquia.org');
    expect(user.role).toBe('MUSICO');
    expect(user.voiceOrInstrument).toBe('Soprano');
    expect(user).not.toHaveProperty('passwordHash');

    const stored = await prisma.user.findUnique({ where: { email: 'maria@paroquia.org' } });
    expect(stored.passwordHash).not.toBe(novoCadastro.password);
    expect(stored.passwordHash.length).toBeGreaterThan(20);
  });

  it('recusa e-mail já cadastrado', async () => {
    await registerUser(novoCadastro);
    await expect(registerUser(novoCadastro)).rejects.toMatchObject({ status: 409 });
  });

  it('recusa cadastro inválido antes de tocar o banco', async () => {
    await expect(registerUser({ ...novoCadastro, password: '123' })).rejects.toMatchObject({
      status: 422,
    });
    expect(await prisma.user.count()).toBe(0);
  });
});

describe('authenticate', () => {
  it('aceita a senha correta e devolve o usuário sem o hash', async () => {
    await registerUser(novoCadastro);
    const user = await authenticate({ email: 'maria@paroquia.org', password: 'salmo23aleluia' });
    expect(user).toMatchObject({ email: 'maria@paroquia.org', role: 'MUSICO' });
    expect(user).not.toHaveProperty('passwordHash');
  });

  it('recusa senha errada e e-mail inexistente sem dizer qual dos dois falhou', async () => {
    await registerUser(novoCadastro);
    expect(await authenticate({ email: 'maria@paroquia.org', password: 'errada' })).toBeNull();
    expect(await authenticate({ email: 'ninguem@paroquia.org', password: 'salmo23aleluia' })).toBeNull();
  });

  it('ignora diferença de caixa no e-mail', async () => {
    await registerUser(novoCadastro);
    expect(await authenticate({ email: 'MARIA@PAROQUIA.ORG', password: 'salmo23aleluia' })).not.toBeNull();
  });
});

describe('listMembers', () => {
  it('lista a equipe para qualquer integrante autenticado', async () => {
    await makeCoordinator({ name: 'Ana Coordenadora' });
    const musico = await makeMusician({ name: 'João Músico' });

    const members = await listMembers(musico);
    expect(members.map((m) => m.name).sort()).toEqual(['Ana Coordenadora', 'João Músico']);
    expect(members[0]).not.toHaveProperty('passwordHash');
  });

  it('exige autenticação', async () => {
    await expect(listMembers(null)).rejects.toMatchObject({ status: 401 });
  });
});

describe('changeRole', () => {
  it('permite ao coordenador promover um músico', async () => {
    const coordenador = await makeCoordinator();
    const musico = await makeMusician();

    const updated = await changeRole(musico.id, 'COORDENADOR', coordenador);
    expect(updated.role).toBe('COORDENADOR');
  });

  it('impede que o músico mude papéis', async () => {
    const musico = await makeMusician();
    const outro = await makeMusician();
    await expect(changeRole(outro.id, 'COORDENADOR', musico)).rejects.toMatchObject({ status: 403 });
  });

  it('recusa papel desconhecido', async () => {
    const coordenador = await makeCoordinator();
    const musico = await makeMusician();
    await expect(changeRole(musico.id, 'BISPO', coordenador)).rejects.toMatchObject({ status: 422 });
  });

  it('avisa quando o usuário não existe', async () => {
    const coordenador = await makeCoordinator();
    await expect(changeRole('inexistente', 'MUSICO', coordenador)).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('toPublicUser', () => {
  it('remove o hash da senha', () => {
    expect(toPublicUser({ id: '1', name: 'X', passwordHash: 'segredo' })).toEqual({
      id: '1',
      name: 'X',
    });
  });

  it('tolera nulo', () => {
    expect(toPublicUser(null)).toBeNull();
  });
});
