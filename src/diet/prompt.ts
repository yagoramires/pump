import { DIET_GOAL_PROMPT_LABEL, type Profile } from '@/profile/types'
import { EAT_OUT_PROMPT, RESTRICTIONS } from './anamnesisLabels'
import { HEADER, str } from '@/format/envelope'
import type { Measurement } from '@/evolution/types'
import { FIELDS, WEIGHT, fatSeries, latestWeight, series } from '@/evolution/measurements'
import { addDays, daysBetween, weeksBetween } from '@/lib/date'
import { formatDec, formatKg, formatSigned, plural } from '@/lib/number'
import { FOOD_LIST_URL } from '@/catalog/urls'
import { listRule as rule } from '@/format/listRule'
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


function bodyLines(p: Profile | undefined, ms: Measurement[], today: string): string[] {
  const last = (pts: { value: number }[]) => pts.at(-1)?.value
  const weights = series(ms, WEIGHT.key)
  const weight = latestWeight(ms)
  const fat = p ? last(fatSeries(p, ms)) : undefined
  const measures = FIELDS.filter((f) => f !== WEIGHT).flatMap((f) => { const v = last(series(ms, f.key)); return v === undefined ? [] : [`${f.label.toLowerCase()} ${formatKg(v)} ${f.unit}`] })
  const recent = weights.filter((w) => w.date >= addDays(today, -28))
  const days = recent.length ? daysBetween(recent[0].date, recent[recent.length - 1].date) : 0
  return [
    weight !== undefined && `Peso: ${formatKg(weight)} kg`,
    fat !== undefined && `Gordura corporal (estimativa US Navy): ${formatDec(fat, 1)}%`,
    weight !== undefined && fat !== undefined && `Massa magra (estimativa): ${formatDec(weight * (1 - fat / 100), 1)} kg`,
    measures.length > 0 && `Medidas: ${measures.join(', ')}`,
    days > 0 && `Variação do peso: ${formatSigned(recent[recent.length - 1].value - recent[0].value)} kg em ${plural(weeksBetween(recent[0].date, recent[recent.length - 1].date), 'semana', 'semanas')}`,
  ].filter((l): l is string => !!l).map((l) => `- ${l}`)
}

function aboutMe(p: Profile | undefined, ms: Measurement[], today: string): string[] {
  const d = p?.dietAnamnesis ?? {}
  const dietGoal = label(DIET_GOAL_PROMPT_LABEL, p?.dietGoal)
  const restrictions = names(d.restrictions, RESTRICTIONS).toLowerCase()
  const eatOut = label(EAT_OUT_PROMPT, d.eatOut)
  return [
    ...profileLines(p),
    ...bodyLines(p, ms, today),
    ...[
      p?.daysPerWeek ? `Dias de treino por semana: ${p.daysPerWeek}` : '',
      dietGoal && `Objetivo da dieta: ${dietGoal}`,
      d.meals ? `Refeições por dia: ${d.meals}` : '',
      str(p?.wake) && `Acordo às ${str(p?.wake)}`,
      str(p?.train) && `Treino às ${str(p?.train)}`,
      str(p?.sleep) && `Durmo às ${str(p?.sleep)}`,
      restrictions && `Restrições: ${restrictions}`,
      str(d.avoid) && `Não como: ${str(d.avoid)}`,
      eatOut && `Onde como: ${eatOut}`,
      str(p?.notes) && `Observações gerais: ${str(p?.notes)}`,
      str(d.notes) && `Observações: ${str(d.notes)}`,
    ].filter(Boolean).map((l) => `- ${l}`),
  ]
}

const listRule = (fallback: string) => rule(FOOD_LIST_URL, 'alimento', ` (nomes da tabela TACO 4ª edição, no padrão "Alimento, tipo, preparo"; exemplos: ${TACO_EXAMPLES.map((n) => `"${n}"`).join(', ')}).`, fallback)

