# Review consolidado: plano da Fase 1 do Pump

Alvo: `docs/superpowers/plans/2026-11-16-pump-fase-1-fundacao-e-treino.md`, com a spec e o mockup v2 como contexto.

Foram 5 etapas e 10 revisores, todos completos:
- 5: visão geral e inventivo
- 6: compreensão
- 7: design, estrutura e estilo
- 8: visão geral das correções
- 9: prontidão, precisão técnica e estilo

**Veredito:** o plano **ainda não está pronto pra executar**. A arquitetura se sustenta, mas há **dois jeitos de perder dados sem aviso**, que é exatamente o anti-objetivo nº 1 da spec. Também há dois testes que nunca passam e um passo que pode apagar a pasta `docs/`. Todos os problemas têm correção local: nada exige mudar a spec.

Relatórios por etapa, na mesma pasta: `zoom_out_report.md`, `comprehension_report.md`, `critic_report.md`, `intermediate_zoom_out_report.md`, `implementation_readiness_report.md`.

---

## 🔴 Bloqueadores (corrigir antes de executar)

| # | O que acontece | Correção mínima | Tarefas |
|---|---|---|---|
| **C1** | **Cópias velhas sobrescrevem dados.** Cada tela guarda sua cópia de `settings`, `workoutPlan` e `workoutLog`. Depois de importar um backup, a próxima série marcada grava o histórico vazio por cima do restaurado. Exportar apaga `lastBackupAt` na próxima troca de aba. | Uma lista de ouvintes por chave em `db.ts`: `save()` avisa todas as cópias. `location.reload()` depois de importar. Um teste com duas cópias da mesma chave. | 2, 3, 11 |
| **C2** | **A restauração não é atômica.** O `clear` e o `setMany` rodam em transações separadas, então uma falha no meio apaga tudo. | Rodar `setMany(dados)` primeiro e depois `delMany(chaves que sobraram)`. Validar o formato de leve: chaves conhecidas e `workouts` como array. | 2, 3 |
| **C3** | **A sessão do dia copia pouco.** A tela lê o plano ao vivo, então editar o plano durante o treino embaralha as linhas. Isso contradiz o próprio Foco 2 do plano. | `SessionExercise = PlanExercise & { sets }` via `structuredClone`, mais `workoutLabel`. Desenhar só da sessão depois do 1º toque. Ampliar o teste. | 2, 7, 10 |
| **C4** | **O teste de ida e volta do formato Pump nunca passa**, porque o id é um `randomUUID` novo a cada vez. | Comparar sem o `id`. | 9 |
| **C5** | **`vi.useFakeTimers()` trava o teste da aba Treino** (o IndexedDB falso, o `findBy` e o user-event param de andar). | Usar `vi.useFakeTimers({ toFake: ['Date'] })`, `userEvent.setup({ advanceTimers })` e `waitFor` nas leituras. | 10 |
| **C6** | **`bun create vite .` pode apagar `docs/` e `.superpowers/`**, porque a pasta não está vazia e nada foi commitado ainda. | Commitar `docs/` primeiro. Gerar o projeto numa pasta temporária e copiar os arquivos. Copiar o mockup pra `docs/design/`. | 1 |
| **C7** | **O deploy no Pages falha na primeira vez.** O workflow não está commitado antes do push, e o Pages é ativado depois do `--push`. | Commitar, rodar `gh repo create` sem `--push`, ativar o Pages e só então dar push. Incluir no workflow o `actions/checkout`, o `configure-pages`, `environment: github-pages` e `bun-version`. | 12 |

## 🟡 Importantes

