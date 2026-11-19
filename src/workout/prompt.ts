import { FOCUS_LABEL, type Focus, type Profile } from '@/profile/types'
import { focusOf } from '@/profile/profile'
import { EXTRA_LABEL, LEVEL_LABEL, MUSCLE_LABEL, PLACE_LABEL, SPLIT_LABEL } from './anamnesis'
import { str } from '@/lib/text'
import { profileLines } from '@/profile/promptLines'
import { EXERCISE_LIST_URL } from '@/catalog/urls'
import { aboutMe as aboutMeBlock, adjustPrompt, askFirst, formatSpec, label, listRule as rule, names } from '@/format/promptRules'
import { exportPlanFormat } from './planFormat'
import type { WorkoutPlan } from './types'
import { KG, REST_SEC, SETS } from './limits'
import { CARDIO_REPS_RULE } from './reps'

const FOCUS: Record<Focus, string> = {
  hipertrofia: `${FOCUS_LABEL.hipertrofia.toLowerCase()} (ganhar massa muscular)`,
  forca: FOCUS_LABEL.forca.toLowerCase(),
  condicionamento: FOCUS_LABEL.condicionamento.toLowerCase(),
}
const PLACES = {
  academia: `${PLACE_LABEL.academia.toLowerCase()} completa`,
  casa: `${PLACE_LABEL.casa.toLowerCase()}, com pouco equipamento`,
}
const SPLITS = {
  ...SPLIT_LABEL,
  fullbody: `${SPLIT_LABEL.fullbody.toLowerCase()} (corpo todo em cada treino)`,
  ab: `${SPLIT_LABEL.ab} (superiores e inferiores)`,
  ppl: `${SPLIT_LABEL.ppl.toLowerCase()} (empurrar, puxar, pernas)`,
}
const EXTRAS = { ...EXTRA_LABEL, mobilidade: `${EXTRA_LABEL.mobilidade}/alongamento` }

function aboutMe(p?: Profile): string[] {
  const a = p?.anamnesis ?? {}
  const focus = label(FOCUS, focusOf(p))
  const level = label(LEVEL_LABEL, a.level)
  const place = label(PLACES, a.place)
  const split = label(SPLITS, a.split)
  const extras = names(a.extras, EXTRAS).toLowerCase()
  const muscles = names(a.weak, MUSCLE_LABEL).toLowerCase()
  const notes = str(p?.notes)
  return [
    ...profileLines(p),
    ...[
      focus && `Foco: ${focus}`,
      level && `Nível: ${level.toLowerCase()}`,
      place && `Onde treino: ${place}`,
      split && `Divisão preferida: ${split}`,
      extras && `Incluir também: ${extras}`,
      muscles && `Pontos fracos (quero priorizar): ${muscles}`,
      a.minutes ? `Tempo por treino: até ${a.minutes} min${a.extras?.includes('cardio') ? ', contando o cardio' : ''}` : '',
      notes && `Lesões, limitações ou observações: ${notes}`,
    ].filter(Boolean).map((l) => `- ${l}`),
  ]
}

const listRule = (fallback: string) => rule(EXERCISE_LIST_URL, 'exercício', '. Copie a linha inteira da lista, do jeito que está, com o equipamento entre parênteses (o app reconhece).', fallback)
const NEW_EXERCISE_RULE = listRule('Só use outro nome se nenhum da lista servir.')

const FORMAT = formatSpec(`- "treinos": lista com pelo menos um treino. Cada treino tem:
  - "letra": identificador curto e único ("A", "B", "C"...).
  - "nome": nome do treino (ex.: "Peito e tríceps").
  - "exercicios": lista com pelo menos um exercício. Cada exercício tem:
    - "nome": nome do exercício (obrigatório).
    - "series": número inteiro de ${SETS[0]} a ${SETS[1]} (obrigatório).
    - "reps": repetições como texto, ex.: "8-12" ou "10" (obrigatório).
    - "cargaKg": carga inicial em kg, número de ${KG[0]} a ${KG[1]} (opcional).
    - "descansoSeg": descanso entre séries em segundos, número inteiro de ${REST_SEC[0]} a ${REST_SEC[1]} (opcional).
    - "obs": observação curta (opcional).`, 'Exemplo', `  "treinos": [
    {
      "letra": "A",
      "nome": "Peito e tríceps",
      "exercicios": [
        { "nome": "supino reto com barra", "series": 4, "reps": "8-10", "cargaKg": 40, "descansoSeg": 90 },
        { "nome": "tríceps corda", "series": 3, "reps": "12", "obs": "segurar 1s embaixo" }
      ]
    }
  ]`)

export const buildPrompt = (profile?: Profile): string => `Você é um personal trainer. Monte meu plano de treino de musculação no formato "Pump".

${aboutMeBlock(aboutMe(profile))}

Como fazer:
1. Se eu colar uma ficha pronta junto, transcreva sem mudar os números (séries, repetições, cargas); os nomes seguem a regra da lista.
2. ${askFirst('plano', 'objetivo, dias por semana, tempo por treino, onde treino, nível, lesões')}
3. Monte o plano pro meu objetivo: escolha séries, repetições e descanso de acordo com ele, use a divisão que prefiro (se eu disse), dê um pouco mais de volume aos meus pontos fracos e evite exercícios que piorem minhas lesões ou limitações.
4. Cada treino tem que caber no tempo por treino. Some 5 min de aquecimento, o cardio e, pra cada série, uns 40 s de execução mais o descanso. Por exemplo: 60 min com 20 de cardio deixam uns 35 min pra musculação, o que dá umas 12 a 15 séries (4 ou 5 exercícios). Se passar do tempo, corte exercícios ou séries, nunca o descanso.
5. Cardio, abdômen ou mobilidade entram como exercícios do treino; ${CARDIO_REPS_RULE}.
6. Só coloque "cargaKg" se souber quanto eu levanto; senão deixe de fora.
7. Os treinos rodam em sequência, na ordem da lista (A, B, C…), um por dia de treino.
8. ${NEW_EXERCISE_RULE}

${FORMAT}`

export const buildConvertPrompt = (): string => `Vou te mandar minha ficha de treino (PDF, foto ou texto). Transcreva ela para o formato "Pump", sem mudar séries, repetições, cargas nem descansos.

Como fazer:
1. Mantenha a ordem dos treinos e dos exercícios e os nomes dos treinos como estão na ficha.
2. ${listRule('Se nenhum da lista servir, mantenha o nome original da ficha.')}
3. O que a ficha trouxer além disso (observações, cardio) entra em "obs" ou como exercício; ${CARDIO_REPS_RULE}.

${FORMAT}`

export const buildAdjustPrompt = (plan: WorkoutPlan): string =>
  adjustPrompt('treino', [`Para exercício novo: ${NEW_EXERCISE_RULE}`], exportPlanFormat(plan))
