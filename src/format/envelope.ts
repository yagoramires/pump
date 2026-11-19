import { isObj } from '@/lib/utils'

/** o arquivo "pump-plano" é um só: treinos e dieta são metades dele */
export const HEADER = { formato: 'pump-plano', versao: 1 } as const

export class FormatError extends Error {
  problems: string[]
  constructor(problems: string[]) {
    super(problems.join('\n'))
    this.name = 'FormatError'
    this.problems = problems
  }
}

function extractJson(text: string): unknown {
  const fence = text.match(/```[^\n`]*\n?([\s\S]*?)```/)
  const body = fence ? fence[1] : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
  try {
    return JSON.parse(body)
  } catch {
    return undefined
  }
}

export type Half = 'treinos' | 'dieta'
const ONLY: Record<Half, string> = {
  treinos: 'Este arquivo só tem treinos. Importe na aba Treino.',
  dieta: 'Este arquivo só tem dieta. Importe na aba Dieta.',
}
/** a revisão de uma metade avisa que a outra, ignorada, vai na outra aba */
export const IGNORED: Record<Half, string> = {
  treinos: 'Os treinos deste arquivo podem ser importados na aba Treino',
  dieta: 'A dieta deste arquivo pode ser importada na aba Dieta',
}

/** cada aba lê a sua metade: a outra é ignorada (`ignored` avisa) e um arquivo só com ela aponta a outra aba.
 * O texto colado é qualquer coisa que a IA mandou: erro inesperado ao ler vira `notFound` */
export function readHalf<T>(text: string, half: Half, notFound: string, read: (raw: Record<string, unknown>, ignored: boolean) => T): T {
  try {
    const raw = extractJson(text)
    if (!isObj(raw)) throw new FormatError([notFound])
    const other: Half = half === 'treinos' ? 'dieta' : 'treinos'
    if (raw[half] === undefined && raw[other] !== undefined) throw new FormatError([ONLY[other]])
    return read(raw, raw[other] !== undefined)
  } catch (e) {
    throw e instanceof FormatError ? e : new FormatError([notFound])
  }
}

export function headerProblems(raw: Record<string, unknown>): string[] {
  return [
    raw.formato !== HEADER.formato && `"formato" precisa ser "${HEADER.formato}"`,
    raw.versao !== HEADER.versao && `Versão ${String(raw.versao)} não suportada (este app lê a versão ${HEADER.versao})`,
  ].filter((p) => p !== false)
}

export const writeEnvelope = (body: Record<string, unknown>): string => JSON.stringify({ ...HEADER, ...body }, null, 2)