| # | Problema | Correção |
|---|---|---|
| I1 | **Atualização automática do app.** O `registerType: 'autoUpdate'` pode recarregar o app no meio do treino, e com injectManifest ainda falta configuração. | Tirar o `autoUpdate` e não chamar `skipWaiting`. A versão nova entra na próxima vez que o app abrir. Incluir `cleanupOutdatedCaches` e `createHandlerBoundToURL('index.html')`, e tipos de WebWorker no `sw.ts`. |
| I2 | **Cache dos previews.** Ele só sincroniza nos botões Salvar, então restaurar backup ou "Refazer montagem" deixam o treino offline sem fotos, e falhas nunca se repetem. | Um efeito no App sempre que o `workoutPlan` muda, mais um ao abrir o app. Tirar as 3 chamadas dos botões. |
| I3 | **O bipe fica mudo no iOS** se o AudioContext não for criado durante um toque (e o iOS não vibra pela web). | Um AudioContext compartilhado, criado ou retomado no toque que marca a série. Avisar nos "Limites" que o alerta só toca com o app aberto. |
| I4 | **Exportar no iPhone.** `<a download>` não abre a folha de compartilhar e falha no modo instalado. | Usar `navigator.share({ files })` quando der, com o link como alternativa. Colocar `accept=".json"` no campo de importar. |
| I5 | **Teste de data.** O teste das 21h não pega o bug no CI, que roda em UTC. | `TZ=America/Sao_Paulo` no script de teste. O `weekday` lê a data como local. |
| I6 | **Configuração de testes da Task 1.** `test:` no config, globals, tipos, jest-dom e `git init -b main`. A meta viewport vai no `index.html`. | Escrever cada item explícito. |
| I7 | **Decisões deixadas pro implementador:** os ids dos planos prontos, os rótulos e descrições, e a ordem ABCD. | Listar no plano. |
| I8 | **Interfaces de montagem.** Faltam a prop `initial` do PlanEditor, quem salva o exercício criado e gera o id, o que acontece offline na montagem, reps como texto, passos de kg e descanso, e os padrões do `toPlanExercise`. | Definir cada uma. |
| I9 | **Validação do formato Pump incompleta:** reps numérico, tipos, listas vazias, letra repetida, JSON inválido, e o mesmo nome sem par duas vezes. | Listar as regras e as mensagens. |
| I10 | **Testes vazios ou incompletos.** Dois testes são só comentário, e os helpers e fixtures não estão definidos. | Escrever por extenso. |
| I11 | **Lotes de tradução.** A ordem "por id" é ambígua, então os lotes paralelos podem se sobrepor. Importar o script no teste roda o `process.exit`. | O script grava `batches.json`. Usar `if (import.meta.main)`. |
| I12 | **Aba Treino.** Faltam: o círculo `.chk` do mockup (e se os tracinhos o substituem), a área de 44 px nos tracinhos, editar só por "editar" (sem segurar), "Concluir" sem sessão, e o `aria-label` "Série N de X". | Definir cada um. |
| I13 | **Listas de arquivos incompletas** nas Tasks 1, 2, 11 e 12, e o pipeline de ícones (preset, config, nomes). | Completar. |
| I14 | **Parte de produto do plano.** O objetivo diz "tudo offline", mas montar o plano usa internet. O objetivo também não cita o import via IA nem o convite de instalação. O "sem confirmar o nome" enfraquece o "OK explícito pra publicar" da spec. O `base: '/pump/'` assume o nome do repo. | Ajustar o texto e criar um bloco curto de **Limites conhecidos** (~6 linhas). |

## 🟢 Detalhes
- Tirar `category` e `level`, que ninguém usa. Os chips de filtro saem dos valores do catálogo, não do glossário.
- Sessão perto da meia-noite: fixar o dia ao abrir a tela (`useState(todayKey)`).
- A data no topo fica "SEG, 16 NOV" com arrays próprios, não `Intl`.
- Usar o ícone `Check` em vez do caractere ✓.
- Renomear o componente `Settings` pra `SettingsScreen`.
- `aria-label` nos chips de dia.
- O SVG do ícone vai no plano, sem a referência ao "NeyHub".
- Cast no `navigator.standalone`.
- `fetchCatalog` lança erro com `!res.ok`.
- Pré-condição na conferência do PWA: salvar antes um plano com treino no dia de hoje.

