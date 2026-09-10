/**
 * Leitura e escrita de cifras individuais.
 *
 * Uma cifra é composta por tônica (nota + acidente opcional), sufixo livre
 * (m7, sus4, 7M, (b5)...) e, opcionalmente, um baixo invertido após a barra.
 */

const ROOT = '(?<root>[A-G](?:#|b)?)';
const SUFFIX = '(?<suffix>(?:m|maj|min|dim|aug|sus|add|alt|M|°|º|ø|\\+|-|\\d|\\(|\\)|#|b|/(?![A-G]))*)';
const BASS = '(?:/(?<bass>[A-G](?:#|b)?))?';
const CHORD_RE = new RegExp(`^${ROOT}${SUFFIX}${BASS}$`);

/**
 * @param {string} text
 * @returns {{root: string, suffix: string, bass: string|null}|null}
 */
export function parseChord(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  const match = CHORD_RE.exec(trimmed);
  if (!match) return null;
  const { root, suffix, bass } = match.groups;
  return { root, suffix: suffix ?? '', bass: bass ?? null };
}

/**
 * @param {{root: string, suffix?: string, bass?: string|null}} parts
 * @returns {string}
 */
export function formatChord({ root, suffix = '', bass = null }) {
  return `${root}${suffix}${bass ? `/${bass}` : ''}`;
}

/** @param {string} text */
export function isChord(text) {
  return parseChord(text) !== null;
}
