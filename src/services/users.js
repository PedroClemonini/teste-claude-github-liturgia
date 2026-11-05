/**
 * Equipe do coral: cadastro, autenticação, perfil e vínculos com as capelas.
 */
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma.js';
import {
  createMemberSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  updateMemberSchema,
  ROLE_VALUES,
} from '@/domain/validation/schemas.js';
import {
  ACTIONS,
  AuthorizationError,
  assertCan,
  assertManagesCapela,
  assertOwner,
  isCoordinator,
  toActor,
} from '@/domain/auth/roles.js';
import { getCapela } from '@/services/capelas.js';
import { validateInviteToken } from '@/services/invites.js';
import { ConflictError, DomainError, NotFoundError, ValidationError, unwrap } from '@/domain/errors.js';

const SALT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 10);

const MEMBERSHIPS = {
  select: {
    capelaId: true,
    role: true,
    capela: { select: { id: true, name: true } },
  },
  orderBy: { capela: { name: 'asc' } },
};

const PUBLIC_FIELDS = {
  id: true,
  name: true,
  email: true,
  instruments: true,
  isOwner: true,
  createdAt: true,
  memberships: MEMBERSHIPS,
};

/** Remove o hash da senha antes de qualquer coisa sair do servidor. */
export function toPublicUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

/**
 * Cadastro por convite: o convite decide a capela, o papel é sempre Músico.
 * Quem já tem conta entra na capela do convite confirmando a própria senha,
 * sem criar outro cadastro.
 * @param {object} input
 */
export async function registerUser(input) {
  const data = unwrap(registerSchema.safeParse(input));

  return prisma.$transaction(async (tx) => {
    // Confere o convite e o e-mail antes de pagar o custo do hash da senha.
    const invite = await validateInviteToken(data.inviteToken, tx);

    const existing = await tx.user.findUnique({ where: { email: data.email } });
    let userId;

    if (existing) {
      const matches = await bcrypt.compare(data.password, existing.passwordHash);
      if (!matches) {
        throw new ConflictError(
          'Já existe um cadastro com este e-mail. Use a senha dessa conta para entrar nesta capela.',
        );
      }
      const member = await tx.capelaMembership.findUnique({
        where: { userId_capelaId: { userId: existing.id, capelaId: invite.capelaId } },
      });
      if (member) throw new ConflictError('Você já faz parte desta capela.');
      userId = existing.id;
    } else {
      const created = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash: await bcrypt.hash(data.password, SALT_ROUNDS),
          instruments: data.instruments,
        },
      });
      userId = created.id;
    }

    await tx.capelaMembership.create({
      data: { userId, capelaId: invite.capelaId, role: 'MUSICO' },
    });

    // updateMany com a guarda usedAt:null evita a corrida de dois cadastros
    // simultâneos consumindo o mesmo convite.
    const consumed = await tx.invite.updateMany({
      where: { id: invite.id, usedAt: null },
      data: { usedAt: new Date(), usedById: userId },
    });
    if (consumed.count === 0) {
      throw new ConflictError('Este convite acabou de ser usado por outra pessoa.');
    }

    return toActor(await tx.user.findUnique({ where: { id: userId }, select: PUBLIC_FIELDS }));
  });
}

/**
 * Confere as credenciais de login.
 * @returns {Promise<object|null>} usuário público, ou null se não confere
 */
export async function authenticate(input) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return null;
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) return null;

  return toPublicUser(user);
}

/**
 * Equipe visível: o músico só vê as próprias capelas, e de cada colega só as
 * capelas em comum; o coordenador vê todo mundo (para saber quem é quem), mas
 * só gerencia as capelas que coordena — isso é checado à parte, em
 * `changeRole`/`removeFromCapela`/`createInvite`.
 */
export async function listMembers(actor) {
  assertCan(actor, ACTIONS.VIEW_CALENDAR);
  if (isCoordinator(actor)) {
    const members = await prisma.user.findMany({ select: PUBLIC_FIELDS, orderBy: { name: 'asc' } });
    return members.map(toActor);
  }
  const shared = { capelaId: { in: actor.capelaIds ?? [] } };
  const members = await prisma.user.findMany({
    where: { memberships: { some: shared } },
    select: { ...PUBLIC_FIELDS, memberships: { ...MEMBERSHIPS, where: shared } },
    orderBy: { name: 'asc' },
  });
  return members.map(toActor);
}

/** Troca o papel de alguém numa capela que o ator administra. */
export async function changeRole(userId, capelaId, role, actor) {
  assertCan(actor, ACTIONS.MANAGE_USERS);
  if (!ROLE_VALUES.includes(role)) {
    throw new ValidationError('Papel inválido.', { role: 'Escolha Coordenador ou Músico.' });
  }
  assertManagesCapela(actor, await getCapela(capelaId));

  const changed = await prisma.capelaMembership.updateMany({
    where: { userId, capelaId },
    data: { role },
  });
  if (changed.count === 0) throw new NotFoundError('Integrante não encontrado nesta capela.');
  return findUserById(userId);
}

