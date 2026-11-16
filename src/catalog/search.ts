export const normalize = (s: string): string => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

export function searchCatalog<T extends { name: string; muscles: string[]; equipment?: string }>(
  list: T[],
  q: string,
  f: { muscle?: string; equipment?: string } = {},
): T[] {
  const nq = normalize(q)
  const words = nq.split(/\s+/).filter(Boolean)
  const named = list
    .filter((e) => (!f.muscle || e.muscles.includes(f.muscle)) && (!f.equipment || e.equipment === f.equipment))
    .map((e) => ({ e, n: normalize(e.name) }))
    .filter(({ n }) => words.every((w) => n.includes(w)))
  const rank = (n: string) => (n.startsWith(nq) ? 0 : 1)
  return named
    .sort((a, b) => rank(a.n) - rank(b.n) || a.e.name.localeCompare(b.e.name, 'pt-BR'))
    .map(({ e }) => e)
}
