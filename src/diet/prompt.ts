import type { DietAnamnesis, DietGoal, Profile, Restriction } from '../types'
import { GOALS, names, profileLines } from '../workout/planFormat'

export const TACO_EXAMPLES: string[] = [
  'Arroz, tipo 1, cozido',
  'Feijão, carioca, cozido',
  'Frango, peito, sem pele, grelhado',
  'Carne, bovina, patinho, sem gordura, grelhado',
  'Ovo, de galinha, inteiro, cozido/10minutos',
  'Pão, trigo, francês',
  'Banana, prata, crua',
  'Mamão, Papaia, cru',
  'Aveia, flocos, crua',
  'Batata, doce, cozida',
  'Leite, de vaca, desnatado, UHT',
  'Iogurte, natural, desnatado',
  'Queijo, minas, frescal',
  'Brócolis, cozido',
  'Azeite, de oliva, extra virgem',
]

const DIET_GOALS: Record<DietGoal, string> = { 'perder-rapido': 'perder peso rápido', perder: 'perder peso', manter: 'manter o peso', ganhar: 'ganhar peso', 'ganhar-rapido': 'ganhar peso rápido' }
const RESTRICTIONS: Record<Restriction, string> = { lactose: 'sem lactose', gluten: 'sem glúten', vegetariano: 'vegetariano', vegano: 'vegano' }
const EAT_OUT: Record<NonNullable<DietAnamnesis['eatOut']>, string> = { casa: 'em casa', fora: 'fora de casa', misto: 'misto (em casa e fora)' }
const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

function aboutMe(p?: Profile): string[] {
  const a = p?.anamnesis ?? {}
  // backup importado não valida as anamneses: valor desconhecido não pode virar "undefined" no prompt
  const d = (p?.dietAnamnesis ?? {}) as Partial<DietAnamnesis>
  return [
    ...profileLines(p),
    ...[
      a.goal && GOALS[a.goal] ? `Objetivo no treino: ${GOALS[a.goal]}` : '',
      a.daysPerWeek ? `Dias de treino por semana: ${a.daysPerWeek}` : '',
      d.goal && DIET_GOALS[d.goal] ? `Objetivo da dieta: ${DIET_GOALS[d.goal]}` : '',
      d.meals ? `Refeições por dia: ${d.meals}` : '',
      text(d.wake) && `Acordo às ${text(d.wake)}`,
      text(d.train) && `Treino às ${text(d.train)}`,
      text(d.sleep) && `Durmo às ${text(d.sleep)}`,
      names(d.restrictions, RESTRICTIONS) && `Restrições: ${names(d.restrictions, RESTRICTIONS)}`,
      text(d.avoid) && `Não como: ${text(d.avoid)}`,
      d.eatOut && EAT_OUT[d.eatOut] ? `Onde como: ${EAT_OUT[d.eatOut]}` : '',
      text(d.notes) && `Observações: ${text(d.notes)}`,
    ].filter(Boolean).map((l) => `- ${l}`),
  ]
}

export const buildDietPrompt = (profile?: Profile): string => {
  const me = aboutMe(profile)
  return `Você é um nutricionista. Monte meu cardápio no formato "Pump".

Sobre mim:
${me.length ? me.join('\n') : '- (ainda não contei nada)'}

Como fazer:
1. Se eu colar uma dieta pronta (de nutricionista, por exemplo), só transcreva ela pro formato, sem mudar as quantidades.
2. Senão, se faltar algo importante pra montar um bom cardápio (objetivo, peso, altura, idade, refeições por dia, horários), me pergunte primeiro, tudo numa mensagem só, e espere minha resposta. Nessa hora não mande JSON.
3. Calcule uma meta diária de calorias e de macros (proteína, carboidrato e gordura) coerente com meu objetivo e meu perfil.
4. Distribua as refeições nos meus horários, respeite minhas restrições e o que não como, e use comida simples do dia a dia no Brasil.
5. Escreva o nome de cada alimento no padrão da tabela TACO 4ª edição: "Alimento, tipo, preparo", sempre dizendo o preparo (cru, cozido, grelhado, assado, frito...). Exemplos de nomes da TACO: ${TACO_EXAMPLES.map((n) => `"${n}"`).join(', ')}.
6. Pra cada alimento, informe as gramas, a porção caseira e os valores da quantidade indicada (não por 100 g): kcal, proteína, carboidrato e gordura.
7. Com o cardápio pronto, responda SOMENTE com o JSON, sem explicação antes ou depois.

Formato:
- "formato": sempre "pump-plano".
- "versao": sempre 1.
- "dieta":
  - "metaKcal": meta diária de calorias, número inteiro de 800 a 6000.
  - "macros": meta diária em gramas, com "proteinaG", "carboG" e "gorduraG" (cada um de 0 a 600).
  - "refeicoes": lista de 1 a 10 refeições. Cada refeição tem:
    - "nome": nome da refeição (ex.: "Café da manhã").
    - "horario": hora no formato "HH:MM" (ex.: "07:00").
    - "alimentos": lista de 1 a 30 alimentos. Cada alimento tem:
      - "nome": nome no padrão da TACO (obrigatório).
      - "gramas": quantidade em gramas, de 1 a 2000 (obrigatório).
      - "porcao": porção caseira, ex.: "1 unidade" ou "2 colheres de sopa".
      - "kcal", "proteinaG", "carboG", "gorduraG": valores da quantidade indicada, números maiores ou iguais a 0.

Exemplo:
\`\`\`json
{
  "formato": "pump-plano",
  "versao": 1,
  "dieta": {
    "metaKcal": 1950,
    "macros": { "proteinaG": 150, "carboG": 190, "gorduraG": 60 },
    "refeicoes": [
      {
        "nome": "Café da manhã",
        "horario": "07:00",
        "alimentos": [
          { "nome": "Pão, trigo, francês", "gramas": 50, "porcao": "1 unidade", "kcal": 150, "proteinaG": 4, "carboG": 29.3, "gorduraG": 1.6 },
          { "nome": "Ovo, de galinha, inteiro, cozido/10minutos", "gramas": 100, "porcao": "2 unidades", "kcal": 146, "proteinaG": 13.3, "carboG": 0.6, "gorduraG": 9.5 }
        ]
      }
    ]
  }
}
\`\`\`

Quando for mandar o cardápio, responda só com o JSON.`
}
