import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

function Boom(): never {
  throw new Error('boom')
}

test('erro de render mostra a tela com Exportar backup e Recarregar', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {}) // o React loga o erro capturado
  render(<ErrorBoundary><Boom /></ErrorBoundary>)
  expect(screen.getByRole('heading', { name: 'Algo deu errado' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Exportar backup' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Recarregar' })).toBeInTheDocument()
  vi.mocked(console.error).mockRestore()
})
