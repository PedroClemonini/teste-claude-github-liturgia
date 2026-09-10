/**
 * Equipe do coral: cadastro, autenticação e papéis.
 */
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma.js';
import { registerSchema, loginSchema, ROLE_VALUES } from '@/domain/validation/schemas.js';
import { ACTIONS, assertCan } from '@/domain/auth/roles.js';
import { ConflictError, NotFoundError, ValidationError, unwrap } from '@/domain/errors.js';

const SALT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 10);

const PUBLIC_FIELDS = {
  id: true,
  name: true,
  email: true,
  voiceOrInstrument: true,
  role: true,
  createdAt: true,
};

/** Remove o hash da senha antes de qualquer coisa sair do servidor. */
export function toPublicUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

/**
 * Cadastro simples: nome, e-mail, senha e voz/instrumento.
 * @param {object} input
 */
export async function registerUser(input) {
  const data = unwrap(registerSchema.safeParse(input));

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new ConflictError('Já existe um cadastro com este e-mail.');

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: await bcrypt.hash(data.password, SALT_ROUNDS),
      voiceOrInstrument: data.voiceOrInstrument,
      role: data.role,
    },
    select: PUBLIC_FIELDS,
  });
  return user;
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

/** Equipe completa, visível a qualquer integrante autenticado. */
export async function listMembers(actor) {
  assertCan(actor, ACTIONS.VIEW_CALENDAR);
  return prisma.user.findMany({ select: PUBLIC_FIELDS, orderBy: { name: 'asc' } });
}

/** Troca o papel de um integrante (só o coordenador). */
export async function changeRole(userId, role, actor) {
  assertCan(actor, ACTIONS.MANAGE_USERS);
  if (!ROLE_VALUES.includes(role)) {
    throw new ValidationError('Papel inválido.', { role: 'Escolha Coordenador ou Músico.' });
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('Integrante não encontrado.');

  return prisma.user.update({ where: { id: userId }, data: { role }, select: PUBLIC_FIELDS });
}

export async function findUserById(id) {
  const user = await prisma.user.findUnique({ where: { id }, select: PUBLIC_FIELDS });
  return user ?? null;
}
