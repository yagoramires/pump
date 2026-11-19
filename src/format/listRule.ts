// a regra de nomes dos prompts: a IA abre a lista pública e, se não conseguir, pede pra eu colar
export const listRule = (url: string, noun: string, detail: string, fallback: string) =>
  `Abra a lista em ${url} e use exatamente um nome dela para cada ${noun}${detail} ${fallback} Se não conseguir abrir o link, diga isso e me peça pra colar a lista aqui, em vez de inventar nomes.`
