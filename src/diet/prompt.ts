import type { Profile } from '@/profile/types'
import type { DietAnamnesis, DietGoal, Restriction } from './types'
import { HEADER, str } from '@/format/envelope'
import { label, names, profileLines } from '@/profile/promptLines'
import { GOAL_KCAL, GRAMS, MACRO_G, MAX_ITEMS, MAX_MEALS, MAX_MENUS, MAX_OPTIONS } from './limits'

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
  'Iogurte, natural',
  'Iogurte, natural, desnatado',
  'Queijo, minas, frescal',
  'Brócolis, cozido',
  'Azeite, de oliva, extra virgem',
]

const DIET_GOALS: Record<DietGoal, string> = { 'perder-rapido': 'perder peso rápido', perder: 'perder peso', manter: 'manter o peso', ganhar: 'ganhar peso', 'ganhar-rapido': 'ganhar peso rápido' }
const RESTRICTIONS: Record<Restriction, string> = { lactose: 'sem lactose', gluten: 'sem glúten', vegetariano: 'vegetariano', vegano: 'vegano' }
const EAT_OUT: Record<NonNullable<DietAnamnesis['eatOut']>, string> = { casa: 'em casa', fora: 'fora de casa', misto: 'misto (em casa e fora)' }

function aboutMe(p?: Profile): string[] {
  const d = (p?.dietAnamnesis ?? {}) as Partial<DietAnamnesis>
  return [
    ...profileLines(p),
    ...[
      p?.daysPerWeek ? `Dias de treino por semana: ${p.daysPerWeek}` : '',
      label(DIET_GOALS, p?.dietGoal) && `Objetivo da dieta: ${label(DIET_GOALS, p?.dietGoal)}`,
      d.meals ? `Refeições por dia: ${d.meals}` : '',
      str(p?.wake) && `Acordo às ${str(p?.wake)}`,
      str(p?.train) && `Treino às ${str(p?.train)}`,
      str(p?.sleep) && `Durmo às ${str(p?.sleep)}`,
      names(d.restrictions, RESTRICTIONS) && `Restrições: ${names(d.restrictions, RESTRICTIONS)}`,
      str(d.avoid) && `Não como: ${str(d.avoid)}`,
      label(EAT_OUT, d.eatOut) && `Onde como: ${label(EAT_OUT, d.eatOut)}`,
      str(p?.notes) && `Observações gerais: ${str(p?.notes)}`,
      str(d.notes) && `Observações: ${str(d.notes)}`,
    ].filter(Boolean).map((l) => `- ${l}`),
  ]
}

export const buildDietPrompt = (profile?: Profile): string => {
  const me = aboutMe(profile)
  const menus = profile?.daysPerWeek
    ? 'Faça 2 cardápios: "Dia de treino" e "Descanso", cada um com sua meta (no descanso, em geral menos calorias e carboidrato).'
    : 'Faça 1 cardápio.'
  return `Você é um nutricionista. Monte meu cardápio no formato "Pump".

Sobre mim:
${me.length ? me.join('\n') : '- (ainda não contei nada)'}

Como fazer:
1. Se eu colar uma dieta pronta (de nutricionista, por exemplo), só transcreva ela pro formato, sem mudar as quantidades.
2. Senão, se faltar algo importante pra montar um bom cardápio (objetivo, peso, altura, idade, refeições por dia, horários), me pergunte primeiro, tudo numa mensagem só, e espere minha resposta. Nessa hora não mande JSON.
3. ${menus}
4. Calcule uma meta diária de calorias e de macros (proteína, carboidrato e gordura) coerente com meu objetivo e meu perfil.
5. Distribua as refeições nos meus horários, respeite minhas restrições e o que não como, e use comida simples do dia a dia no Brasil.
6. Dê 2 opções em cada refeição (ex.: "Ovos com pão" e "Iogurte com aveia"), com calorias e macros parecidos, pra eu poder variar.
7. Escreva o nome de cada alimento no padrão da tabela TACO 4ª edição: "Alimento, tipo, preparo", sempre dizendo o preparo (cru, cozido, grelhado, assado, frito...). Exemplos de nomes da TACO: ${TACO_EXAMPLES.map((n) => `"${n}"`).join(', ')}.
8. Pra cada alimento, informe as gramas, a porção caseira e os valores da quantidade indicada (não por 100 g): kcal, proteína, carboidrato e gordura.
9. Com o cardápio pronto, responda SOMENTE com o JSON, sem explicação antes ou depois.

Formato:
- "formato": sempre "${HEADER.formato}".
- "versao": sempre ${HEADER.versao}.
- "dieta":
  - "cardapios": lista de 1 a ${MAX_MENUS} cardápios. Cada cardápio tem:
    - "nome": nome do cardápio (ex.: "Dia de treino").
    - "metaKcal": meta diária de calorias, número inteiro de ${GOAL_KCAL[0]} a ${GOAL_KCAL[1]}.
    - "macros": meta diária em gramas, com "proteinaG", "carboG" e "gorduraG" (cada um de ${MACRO_G[0]} a ${MACRO_G[1]}).
    - "refeicoes": lista de 1 a ${MAX_MEALS} refeições. Cada refeição tem:
      - "nome": nome da refeição (ex.: "Café da manhã").
      - "horario": hora no formato "HH:MM" (ex.: "07:00").
      - "opcoes": lista de 1 a ${MAX_OPTIONS} opções (faça 2). Cada opção tem:
        - "nome": nome curto da opção (ex.: "Ovos com pão").
        - "alimentos": lista de 1 a ${MAX_ITEMS} alimentos. Cada alimento tem:
          - "nome": nome no padrão da TACO (obrigatório).
          - "gramas": quantidade em gramas, de ${GRAMS[0]} a ${GRAMS[1]} (obrigatório).
          - "porcao": porção caseira, ex.: "1 unidade" ou "2 colheres de sopa".
          - "kcal", "proteinaG", "carboG", "gorduraG": valores da quantidade indicada, números maiores ou iguais a 0.

Exemplo (um cardápio e uma refeição, só pra mostrar o formato):
\`\`\`json
{
  "formato": "${HEADER.formato}",
  "versao": ${HEADER.versao},
  "dieta": {
    "cardapios": [
      {
        "nome": "Cardápio",
        "metaKcal": 1950,
        "macros": { "proteinaG": 150, "carboG": 190, "gorduraG": 60 },
        "refeicoes": [
          {
            "nome": "Café da manhã",
            "horario": "07:00",
            "opcoes": [
              {
                "nome": "Ovos com pão",
                "alimentos": [
                  { "nome": "Pão, trigo, francês", "gramas": 50, "porcao": "1 unidade", "kcal": 150, "proteinaG": 4, "carboG": 29.3, "gorduraG": 1.6 },
                  { "nome": "Ovo, de galinha, inteiro, cozido/10minutos", "gramas": 100, "porcao": "2 unidades", "kcal": 146, "proteinaG": 13.3, "carboG": 0.6, "gorduraG": 9.5 }
                ]
              },
              {
                "nome": "Iogurte com aveia",
                "alimentos": [
                  { "nome": "Iogurte, natural", "gramas": 170, "porcao": "1 pote", "kcal": 87, "proteinaG": 7, "carboG": 3.2, "gorduraG": 5.1 },
                  { "nome": "Aveia, flocos, crua", "gramas": 30, "porcao": "3 colheres de sopa", "kcal": 118, "proteinaG": 4.2, "carboG": 20, "gorduraG": 2.6 }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
\`\`\`

Quando for mandar o cardápio, responda só com o JSON.`
}
