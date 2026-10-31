import { describe, it, expect } from 'vitest';
import {
  ROLES,
  ASSIGNABLE_ROLES,
  ACTIONS,
  can,
  assertCan,
  AuthorizationError,
  isCoordinator,
  isAdministrator,
  roleLabel,
  canManageCapela,
  assertManagesCapela,
} from '@/domain/auth/roles.js';

const administrador = { id: 'u0', role: 'ADMINISTRADOR', capelaId: null };
const coordenador = { id: 'u1', role: 'COORDENADOR', capelaId: 'capela-1' };
const musico = { id: 'u2', role: 'MUSICO', capelaId: 'capela-1' };

describe('catálogo de papéis', () => {
  it('define Administrador, Coordenador e Músico', () => {
    expect(ROLES.map((r) => r.id)).toEqual(['ADMINISTRADOR', 'COORDENADOR', 'MUSICO']);
    expect(roleLabel('MUSICO')).toBe('Músico');
    expect(roleLabel('ADMINISTRADOR')).toBe('Administrador');
  });

  it('nunca deixa Administrador entre os papéis atribuíveis pela interface', () => {
    expect(ASSIGNABLE_ROLES.map((r) => r.id)).toEqual(['COORDENADOR', 'MUSICO']);
  });

  it('identifica o coordenador e o administrador', () => {
    expect(isCoordinator(coordenador)).toBe(true);
    expect(isCoordinator(musico)).toBe(false);
    expect(isCoordinator(null)).toBe(false);

    expect(isAdministrator(administrador)).toBe(true);
    expect(isAdministrator(coordenador)).toBe(false);
    expect(isAdministrator(null)).toBe(false);
  });
});

describe('can', () => {
  it('deixa o coordenador editar o calendário e o acervo', () => {
    expect(can(coordenador, ACTIONS.MANAGE_CELEBRATION)).toBe(true);
    expect(can(coordenador, ACTIONS.MANAGE_SONG)).toBe(true);
    expect(can(coordenador, ACTIONS.MANAGE_REPERTOIRE)).toBe(true);
    expect(can(coordenador, ACTIONS.MANAGE_USERS)).toBe(true);
  });

  it('não deixa o coordenador fundar capelas — isso é só do administrador', () => {
    expect(can(coordenador, ACTIONS.MANAGE_CAPELA)).toBe(false);
  });

  it('deixa o administrador fundar capelas e conceder coordenações, nada mais', () => {
    expect(can(administrador, ACTIONS.MANAGE_CAPELA)).toBe(true);
    expect(can(administrador, ACTIONS.MANAGE_USERS)).toBe(true);
    expect(can(administrador, ACTIONS.MANAGE_CELEBRATION)).toBe(false);
    expect(can(administrador, ACTIONS.MANAGE_SONG)).toBe(false);
    expect(can(administrador, ACTIONS.VIEW_CALENDAR)).toBe(false);
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

describe('canManageCapela / assertManagesCapela', () => {
  const capela = { id: 'capela-1', createdById: null };
  const capelaFundadaPeloCoordenadorMasNaoMorada = { id: 'capela-2', createdById: coordenador.id };
  const capelaAlheia = { id: 'capela-9', createdById: 'outro-user' };

  it('o coordenador administra a própria capela-casa', () => {
    expect(canManageCapela(coordenador, capela)).toBe(true);
  });

  it('o coordenador não administra uma capela só porque a fundou — só a de casa', () => {
    expect(canManageCapela(coordenador, capelaFundadaPeloCoordenadorMasNaoMorada)).toBe(false);
  });

  it('o coordenador não administra capela alheia', () => {
    expect(canManageCapela(coordenador, capelaAlheia)).toBe(false);
  });

  it('o músico nunca administra capela, mesmo a própria', () => {
    expect(canManageCapela(musico, capela)).toBe(false);
  });

  it('nega quando não há capela', () => {
    expect(canManageCapela(coordenador, null)).toBe(false);
    expect(canManageCapela(administrador, null)).toBe(false);
  });

  it('o administrador administra qualquer capela, mesmo sem ser dono nem morador', () => {
    expect(canManageCapela(administrador, capela)).toBe(true);
    expect(canManageCapela(administrador, capelaAlheia)).toBe(true);
  });

  it('assertManagesCapela lança 401 sem usuário e 403 fora da capela', () => {
    expect(() => assertManagesCapela(null, capela)).toThrow(AuthorizationError);
    try {
      assertManagesCapela(null, capela);
    } catch (error) {
      expect(error.status).toBe(401);
    }

    try {
      assertManagesCapela(musico, capelaAlheia);
    } catch (error) {
      expect(error.status).toBe(403);
    }
  });

  it('assertManagesCapela passa silenciosamente quando o coordenador administra a capela', () => {
    expect(() => assertManagesCapela(coordenador, capela)).not.toThrow();
  });
});
