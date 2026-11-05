import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  songSchema,
  celebrationSchema,
  repertoireItemSchema,
} from '@/domain/validation/schemas.js';

describe('registerSchema', () => {
  const valid = {
    name: 'Maria Coral',
    email: 'maria@paroquia.org',
    password: 'salmo23aleluia',
    instruments: ['Soprano'],
    inviteToken: 'token-do-convite',
  };

  it('aceita cadastro completo', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('normaliza o e-mail para minúsculas e sem espaços', () => {
    const parsed = registerSchema.parse({ ...valid, email: '  Maria@Paroquia.ORG ' });
    expect(parsed.email).toBe('maria@paroquia.org');
  });

  it('recusa e-mail inválido', () => {
    expect(registerSchema.safeParse({ ...valid, email: 'maria(at)paroquia' }).success).toBe(false);
  });

  it('exige senha de pelo menos 8 caracteres', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'curta' }).success).toBe(false);
  });

  it('exige voz ou instrumento', () => {
    expect(registerSchema.safeParse({ ...valid, instruments: [''] }).success).toBe(false);
    expect(registerSchema.parse({ ...valid, instruments: undefined }).instruments).toEqual([]);
    expect(registerSchema.parse({ ...valid, instruments: ['Violão', ' violão '] }).instruments).toHaveLength(1);
  });

  it('exige o token do convite', () => {
    const { inviteToken, ...semConvite } = valid;
    expect(registerSchema.safeParse(semConvite).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('exige e-mail e senha', () => {
    expect(loginSchema.safeParse({ email: 'a@b.org', password: 'x' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'a@b.org' }).success).toBe(false);
  });
});

describe('songSchema', () => {
  const valid = {
    title: 'Vem, Espírito Santo',
    composer: 'Pe. Zezinho',
    chordPro: '[G]Vem, Espírito [C]Santo',
    originalKey: 'G',
    moments: ['ENTRADA'],
    seasons: ['PASCOA'],
  };

  it('aceita música completa', () => {
    expect(songSchema.safeParse(valid).success).toBe(true);
  });

  it('exige título e cifra', () => {
    expect(songSchema.safeParse({ ...valid, title: '' }).success).toBe(false);
    expect(songSchema.safeParse({ ...valid, chordPro: '   ' }).success).toBe(false);
  });

  it('recusa tom que não é uma cifra válida', () => {
    expect(songSchema.safeParse({ ...valid, originalKey: 'H7' }).success).toBe(false);
  });

  it('deduz o tom a partir da cifra quando ele não é informado', () => {
    const parsed = songSchema.parse({ ...valid, originalKey: undefined });
    expect(parsed.originalKey).toBe('G');
  });

  it('recusa momento fora do rito', () => {
    expect(songSchema.safeParse({ ...valid, moments: ['CAFEZINHO'] }).success).toBe(false);
  });

  it('aceita listas de momentos e tempos vazias', () => {
    const parsed = songSchema.parse({ ...valid, moments: undefined, seasons: undefined });
    expect(parsed.moments).toEqual([]);
    expect(parsed.seasons).toEqual([]);
  });
});

describe('celebrationSchema', () => {
  const valid = {
    title: 'Missa dominical',
    date: '2026-04-05T10:00:00.000Z',
    type: 'MISSA_COMUM',
  };

  it('aceita evento completa', () => {
    expect(celebrationSchema.safeParse(valid).success).toBe(true);
  });

  it('converte a data em objeto Date', () => {
    expect(celebrationSchema.parse(valid).date).toBeInstanceOf(Date);
  });

  it('recusa data inválida', () => {
    expect(celebrationSchema.safeParse({ ...valid, date: 'domingo que vem' }).success).toBe(false);
  });

  it('deduz o tempo litúrgico pela data quando não informado', () => {
    expect(celebrationSchema.parse(valid).season).toBe('PASCOA');
  });

  it('respeita o tempo litúrgico informado pelo coordenador', () => {
    expect(celebrationSchema.parse({ ...valid, season: 'TEMPO_COMUM' }).season).toBe('TEMPO_COMUM');
  });

  it('recusa tipo de evento desconhecido', () => {
    expect(celebrationSchema.safeParse({ ...valid, type: 'PIQUENIQUE' }).success).toBe(false);
  });
});

describe('repertoireItemSchema', () => {
  it('aceita item do roteiro', () => {
    const parsed = repertoireItemSchema.parse({ songId: 's1', moment: 'OFERTORIO' });
    expect(parsed.position).toBe(0);
    expect(parsed.keyOverride).toBeNull();
  });

  it('recusa tom de execução inválido', () => {
    expect(
      repertoireItemSchema.safeParse({ songId: 's1', moment: 'SANTO', keyOverride: 'Z#' }).success,
    ).toBe(false);
  });

  it('aceita tom de execução válido', () => {
    expect(repertoireItemSchema.parse({ songId: 's1', moment: 'SANTO', keyOverride: 'Bb' }).keyOverride).toBe('Bb');
  });
});
