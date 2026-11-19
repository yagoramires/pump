/** plano novo por cima do antigo: o item de mesmo nome herda o id antigo (o que guarda a posição na rotação ou o
 * último cardápio usado); cada id antigo vale uma vez só, e quem já tem um id antigo (veio do editor) fica com ele */
export function keepIdsByName<T extends { id: string }>(prev: T[], next: T[], name: (t: T) => string): T[] {
  const old = new Set(prev.map((o) => o.id))
  const taken = new Set(next.filter((n) => old.has(n.id)).map((n) => n.id))
  return next.map((n) => {
    if (old.has(n.id)) return n
    const match = prev.find((o) => name(o) === name(n) && !taken.has(o.id))
    if (!match) return n
    taken.add(match.id)
    return { ...n, id: match.id }
  })
}
