/**
 * Utilidades comuns às rotas de API: leitura do corpo, resposta JSON e
 * tradução dos erros de domínio em status HTTP.
 */
import { DomainError } from '@/domain/errors.js';
import { AuthorizationError } from '@/domain/auth/roles.js';

/** @param {unknown} data @param {number} [status] */
export function json(data, status = 200) {
  return Response.json(data, { status });
}

/** Corpo JSON da requisição; lança DomainError 400 se vier inválido. */
export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new DomainError('Corpo da requisição não é um JSON válido.', {
      status: 400,
      code: 'json_invalido',
    });
  }
}

/**
 * Traduz o erro em resposta HTTP. Erros inesperados viram 500 sem vazar
 * detalhes internos, mas ficam no log do servidor.
 */
export function errorResponse(error) {
  if (error instanceof AuthorizationError) {
    return json({ error: error.message }, error.status);
  }
  if (error instanceof DomainError) {
    return json({ error: error.message, details: error.details }, error.status);
  }
  console.error('[api] erro inesperado', error);
  return json({ error: 'Erro inesperado no servidor.' }, 500);
}

/**
 * Executa o handler traduzindo qualquer erro de domínio.
 * @template T
 * @param {() => Promise<Response>} handler
 */
export async function handle(handler) {
  try {
    return await handler();
  } catch (error) {
    return errorResponse(error);
  }
}
