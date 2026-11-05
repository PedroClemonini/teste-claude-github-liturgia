import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  prisma,
  resetDatabase,
  makeCapela,
  makeCoordinator,
  makeMusician,
  makeOwner,
  reloadActor,
} from '../helpers/db.js';
import {
  registerUser,
  authenticate,
  listMembers,
  changeRole,
  addToCapela,
  removeFromCapela,
  removeMember,
  createMember,
  updateMember,
  updateProfile,
  toPublicUser,
} from '@/services/users.js';
import { createInvite } from '@/services/invites.js';
import { createCapela, listManagedCapelas } from '@/services/capelas.js';
import { listCelebrations, createCelebration, getCelebration } from '@/services/celebrations.js';

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
  instruments: ['Soprano'],
};

describe('registerUser', () => {
  it('grava o usuário com e-mail normalizado, senha em hash, Músico e a capela do convite', async () => {
    const invite = await createInvite(capela.id, coordenador);
    const user = await registerUser({ ...novoCadastro, inviteToken: invite.token });

    expect(user.email).toBe('maria@paroquia.org');
    expect(user.role).toBe('MUSICO');
    expect(user.instruments).toEqual(['Soprano']);
    expect(user.capelaIds).toEqual([capela.id]);
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
    expect(user).toMatchObject({ email: 'maria@paroquia.org' });
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

describe('registerUser com conta existente', () => {
  it('quem já tem conta entra em outra capela confirmando a senha, sem duplicar nem trocar dados', async () => {
    const invite1 = await createInvite(capela.id, coordenador);
    const user = await registerUser({ ...novoCadastro, inviteToken: invite1.token });

    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const invite2 = await createInvite(outraCapela.id, await makeOwner());
    const again = await registerUser({
      ...novoCadastro,
      name: 'Outro Nome',
      instruments: [],
      inviteToken: invite2.token,
    });

    expect(again.id).toBe(user.id);
    expect(again.name).toBe(user.name);
    expect(again.instruments).toEqual(['Soprano']);
    expect(again.capelaIds.sort()).toEqual([capela.id, outraCapela.id].sort());
    expect((await prisma.invite.findUnique({ where: { id: invite2.id } })).usedById).toBe(user.id);
  });

  it('recusa a senha errada, sem criar vínculo nem gastar o convite', async () => {
    const invite1 = await createInvite(capela.id, coordenador);
    const user = await registerUser({ ...novoCadastro, inviteToken: invite1.token });

    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const invite2 = await createInvite(outraCapela.id, await makeOwner());
    await expect(
      registerUser({ ...novoCadastro, password: 'senhaErrada99', inviteToken: invite2.token }),
    ).rejects.toMatchObject({ status: 409 });

    expect((await reloadActor(user.id)).capelaIds).toEqual([capela.id]);
    expect((await prisma.invite.findUnique({ where: { id: invite2.id } })).usedAt).toBeNull();
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

  it('mostra ao músico só as capelas em comum com cada colega', async () => {
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const musico = await makeMusician({ capelaId: capela.id });
    await makeMusician({
      name: 'Colega',
      memberships: [
        { capelaId: capela.id, role: 'MUSICO' },
        { capelaId: outraCapela.id, role: 'COORDENADOR' },
      ],
    });

    const colega = (await listMembers(musico)).find((member) => member.name === 'Colega');
    expect(colega.capelaIds).toEqual([capela.id]);
  });

  it('o dono aparece na lista do coordenador, marcado como dono', async () => {
    await makeOwner({ name: 'Zeca Dono' });
    const dono = (await listMembers(coordenador)).find((member) => member.name === 'Zeca Dono');
    expect(dono.isOwner).toBe(true);
  });
});

describe('changeRole', () => {
  it('permite ao coordenador promover um músico da própria capela', async () => {
    const musico = await makeMusician({ capelaId: capela.id });
    const updated = await changeRole(musico.id, capela.id, 'COORDENADOR', coordenador);
    expect(updated.role).toBe('COORDENADOR');
  });

  it('muda o papel só na capela informada', async () => {
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const musico = await makeMusician({
      memberships: [
        { capelaId: capela.id, role: 'MUSICO' },
        { capelaId: outraCapela.id, role: 'MUSICO' },
      ],
    });
    const updated = await changeRole(musico.id, capela.id, 'COORDENADOR', coordenador);
    const papel = (id) => updated.memberships.find((m) => m.capelaId === id).role;
    expect(papel(capela.id)).toBe('COORDENADOR');
    expect(papel(outraCapela.id)).toBe('MUSICO');
  });

  it('impede que o músico mude papéis', async () => {
    const musico = await makeMusician({ capelaId: capela.id });
    const outro = await makeMusician({ capelaId: capela.id });
    await expect(changeRole(outro.id, capela.id, 'COORDENADOR', musico)).rejects.toMatchObject({ status: 403 });
  });

  it('recusa papel desconhecido', async () => {
    const musico = await makeMusician({ capelaId: capela.id });
    await expect(changeRole(musico.id, capela.id, 'BISPO', coordenador)).rejects.toMatchObject({ status: 422 });
  });

  it('avisa quando a pessoa não está na capela', async () => {
    await expect(changeRole('inexistente', capela.id, 'MUSICO', coordenador)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('coordenador de outra capela não promove integrante alheio', async () => {
    const musico = await makeMusician({ capelaId: capela.id });
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const coordenadorDeFora = await makeCoordinator({ capelaId: outraCapela.id });

    await expect(
      changeRole(musico.id, capela.id, 'COORDENADOR', coordenadorDeFora),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('quem é músico numa capela não promove ninguém ali, mesmo coordenando outra', async () => {
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const misto = await makeCoordinator({
      memberships: [
        { capelaId: capela.id, role: 'MUSICO' },
        { capelaId: outraCapela.id, role: 'COORDENADOR' },
      ],
    });
    const musico = await makeMusician({ capelaId: capela.id });

    await expect(changeRole(musico.id, capela.id, 'COORDENADOR', misto)).rejects.toMatchObject({ status: 403 });
  });

  it('o dono muda papéis em qualquer capela', async () => {
    const musico = await makeMusician({ capelaId: capela.id });
    const promovido = await changeRole(musico.id, capela.id, 'COORDENADOR', await makeOwner());
    expect(promovido.role).toBe('COORDENADOR');
  });
});

describe('addToCapela / removeFromCapela', () => {
  it('coloca uma pessoa em mais uma capela, mantendo a anterior', async () => {
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const musico = await makeMusician({ capelaId: capela.id });

    const updated = await addToCapela(musico.id, outraCapela.id, 'MUSICO', await makeOwner());
    expect(updated.capelaIds.sort()).toEqual([capela.id, outraCapela.id].sort());
  });

  it('tira da capela sem apagar a conta nem os outros vínculos', async () => {
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const musico = await makeMusician({
      memberships: [
        { capelaId: capela.id, role: 'MUSICO' },
        { capelaId: outraCapela.id, role: 'MUSICO' },
      ],
    });

    await removeFromCapela(musico.id, capela.id, coordenador);
    expect((await reloadActor(musico.id)).capelaIds).toEqual([outraCapela.id]);
  });

  it('coordenador não mexe em capela que não coordena', async () => {
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const musicoDeFora = await makeMusician({ capelaId: outraCapela.id });

    await expect(removeFromCapela(musicoDeFora.id, outraCapela.id, coordenador)).rejects.toMatchObject({ status: 403 });
    await expect(addToCapela(coordenador.id, outraCapela.id, 'COORDENADOR', coordenador)).rejects.toMatchObject({
      status: 403,
    });
  });

  it('coordenador não tira a si mesmo', async () => {
    await expect(removeFromCapela(coordenador.id, capela.id, coordenador)).rejects.toMatchObject({ status: 400 });
  });

  it('músico não tira ninguém', async () => {
    const musico = await makeMusician({ capelaId: capela.id });
    const outro = await makeMusician({ capelaId: capela.id });
    await expect(removeFromCapela(outro.id, capela.id, musico)).rejects.toMatchObject({ status: 403 });
  });

  it('avisa quando a pessoa não está na capela', async () => {
    await expect(removeFromCapela('inexistente', capela.id, coordenador)).rejects.toMatchObject({ status: 404 });
  });
});

describe('removeMember', () => {
  it('só o dono apaga a conta', async () => {
    const musico = await makeMusician({ capelaId: capela.id });
    await expect(removeMember(musico.id, coordenador)).rejects.toMatchObject({ status: 403 });
    await expect(removeMember(musico.id, null)).rejects.toMatchObject({ status: 401 });

    await removeMember(musico.id, await makeOwner());
    expect(await prisma.user.findUnique({ where: { id: musico.id } })).toBeNull();
  });

  it('o dono não apaga a própria conta', async () => {
    const dono = await makeOwner();
    await expect(removeMember(dono.id, dono)).rejects.toMatchObject({ status: 400 });
  });

  it('avisa quando o integrante não existe', async () => {
    await expect(removeMember('inexistente', await makeOwner())).rejects.toMatchObject({ status: 404 });
  });
});

describe('dono do sistema', () => {
  it('o banco não aceita um segundo dono', async () => {
    await makeOwner();
    await expect(makeOwner()).rejects.toMatchObject({ code: 'P2002' });
  });

  it('cria capelas; o coordenador não', async () => {
    const dono = await makeOwner();
    const nova = await createCapela({ name: 'Capela Nova' }, dono);
    expect(nova.createdById).toBe(dono.id);
    await expect(createCapela({ name: 'Outra' }, coordenador)).rejects.toMatchObject({ status: 403 });
  });

  it('lista todas as capelas e coordena agenda de capela sem vínculo com ela', async () => {
    const dono = await makeOwner();
    await makeCapela({ name: 'Outra paróquia' });
    expect(await listManagedCapelas(dono)).toHaveLength(2);

    const evento = await createCelebration(
      { title: 'Missa', date: '2026-12-06T10:00:00.000Z', type: 'MISSA_COMUM', capelaId: capela.id },
      dono,
    );
    expect(evento.capelaId).toBe(capela.id);
    expect((await listCelebrations({}, dono)).map((row) => row.id)).toEqual([evento.id]);
  });
});

describe('várias capelas', () => {
  it('o músico vê as celebrações de todas as suas capelas', async () => {
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const terceira = await makeCapela({ name: 'Terceira' });
    const dono = await makeOwner();
    const musico = await makeMusician({
      memberships: [
        { capelaId: capela.id, role: 'MUSICO' },
        { capelaId: outraCapela.id, role: 'MUSICO' },
      ],
    });
    const base = { date: '2026-12-06T10:00:00.000Z', type: 'MISSA_COMUM' };
    await createCelebration({ ...base, title: 'A', capelaId: capela.id }, dono);
    await createCelebration({ ...base, title: 'B', capelaId: outraCapela.id }, dono);
    const fora = await createCelebration({ ...base, title: 'C', capelaId: terceira.id }, dono);

    const titulos = (await listCelebrations({}, musico)).map((row) => row.title).sort();
    expect(titulos).toEqual(['A', 'B']);
    await expect(getCelebration(fora.id, musico)).rejects.toMatchObject({ status: 404 });
  });
});

describe('createMember', () => {
  const pessoa = { name: 'Nova Pessoa', email: 'Nova@Paroquia.org', password: 'senhaForte1' };

  it('o dono cria uma pessoa direto na capela, que consegue entrar', async () => {
    const criado = await createMember({ ...pessoa, capelaId: capela.id, role: 'COORDENADOR' }, await makeOwner());

    expect(criado.email).toBe('nova@paroquia.org');
    expect(criado.memberships).toEqual([
      expect.objectContaining({ capelaId: capela.id, role: 'COORDENADOR' }),
    ]);
    expect(criado).not.toHaveProperty('passwordHash');
    expect(await authenticate({ email: pessoa.email, password: pessoa.password })).not.toBeNull();
  });

  it('e-mail que já tem conta só ganha o vínculo, sem trocar a senha', async () => {
    const dono = await makeOwner();
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const criado = await createMember({ ...pessoa, capelaId: capela.id }, dono);
    const hash = (await prisma.user.findUnique({ where: { id: criado.id } })).passwordHash;

    const again = await createMember({ ...pessoa, password: 'outraSenha99', capelaId: outraCapela.id }, dono);

    expect(again.id).toBe(criado.id);
    expect(again.capelaIds).toHaveLength(2);
    expect((await prisma.user.findUnique({ where: { id: criado.id } })).passwordHash).toBe(hash);
  });

  it('recusa quem já está na capela', async () => {
    const dono = await makeOwner();
    await createMember({ ...pessoa, capelaId: capela.id }, dono);
    await expect(createMember({ ...pessoa, capelaId: capela.id }, dono)).rejects.toMatchObject({ status: 409 });
  });

  it('é exclusivo do dono', async () => {
    await expect(createMember({ ...pessoa, capelaId: capela.id }, coordenador)).rejects.toMatchObject({ status: 403 });
    await expect(createMember({ ...pessoa, capelaId: capela.id }, null)).rejects.toMatchObject({ status: 401 });
  });

  it('avisa quando a capela não existe', async () => {
    await expect(createMember({ ...pessoa, capelaId: 'inexistente' }, await makeOwner())).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('updateProfile', () => {
  const senha = 'senhaAtual123';
  let pessoa;

  beforeEach(async () => {
    const invite = await createInvite(capela.id, coordenador);
    pessoa = await registerUser({ ...novoCadastro, password: senha, inviteToken: invite.token });
  });

  const dados = (extra = {}) => ({
    name: pessoa.name,
    email: pessoa.email,
    instruments: pessoa.instruments,
    ...extra,
  });

  it('muda nome e instrumentos sem pedir a senha', async () => {
    const updated = await updateProfile(dados({ name: 'Maria Nova', instruments: ['Flauta', 'Teclado'] }), pessoa);
    expect(updated).toMatchObject({ name: 'Maria Nova', instruments: ['Flauta', 'Teclado'] });
    expect(updated).not.toHaveProperty('passwordHash');
  });

  it('trocar o e-mail exige a senha atual', async () => {
    await expect(updateProfile(dados({ email: 'novo@paroquia.org' }), pessoa)).rejects.toMatchObject({
      status: 422,
      details: { currentPassword: expect.any(String) },
    });
    await expect(
      updateProfile(dados({ email: 'novo@paroquia.org', currentPassword: 'errada' }), pessoa),
    ).rejects.toMatchObject({ status: 422 });

    const updated = await updateProfile(dados({ email: 'novo@paroquia.org', currentPassword: senha }), pessoa);
    expect(updated.email).toBe('novo@paroquia.org');
  });

  it('trocar a senha exige a atual, e a nova passa a valer', async () => {
    await expect(updateProfile(dados({ newPassword: 'novaSenha123' }), pessoa)).rejects.toMatchObject({ status: 422 });

    await updateProfile(dados({ newPassword: 'novaSenha123', currentPassword: senha }), pessoa);
    expect(await authenticate({ email: pessoa.email, password: 'novaSenha123' })).not.toBeNull();
    expect(await authenticate({ email: pessoa.email, password: senha })).toBeNull();
  });

  it('recusa senha nova curta', async () => {
    await expect(
      updateProfile(dados({ newPassword: 'curta', currentPassword: senha }), pessoa),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('recusa e-mail de outra pessoa', async () => {
    await makeMusician({ email: 'ocupado@paroquia.org' });
    await expect(
      updateProfile(dados({ email: 'ocupado@paroquia.org', currentPassword: senha }), pessoa),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('não muda papel, capela nem atributo de dono, mesmo se vierem no corpo', async () => {
    await updateProfile(dados({ isOwner: true, role: 'COORDENADOR', memberships: [] }), pessoa);
    const atual = await reloadActor(pessoa.id);
    expect(atual).toMatchObject({ isOwner: false, role: 'MUSICO', capelaIds: [capela.id] });
  });

  it('exige autenticação', async () => {
    await expect(updateProfile(dados(), null)).rejects.toMatchObject({ status: 401 });
  });
});

describe('updateMember', () => {
  const edicao = {
    name: 'Editado',
    email: 'editado@paroquia.org',
    instruments: ['Contralto'],
  };
  const vinculo = (capelaId, role = 'COORDENADOR') => ({ capelaId, role });

  it('o dono edita dados, capelas e papéis, substituindo os vínculos', async () => {
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const terceira = await makeCapela({ name: 'Terceira' });
    const musico = await makeMusician({ capelaId: capela.id });

    const updated = await updateMember(
      musico.id,
      { ...edicao, memberships: [vinculo(outraCapela.id), vinculo(terceira.id, 'MUSICO')] },
      await makeOwner(),
    );
    expect(updated).toMatchObject(edicao);
    expect(updated.capelaIds.sort()).toEqual([outraCapela.id, terceira.id].sort());
    expect(updated.role).toBe('COORDENADOR');
  });

  it('troca a senha só quando uma nova é informada', async () => {
    const musico = await makeMusician({ capelaId: capela.id });
    const dono = await makeOwner();
    const memberships = [vinculo(capela.id)];
    const antes = await prisma.user.findUnique({ where: { id: musico.id } });

    await updateMember(musico.id, { ...edicao, memberships, password: '' }, dono);
    const semSenhaNova = await prisma.user.findUnique({ where: { id: musico.id } });
    expect(semSenhaNova.passwordHash).toBe(antes.passwordHash);

    await updateMember(musico.id, { ...edicao, memberships, password: 'novaSenha123' }, dono);
    const comSenhaNova = await prisma.user.findUnique({ where: { id: musico.id } });
    expect(comSenhaNova.passwordHash).not.toBe(antes.passwordHash);
  });

  it('recusa e-mail já usado por outra pessoa', async () => {
    await makeMusician({ capelaId: capela.id, email: 'ocupado@paroquia.org' });
    const musico = await makeMusician({ capelaId: capela.id });

    await expect(
      updateMember(
        musico.id,
        { ...edicao, email: 'ocupado@paroquia.org', memberships: [vinculo(capela.id)] },
        await makeOwner(),
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('recusa capela inexistente ou repetida', async () => {
    const musico = await makeMusician({ capelaId: capela.id });
    const dono = await makeOwner();

    await expect(
      updateMember(musico.id, { ...edicao, memberships: [vinculo('inexistente')] }, dono),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      updateMember(musico.id, { ...edicao, memberships: [vinculo(capela.id), vinculo(capela.id)] }, dono),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('coordenador não edita ninguém por aqui', async () => {
    const musico = await makeMusician({ capelaId: capela.id });
    await expect(
      updateMember(musico.id, { ...edicao, memberships: [vinculo(capela.id)] }, coordenador),
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
