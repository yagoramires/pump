import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderLoaded } from '../../test/render'
import { readCurrent, save } from '@/storage/db'
import { ProfileScreen } from './ProfileScreen'


test('Perfil nos Ajustes salva dados comuns e dia do check-in', async () => {
  await save('profile', { sex: 'M', heightCm: 180, focus: 'hipertrofia' })
  const onDone = vi.fn()
  const user = userEvent.setup()
  await renderLoaded(<ProfileScreen onDone={onDone} />)
  await user.click(screen.getByRole('radio', { name: 'Força' }))
  await user.click(screen.getByRole('radio', { name: 'Segunda' }))
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(await readCurrent('profile')).toMatchObject({ focus: 'forca', heightCm: 180 })
  expect(await readCurrent('settings')).toMatchObject({ checkInDay: 1 })
  expect(onDone).toHaveBeenCalled()
})

test('Perfil nos Ajustes não mostra o aviso da anamnese', async () => {
  await save('profile', { sex: 'M', heightCm: 180 })
  await renderLoaded(<ProfileScreen onDone={vi.fn()} />)
  expect(screen.queryByText(/Só a altura é obrigatória/)).not.toBeInTheDocument()
})
