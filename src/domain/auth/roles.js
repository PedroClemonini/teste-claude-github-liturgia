/**
 * Controle de acesso por papel.
 *
 * O Administrador funda capelas e concede coordenações, em qualquer capela;
 * o Coordenador organiza a própria capela (calendário, acervo, equipe); o
 * Músico consulta as escalas e as cifras. Toda checagem passa por
 * `can`/`assertCan`, inclusive nas rotas de API, para que a interface nunca
 * seja a única barreira.
 */

export const ROLES = [
  { id: 'ADMINISTRADOR', label: 'Administrador' },
  { id: 'COORDENADOR', label: 'Coordenador' },
  { id: 'MUSICO', label: 'Músico' },
];

/** Papéis que podem ser atribuídos pela tela Equipe/Admin — nunca Administrador. */
export const ASSIGNABLE_ROLES = ROLES.filter((role) => role.id !== 'ADMINISTRADOR');

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
  // Funda capelas e concede coordenações — não opera agenda/acervo de
  // nenhuma capela diretamente, isso fica com quem ele nomear coordenador.
  ADMINISTRADOR: new Set([ACTIONS.MANAGE_CAPELA, ACTIONS.MANAGE_USERS]),
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

/** @param {{role?: string}|null|undefined} user */
export function roleLabel(id) {
  return ROLE_BY_ID.get(id)?.label ?? id;
}

/** @param {{role?: string}|null|undefined} user */
export function isCoordinator(user) {
  return user?.role === 'COORDENADOR';
}

/** @param {{role?: string}|null|undefined} user */
export function isAdministrator(user) {
  return user?.role === 'ADMINISTRADOR';
}

/**
 * @param {{role?: string}|null|undefined} user
 * @param {string} action
 * @returns {boolean}
 */
export function can(user, action) {
  if (!user?.role) return false;
  if (!KNOWN_ACTIONS.has(action)) return false;
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
 * Um administrador administra qualquer capela. Um coordenador administra
 * só a própria capela-casa — mesmo que tenha fundado outras no passado,
 * quem passa a coordená-las é quem o administrador designar para lá.
 * @param {{role?: string, capelaId?: string|null}|null} actor
 * @param {{id: string}|null} capela
 */
export function canManageCapela(actor, capela) {
  if (!capela) return false;
  if (isAdministrator(actor)) return true;
  if (!isCoordinator(actor)) return false;
  return actor.capelaId === capela.id;
}

/**
 * @param {{id?: string, role?: string, capelaId?: string|null}|null} actor
 * @param {{id: string, createdById?: string|null}|null} capela
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
