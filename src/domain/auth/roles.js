/**
 * Controle de acesso por papel.
 *
 * O Coordenador organiza a paróquia (calendário, acervo, equipe); o Músico
 * consulta as escalas e as cifras. Toda checagem passa por `can`/`assertCan`,
 * inclusive nas rotas de API, para que a interface nunca seja a única barreira.
 */

export const ROLES = [
  { id: 'COORDENADOR', label: 'Coordenador' },
  { id: 'MUSICO', label: 'Músico' },
];

const ROLE_BY_ID = new Map(ROLES.map((role) => [role.id, role]));

export const ACTIONS = {
  VIEW_CALENDAR: 'calendar:view',
  MANAGE_CELEBRATION: 'celebration:manage',
  MANAGE_REPERTOIRE: 'repertoire:manage',
  VIEW_SONG: 'song:view',
  MANAGE_SONG: 'song:manage',
  MANAGE_USERS: 'user:manage',
};

const PERMISSIONS = {
  COORDENADOR: new Set(Object.values(ACTIONS)),
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
