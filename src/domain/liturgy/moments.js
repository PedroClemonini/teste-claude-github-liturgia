/**
 * Momentos do rito aos quais o roteiro musical associa cada canto.
 * A ordem da lista é a ordem em que os cantos acontecem na evento.
 */

export const LITURGICAL_MOMENTS = [
  { id: 'ENTRADA', label: 'Entrada' },
  { id: 'ATO_PENITENCIAL', label: 'Ato Penitencial' },
  { id: 'GLORIA', label: 'Glória' },
  { id: 'SALMO', label: 'Salmo' },
  { id: 'ACLAMACAO', label: 'Aclamação' },
  { id: 'OFERTORIO', label: 'Ofertório' },
  { id: 'SANTO', label: 'Santo' },
  { id: 'ORACAO_EUCARISTICA', label: 'Oração Eucarística' },
  { id: 'MISTERIO_DA_FE', label: 'Mistério da Fé' },
  { id: 'GRANDE_AMEM', label: 'Grande Amém' },
  { id: 'CORDEIRO', label: 'Cordeiro' },
  { id: 'COMUNHAO', label: 'Comunhão' },
  { id: 'ACAO_DE_GRACAS', label: 'Ação de Graças' },
  { id: 'FINAL', label: 'Final' },
];

/** Peso de cada momento na sequência do rito. */
export const MOMENT_ORDER = Object.fromEntries(
  LITURGICAL_MOMENTS.map((moment, index) => [moment.id, index]),
);

const MOMENT_BY_ID = new Map(LITURGICAL_MOMENTS.map((moment) => [moment.id, moment]));

/** @param {string} id */
export function momentLabel(id) {
  return MOMENT_BY_ID.get(id)?.label ?? id;
}

/** @param {string} id */
export function isValidMoment(id) {
  return MOMENT_BY_ID.has(id);
}

/**
 * Ordena o roteiro pela sequência do rito e, dentro do momento, pela posição.
 * @template {{moment: string, position?: number}} T
 * @param {T[]} items
 * @returns {T[]} novo array, sem mutar a entrada
 */
export function sortRepertoire(items) {
  return [...items].sort((a, b) => {
    const byMoment = (MOMENT_ORDER[a.moment] ?? 99) - (MOMENT_ORDER[b.moment] ?? 99);
    if (byMoment !== 0) return byMoment;
    return (a.position ?? 0) - (b.position ?? 0);
  });
}

/**
 * Momentos que ainda não têm nenhuma música escolhida.
 * @param {Array<{moment: string}>} items
 * @returns {string[]}
 */
export function missingMoments(items) {
  const filled = new Set(items.map((item) => item.moment));
  return LITURGICAL_MOMENTS.map((moment) => moment.id).filter((id) => !filled.has(id));
}
