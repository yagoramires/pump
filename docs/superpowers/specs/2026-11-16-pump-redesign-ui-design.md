# Pump: redesign completo da UI (design)

Data: 2026-11-16 · Status: direção aprovada pelo Yago ("pode seguir e depois ajustamos"); push/publicação ainda dependem de OK
Mockup aprovado ("me agradou bastante"): [`docs/design/redesign-todas-as-telas.html`](../../design/redesign-todas-as-telas.html), com 11 telas.
Spec do produto (continua valendo): [`2026-11-16-pump-design.md`](2026-11-16-pump-design.md)

## 1. Intenção e porquê

A Fase 1 funciona, mas o Yago achou a UI "muito feia" e pediu um redesign completo. As queixas e o que foi visto:
- **Barras de rolagem aparecendo:** na página inteira e na fileira de dias do editor.
- **Editor de treino:** virou um paredão de campos, com 3 linhas de steppers por exercício.
- **Aba Treino:** os tracinhos das séries parecem "carregando" e os cards ficam com muito espaço vazio.
- **Montagem:** são formulários soltos, sem hierarquia.

As referências são o **Yield**, o app de finanças do próprio Yago ("padrão simples e bonito"), e o Hevy, que ele citou de leve.

O objetivo é deixar o Pump com a cara do Yield, adaptada pro celular. O resultado tem que ser bonito e consistente com os outros apps dele.

## 2. Objetivos

1. **Sistema visual do Yield:** trazer os tokens, painéis com borda fina, raios, tipografia, o verde usado com parcimônia e os ícones em círculos coloridos, ajustados pro toque.
2. **Biblioteca:** adotar **Tailwind CSS + shadcn/ui**, que foi a escolha do Yago, com as cores do Yield no lugar do visual padrão do shadcn.
3. **Telas:** redesenhar as 11 telas do mockup, mais as que não estão nele (convite de instalação, tela de dados ilegíveis, tela de erro), sempre no mesmo padrão.
4. **Sem barras de rolagem visíveis** no app inteiro (a rolagem continua funcionando).
5. **Novo jeito de marcar séries:**
   - a lista é compacta, com o exercício atual aberto;
   - as séries ficam numa tabela (Série | Anterior | kg | Reps | ✓);
   - os ajustes do editor saem da tela e vão pra gavetas que sobem de baixo.

## 3. Não-objetivos

- Funcionalidades da Fase 2 ou 3: dieta, água, evolução e conquistas continuam "em breve".
- Tema claro. O Yield tem, mas o Pump continua só escuro.
- Mudar a lógica de dados, o offline, o backup, o service worker ou o formato Pump. A única exceção está em §6.3 (um campo opcional novo).
- Trocar React, Vite ou o roteamento (o app continua sem router).

## 4. Anti-objetivos (falhou mesmo que funcione)

- **Visual genérico:** ficar com cara de "shadcn padrão" (cinza neutro, botão preto e branco) em vez do Grafite do Yield.
- **Regressão de funcionamento:** quebrar o treino offline, o cronômetro que sobrevive a recarregar, a proteção contra perda de dados ou os toques rápidos sem perder séries. Tudo isso já está testado e precisa continuar passando.
- **Peso:** o app ficar visivelmente mais lento ou pesado. Só entram os componentes usados, sem kits inteiros.
- **Emojis ou caracteres como ícone.** Os ícones continuam lucide.
- **Gestos escondidos:** ações principais longe do polegar, ou dependentes de gesto que ninguém descobre (sem "segurar pra editar").

## 5. Restrições

- **Celular primeiro:** pt-BR, só tema escuro, com alvos de toque ≥ 44×44 px (o desenho pode ser menor) e as ações principais na metade de baixo da tela.
- **Base atual:** React 19, Vite 8, TypeScript, bun, vite-plugin-pwa e `base: '/pump/'`. Continua funcionando instalado no iPhone e offline.
- **Testes:** os 69 atuais continuam passando, ajustando só seletores de UI que mudarem. Toda cobertura de comportamento (marcar série, descanso restaurado, cópia da sessão, exercício sem foto, toques rápidos, montagem, backup) precisa existir depois do redesign.
- **Commits** sem coautoria do Claude. **Push na `main` publica automaticamente no Pages**, por isso só se faz com OK do Yago.

## 6. Como fica

### 6.1 Sistema visual (tokens do Yield, modo escuro)

