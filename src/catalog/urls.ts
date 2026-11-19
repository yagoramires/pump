// sem imports: o service worker lê daqui e precisa ficar leve
export const IMAGE_BASE = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5/exercises/'
export const IMAGE_HOST = new URL(IMAGE_BASE).hostname
/** fotos dos exercícios do plano; o nome não pode mudar sem migrar o cache dos aparelhos */
export const PREVIEW_CACHE = 'pump-previews-v1'
/** listas de nomes do catálogo, coladas em prompts de IA externa: URL absoluta (literal, o sw importa este arquivo) */
export const EXERCISE_LIST_URL = 'https://yagoramires.github.io/pump/catalog/exercicios.txt'
export const FOOD_LIST_URL = 'https://yagoramires.github.io/pump/catalog/alimentos.txt'
