/** Mais recente primeiro. Entrada nova no topo, com `version` maior, abre o aviso de Novidades uma vez.
 * `version` e não a data: dá pra ter mais de uma versão no mesmo dia. `date` = todayKey */
export type Release = { version: number; date: string; novidades: string[]; correcoes: string[] }

export const CHANGELOG: [Release, ...Release[]] = [
  {
    version: 12,
    date: '2026-11-22',
    novidades: ['No Histórico, edite as medidas de um dia e troque, adicione ou apague uma foto só.'],
    correcoes: [],
  },
  {
    version: 11,
    date: '2026-11-22',
    novidades: [
      'A aba Evolução foi redesenhada. No topo, os destaques do mês: recorde, rumo do peso e sequência de semanas batendo a meta.',
      'Constância em barras por semana, músculos treinados nos últimos 30 dias e as cargas que mais subiram, com a lista completa em Ver todos.',
      'Peso, gordura e medidas num card só, e as fotos em antes e depois.',
    ],
    correcoes: [],
  },
  {
    version: 10,
    date: '2026-11-22',
    novidades: [],
    correcoes: ['O boneco dos músculos mostra só os músculos dos exercícios de força. O cardio não entra mais.'],
  },
  {
    version: 9,
    date: '2026-11-22',
    novidades: ['Troque o cardio pelo próprio card do exercício. A escolha fica salva no treino do dia, com a mesma duração.'],
    correcoes: [],
  },
  {
    version: 8,
    date: '2026-11-22',
    novidades: [
      'Cancele um treino em andamento pelo cabeçalho. Se já marcou séries, o Pump pede confirmação.',
      'Use Somente cardio na tela de início para registrar uma sessão de cardio sem mudar a ordem da ficha.',
    ],
    correcoes: [],
  },
  {
    version: 7,
    date: '2026-11-22',
    novidades: [],
    correcoes: [
      'Treino extra num dia de descanso não apaga mais o descanso; descartar o extra e depois desfazer não deixa o dia com os dois',
      'Dá pra descartar o treino extra enquanto edita as séries dele, mesmo depois de tirar todos os exercícios',
      'Treino extra só abre quando o treino do dia não está em andamento',
      'Pular uma série não cancela mais o descanso que está correndo',
      'A duração de treinos antigos concluídos sem horário de início agora pode ser editada',
      'Treinos anteriores abrem mais rápido com histórico grande',
      'Pular a pergunta "Como foi hoje?" conta como Leve na nota: não responder não dá mais nota maior que responder',
    ],
  },
  {
    version: 6,
    date: '2026-11-22',
    novidades: ['Antes de iniciar, o treino mostra um resumo: músculos, séries, a última vez e os exercícios com a carga sugerida'],
    correcoes: [],
  },
  {
    version: 5,
    date: '2026-11-22',
    novidades: ['Configurações ganham a seção Medidas, pra registrar peso e medidas de hoje'],
    correcoes: [],
  },
  {
    version: 4,
    date: '2026-11-22',
    novidades: [
      'Resumo do treino novo: um destaque do que você fez (recorde, melhora, meta da semana), os músculos trabalhados num mapa do corpo e os detalhes recolhidos',
      'Toque na nota para ver como ela é calculada',
      'Esforço agora é Leve, Na medida ou Puxado',
      'A duração do treino se ajusta em minutos',
      'Compartilhe o treino como imagem: um cartão com o placar do treino ou uma versão sem fundo pra colar sobre uma foto no Stories',
      'Treino extra concluído tem resumo próprio e conta na semana',
    ],
    correcoes: ['A semana das sequências de treino vai de segunda a domingo'],
  },
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
