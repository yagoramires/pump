import { FormatError, readHalf } from './envelope'
import { keepIdsByName } from './keepIds'

const problems = (f: () => unknown) => {
  try { f() } catch (e) { return (e as FormatError).problems }
  throw new Error('não lançou')
}

test('cada aba lê a sua metade e ignora a outra do mesmo jeito', () => {
  const both = JSON.stringify({ treinos: [], dieta: {} })
  expect(readHalf(both, 'treinos', 'nf', (_, ignored) => ignored)).toBe(true)
  expect(readHalf(both, 'dieta', 'nf', (_, ignored) => ignored)).toBe(true)
  expect(readHalf('{"dieta":{}}', 'dieta', 'nf', (_, ignored) => ignored)).toBe(false)
  expect(problems(() => readHalf('{"dieta":{}}', 'treinos', 'nf', () => 0))).toEqual(['Este arquivo só tem dieta. Importe na aba Dieta.'])
  expect(problems(() => readHalf('{"treinos":[]}', 'dieta', 'nf', () => 0))).toEqual(['Este arquivo só tem treinos. Importe na aba Treino.'])
})

test('sem JSON ou erro inesperado lendo o texto colado vira o aviso de não encontrado', () => {
  expect(problems(() => readHalf('oi', 'dieta', 'Não achei', () => 0))).toEqual(['Não achei'])
  expect(problems(() => readHalf('{}', 'dieta', 'Não achei', () => { throw new TypeError('x') }))).toEqual(['Não achei'])
})

test('mesmo nome herda o id antigo uma vez; id que já é do plano antigo fica', () => {
  const prev = [{ id: 'a', n: 'A' }, { id: 'b', n: 'B' }]
  const next = [{ id: 'x', n: 'B' }, { id: 'y', n: 'B' }, { id: 'a', n: 'C' }, { id: 'z', n: 'A' }]
  expect(keepIdsByName(prev, next, (t) => t.n).map((t) => t.id)).toEqual(['b', 'y', 'a', 'z'])
})