| token | valor | uso |
|---|---|---|
| bg | `#0b0c0d` | fundo do app |
| panel | `#121315` | cards, barra de abas, gavetas |
| surface | `#1a1b1f` | botões secundários, campos, caixas de valor |
| line | `#222428` | divisória entre linhas dentro do card |
| border | `#26282e` | borda de card e controle |
| border-strong | `#3a3d45` | borda do check vazio, alça da gaveta, segmento ativo |
| text / text-2 / faint / strong | `#d6d8dd` / `#8a8d96` / `#5d6068` / `#fff` | texto, secundário, rótulo, título |
| accent / on-accent | `#c6ff3d` / `#0b0c0d` | botão principal, check feito, aba ativa |
| accent-bg / accent-line | `#1a2309` / `#34440d` | linha de série feita, exercício atual, selecionado |
| negative | `#ff6e70` | erro e ação destrutiva |
| c1…c8 | `#6d9c04 #3a91dc #dc5f52 #956ed2 #a77e33 #009f99 #c68206 #cd6199` | cor do grupo muscular, nos círculos de ícone |

- **Fonte:** `-apple-system, "SF Pro Display", Inter, sans-serif`. Números com `tabular-nums`.
- **Raios:** card 14px, controles 10–12px, gaveta 22px no topo.
- **Rótulos:** maiúsculos de 10px em `faint`, como no Yield.
- **Rolagem:** `* { scrollbar-width: none } *::-webkit-scrollbar { display: none }`.
- **Círculo de ícone:** a cor do grupo com ~13% de opacidade no fundo e a cor cheia no ícone. Cada grupo muscular ganha uma cor fixa *(o mapeamento é chamada minha; exemplo: peito c2, costas c6, pernas c1, ombros c4, braços c3, abdômen c7, outros c5)*.

### 6.2 Biblioteca

- **Tailwind CSS v4** (`@tailwindcss/vite`), com os tokens acima no `@theme`.
- **shadcn/ui** (CLI, componentes copiados pro projeto), usando só o necessário: Button, Input, Drawer (Vaul), Sonner (toast), ToggleGroup (segmentado), AlertDialog (confirmações) e Checkbox, se servir pro check da série. As variáveis CSS do shadcn apontam pros tokens do Yield.
- **Atalho `@/`:** é o que o shadcn usa, configurado no Vite e no TS.
- **CSS antigo:** o `theme.css` atual e as classes genéricas saem.

### 6.3 Telas (detalhe no mockup)

1. **Treino do dia**
   - **Topo:** rótulo "SEG, 16 NOV · TREINO A", título e engrenagem.
   - **Cartão de resumo:** anel com séries feitas/total, volume do dia (Σ kg × reps das séries feitas) e tempo.
   - **Tempo:** precisa do novo campo opcional `WorkoutSession.startedAt` (ISO), gravado quando a sessão é criada no primeiro toque. Sessões antigas sem esse campo não mostram o tempo. *(É um campo opcional e compatível com backups v1. Chamada minha.)*
   - **Lista:** uma linha por exercício (círculo colorido, nome, grupo, progresso "2/3", e "3/3" verde com check quando completo).
   - **Exercício aberto:** mostra a tabela **Série | Anterior | kg | Reps | ✓**, com a linha feita em `accent-bg` e o check verde.
   - **"Anterior":** são as reps e a carga da mesma série, no mesmo `exerciseId`, na sessão anterior mais recente do histórico. Se não houver, aparece "—".
   - **kg e reps:** dá pra editar tocando na caixa, com campo inline (`inputmode=decimal` em kg e texto em reps). O check grava a série com os valores mostrados e dispara o descanso.
   - **Qual fica aberto:** um por vez, começando pelo primeiro incompleto. Tocar numa linha fechada abre ela. Ao completar todas as séries, abre o próximo incompleto *(chamada minha)*.
   - **Descanso:** um cartão flutuante com tempo, barra de progresso, "+15 s" e "Pular", acima do botão fixo "Concluir treino".
   - **Navegação:** barra de abas fixa embaixo, com ícone e rótulo.
   - O comportamento atual continua igual: cópia da sessão, `restEndsAt`, bipe, troca de dia ao voltar do segundo plano e gravação por função que parte do último valor salvo. O `SetEditor` some, porque a edição agora é inline.
2. **Preview:** abre numa gaveta (Drawer) com as fotos alternando, os dots, as instruções numeradas sem passos vazios e a observação. Fecha arrastando pra baixo ou com Esc.
3. **Dia de descanso:** estado vazio com ícone de lua num círculo verde, texto e a lista de treinos do plano (com letra, nome e número de exercícios).
4. **Montagem, perfil:**
   - barra de passos (1 de 2), segmentado de sexo e campos grandes com a unidade (cm, kg) do lado, aceitando vírgula decimal;
   - aviso de privacidade;
   - embaixo: "Continuar" (principal), "Restaurar backup" e "Pular".
