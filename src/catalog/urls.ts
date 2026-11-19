// sem imports: o service worker lê daqui e precisa ficar leve
export const IMAGE_BASE = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5/exercises/'
export const IMAGE_HOST = new URL(IMAGE_BASE).hostname
/** fotos dos exercícios do plano; o nome não pode mudar sem migrar o cache dos aparelhos */
export const PREVIEW_CACHE = 'pump-previews-v1'
/** listas de nomes do catálogo (public/catalog/), coladas em prompts de IA externa: a IA precisa da URL absoluta do site publicado */
export const EXERCISE_LIST = 'exercicios.txt'
export const FOOD_LIST = 'alimentos.txt'
const SITE_CATALOG = 'https://yagoramires.github.io/pump/catalog/'
export const EXERCISE_LIST_URL = SITE_CATALOG + EXERCISE_LIST
export const FOOD_LIST_URL = SITE_CATALOG + FOOD_LIST