const FORMAT = `Formato:
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
      - "opcoes": lista de 1 a ${MAX_OPTIONS} opções. Cada opção tem:
        - "nome": nome curto da opção (ex.: "Ovos com pão").
        - "alimentos": lista de 1 a ${MAX_ITEMS} alimentos. Cada alimento tem:
          - "nome": nome do alimento (obrigatório).
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

export const buildDietPrompt = (profile: Profile | undefined, measurements: Measurement[], today: string): string => {
  const me = aboutMe(profile, measurements, today)
  const menus = profile?.daysPerWeek
    ? 'Faça 2 cardápios: "Dia de treino" e "Descanso", cada um com sua meta (no descanso, em geral menos calorias e carboidrato).'
    : 'Faça 1 cardápio.'
  return `Você é um nutricionista. Monte meu cardápio no formato "Pump".

Sobre mim:
${me.length ? me.join('\n') : '- (ainda não contei nada)'}

Como fazer:
1. Se eu colar uma dieta pronta (de nutricionista, por exemplo), transcreva sem mudar os números (quantidades); os nomes seguem a regra da lista.
2. Senão, se faltar algo importante pra montar um bom cardápio (objetivo, peso, altura, idade, refeições por dia, horários), me pergunte primeiro, tudo numa mensagem só, e espere minha resposta. Nessa hora não mande JSON.
3. ${menus}
4. Calcule uma meta diária de calorias e de macros (proteína, carboidrato e gordura) coerente com meu objetivo e meu perfil.
5. Distribua as refeições nos meus horários, respeite minhas restrições e o que não como, e use comida simples do dia a dia no Brasil.
6. Dê 2 opções em cada refeição (ex.: "Ovos com pão" e "Iogurte com aveia"), com calorias e macros parecidos, pra eu poder variar.
7. ${listRule('Só use outro nome se nenhum da lista servir, escrevendo no mesmo padrão e sempre dizendo o preparo.')}
8. Pra cada alimento, informe as gramas, a porção caseira e os valores da quantidade indicada (não por 100 g): kcal, proteína, carboidrato e gordura.
9. Com o cardápio pronto, responda SOMENTE com o JSON, sem explicação antes ou depois.

${FORMAT}`
}

export const buildDietConvertPrompt = (): string => `Vou te mandar minha dieta (PDF, foto ou texto). Transcreva ela para o formato "Pump", sem mudar as quantidades, as gramas, as refeições nem os horários.

Como fazer:
1. Mantenha as refeições, as opções e a ordem como estão na dieta.
2. ${listRule('Se nenhum da lista servir, mantenha o nome original da dieta.')}
3. Pra cada alimento, informe as gramas, a porção caseira e os valores da quantidade indicada (não por 100 g): kcal, proteína, carboidrato e gordura. Se a dieta não trouxer a meta diária, calcule somando uma opção de cada refeição (a primeira).
4. Se faltar a quantidade em gramas, estime pela porção caseira (e ponha a medida em "porcao"); se faltar o horário, use um horário comum para a refeição.
5. Respeite os limites do formato: até ${MAX_MENUS} cardápios, ${MAX_MEALS} refeições por cardápio, ${MAX_OPTIONS} opções por refeição e ${MAX_ITEMS} alimentos por opção. Se a dieta tiver mais de ${MAX_MENUS} cardápios, fique com os ${MAX_MENUS} primeiros; se uma refeição tiver mais de ${MAX_OPTIONS} opções, fique com as ${MAX_OPTIONS} primeiras; se uma opção tiver mais de ${MAX_ITEMS} alimentos, fique com os ${MAX_ITEMS} primeiros; o mesmo vale pras refeições além de ${MAX_MEALS}.
6. "metaKcal" é um número inteiro de ${GOAL_KCAL[0]} a ${GOAL_KCAL[1]} e cada macro da meta vai de ${MACRO_G[0]} a ${MACRO_G[1]} g: se você calcular a meta, arredonde para inteiro e ajuste pra dentro dessa faixa.
7. Responda SOMENTE com o JSON, sem explicação antes ou depois.

${FORMAT}`
