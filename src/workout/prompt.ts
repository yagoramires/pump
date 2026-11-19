import type { Profile } from '@/profile/types'
import type { Extra, Level, Muscle, Place, Split } from './types'
import { HEADER, str } from '@/format/envelope'
import { FOCUS, label, names, profileLines } from '@/profile/promptLines'
import { EXERCISE_LIST_URL } from '@/catalog/urls'
import { listRule as rule } from '@/format/listRule'
import { SETS } from './limits'

const LEVELS: Record<Level, string> = { iniciante: 'iniciante', intermediario: 'intermediário', avancado: 'avançado' }
const PLACES: Record<Place, string> = { academia: 'academia completa', casa: 'em casa, com pouco equipamento' }
const SPLITS: Record<Split, string> = { fullbody: 'full body (corpo todo em cada treino)', ab: 'AB (superiores e inferiores)', abc: 'ABC', abcd: 'ABCD', abcde: 'ABCDE', ppl: 'push/pull/legs (empurrar, puxar, pernas)' }
const MUSCLES: Record<Muscle, string> = { peito: 'peito', costas: 'costas', ombros: 'ombros', biceps: 'bíceps', triceps: 'tríceps', pernas: 'pernas', gluteos: 'glúteos', panturrilha: 'panturrilha' }
const EXTRAS: Record<Extra, string> = { cardio: 'cardio', abdomen: 'abdômen', mobilidade: 'mobilidade/alongamento' }

function aboutMe(p?: Profile): string[] {
  const a = p?.anamnesis ?? {}
  return [
    ...profileLines(p),
    ...[
      label(FOCUS, p?.focus) && `Foco: ${label(FOCUS, p?.focus)}`,
      label(LEVELS, a.level) && `Nível: ${label(LEVELS, a.level)}`,
      label(PLACES, a.place) && `Onde treino: ${label(PLACES, a.place)}`,
      p?.daysPerWeek ? `Dias por semana: ${p.daysPerWeek}` : '',
      label(SPLITS, a.split) && `Divisão preferida: ${label(SPLITS, a.split)}`,
      names(a.extras, EXTRAS) && `Incluir também: ${names(a.extras, EXTRAS)}`,
      names(a.weak, MUSCLES) && `Pontos fracos (quero priorizar): ${names(a.weak, MUSCLES)}`,
      a.minutes ? `Tempo por treino: até ${a.minutes} min${a.extras?.includes('cardio') ? ', contando o cardio' : ''}` : '',
      str(p?.notes) && `Lesões, limitações ou observações: ${str(p?.notes)}`,
    ].filter(Boolean).map((l) => `- ${l}`),
  ]
}

const listRule = (fallback: string) => rule(EXERCISE_LIST_URL, 'exercício', '. Copie a linha inteira da lista, do jeito que está, com o equipamento entre parênteses (o app reconhece).', fallback)

// formato e exemplo, iguais em gerar e converter
const FORMAT = `Formato:
- "formato": sempre "${HEADER.formato}".
- "versao": sempre ${HEADER.versao}.
- "treinos": lista com pelo menos um treino. Cada treino tem:
  - "letra": identificador curto e único ("A", "B", "C"...).
  - "nome": nome do treino (ex.: "Peito e tríceps").
  - "exercicios": lista com pelo menos um exercício. Cada exercício tem:
    - "nome": nome do exercício (obrigatório).
    - "series": número inteiro de ${SETS[0]} a ${SETS[1]} (obrigatório).
    - "reps": repetições como texto, ex.: "8-12" ou "10" (obrigatório).
    - "cargaKg": carga inicial em kg, número maior ou igual a 0 (opcional).
    - "descansoSeg": descanso entre séries em segundos, número inteiro maior ou igual a 0 (opcional).
    - "obs": observação curta (opcional).

Exemplo:
\`\`\`json
{
  "formato": "${HEADER.formato}",
  "versao": ${HEADER.versao},
  "treinos": [
    {
      "letra": "A",
      "nome": "Peito e tríceps",
      "exercicios": [
        { "nome": "supino reto com barra", "series": 4, "reps": "8-10", "cargaKg": 40, "descansoSeg": 90 },
        { "nome": "tríceps corda", "series": 3, "reps": "12", "obs": "segurar 1s embaixo" }
      ]
    }
  ]
}
\`\`\`

Quando for mandar o plano, responda só com o JSON.`

export const buildPrompt = (profile?: Profile): string => {
  const me = aboutMe(profile)
  return `Você é um personal trainer. Monte meu plano de treino de musculação no formato "Pump".

Sobre mim:
${me.length ? me.join('\n') : '- (ainda não contei nada)'}

Como fazer:
1. Se eu colar uma ficha pronta junto, transcreva sem mudar os números (séries, repetições, cargas); os nomes seguem a regra da lista.
2. Senão, se faltar algo importante pra montar um bom plano (objetivo, dias por semana, tempo por treino, onde treino, nível, lesões), me pergunte primeiro, tudo numa mensagem só, e espere minha resposta. Nessa hora não mande JSON.
3. Monte o plano pro meu objetivo: escolha séries, repetições e descanso de acordo com ele, use a divisão que prefiro (se eu disse), dê um pouco mais de volume aos meus pontos fracos e evite exercícios que piorem minhas lesões ou limitações.
4. Cada treino tem que caber no tempo por treino. Some 5 min de aquecimento, o cardio e, pra cada série, uns 40 s de execução mais o descanso. Por exemplo: 60 min com 20 de cardio deixam uns 35 min pra musculação, o que dá umas 12 a 15 séries (4 ou 5 exercícios). Se passar do tempo, corte exercícios ou séries, nunca o descanso.
5. Cardio, abdômen ou mobilidade entram como exercícios do treino; no cardio use "series": 1 e o tempo em "reps", como "20 min".
6. Só coloque "cargaKg" se souber quanto eu levanto; senão deixe de fora.
7. Os treinos rodam em sequência, na ordem da lista (A, B, C…), um por dia de treino.
8. ${listRule('Só use outro nome se nenhum da lista servir.')}
9. Com o plano pronto, responda SOMENTE com o JSON, sem explicação antes ou depois.

${FORMAT}`
}

export const buildConvertPrompt = (): string => `Vou te mandar minha ficha de treino (PDF, foto ou texto). Transcreva ela para o formato "Pump", sem mudar séries, repetições, cargas nem descansos.

Como fazer:
1. Mantenha a ordem dos treinos e dos exercícios e os nomes dos treinos como estão na ficha.
2. ${listRule('Se nenhum da lista servir, mantenha o nome original da ficha.')}
3. O que a ficha trouxer além disso (observações, cardio) entra em "obs" ou como exercício, e cardio usa "series": 1 e o tempo em "reps", como "20 min".
4. Responda SOMENTE com o JSON, sem explicação antes ou depois.

${FORMAT}`
