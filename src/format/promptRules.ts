export const listRule = (url: string, noun: string, detail: string, fallback: string) =>
  `Abra a lista em ${url} e use exatamente um nome dela para cada ${noun}${detail} ${fallback} Se não conseguir abrir o link, diga isso e me peça pra colar a lista aqui, em vez de inventar nomes.`

export const COPYABLE_JSON_RULE =
  'Na resposta final, entregue somente um único bloco de código Markdown com a linguagem `json`, como no exemplo, para eu copiar e colar no Pump. Inclua um objeto JSON válido e completo, sem comentários. Não escreva texto fora do bloco.'
