/**
 * Esquemas de validação compartilhados entre formulários e rotas de API,
 * para que o navegador e o servidor cobrem exatamente as mesmas regras.
 */
import { z } from 'zod';
import { isChord } from '../chordpro/chord.js';
import { extractKey } from '../chordpro/parse.js';
import { isValidMoment } from '../liturgy/moments.js';
import { isValidSeason, seasonForDate } from '../liturgy/seasons.js';

const chordField = z.string().refine((value) => isChord(value), {
  message: 'Informe um tom válido (ex.: G, Bb, F#m).',
});

const momentId = z.string().refine(isValidMoment, { message: 'Momento do rito inválido.' });
const seasonId = z.string().refine(isValidSeason, { message: 'Tempo litúrgico inválido.' });

export const ROLE_VALUES = ['COORDENADOR', 'MUSICO'];
export const CELEBRATION_TYPES = ['MISSA_COMUM', 'MISSA_SOLENE', 'ENSAIO'];

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome completo.'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Informe um e-mail válido.'),
  password: z.string().min(8, 'A senha precisa de pelo menos 8 caracteres.'),
  voiceOrInstrument: z.string().trim().min(1, 'Informe sua voz ou instrumento.'),
  role: z.enum(ROLE_VALUES).default('MUSICO'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe a senha.'),
});

export const songSchema = z
  .object({
    title: z.string().trim().min(1, 'Informe o título.'),
    composer: z.string().trim().optional().nullable().default(null),
    chordPro: z.string().trim().min(1, 'Cole ou digite a cifra em ChordPro.'),
    originalKey: chordField.optional(),
    moments: z.array(momentId).optional().default([]),
    seasons: z.array(seasonId).optional().default([]),
  })
  .transform((song) => ({
    ...song,
    originalKey: song.originalKey ?? extractKey(song.chordPro) ?? 'C',
  }));

export const celebrationSchema = z
  .object({
    title: z.string().trim().min(1, 'Informe o título da celebração.'),
    date: z.coerce.date({ message: 'Informe uma data e horário válidos.' }),
    type: z.enum(CELEBRATION_TYPES).default('MISSA_COMUM'),
    season: seasonId.optional(),
    location: z.string().trim().optional().nullable().default(null),
    notes: z.string().trim().optional().nullable().default(null),
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
