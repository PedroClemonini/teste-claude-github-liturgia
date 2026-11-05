import { describe, it, expect } from 'vitest';
import {
  ROLES,
  ASSIGNABLE_ROLES,
  ACTIONS,
  can,
  assertCan,
  AuthorizationError,
  isCoordinator,
  isOwner,
  actorLabel,
  toActor,
  roleLabel,
  canManageCapela,
  assertManagesCapela,
  assertOwner,
} from '@/domain/auth/roles.js';

const dono = toActor({ id: 'u0', isOwner: true });
const coordenador = toActor({
  id: 'u1',
  memberships: [{ capelaId: 'capela-1', role: 'COORDENADOR' }],
});
const musico = toActor({ id: 'u2', memberships: [{ capelaId: 'capela-1', role: 'MUSICO' }] });

describe('catálogo de papéis', () => {
  it('define Coordenador e Músico, ambos atribuíveis', () => {
    expect(ROLES.map((r) => r.id)).toEqual(['COORDENADOR', 'MUSICO']);
    expect(ASSIGNABLE_ROLES.map((r) => r.id)).toEqual(['COORDENADOR', 'MUSICO']);
    expect(roleLabel('MUSICO')).toBe('Músico');
  });

  it('identifica o coordenador e o dono', () => {
    expect(isCoordinator(coordenador)).toBe(true);
    expect(isCoordinator(musico)).toBe(false);
    expect(isCoordinator(null)).toBe(false);

    expect(isOwner(dono)).toBe(true);
    expect(isOwner(coordenador)).toBe(false);
    expect(isOwner(null)).toBe(false);
  });

  it('mostra o rótulo de quem está logado', () => {
    expect(actorLabel(dono)).toBe('Dono');
    expect(actorLabel(coordenador)).toBe('Coordenador');
    expect(actorLabel(musico)).toBe('Músico');
  });
});

describe('toActor', () => {
  it('é coordenador se coordena ao menos uma capela', () => {
    const misto = toActor({
      memberships: [
        { capelaId: 'a', role: 'MUSICO' },
        { capelaId: 'b', role: 'COORDENADOR' },
      ],
    });
    expect(misto.role).toBe('COORDENADOR');
    expect(misto.capelaIds).toEqual(['a', 'b']);
  });

  it('sem vínculos é músico, sem capelas', () => {
    expect(toActor({})).toMatchObject({ role: 'MUSICO', capelaIds: [], isOwner: false });
  });

  it('o dono é coordenador mesmo sem vínculo, e NULL do banco vira false', () => {
    expect(toActor({ isOwner: true }).role).toBe('COORDENADOR');
    expect(toActor({ isOwner: null }).isOwner).toBe(false);
  });
});

describe('can', () => {
  it('deixa o coordenador editar o calendário e o acervo', () => {
    expect(can(coordenador, ACTIONS.MANAGE_CELEBRATION)).toBe(true);
    expect(can(coordenador, ACTIONS.MANAGE_SONG)).toBe(true);
    expect(can(coordenador, ACTIONS.MANAGE_REPERTOIRE)).toBe(true);
    expect(can(coordenador, ACTIONS.MANAGE_USERS)).toBe(true);
  });

  it('não deixa o coordenador criar capelas — isso é só do dono', () => {
    expect(can(coordenador, ACTIONS.MANAGE_CAPELA)).toBe(false);
  });

  it('deixa o dono criar capelas e fazer tudo que o coordenador faz', () => {
    for (const action of Object.values(ACTIONS)) expect(can(dono, action)).toBe(true);
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
  const capelaFundadaPeloCoordenador = { id: 'capela-2', createdById: coordenador.id };
  const capelaAlheia = { id: 'capela-9', createdById: 'outro-user' };

  it('o coordenador administra a capela que coordena', () => {
    expect(canManageCapela(coordenador, capela)).toBe(true);
  });

  it('o coordenador não administra uma capela só porque a fundou', () => {
    expect(canManageCapela(coordenador, capelaFundadaPeloCoordenador)).toBe(false);
  });

  it('o coordenador não administra capela alheia', () => {
    expect(canManageCapela(coordenador, capelaAlheia)).toBe(false);
  });

  it('o músico nunca administra capela, mesmo a própria', () => {
    expect(canManageCapela(musico, capela)).toBe(false);
  });

  it('coordenar uma capela não dá poder onde a pessoa é só músico', () => {
    const misto = toActor({
      memberships: [
        { capelaId: 'capela-1', role: 'COORDENADOR' },
        { capelaId: 'capela-2', role: 'MUSICO' },
      ],
    });
    expect(canManageCapela(misto, { id: 'capela-1' })).toBe(true);
    expect(canManageCapela(misto, { id: 'capela-2' })).toBe(false);
  });

  it('nega quando não há capela ou usuário', () => {
    expect(canManageCapela(coordenador, null)).toBe(false);
    expect(canManageCapela(dono, null)).toBe(false);
    expect(canManageCapela(null, capela)).toBe(false);
  });

  it('o dono administra qualquer capela, sem vínculo com ela', () => {
    expect(canManageCapela(dono, capela)).toBe(true);
    expect(canManageCapela(dono, capelaAlheia)).toBe(true);
  });

  it('assertOwner barra quem não é dono', () => {
    expect(() => assertOwner(dono)).not.toThrow();
    expect(() => assertOwner(coordenador)).toThrow(AuthorizationError);
    expect(() => assertOwner(null)).toThrow(AuthorizationError);
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
