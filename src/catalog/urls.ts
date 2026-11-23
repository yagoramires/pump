// sem imports: o service worker, o vite.config e os scripts de build leem daqui
export const BASE = '/pump/'
/** pasta do catálogo: public/ no repositório, BASE no site */
export const CATALOG_DIR = 'catalog/'
export const EXERCISES_JSON = 'exercises.json'
export const TACO_JSON = 'taco.json'
export const IMAGE_BASE = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5/exercises/'
export const IMAGE_HOST = new URL(IMAGE_BASE).hostname
/** fotos dos exercícios do plano; o nome não pode mudar sem migrar o cache dos aparelhos */
export const PREVIEW_CACHE = 'pump-previews-v1'
/** listas de nomes do catálogo, coladas em prompts de IA externa: a IA precisa da URL absoluta do site publicado */
export const EXERCISE_LIST = 'exercicios.txt'
export const FOOD_LIST = 'alimentos.txt'
const SITE = `https://yagoramires.github.io${BASE}`
const SITE_CATALOG = SITE + CATALOG_DIR
export const EXERCISE_LIST_URL = SITE_CATALOG + EXERCISE_LIST
export const FOOD_LIST_URL = SITE_CATALOG + FOOD_LIST
/** página do editor no computador (entrada editor.html do Vite) */
export const EDITOR_URL = SITE + 'editor.html'
