/**
 * Equipe e Capelas mostram uma capela por vez: aqui se decide quais aparecem no
 * seletor e qual abre por padrão.
 */

/** Valor do seletor para as contas que não estão em nenhuma capela. */
export const NO_CAPELA = 'sem-capela';

const byLabel = (a, b) => a.label.localeCompare(b.label);

/**
 * Capelas do seletor: as dos integrantes visíveis mais as que o ator administra,
 * que podem estar vazias (recém-criadas, por exemplo).
 *
 * @param {{memberships: {capelaId: string, capela: {name: string}}[]}[]} members
 * @param {{id: string, name: string}[]} managed
 * @returns {{value: string, label: string}[]}
 */
export function capelaOptions(members, managed = []) {
  const names = new Map(managed.map((capela) => [capela.id, capela.name]));
  for (const member of members) {
    for (const { capelaId, capela } of member.memberships) names.set(capelaId, capela.name);
  }
  return [...names].map(([value, label]) => ({ value, label })).sort(byLabel);
}

/**
 * A capela pedida na URL, se a pessoa puder vê-la; senão a primeira de
 * `preferred`; senão a primeira da lista.
 *
 * @param {{value: string}[]} options
 * @param {string|undefined} requested
 * @param {string[]} preferred em ordem de preferência
 * @returns {string|null}
 */
export function pickCapela(options, requested, preferred = []) {
  const available = (id) => options.some((option) => option.value === id);
  if (available(requested)) return requested;
  return preferred.find(available) ?? options[0]?.value ?? null;
}

/** Integrantes da capela escolhida. O dono não entra em "sem capela": ele coordena todas. */
export function membersOf(members, selected) {
  if (selected === NO_CAPELA) {
    return members.filter((member) => member.memberships.length === 0 && !member.isOwner);
  }
  return members.filter((member) => member.memberships.some((membership) => membership.capelaId === selected));
}
