# Pump

PWA em pt-BR para montar o plano de treino, registrar as séries e acompanhar o descanso. Funciona offline depois de instalada. React 19 + Vite + TypeScript.

Teste no iPhone: pendente

## Como rodar

```sh
bun install
bun run dev      # servidor local (base /pump/)
bun run test     # vitest
bun run build    # tsc + vite build
```

## Instalar no iPhone

Abra o endereço do app no Safari, toque em Compartilhar e depois em Adicionar à Tela de Início.

## Dados e backup

Tudo fica só no aparelho (IndexedDB), sem conta e sem servidor. Se o app for apagado ou o Safari limpar os dados, o plano e o histórico somem. Faça backup em Configurações → Exportar backup e guarde o arquivo (por exemplo em Arquivos).

## Limites conhecidos

- **Alerta do descanso:** só toca com o app aberto na tela. O iOS não vibra pela web, e a chave de silêncio do iPhone também cala o som.
- **Fotos:** dependem do jsDelivr pra baixar. Se ele sumir, a alternativa é hospedar as fotos junto com o app (não feito agora).
- **Internet:** adicionar exercícios do catálogo, escolher um plano pronto e importar o plano de uma IA precisam de internet, porque usam o catálogo. O resto, inclusive editar séries, cargas e dias do plano, funciona offline.
- **Dois treinos no mesmo dia da semana:** aparece o primeiro da lista.
- **Atualizações do app:** uma versão nova só entra depois que o app é fechado de vez e aberto de novo.
- **Prompt pra IA:** não leva a lista de nomes do catálogo. Nomes que não casam viram exercícios da pessoa, sem foto. Melhorar isso fica adiado.
