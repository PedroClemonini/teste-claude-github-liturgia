/** Erros de domínio, com o status HTTP que as rotas de API devem devolver. */

export class DomainError extends Error {
  /**
   * @param {string} message
   * @param {{status?: number, code?: string, details?: unknown}} [options]
   */
  constructor(message, { status = 400, code = 'erro', details } = {}) {
    super(message);
    this.name = 'DomainError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends DomainError {
  constructor(message = 'Dados inválidos.', details) {
    super(message, { status: 422, code: 'validacao', details });
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends DomainError {
  constructor(message = 'Registro não encontrado.') {
    super(message, { status: 404, code: 'nao_encontrado' });
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends DomainError {
  constructor(message = 'Conflito com um registro existente.') {
    super(message, { status: 409, code: 'conflito' });
    this.name = 'ConflictError';
  }
}

/**
 * Converte a falha de um schema Zod em ValidationError com mensagens por campo.
 * @param {import('zod').ZodSafeParseResult<unknown>} result
 */
export function unwrap(result) {
  if (result.success) return result.data;
  const details = {};
  for (const issue of result.error.issues) {
    const field = issue.path.join('.') || '_';
    if (!details[field]) details[field] = issue.message;
  }
  throw new ValidationError('Verifique os campos destacados.', details);
}
