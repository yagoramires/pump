import { screen } from '@testing-library/react'
import { renderLoaded } from '../../test/render'
import userEvent from '@testing-library/user-event'
import { WorkoutSettings } from './WorkoutSettings'


test('linhas Gerar com IA e Converter abrem cada tela', async () => {
  const user = userEvent.setup()
  const open = vi.fn()
  await renderLoaded(<WorkoutSettings open={open} />)
  expect(screen.queryByText('Importar/exportar via IA')).not.toBeInTheDocument()
  await user.click(await screen.findByText('Gerar com IA'))
  await user.click(screen.getByText('Converter'))
  expect(open.mock.calls[0][0].props.mode).toBe('ia')
  expect(open.mock.calls[1][0].props.mode).toBe('convert')
})
