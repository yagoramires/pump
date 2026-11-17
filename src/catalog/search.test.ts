import { searchCatalog } from './search'
import { ex } from '../../test/helpers'

test('busca ignora acento e caixa, casa trechos e prioriza prefixo; empate alfabético', () => {
  const l = [ex('Crucifixo com halter'), ex('Supino reto com barra'), ex('Supino inclinado')]
  expect(searchCatalog(l, 'SUPINO').map(e => e.name)).toEqual(['Supino inclinado', 'Supino reto com barra'])
  expect(searchCatalog(l, 'halter cruci').map(e => e.name)).toEqual(['Crucifixo com halter'])
  expect(searchCatalog([ex('Elevação pélvica')], 'elevacao pelvica')).toHaveLength(1)
  expect(searchCatalog(l, 'barra').map(e => e.name)).toEqual(['Supino reto com barra'])
})

test('busca vazia devolve tudo filtrado; filtro de músculo inclui secundários', () => {
  const l = [ex('Remada', { muscles: ['dorsais', 'bíceps'] }), ex('Rosca', { muscles: ['bíceps'] }), ex('Agachamento', { muscles: ['quadríceps'] })]
  expect(searchCatalog(l, '', { muscle: 'bíceps' }).map(e => e.name)).toEqual(['Remada', 'Rosca'])
})

test('filtro de aparelho é por igualdade', () => {
  const l = [ex('A', { equipment: 'barra' }), ex('B', { equipment: 'halter' })]
  expect(searchCatalog(l, '', { equipment: 'halter' }).map(e => e.name)).toEqual(['B'])
})

test('searchCatalog funciona com itens sem muscles', () =>
  expect(searchCatalog([{ name: 'Arroz, tipo 1, cozido' }, { name: 'Feijão, carioca, cozido' }], 'arroz').map((x) => x.name)).toEqual(['Arroz, tipo 1, cozido']))
