export const normalize = (s: string): string => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

/** todas as palavras no nome; quem começa com a busca vem antes */
export function searchByName<T extends { name: string }>(list: T[], q: string): T[] {
  const nq = normalize(q)
  const words = nq.split(/\s+/).filter(Boolean)
  const named = list.map((e) => ({ e, n: normalize(e.name) })).filter(({ n }) => words.every((w) => n.includes(w)))
  const rank = (n: string) => (n.startsWith(nq) ? 0 : 1)
  return named
    .sort((a, b) => rank(a.n) - rank(b.n) || a.e.name.localeCompare(b.e.name, 'pt-BR'))
    .map(({ e }) => e)
}
