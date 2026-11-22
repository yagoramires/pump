import { render, screen } from '@testing-library/react'
import { dietDay, food } from '../../test/helpers'
import { DietRows, dietSummary } from './DietCard'

const value = (label: string) => screen.getByText(label).parentElement

test('cartão: média, dias no plano, água e livres nos 30 dias', () => {
  render(<DietRows log={{ '2026-12-10': dietDay([true, true]) }} water={{ '2026-12-10': { ml: 2500, goalMl: 2000 } }} today="2026-12-12" />)
  expect(value('Média de kcal')).toHaveTextContent('400 / 2.000')
  expect(value('Dias no plano')).toHaveTextContent('1 de 3')
  expect(value('Água na meta')).toHaveTextContent('1 de 3')
  expect(value('Livres no mês')).toHaveTextContent('0')
})
test('Q1: água só fora da janela de 30 dias não mostra a linha; dentro, mostra mesmo com 0', () => {
  const log = { '2026-12-10': dietDay([true]) }
  const { unmount } = render(<DietRows log={log} water={{ '2026-10-01': { ml: 2500, goalMl: 2000 } }} today="2026-12-12" />)
  expect(screen.getByText('Dias no plano')).toBeInTheDocument()
  expect(screen.queryByText('Água na meta')).not.toBeInTheDocument()
  unmount()
  render(<DietRows log={log} water={{ '2026-12-11': { ml: 500, goalMl: 2000 } }} today="2026-12-12" />)
  expect(value('Água na meta')).toHaveTextContent('0 de 3')
})
test('sem refeição marcada não tem média; sem registro, o convite', () => {
  const { unmount } = render(<DietRows log={{ '2026-12-10': dietDay([false]) }} water={{}} today="2026-12-12" />)
  expect(screen.queryByText('Média de kcal')).not.toBeInTheDocument()
  unmount()
  render(<DietRows log={{}} water={{}} today="2026-12-12" />)
  expect(screen.getByText('Marque as refeições na aba Dieta pra ver aqui.')).toBeInTheDocument()
})
test('dia marcado só com itens de 0 kcal: a média é 0, não falta de dado', () => {
  const day = dietDay([true])
  day.meals[0].items = [food({ id: 'agua', name: 'Água', per100: { kcal: 0, p: 0, c: 0, f: 0 } })]
  render(<DietRows log={{ '2026-12-10': day }} water={{}} today="2026-12-12" />)
  expect(value('Média de kcal')).toHaveTextContent('0 / 2.000')
})
test('resumo: dias no plano; sem dia, undefined', () => {
  expect(dietSummary({ '2026-12-10': dietDay([true, true]) }, {}, '2026-12-12')).toBe('1 de 3 dias no plano')
  expect(dietSummary({}, {}, '2026-12-12')).toBeUndefined()
})
test('linhas sem card nem título', () => {
  render(<DietRows log={{ '2026-12-10': dietDay([true]) }} water={{}} today="2026-12-12" />)
  expect(screen.queryByText('Dieta · 30 dias')).toBeNull()
})
