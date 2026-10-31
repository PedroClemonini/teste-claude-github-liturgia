import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  prisma,
  resetDatabase,
  makeCapela,
  makeCoordinator,
  makeMusician,
  makeAdministrator,
} from '../helpers/db.js';
import {
  registerUser,
  authenticate,
  listMembers,
  listAllMembers,
  changeRole,
  removeMember,
  reassignCapela,
  updateMember,
  toPublicUser,
} from '@/services/users.js';
import { createInvite } from '@/services/invites.js';

let capela;
let coordenador;

beforeEach(async () => {
  await resetDatabase();
  capela = await makeCapela();
  coordenador = await makeCoordinator({ capelaId: capela.id });
});
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
  it('grava o usuário com e-mail normalizado, senha em hash, Músico e a capela do convite', async () => {
    const invite = await createInvite(capela.id, coordenador);
    const user = await registerUser({ ...novoCadastro, inviteToken: invite.token });

    expect(user.email).toBe('maria@paroquia.org');
    expect(user.role).toBe('MUSICO');
    expect(user.voiceOrInstrument).toBe('Soprano');
    expect(user.capelaId).toBe(capela.id);
    expect(user).not.toHaveProperty('passwordHash');

    const stored = await prisma.user.findUnique({ where: { email: 'maria@paroquia.org' } });
    expect(stored.passwordHash).not.toBe(novoCadastro.password);
    expect(stored.passwordHash.length).toBeGreaterThan(20);

    const usedInvite = await prisma.invite.findUnique({ where: { id: invite.id } });
    expect(usedInvite.usedAt).not.toBeNull();
    expect(usedInvite.usedById).toBe(user.id);
  });

  it('recusa e-mail já cadastrado', async () => {
    const invite1 = await createInvite(capela.id, coordenador);
    await registerUser({ ...novoCadastro, inviteToken: invite1.token });

    const invite2 = await createInvite(capela.id, coordenador);
    await expect(
      registerUser({ ...novoCadastro, inviteToken: invite2.token }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('recusa cadastro inválido antes de tocar o banco', async () => {
    const invite = await createInvite(capela.id, coordenador);
    await expect(
      registerUser({ ...novoCadastro, password: '123', inviteToken: invite.token }),
    ).rejects.toMatchObject({ status: 422 });
    // Só o coordenador do beforeEach — o cadastro inválido não chegou a gravar nada.
    expect(await prisma.user.count()).toBe(1);
  });

  it('recusa convite ausente', async () => {
    await expect(registerUser(novoCadastro)).rejects.toMatchObject({ status: 422 });
  });

  it('recusa convite inexistente', async () => {
    await expect(
      registerUser({ ...novoCadastro, inviteToken: 'token-fantasma' }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('recusa convite já usado', async () => {
    const invite = await createInvite(capela.id, coordenador);
    await registerUser({ ...novoCadastro, inviteToken: invite.token });

    await expect(
      registerUser({ ...novoCadastro, email: 'outra@paroquia.org', inviteToken: invite.token }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('recusa convite expirado', async () => {
    const invite = await createInvite(capela.id, coordenador);
    await prisma.invite.update({
      where: { id: invite.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(
      registerUser({ ...novoCadastro, inviteToken: invite.token }),
    ).rejects.toMatchObject({ status: 422 });
  });
});

describe('authenticate', () => {
  it('aceita a senha correta e devolve o usuário sem o hash', async () => {
    const invite = await createInvite(capela.id, coordenador);
    await registerUser({ ...novoCadastro, inviteToken: invite.token });

    const user = await authenticate({ email: 'maria@paroquia.org', password: 'salmo23aleluia' });
    expect(user).toMatchObject({ email: 'maria@paroquia.org', role: 'MUSICO' });
    expect(user).not.toHaveProperty('passwordHash');
  });

  it('recusa senha errada e e-mail inexistente sem dizer qual dos dois falhou', async () => {
    const invite = await createInvite(capela.id, coordenador);
    await registerUser({ ...novoCadastro, inviteToken: invite.token });

    expect(await authenticate({ email: 'maria@paroquia.org', password: 'errada' })).toBeNull();
    expect(await authenticate({ email: 'ninguem@paroquia.org', password: 'salmo23aleluia' })).toBeNull();
  });

  it('ignora diferença de caixa no e-mail', async () => {
    const invite = await createInvite(capela.id, coordenador);
    await registerUser({ ...novoCadastro, inviteToken: invite.token });

    expect(await authenticate({ email: 'MARIA@PAROQUIA.ORG', password: 'salmo23aleluia' })).not.toBeNull();
  });
});

describe('listMembers', () => {
  it('lista só a equipe da própria capela', async () => {
    const musico = await makeMusician({ name: 'João Músico', capelaId: capela.id });

    const members = await listMembers(musico);
    expect(members.map((m) => m.name).sort()).toEqual(['Ana Coordenadora', 'João Músico']);
    expect(members[0]).not.toHaveProperty('passwordHash');
  });

  it('não lista integrantes de outra capela', async () => {
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const musicoDeFora = await makeMusician({ name: 'Fora', capelaId: outraCapela.id });

    const members = await listMembers(musicoDeFora);
    expect(members.map((m) => m.name)).toEqual(['Fora']);
  });

  it('exige autenticação', async () => {
    await expect(listMembers(null)).rejects.toMatchObject({ status: 401 });
  });

  it('coordenador vê integrantes de todas as capelas, não só a própria', async () => {
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    await makeMusician({ name: 'Fora', capelaId: outraCapela.id });

    const members = await listMembers(coordenador);
    expect(members.map((m) => m.name)).toContain('Fora');
  });

  it('nunca lista o administrador, nem pro coordenador nem pro músico', async () => {
    await makeAdministrator({ name: 'Zeca Administrador' });
    const musico = await makeMusician({ capelaId: capela.id });

    expect(await listMembers(coordenador)).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ role: 'ADMINISTRADOR' })]),
    );
    expect(await listMembers(musico)).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ role: 'ADMINISTRADOR' })]),
    );
  });
});

describe('listAllMembers', () => {
  it('só o administrador vê integrantes de todas as capelas — nunca outro administrador', async () => {
    await makeMusician({ name: 'João Músico', capelaId: capela.id });
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    await makeMusician({ name: 'Fora', capelaId: outraCapela.id });
    const admin = await makeAdministrator();

    const members = await listAllMembers(admin);
    expect(members.map((m) => m.name).sort()).toEqual(['Ana Coordenadora', 'Fora', 'João Músico']);
  });

  it('recusa coordenador e músico', async () => {
    const musico = await makeMusician({ capelaId: capela.id });
    await expect(listAllMembers(coordenador)).rejects.toMatchObject({ status: 403 });
    await expect(listAllMembers(musico)).rejects.toMatchObject({ status: 403 });
    await expect(listAllMembers(null)).rejects.toMatchObject({ status: 401 });
  });
});

describe('changeRole', () => {
  it('permite ao coordenador promover um músico da própria capela', async () => {
    const musico = await makeMusician({ capelaId: capela.id });
    const updated = await changeRole(musico.id, 'COORDENADOR', coordenador);
    expect(updated.role).toBe('COORDENADOR');
  });

  it('impede que o músico mude papéis', async () => {
    const musico = await makeMusician({ capelaId: capela.id });
    const outro = await makeMusician({ capelaId: capela.id });
    await expect(changeRole(outro.id, 'COORDENADOR', musico)).rejects.toMatchObject({ status: 403 });
  });

  it('recusa papel desconhecido', async () => {
    const musico = await makeMusician({ capelaId: capela.id });
    await expect(changeRole(musico.id, 'BISPO', coordenador)).rejects.toMatchObject({ status: 422 });
  });

  it('avisa quando o usuário não existe', async () => {
    await expect(changeRole('inexistente', 'MUSICO', coordenador)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('coordenador de outra capela não promove integrante alheio', async () => {
    const musico = await makeMusician({ capelaId: capela.id });
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const coordenadorDeFora = await makeCoordinator({ capelaId: outraCapela.id });

    await expect(
      changeRole(musico.id, 'COORDENADOR', coordenadorDeFora),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('o administrador promove/rebaixa integrantes de qualquer capela', async () => {
    const musico = await makeMusician({ capelaId: capela.id });
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const musicoDeFora = await makeMusician({ capelaId: outraCapela.id });
    const admin = await makeAdministrator();

    const promovido = await changeRole(musico.id, 'COORDENADOR', admin);
    expect(promovido.role).toBe('COORDENADOR');

    const promovidoDeFora = await changeRole(musicoDeFora.id, 'COORDENADOR', admin);
    expect(promovidoDeFora.role).toBe('COORDENADOR');
  });
});

describe('removeMember', () => {
  it('coordenador remove um integrante da própria capela', async () => {
    const musico = await makeMusician({ capelaId: capela.id });
    const result = await removeMember(musico.id, coordenador);
    expect(result).toEqual({ id: musico.id });
    expect(await prisma.user.findUnique({ where: { id: musico.id } })).toBeNull();
  });

  it('coordenador não remove integrante de outra capela', async () => {
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const musicoDeFora = await makeMusician({ capelaId: outraCapela.id });

    await expect(removeMember(musicoDeFora.id, coordenador)).rejects.toMatchObject({ status: 403 });
    expect(await prisma.user.findUnique({ where: { id: musicoDeFora.id } })).not.toBeNull();
  });

  it('ninguém remove a si mesmo', async () => {
    await expect(removeMember(coordenador.id, coordenador)).rejects.toMatchObject({ status: 400 });
  });

  it('não remove um administrador', async () => {
    const outroAdmin = await makeAdministrator();
    const admin = await makeAdministrator();
    await expect(removeMember(outroAdmin.id, admin)).rejects.toMatchObject({ status: 403 });
  });

  it('músico não remove ninguém', async () => {
    const musico = await makeMusician({ capelaId: capela.id });
    const outro = await makeMusician({ capelaId: capela.id });
    await expect(removeMember(outro.id, musico)).rejects.toMatchObject({ status: 403 });
  });

  it('administrador remove integrante de qualquer capela', async () => {
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const musicoDeFora = await makeMusician({ capelaId: outraCapela.id });
    const admin = await makeAdministrator();

    const result = await removeMember(musicoDeFora.id, admin);
    expect(result).toEqual({ id: musicoDeFora.id });
  });

  it('avisa quando o integrante não existe', async () => {
    await expect(removeMember('inexistente', coordenador)).rejects.toMatchObject({ status: 404 });
  });
});

describe('reassignCapela', () => {
  it('administrador move um integrante para outra capela', async () => {
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const musico = await makeMusician({ capelaId: capela.id });
    const admin = await makeAdministrator();

    const moved = await reassignCapela(musico.id, outraCapela.id, admin);
    expect(moved.capelaId).toBe(outraCapela.id);
  });

  it('coordenador não move ninguém de capela', async () => {
    const musico = await makeMusician({ capelaId: capela.id });
    await expect(reassignCapela(musico.id, capela.id, coordenador)).rejects.toMatchObject({
      status: 403,
    });
  });

  it('não move um administrador', async () => {
    const outroAdmin = await makeAdministrator();
    const admin = await makeAdministrator();
    await expect(reassignCapela(outroAdmin.id, capela.id, admin)).rejects.toMatchObject({
      status: 403,
    });
  });

  it('avisa quando a capela de destino não existe', async () => {
    const musico = await makeMusician({ capelaId: capela.id });
    const admin = await makeAdministrator();
    await expect(reassignCapela(musico.id, 'inexistente', admin)).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('updateMember', () => {
  const edicao = {
    name: 'Editado',
    email: 'editado@paroquia.org',
    voiceOrInstrument: 'Contralto',
    role: 'COORDENADOR',
  };

  it('administrador edita nome, e-mail, voz, capela e papel', async () => {
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const musico = await makeMusician({ capelaId: capela.id });
    const admin = await makeAdministrator();

    const updated = await updateMember(musico.id, { ...edicao, capelaId: outraCapela.id }, admin);
    expect(updated).toMatchObject({ ...edicao, capelaId: outraCapela.id });
  });

  it('troca a senha só quando uma nova é informada', async () => {
    const musico = await makeMusician({ capelaId: capela.id });
    const admin = await makeAdministrator();
    const antes = await prisma.user.findUnique({ where: { id: musico.id } });

    await updateMember(musico.id, { ...edicao, capelaId: capela.id, password: '' }, admin);
    const semSenhaNova = await prisma.user.findUnique({ where: { id: musico.id } });
    expect(semSenhaNova.passwordHash).toBe(antes.passwordHash);

    await updateMember(musico.id, { ...edicao, capelaId: capela.id, password: 'novaSenha123' }, admin);
    const comSenhaNova = await prisma.user.findUnique({ where: { id: musico.id } });
    expect(comSenhaNova.passwordHash).not.toBe(antes.passwordHash);
  });

  it('recusa e-mail já usado por outra pessoa', async () => {
    await makeMusician({ capelaId: capela.id, email: 'ocupado@paroquia.org' });
    const musico = await makeMusician({ capelaId: capela.id });
    const admin = await makeAdministrator();

    await expect(
      updateMember(musico.id, { ...edicao, capelaId: capela.id, email: 'ocupado@paroquia.org' }, admin),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('coordenador não edita ninguém por aqui', async () => {
    const musico = await makeMusician({ capelaId: capela.id });
    await expect(
      updateMember(musico.id, { ...edicao, capelaId: capela.id }, coordenador),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('não edita um administrador', async () => {
    const outroAdmin = await makeAdministrator();
    const admin = await makeAdministrator();
    await expect(
      updateMember(outroAdmin.id, { ...edicao, capelaId: capela.id }, admin),
    ).rejects.toMatchObject({ status: 403 });
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
