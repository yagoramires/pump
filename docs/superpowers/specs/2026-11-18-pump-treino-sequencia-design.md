# Pump · Treino em sequência (A → B → C)

Data: 2026-11-18 · Pedido do Yago; decisões abaixo são propostas do assistente que ele mandou seguir ("pode seguir").

## 1. Problema

A aba Treino escolhe o treino pelo dia da semana (`Workout.weekdays`). Não dá pra iniciar nem trocar de treino (só em dia sem treino), não há lista de treinos anteriores na aba, e quem esquece de concluir perde o treino: no dia seguinte a aba vira e a sessão de ontem fica pela metade, sem contar em nada. Faltar um dia pula o treino daquele dia.

## 2. Objetivo

Seguir a ficha, não o calendário: os treinos rodam em ordem (A → B → C → A). Faltou um dia, o mesmo treino espera. Dá pra iniciar, trocar, ver os anteriores e resolver o que ficou sem concluir.

Fora do escopo: lembretes/push, mudança no registro de séries, cronômetro de descanso e cardio (ficam como estão).

## 3. Próximo treino (regra)

- Ordem = ordem dos treinos na ficha (a mesma do editor).
- Próximo treino = o seguinte ao da **última sessão concluída** (por data, depois por `completedAt`); volta ao primeiro depois do último. Sem sessão concluída (ou o treino dela não existe mais na ficha) → o primeiro.
- Hoje já tem sessão (em andamento ou concluída) → a aba mostra essa sessão.
- Descanso marcado hoje não muda a fila.

## 4. Aba Treino

- **Antes de começar:** mostra o próximo treino (rótulo, nome, exercícios em acordeão como hoje) com o botão principal **"Iniciar treino"** na barra de baixo. Iniciar cria a sessão de hoje com `startedAt`. Marcar uma série sem ter iniciado também inicia (como hoje).
- **Trocar treino:** link "Trocar treino" abaixo do título abre uma gaveta com os treinos da ficha (o próximo marcado como "próximo"); escolher troca o treino mostrado. Depois que alguma série foi marcada, trocar pede confirmação ("As séries marcadas hoje serão descartadas.") e substitui a sessão de hoje.
- **Em andamento:** como hoje (séries, descanso, "Concluir treino").
- **"Descansar hoje"** continua (só antes de iniciar).
- **Treinos anteriores:** link "Treinos anteriores" no topo da aba abre uma tela com as sessões concluídas, mais recente primeiro (data, rótulo + nome, duração, volume); tocar abre o detalhe só leitura (reaproveitar o detalhe do Histórico da Evolução).

## 5. Treino que ficou sem concluir

- Sessão de um dia anterior, não concluída, com pelo menos uma série marcada → cartão no topo da aba: "Treino {rótulo} de {dia} ficou sem concluir" com **"Concluir"** (grava `completedAt` no fim daquele dia, 23:59, e tira o `startedAt`: o horário real de término não é conhecido, então a duração fica sem número em vez de inventada; conta no dia dela) e **"Descartar"** (apaga a sessão). Só a mais recente aparece; as mais antigas ficam como estão.
- Enquanto não resolver, a fila conta só as concluídas, então o próximo treino é o mesmo que ficou aberto.
- Sessão de dia anterior sem nenhuma série marcada (só iniciada) é ignorada e não mostra cartão.

## 6. Sem dias da semana

- `Workout.weekdays` sai do tipo, do editor (a grade de dias some), dos modelos prontos e do formato Pump: na importação `dias` é aceito e ignorado (arquivos antigos continuam importando); na exportação não sai. O prompt do treino deixa de pedir "dias" e passa a dizer que os treinos rodam em sequência na ordem da lista.
- Dados guardados com `weekdays` continuam lendo: o campo só deixa de ser lido (sem migração).
- Montagem: os pontos de dia da semana dos modelos viram "N treinos".

## 7. Sequência (conquistas de dias seguidos)

- A conta de dias seguidos deixa de depender de dia com treino marcado. Nova regra: meta semanal = `profile.daysPerWeek` ou, sem ela, o número de treinos da ficha (entre 1 e 7). A sequência soma cada dia treinado e zera quando uma semana (Dom–Sáb) **já fechada** termina com menos sessões concluídas que a meta. A semana atual nunca zera.
- Descanso marcado não conta nem zera.
- O golden da Evolução muda só nos casos de sequência; o resto fica igual.

## 8. Testes

- Fila: sem sessões, rotação com volta, ficha alterada (treino removido), descanso no meio, sessão aberta antiga.
- Aba: iniciar, trocar antes e depois de marcar (com confirmação), cartão de "ficou sem concluir" (concluir e descartar), treinos anteriores.
- Formato: importar com e sem `dias`; exportar sem `dias`.
- Sequência: semana fechada abaixo da meta zera, acima não; semana atual não zera; sem `daysPerWeek` usa o número de treinos.