## Recusado ou adiado (exagero pra Fase 1)
A etapa 8 avaliou as correções em conjunto e recusou estas:
- **Histórico do plano + `schemaVersion` + migração.** A Fase 3 decide como contar as sequências.
- **Uma função `migrate()` que não faz nada.** O backup já tem `version`.
- **Gravar o `lastTab` só quando for treino.** Contradiz a spec e o teste.
- **Agendar o bipe no oscilador.** Brigaria com "Pular" e "+15 s".
- **Ouvinte do evento `online`** e a regra "o plano mais novo ganha". Abrir o app já repete a sincronização.
- **Fallback do jsDelivr em tempo de execução.** Fica só registrado como limite.
- **Escolha quando dois treinos caem no mesmo dia.** Fica como limite: o primeiro ganha.
- **Seção de alternativas.** Basta uma frase no cabeçalho pro injectManifest e outra pro idb-keyval.

## Uma decisão sua
**O prompt pra IA pode levar a lista de nomes do catálogo?** Do jeito que está na spec, uma IA vai escrever "Supino reto" e o catálogo tem "Supino reto com barra". O exercício vira "seu", sem foto e sem preview offline. Incluir os 876 nomes no prompt resolve isso, sem mexer no casamento exato.
- **A favor:** os planos importados ficam com foto.
- **Contra:** o prompt fica com ~15–20 KB e copiar precisa de internet.

A etapa 8 sugeriu adiar. Os revisores das etapas 5 e 7 indicaram fazer.

## Matriz de rastreabilidade

| Item | Origem (relatório: achado) |
|---|---|
| C1 | ZO#1, IC#1, Comp#3, Design#4(parte), IZO#2-3, IR B2, ST M4 |
| C2 | IC#2, Design#5, IZO#10, CD M7 |
| C3 | ZO#2, IC#4, Comp#2, Design#2, IZO#13, IR B1, ST M14 |
| C4 | Comp#1, IR B3, CD B1, ST B1 |
| C5 | CD B2, IR M7, ST M13, CD M8 |
| C6 | Comp#17, Comp#6, IZO#14, IR B4, CD M11, ST M1 |
| C7 | ST B2, IR M13, CD M9 |
| I1 | ZO#4, IC#6, Design#3, IZO#1, IR M11, CD M4 |
| I2 | ZO#3, IC#3, Comp#4, Design#4, IZO#2, IR M12 |
| I3 | IC#5, Design#3, IZO#4, IR M10, CD M5 |
| I4 | CD M6, ST N4 |
| I5 | Comp#5, Design#1, CD M2 |
| I6 | Comp#17, IR M1, CD M1, ST M2-M3 |
| I7 | IR M4, ST N9 |
| I8 | IR M5, ST M15 |
| I9 | IR M6, CD nit |
| I10 | Comp#12, Struct#7, IR M8, CD M12, ST M11-M12 |
| I11 | IR M3, ST M7-M9 |
| I12 | ZO#6, Design#11, IR M9, ST M13 |
| I13 | IR M2, CD M10-M11 |
| I14 | ST(7)#1-5, Struct#2-3, Design#8-9, IZO#12 |
| Detalhes | ZO#5, IC#8, Comp#14, IZO#6, CD/ST/IR nits |
| Recusados | Design#6/#10, IC#3/#9/#10, Design#7/#12/#13, IZO#7-11 |
| Contestado | Struct#1 (`persist()` ausente): o plano já tem `requestPersist()` na Task 2 |

Siglas: ZO = visão geral (5), IC = inventivo (5), Comp = compreensão (6), Struct = estrutura (7), ST = estilo (7/9), IZO = visão geral das correções (8), IR = prontidão (9), CD = precisão técnica (9).

---

## Resolução (2026-11-16)
O Yago aprovou aplicar tudo. Todos os itens C1–C7, I1–I14 e os detalhes foram aplicados no plano, e os recusados ficaram de fora. O prompt com os nomes do catálogo foi **adiado** e ficou registrado em "Limites conhecidos".

Confirmado no npm (2026-11-16):
- o vite-plugin-pwa 2.0.0 aceita Vite 8;
- o idb-keyval 6.3 tem `setMany`, `delMany` e `keys`;
- o comando do gerador de ícones é `pwa-assets-generator`;
- os ids dos planos prontos existem no commit f00c92c.

O mockup foi copiado pra `docs/design/mockup-dia-a-dia-v2.html`.
