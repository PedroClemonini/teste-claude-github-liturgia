import { handle, json, readJson } from '@/lib/api.js';
import { currentUser } from '@/lib/session.js';
import { ACTIONS, assertCan } from '@/domain/auth/roles.js';
import { DomainError } from '@/domain/errors.js';
import { extractCifraClubSong } from '@/domain/chordpro/cifraclub.js';

/** Só aceitamos links do próprio CifraClub (host exato ou subdomínio). */
function isCifraClubUrl(url) {
  return url.hostname === 'cifraclub.com.br' || url.hostname.endsWith('.cifraclub.com.br');
}

/**
 * O CifraClub responde 403 a qualquer user-agent que se identifique como bot,
 * então a busca precisa se apresentar como um navegador comum — com os
 * cabeçalhos que um navegador manda junto, porque só o user-agent não basta.
 */
const BROWSER_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8',
};

const TIMEOUT_MS = 15_000;

/** Importa título, tom e cifra a partir de um link do CifraClub. */
export async function POST(request) {
  return handle(async () => {
    const actor = await currentUser();
    assertCan(actor, ACTIONS.MANAGE_SONG);

    const { url } = await readJson(request);
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new DomainError('Informe um link válido.', { code: 'url_invalida' });
    }
    if (!isCifraClubUrl(parsedUrl)) {
      throw new DomainError('Envie um link do CifraClub (cifraclub.com.br).', {
        code: 'url_nao_suportada',
      });
    }

    let response;
    try {
      response = await fetch(parsedUrl.toString(), {
        headers: BROWSER_HEADERS,
        redirect: 'follow',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      console.error('[songs/import] falha ao buscar', parsedUrl.toString(), error);
      throw new DomainError('Não foi possível acessar o link informado.', {
        status: 502,
        code: 'importacao_falhou',
      });
    }
    if (!response.ok) {
      console.error('[songs/import] CifraClub respondeu', response.status, parsedUrl.toString());
      if (response.status === 404) {
        throw new DomainError('O CifraClub não encontrou essa página. Confira o link.', {
          status: 502,
          code: 'importacao_falhou',
        });
      }
      throw new DomainError(
        `O CifraClub recusou a busca (HTTP ${response.status}). Tente novamente em alguns instantes.`,
        { status: 502, code: 'importacao_falhou' },
      );
    }

    const html = await response.text();
    const song = extractCifraClubSong(html);
    if (!song.chordPro) {
      throw new DomainError('Não foi possível reconhecer a cifra nessa página.', {
        code: 'importacao_vazia',
      });
    }
    return json({ song });
  });
}
