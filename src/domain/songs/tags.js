/**
 * Tags das músicas, como #novenasaofrancisco. Ficam num formato único (sem #,
 * acentos, espaços ou maiúsculas) para "Novena São Francisco" e
 * "#novenasaofrancisco" serem a mesma tag, na busca e no cadastro.
 */

/** @param {string} text */
export function normalizeTag(text) {
  return String(text)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Tags válidas e sem repetição, mantendo a ordem. */
export function normalizeTags(items) {
  return [...new Set(items.map(normalizeTag).filter(Boolean))];
}

/** @param {string} tag */
export const formatTag = (tag) => `#${tag}`;

/** Das tags existentes, as que contêm o termo buscado. */
export function matchingTags(allTags, term) {
  const needle = normalizeTag(term);
  return needle ? allTags.filter((tag) => tag.includes(needle)) : [];
}
