/**
 * Reconhece links de YouTube e Vimeo para tocar num player embutido na
 * própria página, em vez de abrir o link em outra aba.
 */

function youtubeEmbedUrl(url) {
  const { hostname, pathname, searchParams } = url;

  if (hostname === 'youtu.be') {
    const id = pathname.slice(1);
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }

  if (!hostname.endsWith('youtube.com')) return null;

  if (pathname === '/watch') {
    const id = searchParams.get('v');
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }

  if (pathname.startsWith('/shorts/') || pathname.startsWith('/embed/')) {
    const id = pathname.split('/')[2];
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }

  return null;
}

function vimeoEmbedUrl(url) {
  if (!url.hostname.endsWith('vimeo.com')) return null;

  const id = url.pathname.split('/').find((part) => /^\d+$/.test(part));
  return id ? `https://player.vimeo.com/video/${id}` : null;
}

/**
 * @param {string | null | undefined} rawUrl
 * @returns {string | null} URL para usar num <iframe>, ou null se o link
 * não for de um provedor com player embutido suportado.
 */
export function getVideoEmbedUrl(rawUrl) {
  if (!rawUrl) return null;

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  return youtubeEmbedUrl(url) ?? vimeoEmbedUrl(url);
}