/** Coloca uma pessoa que já tem conta numa capela que o ator administra. */
export async function addToCapela(userId, capelaId, role, actor) {
  assertCan(actor, ACTIONS.MANAGE_USERS);
  if (!ROLE_VALUES.includes(role)) {
    throw new ValidationError('Papel inválido.', { role: 'Escolha Coordenador ou Músico.' });
  }
  assertManagesCapela(actor, await getCapela(capelaId));

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('Integrante não encontrado.');

  await prisma.capelaMembership.upsert({
    where: { userId_capelaId: { userId, capelaId } },
    create: { userId, capelaId, role },
    update: { role },
  });
  return findUserById(userId);
}

/**
 * Tira alguém de uma capela que o ator administra. A conta continua existindo,
 * com os demais vínculos. Só o dono pode tirar a si mesmo.
 */
export async function removeFromCapela(userId, capelaId, actor) {
  assertCan(actor, ACTIONS.MANAGE_USERS);
  assertManagesCapela(actor, await getCapela(capelaId));
  if (userId === actor.id && !actor.isOwner) {
    throw new DomainError('Você não pode remover a si mesmo.', { status: 400, code: 'auto_remocao' });
  }

  const removed = await prisma.capelaMembership.deleteMany({ where: { userId, capelaId } });
  if (removed.count === 0) throw new NotFoundError('Integrante não encontrado nesta capela.');
  return { id: userId, capelaId };
}

/** Apaga a conta inteira — exclusivo do dono, que não pode apagar a própria. */
export async function removeMember(userId, actor) {
  assertOwner(actor);
  if (userId === actor.id) {
    throw new DomainError('Você não pode remover a si mesmo.', { status: 400, code: 'auto_remocao' });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('Integrante não encontrado.');

  await prisma.user.delete({ where: { id: userId } });
  return { id: userId };
}

/**
 * Cria uma pessoa com nome, e-mail e senha direto numa capela — exclusivo do
 * dono. Se o e-mail já tem conta, só acrescenta o vínculo, sem tocar na senha
 * nem nos dados dela.
 */
export async function createMember(input, actor) {
  assertOwner(actor);
  const data = unwrap(createMemberSchema.safeParse(input));
  await getCapela(data.capelaId);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    const member = await prisma.capelaMembership.findUnique({
      where: { userId_capelaId: { userId: existing.id, capelaId: data.capelaId } },
    });
    if (member) throw new ConflictError('Esta pessoa já faz parte desta capela.');
    await prisma.capelaMembership.create({
      data: { userId: existing.id, capelaId: data.capelaId, role: data.role },
    });
    return findUserById(existing.id);
  }

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: await bcrypt.hash(data.password, SALT_ROUNDS),
      instruments: data.instruments,
      memberships: { create: { capelaId: data.capelaId, role: data.role } },
    },
    select: PUBLIC_FIELDS,
  });
  return toActor(user);
}

async function assertEmailAvailable(email, currentEmail) {
  if (email === currentEmail) return;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ConflictError('Já existe um cadastro com este e-mail.');
}

/**
 * Edição completa de um integrante (nome, e-mail, instrumentos, capelas com
 * seus papéis e, se informada, nova senha) — exclusiva do dono.
 */
export async function updateMember(userId, input, actor) {
  assertOwner(actor);
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new NotFoundError('Integrante não encontrado.');

  const data = unwrap(updateMemberSchema.safeParse(input));

  const capelaIds = data.memberships.map((membership) => membership.capelaId);
  const found = await prisma.capela.count({ where: { id: { in: capelaIds } } });
  if (found !== capelaIds.length) throw new NotFoundError('Capela não encontrada.');

  await assertEmailAvailable(data.email, target.email);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      email: data.email,
      instruments: data.instruments,
      memberships: { deleteMany: {}, create: data.memberships },
      ...(data.password ? { passwordHash: await bcrypt.hash(data.password, SALT_ROUNDS) } : {}),
    },
    select: PUBLIC_FIELDS,
  });
  return toActor(user);
}

/**
 * A própria pessoa muda seus dados. Trocar e-mail ou senha pede a senha atual,
 * para que uma sessão esquecida aberta não baste para tomar a conta.
 */
export async function updateProfile(input, actor) {
  if (!actor?.id) {
    throw new AuthorizationError('É preciso entrar para continuar.', { status: 401 });
  }
  const data = unwrap(profileSchema.safeParse(input));

  const user = await prisma.user.findUnique({ where: { id: actor.id } });
  if (!user) throw new NotFoundError('Integrante não encontrado.');

  if (data.email !== user.email || data.newPassword) {
    const matches = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!matches) {
      throw new ValidationError('Confira a senha atual.', {
        currentPassword: 'Senha atual incorreta.',
      });
    }
  }
  await assertEmailAvailable(data.email, user.email);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: data.name,
      email: data.email,
      instruments: data.instruments,
      ...(data.newPassword ? { passwordHash: await bcrypt.hash(data.newPassword, SALT_ROUNDS) } : {}),
    },
    select: PUBLIC_FIELDS,
  });
  return toActor(updated);
}

/** Só o que as telas de equipe precisam de um integrante. */
export function toMemberRow(member) {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    instruments: member.instruments,
    isOwner: member.isOwner,
    memberships: member.memberships.map(({ capelaId, role, capela }) => ({
      capelaId,
      role,
      capelaName: capela.name,
    })),
  };
}

export async function findUserById(id) {
  const user = await prisma.user.findUnique({ where: { id }, select: PUBLIC_FIELDS });
  return user ? toActor(user) : null;
}
