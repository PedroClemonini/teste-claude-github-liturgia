import { describe, it, expect } from 'vitest';
import {
  ROLES,
  ACTIONS,
  can,
  assertCan,
  AuthorizationError,
  isCoordinator,
  roleLabel,
} from '@/domain/auth/roles.js';

const coordenador = { id: 'u1', role: 'COORDENADOR' };
const musico = { id: 'u2', role: 'MUSICO' };

describe('catálogo de papéis', () => {
  it('define apenas Coordenador e Músico', () => {
    expect(ROLES.map((r) => r.id)).toEqual(['COORDENADOR', 'MUSICO']);
    expect(roleLabel('MUSICO')).toBe('Músico');
  });

  it('identifica o coordenador', () => {
    expect(isCoordinator(coordenador)).toBe(true);
    expect(isCoordinator(musico)).toBe(false);
    expect(isCoordinator(null)).toBe(false);
  });
});

describe('can', () => {
  it('deixa o coordenador editar o calendário e o acervo', () => {
    expect(can(coordenador, ACTIONS.MANAGE_CELEBRATION)).toBe(true);
    expect(can(coordenador, ACTIONS.MANAGE_SONG)).toBe(true);
    expect(can(coordenador, ACTIONS.MANAGE_REPERTOIRE)).toBe(true);
    expect(can(coordenador, ACTIONS.MANAGE_USERS)).toBe(true);
  });

  it('deixa o músico apenas visualizar escalas e cifras', () => {
    expect(can(musico, ACTIONS.VIEW_CALENDAR)).toBe(true);
    expect(can(musico, ACTIONS.VIEW_SONG)).toBe(true);
    expect(can(musico, ACTIONS.MANAGE_CELEBRATION)).toBe(false);
    expect(can(musico, ACTIONS.MANAGE_SONG)).toBe(false);
    expect(can(musico, ACTIONS.MANAGE_USERS)).toBe(false);
  });

  it('nega tudo a visitante não autenticado', () => {
    expect(can(null, ACTIONS.VIEW_CALENDAR)).toBe(false);
    expect(can(undefined, ACTIONS.VIEW_SONG)).toBe(false);
  });

  it('nega ação desconhecida', () => {
    expect(can(coordenador, 'demolir:paroquia')).toBe(false);
  });
});

describe('assertCan', () => {
  it('passa silenciosamente quando permitido', () => {
    expect(() => assertCan(coordenador, ACTIONS.MANAGE_SONG)).not.toThrow();
  });

  it('lança AuthorizationError quando negado', () => {
    expect(() => assertCan(musico, ACTIONS.MANAGE_SONG)).toThrow(AuthorizationError);
    try {
      assertCan(musico, ACTIONS.MANAGE_SONG);
    } catch (error) {
      expect(error.status).toBe(403);
      expect(error.action).toBe(ACTIONS.MANAGE_SONG);
    }
  });

  it('usa 401 quando não há usuário', () => {
    try {
      assertCan(null, ACTIONS.VIEW_CALENDAR);
    } catch (error) {
      expect(error.status).toBe(401);
    }
  });
});