5. **Montagem, plano:**
   - lista dos 5 planos com bolinhas dos 7 dias e o selecionado em `accent-bg`;
   - atalhos "Do zero" e "Importar de IA";
   - botão "Usar {plano}" fixo embaixo, que abre o editor com o modelo.
6. **Editor do plano:**
   - topo com voltar, título e "Salvar";
   - cada treino num card com a letra e o nome editável (pelo menu ⋯: renomear e remover), dias numa grade de 7 colunas que cabe na largura, e exercícios em linhas de resumo ("3 × 10-12 · 40 kg · 90 s") que abrem a gaveta 7;
   - "Adicionar exercício" e "Novo treino".
7. **Ajustar exercício (gaveta):**
   - séries ±1, reps em texto, carga ±2,5 mais digitação com vírgula, e descanso ±15 s, com os mesmos limites de hoje;
   - botões "Remover" e "Pronto";
   - subir e descer a ordem também ficam no menu ⋯ da gaveta *(chamada minha)*.
8. **Adicionar exercício:**
   - tela cheia com busca e duas fileiras de chips (músculo, aparelho) que rolam de lado sem barra;
   - "Seus exercícios" primeiro, depois "Catálogo", com miniatura e "+";
   - "Criar exercício próprio" fixo embaixo, abrindo numa gaveta.
9. **Importar de IA:**
   - passos numerados: copiar o prompt e colar a resposta;
   - a revisão aparece sozinha ao colar ou escolher o arquivo (sem botão "Revisar"), com os problemas em lista ou o resumo;
   - "Importar plano" fixo, mais o link "copiar meu plano" pra exportar.
10. **Configurações:**
    - lista agrupada ("Treino", "Seus dados") com ícones em círculos coloridos;
    - o item de perfil mostra o resumo, e o de backup mostra "último: há N dias";
    - aviso de dados só no aparelho;
    - "Refazer montagem" em vermelho;
    - confirmações em AlertDialog, no lugar do `confirm()`.
11. **Dieta / Evolução:** estado vazio "chega em breve" com o ícone da aba.

**Fora do mockup, mesmo padrão:**
- **InstallGate:** estado vazio com instrução e botões.
- **Tela "Não consegui ler seus dados"** e **tela de erro (ErrorBoundary):** estado vazio com o ícone em vermelho e os botões.
- **Faixa de backup atrasado e faixa de erro de gravação:** cartões finos no topo, de aviso e de erro.
- **Toasts** viram Sonner.

## 7. Abordagens consideradas

| | Abordagem | Prós | Contras |
|---|---|---|---|
| A | Portar o CSS próprio do Yield e usar só Vaul + Sonner pra gaveta e toast | Fica idêntico aos outros apps, mais leve | Sem kit pronto, cada componente é escrito à mão |
| **B (escolhida pelo Yago)** | **Tailwind + shadcn/ui com as cores do Yield** | Kit completo e acessível (gaveta, diálogo, foco, Esc), rápido de compor | Entram Tailwind e Radix, e é preciso reescrever o markup |
| C | Konsta UI (cara de iOS) | Parece nativo | Visual genérico, difícil de deixar com a identidade própria |
| D | Mantine | Tudo pronto | Pesado, com cara de painel administrativo |

## 8. Detalhes resolvidos (chamadas minhas)
- **Volume:** usa as séries feitas, com carga × primeiro número das reps registradas ("10-12" conta 10; texto sem número conta 0).
- **"Anterior":** compara pela posição da série. Se a sessão anterior tinha menos séries, as que sobram mostram "—".
- **Tempo:** conta de `startedAt` até agora e congela em `completedAt` depois de concluir.
- **Desmarcar uma série:** é tocar no check de novo, como hoje. Isso não mexe no cronômetro.
- **Botões fixos embaixo** (barra de abas, "Concluir", ações da montagem): respeitam a área segura do iPhone e não cobrem o teclado. Com um campo focado, a barra de abas e o cartão de descanso podem se esconder.

## 9. Deixado pro builder

- A estrutura de pastas de `components/ui` (o padrão do shadcn serve) e a divisão em componentes.
- A animação de abrir e fechar o exercício, a gaveta e o anel (sutil, sem exagero).
- Os textos exatos dos estados vazios e avisos, que devem ser curtos, em pt-BR e no tom do mockup.
- A ordem de migração das telas e como manter os testes verdes no caminho.

## 10. Verificação

- **Testes:** `bun run test`, `bun run build` e `bun run lint` verdes, com a cobertura de comportamento mantida (§5).
- **Prints:** com o Playwright em 390×844, cada uma das 11 telas, mais as de fora do mockup, comparadas com o mockup. Nenhuma barra de rolagem visível.
- **Publicação:** só depois do OK do Yago, com push na `main`, que publica sozinho no Pages.
