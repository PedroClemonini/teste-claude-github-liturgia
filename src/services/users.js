/**
 * Equipe do coral: cadastro, autenticação e papéis.
 */
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma.js';
import { registerSchema, loginSchema, updateMemberSchema, ROLE_VALUES } from '@/domain/validation/schemas.js';
import {
  ACTIONS,
  AuthorizationError,
  assertCan,
  assertManagesCapela,
  isAdministrator,
  isCoordinator,
} from '@/domain/auth/roles.js';
import { validateInviteToken } from '@/services/invites.js';
import { ConflictError, DomainError, NotFoundError, ValidationError, unwrap } from '@/domain/errors.js';

const SALT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 10);

const PUBLIC_FIELDS = {
  id: true,
  name: true,
  email: true,
  voiceOrInstrument: true,
  role: true,
  capelaId: true,
  createdAt: true,
};

/** Remove o hash da senha antes de qualquer coisa sair do servidor. */
export function toPublicUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

/**
 * Cadastro por convite: o convite decide a capela, o papel é sempre Músico.
 * @param {object} input
 */
export async function registerUser(input) {
  const data = unwrap(registerSchema.safeParse(input));

  return prisma.$transaction(async (tx) => {
    // Confere o convite e o e-mail antes de pagar o custo do hash da senha.
    const invite = await validateInviteToken(data.inviteToken, tx);

    const existing = await tx.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictError('Já existe um cadastro com este e-mail.');

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const user = await tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        voiceOrInstrument: data.voiceOrInstrument,
        role: 'MUSICO',
        capelaId: invite.capelaId,
      },
      select: PUBLIC_FIELDS,
    });

    // updateMany com a guarda usedAt:null evita a corrida de dois cadastros
    // simultâneos consumindo o mesmo convite.
    const consumed = await tx.invite.updateMany({
      where: { id: invite.id, usedAt: null },
      data: { usedAt: new Date(), usedById: user.id },
    });
    if (consumed.count === 0) {
      throw new ConflictError('Este convite acabou de ser usado por outra pessoa.');
    }

    return user;
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

// Administrador nunca aparece em nenhuma listagem de equipe — ninguém o vê.
const NOT_ADMIN = { role: { not: 'ADMINISTRADOR' } };

/**
 * Equipe visível: o músico só vê a própria capela; o coordenador vê todo
 * mundo (para saber quem é quem), mas só gerencia (convida, promove,
 * remove) a própria — isso é checado à parte, em
 * `changeRole`/`removeMember`/`createInvite`.
 */
export async function listMembers(actor) {
  assertCan(actor, ACTIONS.VIEW_CALENDAR);
  if (isCoordinator(actor)) {
    return prisma.user.findMany({
      where: NOT_ADMIN,
      select: { ...PUBLIC_FIELDS, capela: { select: { name: true } } },
      orderBy: [{ capelaId: 'asc' }, { name: 'asc' }],
    });
  }
  return prisma.user.findMany({
    // Sem capela (conta órfã/legada), não vê ninguém — em vez de ver todo mundo.
    where: { capelaId: actor.capelaId ?? '__none__', ...NOT_ADMIN },
    select: { ...PUBLIC_FIELDS, capela: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });
}

/** Todos os integrantes, de todas as capelas — só para o administrador. */
export async function listAllMembers(actor) {
  if (!isAdministrator(actor)) {
    throw new AuthorizationError('Esta ação é exclusiva do administrador.', {
      status: actor?.role ? 403 : 401,
    });
  }
  return prisma.user.findMany({
    where: NOT_ADMIN,
    select: { ...PUBLIC_FIELDS, capela: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });
}

/** Troca o papel de um integrante da capela que o coordenador (ou o administrador) administra. */
export async function changeRole(userId, role, actor) {
  assertCan(actor, ACTIONS.MANAGE_USERS);
  if (!ROLE_VALUES.includes(role)) {
    throw new ValidationError('Papel inválido.', { role: 'Escolha Coordenador ou Músico.' });
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('Integrante não encontrado.');

  if (!isAdministrator(actor)) {
    const capela = user.capelaId ? await prisma.capela.findUnique({ where: { id: user.capelaId } }) : null;
    assertManagesCapela(actor, capela);
  }

  return prisma.user.update({ where: { id: userId }, data: { role }, select: PUBLIC_FIELDS });
}

/**
 * Remove um integrante. O coordenador só remove quem é da própria capela;
 * o administrador remove qualquer um (menos outro administrador).
 */
export async function removeMember(userId, actor) {
  assertCan(actor, ACTIONS.MANAGE_USERS);
  if (userId === actor.id) {
    throw new DomainError('Você não pode remover a si mesmo.', { status: 400, code: 'auto_remocao' });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('Integrante não encontrado.');
  if (user.role === 'ADMINISTRADOR') {
    throw new AuthorizationError('Não é possível remover um administrador por aqui.', { status: 403 });
  }

  if (!isAdministrator(actor)) {
    const capela = user.capelaId ? await prisma.capela.findUnique({ where: { id: user.capelaId } }) : null;
    assertManagesCapela(actor, capela);
  }

  await prisma.user.delete({ where: { id: userId } });
  return { id: userId };
}

/**
 * Move um integrante para outra capela — exclusivo do administrador. Se a
 * pessoa for coordenadora, a coordenação passa a valer na capela nova (a
 * autoridade do coordenador é sempre a da própria `capelaId`).
 */
export async function reassignCapela(userId, capelaId, actor) {
  if (!isAdministrator(actor)) {
    throw new AuthorizationError('Esta ação é exclusiva do administrador.', {
      status: actor?.role ? 403 : 401,
    });
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('Integrante não encontrado.');
  if (user.role === 'ADMINISTRADOR') {
    throw new AuthorizationError('Não é possível editar um administrador por aqui.', { status: 403 });
  }

  const capela = await prisma.capela.findUnique({ where: { id: capelaId } });
  if (!capela) throw new NotFoundError('Capela não encontrada.');

  return prisma.user.update({ where: { id: userId }, data: { capelaId }, select: PUBLIC_FIELDS });
}

/**
 * Edição completa de um integrante (nome, e-mail, voz/instrumento, capela,
 * papel e, se informada, nova senha) — exclusiva do administrador.
 */
export async function updateMember(userId, input, actor) {
  if (!isAdministrator(actor)) {
    throw new AuthorizationError('Esta ação é exclusiva do administrador.', {
      status: actor?.role ? 403 : 401,
    });
  }
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new NotFoundError('Integrante não encontrado.');
  if (target.role === 'ADMINISTRADOR') {
    throw new AuthorizationError('Não é possível editar um administrador por aqui.', { status: 403 });
  }

  const data = unwrap(updateMemberSchema.safeParse(input));

  const capela = await prisma.capela.findUnique({ where: { id: data.capelaId } });
  if (!capela) throw new NotFoundError('Capela não encontrada.');

  if (data.email !== target.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictError('Já existe um cadastro com este e-mail.');
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      email: data.email,
      voiceOrInstrument: data.voiceOrInstrument,
      capelaId: data.capelaId,
      role: data.role,
      ...(data.password ? { passwordHash: await bcrypt.hash(data.password, SALT_ROUNDS) } : {}),
    },
    select: PUBLIC_FIELDS,
  });
}

export async function findUserById(id) {
  const user = await prisma.user.findUnique({ where: { id }, select: PUBLIC_FIELDS });
  return user ?? null;
}
