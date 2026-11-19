import { toPlanExercise } from './exercises'
import { ex } from '../../test/helpers'

test('exercício criado vira exercício do plano sem fotos e com a observação', () =>
  expect(toPlanExercise({ id: 'custom-1', name: 'Remada na máquina X', muscles: ['dorsais'], note: 'banco 3' }))
    .toMatchObject({ exerciseId: 'custom-1', name: 'Remada na máquina X', custom: true, images: [], note: 'banco 3' }))
test('exercício do catálogo leva fotos e instruções', () => {
  const e = toPlanExercise(ex('Supino', { images: ['S/0.jpg'], instructions: ['Deite'] }))
  expect(e).toMatchObject({ exerciseId: 'Supino', images: ['S/0.jpg'], instructions: ['Deite'] })
  expect(e.custom).toBeFalsy()
})
