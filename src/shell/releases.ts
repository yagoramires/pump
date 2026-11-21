/** Mais recente primeiro. Entrada nova no topo, com `version` maior, abre o aviso de Novidades uma vez.
 * `version` e não a data: dá pra ter mais de uma versão no mesmo dia. `date` = todayKey */
export type Release = { version: number; date: string; novidades: string[]; correcoes: string[] }

export const CHANGELOG: [Release, ...Release[]] = [
  {
    version: 3,
    date: '2026-11-21',
    novidades: [
      'Água: barra de arrastar de 100 em 100 ml',
      'Treino extra: registre um treino fora da ficha sem mudar a ordem dela',
      'Nota do treino com o seu esforço no lugar do volume',
      'A duração termina na última série e dá pra editar o horário',
      'Arraste a série pro lado para marcar como não feita',
    ],
    correcoes: [],
  },
  {
    version: 2,
    date: '2026-11-20',
    novidades: [
      'Tela de Novidades nas configurações',
      'Foto do exercício na tela do dia',
      'Suplementos: cadastro, card na dieta de hoje e no histórico do dia',
      'Novo resumo do treino concluído e em Treinos anteriores',
    ],
    correcoes: [
      'O aviso do fim do descanso não pausa mais a sua música',
      'Substituir o cardápio atualiza o dia de hoje mesmo com refeições marcadas',
      'Exercício repetido, duração ao editar séries e virada do dia no treino',
      'Foto do dia zero, faixas de medidas e conquistas ganhas na evolução',
    ],
  },
  {
    version: 1,
    date: '2026-11-19',
    novidades: [
      'Escolher o primeiro treino ao importar a ficha',
      'Recordes e comparação de volume do treino concluído',
      'Card de cargas na Evolução e detalhe do exercício com gráfico',
      'Carga da série começa com a do último treino',
      'Ajustar com IA nas configurações de treino e dieta',
    ],
    correcoes: [
      'Versão nova entra sozinha no app da tela de início',
      'Reabrir e concluir de novo não troca o primeiro treino escolhido',
    ],
  },
]
