/**
 * Controle de acesso por papel.
 *
 * O papel é por capela: a mesma pessoa pode coordenar uma e ser Músico em
 * outra. O Coordenador organiza as capelas que coordena (calendário, equipe);
 * o Músico consulta as escalas e as cifras. O dono é um coordenador com um
 * atributo a mais: coordena todas as capelas, cria capelas e adiciona pessoas
 * em qualquer uma.
 *
 * `toActor` resume os vínculos num `role` geral, usado por `can` para as ações
 * que não dependem de capela; as que dependem passam por `canManageCapela`.
 * Toda checagem passa por aqui, inclusive nas rotas de API, para que a
 * interface nunca seja a única barreira.
 */

export const ROLES = [
  { id: 'COORDENADOR', label: 'Coordenador' },
  { id: 'MUSICO', label: 'Músico' },
];

/** Papéis que podem ser atribuídos num vínculo com uma capela. */
export const ASSIGNABLE_ROLES = ROLES;

const ROLE_BY_ID = new Map(ROLES.map((role) => [role.id, role]));

export const ACTIONS = {
  VIEW_CALENDAR: 'calendar:view',
  MANAGE_CELEBRATION: 'celebration:manage',
  MANAGE_REPERTOIRE: 'repertoire:manage',
  VIEW_SONG: 'song:view',
  MANAGE_SONG: 'song:manage',
  MANAGE_USERS: 'user:manage',
  MANAGE_CAPELA: 'capela:manage',
};

const PERMISSIONS = {
  COORDENADOR: new Set([
    ACTIONS.VIEW_CALENDAR,
    ACTIONS.MANAGE_CELEBRATION,
    ACTIONS.MANAGE_REPERTOIRE,
    ACTIONS.VIEW_SONG,
    ACTIONS.MANAGE_SONG,
    ACTIONS.MANAGE_USERS,
  ]),
  MUSICO: new Set([ACTIONS.VIEW_CALENDAR, ACTIONS.VIEW_SONG]),
};

const KNOWN_ACTIONS = new Set(Object.values(ACTIONS));

export class AuthorizationError extends Error {
  /**
   * @param {string} message
   * @param {{status?: number, action?: string}} [details]
   */
  constructor(message, { status = 403, action } = {}) {
    super(message);
    this.name = 'AuthorizationError';
    this.status = status;
    this.action = action;
  }
}

/** @param {string} id */
export function roleLabel(id) {
  return ROLE_BY_ID.get(id)?.label ?? id;
}

/** @param {{role?: string}|null|undefined} user */
export function isCoordinator(user) {
  return user?.role === 'COORDENADOR';
}

/** @param {{isOwner?: boolean|null}|null|undefined} user */
export function isOwner(user) {
  return user?.isOwner === true;
}

/** Rótulo curto de quem está logado, para o cabeçalho. */
export function actorLabel(user) {
  return isOwner(user) ? 'Dono' : roleLabel(user?.role);
}

/**
 * Monta o "ator" usado nas checagens a partir do usuário com seus vínculos.
 * `role` é Coordenador se a pessoa coordena ao menos uma capela (ou é o dono).
 * @param {{isOwner?: boolean|null, memberships?: {capelaId: string, role: string}[]}} user
 */
export function toActor(user) {
  const memberships = user.memberships ?? [];
  const owner = user.isOwner === true;
  const coordinates = memberships.some((membership) => membership.role === 'COORDENADOR');
  return {
    ...user,
    memberships,
    isOwner: owner,
    role: owner || coordinates ? 'COORDENADOR' : 'MUSICO',
    capelaIds: memberships.map((membership) => membership.capelaId),
  };
}

/**
 * @param {{role?: string}|null|undefined} user
 * @param {string} action
 * @returns {boolean}
 */
export function can(user, action) {
  if (!user?.role) return false;
  if (!KNOWN_ACTIONS.has(action)) return false;
  if (action === ACTIONS.MANAGE_CAPELA) return isOwner(user);
  return PERMISSIONS[user.role]?.has(action) ?? false;
}

/**
 * @param {{role?: string}|null|undefined} user
 * @param {string} action
 * @throws {AuthorizationError}
 */
export function assertCan(user, action) {
  if (!user?.role) {
    throw new AuthorizationError('É preciso entrar para continuar.', { status: 401, action });
  }
  if (!can(user, action)) {
    throw new AuthorizationError('Esta ação é exclusiva do coordenador.', { status: 403, action });
  }
}

/**
 * O dono administra todas as capelas; o coordenador, só aquelas em que tem
 * vínculo de Coordenador. Ser Músico numa capela não dá direito de geri-la,
 * mesmo que a pessoa coordene outra.
 * @param {{isOwner?: boolean, memberships?: {capelaId: string, role: string}[]}|null} actor
 * @param {{id: string}|null} capela
 */
export function canManageCapela(actor, capela) {
  if (!capela || !actor) return false;
  if (isOwner(actor)) return true;
  return (actor.memberships ?? []).some(
    (membership) => membership.capelaId === capela.id && membership.role === 'COORDENADOR',
  );
}

/**
 * @param {object|null} actor
 * @param {{id: string}|null} capela
 * @throws {AuthorizationError}
 */
export function assertManagesCapela(actor, capela) {
  if (!actor?.role) {
    throw new AuthorizationError('É preciso entrar para continuar.', {
      status: 401,
      action: ACTIONS.MANAGE_CAPELA,
    });
  }
  if (!canManageCapela(actor, capela)) {
    throw new AuthorizationError('Esta ação é exclusiva do coordenador desta capela.', {
      status: 403,
      action: ACTIONS.MANAGE_CAPELA,
    });
  }
}

/**
 * @param {object|null} actor
 * @throws {AuthorizationError}
 */
export function assertOwner(actor) {
  if (!actor?.role) {
    throw new AuthorizationError('É preciso entrar para continuar.', { status: 401 });
  }
  if (!isOwner(actor)) {
    throw new AuthorizationError('Esta ação é exclusiva do dono do sistema.', { status: 403 });
  }
}
