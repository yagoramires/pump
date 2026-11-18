import { isObj } from '../schema'

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

export const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

export function extractJson(text: string): unknown {
  const fence = text.match(/```[^\n`]*\n?([\s\S]*?)```/)
  const body = fence ? fence[1] : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
  try {
    return JSON.parse(body)
  } catch {
    return undefined
  }
}

export function readEnvelope(text: string, notFound: string): Record<string, unknown> {
  const raw = extractJson(text)
  if (!isObj(raw)) throw new FormatError([notFound])
  return raw
}

export function headerProblems(raw: Record<string, unknown>): string[] {
  return [
    raw.formato !== HEADER.formato && `"formato" precisa ser "${HEADER.formato}"`,
    raw.versao !== HEADER.versao && `Versão ${String(raw.versao)} não suportada (este app lê a versão ${HEADER.versao})`,
  ].filter((p) => p !== false)
}

export const writeEnvelope = (body: Record<string, unknown>): string => JSON.stringify({ ...HEADER, ...body }, null, 2)
