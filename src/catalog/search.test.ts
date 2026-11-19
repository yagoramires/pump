import { searchByName } from './search'
import { ex } from '../../test/helpers'

test('busca ignora acento e caixa, casa trechos e prioriza prefixo; empate alfabético', () => {
  const l = [ex('Crucifixo com halter'), ex('Supino reto com barra'), ex('Supino inclinado')]
  expect(searchByName(l, 'SUPINO').map(e => e.name)).toEqual(['Supino inclinado', 'Supino reto com barra'])
  expect(searchByName(l, 'halter cruci').map(e => e.name)).toEqual(['Crucifixo com halter'])
  expect(searchByName([ex('Elevação pélvica')], 'elevacao pelvica')).toHaveLength(1)
})

test('searchByName funciona com qualquer item com nome', () =>
  expect(searchByName([{ name: 'Arroz, tipo 1, cozido' }, { name: 'Feijão, carioca, cozido' }], 'arroz').map((x) => x.name)).toEqual(['Arroz, tipo 1, cozido']))
