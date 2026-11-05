/**
 * Esquemas de validação compartilhados entre formulários e rotas de API,
 * para que o navegador e o servidor cobrem exatamente as mesmas regras.
 */
import { z } from 'zod';
import { isChord } from '../chordpro/chord.js';
import { extractKey } from '../chordpro/parse.js';
import { isValidMoment } from '../liturgy/moments.js';
import { isValidSeason, seasonForDate } from '../liturgy/seasons.js';
import { normalizeTags } from '../songs/tags.js';

const chordField = z.string().refine((value) => isChord(value), {
  message: 'Informe um tom válido (ex.: G, Bb, F#m).',
});

const momentId = z.string().refine(isValidMoment, { message: 'Momento do rito inválido.' });
const seasonId = z.string().refine(isValidSeason, { message: 'Tempo litúrgico inválido.' });

const optionalUrlField = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z
    .string()
    .trim()
    .url('Informe um link válido (ex.: https://...).')
    .nullable()
    .optional()
    .default(null),
);

export const ROLE_VALUES = ['COORDENADOR', 'MUSICO'];
export const CELEBRATION_TYPES = ['MISSA_COMUM', 'MISSA_SOLENE', 'ENSAIO'];

/** Vozes e instrumentos: tira repetições sem diferenciar maiúsculas. */
const instrumentsField = z
  .array(z.string().trim().min(1, 'Informe o instrumento.').max(40, 'Nome de instrumento muito longo.'))
  .max(20, 'Escolha no máximo 20 instrumentos.')
  .optional()
  .default([])
  .transform((items) => [...new Map(items.map((item) => [item.toLowerCase(), item])).values()]);

const nameField = z.string().trim().min(2, 'Informe o nome completo.');
const emailField = z.string().trim().toLowerCase().email('Informe um e-mail válido.');
const passwordField = z.string().min(8, 'A senha precisa de pelo menos 8 caracteres.');
/** Em branco, mantém a senha atual. */
const optionalPasswordField = z.union([passwordField, z.literal('')]).optional();

export const registerSchema = z.object({
  name: nameField,
  email: emailField,
  password: passwordField,
  instruments: instrumentsField,
  // O cadastro é só por convite: o papel nunca vem do cliente (sempre
  // Músico, forçado em registerUser) e a capela vem do convite, não daqui.
  inviteToken: z.string().trim().min(1, 'Convite obrigatório.'),
});

export const capelaSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome da capela.'),
});

/** Pessoa criada diretamente pelo dono numa capela, com nome, e-mail e senha. */
export const createMemberSchema = z.object({
  capelaId: z.string().trim().min(1, 'Escolha uma capela.'),
  name: nameField,
  email: emailField,
  password: passwordField,
  role: z.enum(ROLE_VALUES).optional().default('MUSICO'),
  instruments: instrumentsField,
});

/** Edição completa de um integrante e dos seus vínculos — exclusiva do dono. */
export const updateMemberSchema = z.object({
  name: nameField,
  email: emailField,
  instruments: instrumentsField,
  memberships: z
    .array(z.object({ capelaId: z.string().trim().min(1), role: z.enum(ROLE_VALUES) }))
    .refine((items) => new Set(items.map((item) => item.capelaId)).size === items.length, {
      message: 'Cada capela só pode aparecer uma vez.',
    }),
  password: optionalPasswordField,
});

/** A própria pessoa editando o perfil. */
export const profileSchema = z.object({
  name: nameField,
  email: emailField,
  instruments: instrumentsField,
  currentPassword: z.string().optional().default(''),
  newPassword: optionalPasswordField,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe a senha.'),
});

/** "Esqueci minha senha": só o e-mail de quem está pedindo. */
export const requestPasswordResetSchema = z.object({
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.'),
});

/** Nova senha, a partir do token que veio no link do e-mail. */
export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Link de redefinição inválido.'),
  password: z.string().min(8, 'A senha precisa de pelo menos 8 caracteres.'),
});

export const songSchema = z
  .object({
    title: z.string().trim().min(1, 'Informe o título.'),
    composer: z.string().trim().optional().nullable().default(null),
    chordPro: z.string().trim().min(1, 'Cole ou digite a cifra em ChordPro.'),
    originalKey: chordField.optional(),
    audioUrl: optionalUrlField,
    moments: z.array(momentId).optional().default([]),
    seasons: z.array(seasonId).optional().default([]),
    tags: z.array(z.string().max(60, 'Tag muito longa.')).max(30, 'Use no máximo 30 tags.').optional().default([]),
  })
  .transform((song) => ({
    ...song,
    tags: normalizeTags(song.tags),
    originalKey: song.originalKey ?? extractKey(song.chordPro) ?? 'C',
  }));

export const celebrationSchema = z
  .object({
    title: z.string().trim().min(1, 'Informe o título da evento.'),
    date: z.coerce.date({ message: 'Informe uma data e horário válidos.' }),
    type: z.enum(CELEBRATION_TYPES).default('MISSA_COMUM'),
    season: seasonId.optional(),
    location: z.string().trim().optional().nullable().default(null),
    notes: z.string().trim().optional().nullable().default(null),
    capelaId: z.string().trim().min(1).optional(),
    participantIds: z.array(z.string().trim().min(1)).optional().default([]),
  })
  .transform((celebration) => ({
    ...celebration,
    season: celebration.season ?? seasonForDate(celebration.date),
  }));

export const repertoireItemSchema = z.object({
  songId: z.string().min(1, 'Escolha uma música do acervo.'),
  moment: momentId,
  position: z.coerce.number().int().min(0).max(20).default(0),
  keyOverride: chordField.optional().nullable().default(null),
});

export const repertoireSchema = z.object({
  items: z.array(repertoireItemSchema),
});
