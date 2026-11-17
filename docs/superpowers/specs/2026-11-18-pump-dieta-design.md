# Pump — Fase 2: Dieta e água (design)

Data: 2026-11-18 · Status: revisado (4 revisores), aguardando aprovação do Yago · Mockup: `docs/design/dieta.html`

Parte da spec de produto `docs/superpowers/specs/2026-11-16-pump-design.md` (§7.1 passos 3–4, §7.3, §7.4, §7.5, §7.6). Onde esta spec muda algo de lá, vale esta, e as mudanças estão listadas em §11.

## 1. Intenção

O Yago controla o treino na academia pelo Pump e quer controlar a dieta em casa no mesmo app, sem conta e sem banco de dados. A dieta segue um **cardápio fixo** (o do nutricionista ou um gerado pela IA da própria pessoa). No dia a dia ela marca o que comeu, troca o que saiu do plano e vê as calorias e os macros do dia.

O ponto especial, pedido pelo Yago, é **gerar a dieta com IA** do mesmo jeito que já existe no treino: o app faz uma anamnese curta, monta um prompt pronto, a pessoa cola na IA dela e cola a resposta de volta.

## 2. Objetivos

1. Aba Dieta: kcal e macros do dia contra a meta, copos de água, refeições do cardápio com check.
2. "Saiu do plano": trocar, adicionar ou pular um alimento **só hoje**, sem mexer no cardápio.
3. Montar o cardápio por três caminhos: **Gerar com IA** (principal), **Do zero** e **Importar**.
4. Alimentos da **TACO** (4ª edição), mais alimentos criados pela pessoa e itens com valores estimados pela IA.
5. Água: liga/desliga, meta e tamanho do copo.
6. Evolução: dieta e água no detalhe do dia do Histórico, cartão "Dieta · 30 dias", 3 conquistas novas e uma seção de dieta no PDF.

## 3. Fora do escopo

- IA dentro do app. A IA é sempre a da pessoa, via prompt copiado.
- **Sugestão de meta calculada pelo app** (cortada pelo Yago na revisão): a meta vem da IA ou é digitada.
- **Modelos prontos de cardápio** (adiados pelo Yago na revisão).
- Cardápios diferentes por dia da semana. Um cardápio vale todo dia.
- Leitor de código de barras, fotos de refeição, banco de marcas comerciais.
- Marcar dieta ou água em dias passados, e gráficos de kcal/água por dia (ver §11).
- Micronutrientes. Só kcal, proteína, carboidrato e gordura.
- Mudar a montagem inicial (perfil + treino).

**Anti-objetivos (seria fracasso mesmo funcionando):**
- O prompt ficar enorme (colar a TACO inteira). Teto: o prompt de dieta não passa de 6.000 caracteres sem os dados da pessoa.
- Números errados ou inventados **sem aviso**: todo valor que não vem da TACO nem da pessoa aparece como **estimativa da IA**, e um casamento duvidoso com a TACO cai pra estimativa em vez de entrar calado (§7.3).
- Obrigar quem só treina a ver dieta: sem cardápio, nada de dieta aparece fora da aba Dieta (nem conquistas, nem cartão).
- Editar ou trocar o cardápio apagar ou reescrever dias passados.

## 4. Restrições

- Mesmas da base: React 19 + Vite + TS + Tailwind v4 + shadcn, pt-BR, só tema escuro, ícones lucide, sem emojis, alvos ≥ 44 px, inputs com 16 px, sem barras de rolagem visíveis, `usePersisted` com updater e nunca copiar dado salvo antes de `loaded`.
- A TACO fica em `public/catalog/taco.json`. O `globIgnores: ['**/catalog/**']` já a tira do precache e o `sw.ts` não tem rota pra `catalog/`, então ela sempre vem da rede (cache HTTP normal). Guardar em memória durante a sessão depois do primeiro carregamento.
- Todo alimento usado é **copiado** pros dados da pessoa (nome + valores por 100 g).
- Backup continua na versão 1; aceita as chaves novas (precisam entrar em `USER_KEYS` e ganhar checagem de formato em `parseBackup`), e backups antigos continuam válidos. Limite aceito: uma versão antiga do app ainda em cache recusa um backup com as chaves novas ("conteúdo desconhecido").
- Fonte: TACO 4ª edição (NEPA/UNICAMP, 2011), via `references/csv/food.csv` + `nutrients.csv` do repositório `raulfdm/taco-api` (MIT). Convertido uma vez por um script em `scripts/` no mesmo padrão de `scripts/build-catalog.ts` (função pura testável + `import.meta.main`). Campos: `id`, `name`, `kcal`, `p`, `c`, `f` por 100 g; vazio, "NA" e "Tr" viram 0. A fonte é citada no rodapé da busca de alimentos.

## 5. Abordagens consideradas (escolhidas na conversa)

**Quantidade dos alimentos:** A só gramas · B gramas + tabela de medidas caseiras · **C gramas + rótulo de porção por item ("2 un · 100 g")** — escolhida: a dieta do nutricionista já vem assim e não há tabela nova pra manter.

**Valores dos itens da IA:** A só a IA · B só a TACO · **C TACO primeiro, valor da IA como reserva marcado "estimativa da IA"** — escolhida: um passo só, confiável onde dá.

**Casamento com a TACO no prompt:** A lista numerada da TACO no prompt (~25 mil caracteres) · **B só o padrão de nomes, com exemplos** — escolhida pelo Yago: prompt curto.

**Como guardar o dia:** A marcações apontando pro cardápio + resumo congelado · **B cópia do cardápio dentro do dia** — escolhida na revisão: é o que o treino já faz (`startSession` copia o treino pra sessão), não tem dois caminhos de cálculo e nunca deixa marcações órfãs.

## 6. O que o Yago decidiu

1. **Aba Dieta** como no mockup: kcal feito/meta em barra, macros P/C/G, copos de água, refeições com círculo de check, refeição aberta mostra os itens e as trocas em verde.
2. **Porções (C).**
3. **Gerar com IA** com anamnese própria. Objetivos da dieta: **perder peso rápido, perder peso, manter, ganhar peso, ganhar peso rápido**.
4. **Valores (C)** e **prompt com só o padrão da TACO**.
5. Sem etiqueta "TACO" nos itens. Só os itens fora dela mostram **"estimativa da IA"**.
6. Mockup aprovado.
7. Na revisão: cortar a sugestão de meta, adiar os modelos prontos, trocar a "pergunta da água" por um link na aba.

## 7. Comportamento

### 7.1 Aba Dieta vazia (convite) — mockup tela 1
Sem cardápio (`dietPlan.meals` vazio): `EmptyState` com ícone, "Monte seu cardápio", botão principal **Gerar com IA** e dois botões **Do zero** e **Importar**. (O botão "Modelo" do mockup sai.)

### 7.2 Gerar com IA e Importar — mockup telas 2 e 3
"Gerar com IA" e "Importar" são **a mesma tela** com um passo a mais no primeiro, como o `PlanImport` do treino (passos, colar com espera de 400 ms, escolher arquivo, aviso). Reaproveitar o `Step` e o padrão do `PlanImport` em vez de duplicar.

1. **Anamnese** (só em Gerar com IA). Salva em `profile.dietAnamnesis` ao tocar "Copiar prompt" e vem pré-preenchida da próxima vez. Reaproveita `Chips`/`MultiChips` de `AnamnesisForm.tsx` (exportar).
   - Objetivo (obrigatório): perder peso rápido, perder peso, manter, ganhar peso, ganhar peso rápido.
   - Refeições por dia: 3 a 7.
   - Horários: acorda, treina, dorme (HH:MM).
   - Restrições (múltipla): sem lactose, sem glúten, vegetariano, vegano.
   - "Não como" (texto livre).
   - Onde come: em casa, fora, misto.
   - Observações (texto livre; também serve pra colar a dieta do nutricionista a transcrever).
2. **Copiar prompt pra IA.** O prompt leva:
   - perfil (sexo, altura, peso, idade se houver) e objetivo/dias de treino — reaproveitando `aboutMe` de `planFormat.ts` (separar as linhas de perfil das de treino);
   - a anamnese da dieta; o pedido de calcular uma meta de kcal e macros coerente com o objetivo e o perfil;
   - a regra: **nomes dos alimentos no padrão da TACO 4ª edição** ("Alimento, tipo, preparo"), sempre dizendo o preparo (cru, cozido, grelhado…), com cerca de 15 exemplos reais tirados do `taco.json`;
   - para cada item: gramas, porção caseira e os valores **da quantidade indicada** (kcal, proteína, carboidrato, gordura);
   - o formato JSON (§7.7) com um exemplo, e o pedido de responder só o JSON.
3. **Colar resposta ou escolher arquivo.** Aceita JSON dentro de bloco de código. Valida (§7.7) e lista erros em pt-BR.
4. **Revisar:** meta kcal e macros, refeições com horário, itens com porção e kcal.
   - Item casado com a TACO por nome diferente do que a IA escreveu mostra uma linha discreta "na TACO: {nome}" (texto, não etiqueta).
   - Item fora da TACO mostra **"estimativa da IA"**; rodapé "N itens fora da TACO usam os números da IA. Toque pra trocar." Tocar abre a gaveta de busca (§7.5) pra trocar aquele item no cardápio em revisão.
   - Item sem kcal (a IA não mandou) entra com 0 e aparece como "sem valores — escolha na TACO"; isso **não** bloqueia salvar.
   - Botões **Editar** (abre o editor com o cardápio) e **Usar cardápio** (substitui o atual; se já existir um, confirma com "O cardápio atual será substituído. O que você já marcou hoje continua.").

### 7.3 Casamento com a TACO (import)
Normalização: minúsculas, sem acento, **pontuação vira espaço**, espaços colapsados, comparação por **palavras inteiras**. Função nova (não mudar o `normalize` de `catalog/search.ts`, que o casamento de exercícios usa).

Para cada item, na ordem:
1. **Alimentos da pessoa** (`foods` de origem `custom`) com o mesmo nome normalizado → casa (como `planFromFormat` faz com os exercícios criados antes do catálogo).
2. **TACO, nome igual** → casa.
3. **TACO, candidatos** que contêm todas as palavras do item (ignorando só "de", "da", "do", "e"; nunca ignorar "com", "sem", "cru", "cozido" ou outro preparo), ordenados por nome mais curto, depois alfabético. Se a IA mandou kcal, aceitar o primeiro candidato cuja kcal pros gramas indicados fique a até **35%** da kcal da IA; nenhum dentro disso → passo 4. Sem kcal da IA, aceitar o primeiro candidato.
4. **Estimativa da IA:** valores da IA convertidos pra 100 g, `source: 'ia'`. Macro ausente vale 0; só a falta de kcal faz o item virar "sem valores".

O item casado guarda o **nome da TACO**. Sem internet (TACO não carrega), os passos 2–3 são pulados e o app avisa: "Sem internet: usei os números da IA. Dá pra trocar depois." Itens `ia` podem ser trocados a qualquer momento pela gaveta (§7.5); não há recasamento automático.

### 7.4 Dia a dia — mockup tela 4
- Topo no padrão das outras abas: rótulo do dia com `formatDayLabel` (como no Treino) e título "Dieta". A engrenagem é a global do app (não criar outra).
- **Cópia do dia:** no primeiro toque do dia (marcar, trocar, pular, extra, água não conta), o app copia as refeições do cardápio pra `dietLog[hoje]` (com `structuredClone`, como `startSession`). Antes disso, a tela mostra o cardápio direto. Depois, tudo vale sobre a cópia.
- **Editar ou trocar o cardápio** com o dia já copiado: vale a partir de amanhã. Se hoje ainda não tem nenhuma refeição marcada, a cópia de hoje é refeita com o cardápio novo.
- Cartão de calorias: `{feito} / {meta} kcal` e barra; macros P/C/G `{feito}/{meta} g`. Acima de 100%, a barra fica cheia e o número em `text-text` (sem cor de alerta). Sem meta: só o feito, sem barra.
- Cartão de água (se ligada): `{x} de {meta} L` e `ceil(meta/copo)` copos. Tocar num copo vazio soma 1 copo; tocar no último cheio tira 1. Com todos cheios aparece mais um copo vazio (dá pra passar da meta). Água desligada: uma linha "Ligar contador de água" que liga com a meta padrão (§7.8).
- Refeições **ordenadas por horário** (empate: ordem do cardápio). Círculo marca/desmarca a refeição inteira; a linha mostra horário, kcal (já com trocas/pulos/extras) e "N troca(s)"/"N extra(s)". Tocar abre os itens.
- Item aberto: tocar abre a gaveta **Trocar** (§7.5); um botão **Pular hoje** no item (ou na gaveta) tira o item do dia e o mostra riscado, com desfazer. "Adicionar extra" no fim da refeição abre a gaveta em modo extra. Trocas, pulos e extras podem ser desfeitos e continuam se a refeição for desmarcada.
- **O que conta como comido:** itens das refeições marcadas (com trocas, sem os pulados) + os extras, que contam na hora em que são adicionados (mesmo com a refeição desmarcada).
- **Virada da meia-noite:** a aba recalcula `todayKey()` ao voltar a ficar visível (`visibilitychange`) e antes de cada ação; uma ação depois da meia-noite vai pro dia novo.

### 7.5 Trocar / extra / alimento novo — mockup tela 5
Gaveta no padrão do `CatalogPicker` (busca na montagem, aviso de offline, `slice(0,100)`, criar item próprio): busca na TACO (usa internet, rodapé com a fonte), lista "Recentes e do cardápio" (funciona offline: alimentos do cardápio, criados pela pessoa e usados nos últimos dias do `dietLog`), quantidade em gramas com −/+ (passo 10 g; padrão = gramas do item trocado, ou 100 g em extra) e rótulo de porção opcional, botão **Trocar**/**Adicionar** e link **Criar alimento próprio** (nome + kcal, proteína, carbo, gordura por 100 g, com `parseDecimal`).
Reaproveitar `fetchCatalog`/`searchCatalog` com parâmetro de caminho e `muscles` opcional, em vez de criar cópias.

### 7.6 Editor do cardápio — mockup tela 6
- Meta diária em kcal e macros-meta P/C/G (opcionais, digitados). Sem a "sugestão" do mockup.
- Refeições: nome + horário (obrigatório, HH:MM), itens com nome, porção, gramas e kcal; adicionar/remover itens e refeições; reordenar só itens dentro da refeição. "Apagar cardápio" (com confirmação) volta ao convite; o histórico fica.
- **Exportar cardápio** no formato Pump (copiar), pra pedir ajuste à IA.
- Acesso: no fim da aba Dieta e num grupo **DIETA** novo nas Configurações (Cardápio, Gerar com IA, Água).

### 7.7 Formato Pump — parte `dieta`
```json
{
  "formato": "pump-plano", "versao": 1,
  "dieta": {
    "metaKcal": 1950,
    "macros": { "proteinaG": 150, "carboG": 190, "gorduraG": 60 },
    "refeicoes": [
      { "nome": "Café da manhã", "horario": "07:00", "alimentos": [
        { "nome": "Pão, trigo, francês", "gramas": 50, "porcao": "1 un", "kcal": 150, "proteinaG": 4, "carboG": 29, "gorduraG": 1.5 }
      ] }
    ]
  }
}
```
- **Leitores separados:** `parsePlanFormat` (treino) continua exigindo `treinos`; um arquivo sem `treinos` mas com `dieta` dá "Este arquivo só tem dieta. Importe na aba Dieta." O aviso de "dieta ignorada" quando vierem os dois passa a ser "A dieta deste arquivo pode ser importada na aba Dieta". Um `parseDietFormat` novo lê só `dieta`, reaproveitando `extractJson` (exportar) e `PlanFormatError`; arquivo sem `dieta` dá "Este arquivo não tem dieta."
- **Validação** (mensagens em pt-BR, listadas como no treino):
  - `refeicoes` com 1 a 10 itens; cada uma com `nome` não vazio, `horario` HH:MM válido e `alimentos` com 1 a 30 itens;
  - cada alimento com `nome` não vazio e `gramas` finito entre 1 e 2000;
  - `kcal`, `proteinaG`, `carboG`, `gorduraG`: opcionais, finitos e ≥ 0; kcal por 100 g convertida acima de 900 é tratada como ausente;
  - `metaKcal` opcional, inteiro entre 800 e 6000; `macros` opcional, cada um entre 0 e 600;
  - texto sem JSON: "Não encontrei um cardápio em JSON no texto".
- Os valores do alimento são da **quantidade indicada**, não por 100 g.

### 7.8 Água
Nas Configurações (grupo DIETA): liga/desliga, meta em ml e copo em ml. Padrão desligado; ao ligar (aqui ou pelo link da aba), meta = 35 ml × peso arredondado pra 250 (sem peso, 2.000 ml) e copo = 250 ml. Meta batida = `ml ≥ goalMl` do dia.

### 7.9 Evolução — mockup tela 7
- **Histórico, detalhe do dia:** linha "Dieta · {kcal} kcal" com "{feitas} de {total} refeições · N troca(s) · N extra(s)" e linha "Água · {L}". O dia com ao menos uma refeição marcada ou água registrada ganha o ponto no calendário (reaproveitar a descrição "com registro"). No detalhe, "Apagar dieta" e "Apagar água" do dia com confirmação, como medidas e fotos.
- **Cartão "Dieta · 30 dias"** (só com cardápio ou com dias de dieta registrados): janela dos últimos 30 dias incluindo hoje; média de kcal dos dias com ≥ 1 refeição marcada contra a média das metas desses dias; "dias no plano" (§7.10) de `min(30, dias desde o 1º registro)`; "água na meta" com o mesmo denominador (se houver registro de água). Quem só faz dieta também vê a Evolução (o estado vazio passa a considerar dias de dieta).
- **Direção de "melhorou":** o objetivo da dieta, quando é perder (rápido ou não) ou ganhar (rápido ou não), decide `loss`/`gain` em `goalDirection` (`bodyFat.ts`), e assim em todos os lugares que a usam (aba, Comparar, PDF, conquistas de peso). "Manter" ou sem objetivo de dieta → regra atual (objetivo do treino). Um teste a mais em `bodyFat.test.ts`.
- **PDF:** seção "Dieta" quando houver dias de dieta no período do relatório: média de kcal vs. meta, dias no plano, dias com água na meta, no visual das outras seções. As conquistas de dieta aparecem nessa seção, não na de treino. O início do período passa a considerar dias de dieta, e o PDF gerado é invalidado quando `dietLog`/`waterLog` mudam.

### 7.10 Conquistas (12 → 15)
- **Dia 100%** de um dia `d`: o dia tem cópia com ≥ 1 refeição, todas as refeições marcadas e **nenhum extra** (trocas e pulos são permitidos).
- **Dia no plano:** primeiro dia 100%.
- **7 dias na dieta:** 7 dias consecutivos 100%. Dia sem cópia quebra a sequência.
- **Água 7 dias:** 7 dias consecutivos com a meta batida, lendo só o `waterLog` (não a configuração atual).
- Só **dias fechados** (`< hoje`) contam: a conquista aparece no dia seguinte e não some ao adicionar um extra à noite.
- As 3 só aparecem na estante (e no total "de N") quando existe cardápio ou algum dia de dieta; senão o total continua 12.
- Integração: ampliar `AchievementId` e o `ICON` da estante; os logs novos entram como campos opcionais no `Input` de `computeAchievements`, carregados (com `loaded`) em EvolutionTab, AchievementsScreen, useAchievementToasts (inclusive nas dependências do efeito) e report.

## 8. Dados

Chaves novas (em `UserData`, `USER_KEYS` e no backup, com checagem de formato):
- `dietPlan: DietPlan`, começando como `{ meals: [] }` (como `workoutPlan`).
- `DietPlan = { meals: Meal[]; goalKcal?: number; goalMacros?: { p: number; c: number; f: number } }`
- `Meal = { id: string; name: string; time: string /* HH:MM */; items: DietItem[] }`
- `DietItem = { id: string; name: string; grams: number; portion?: string; per100: { kcal: number; p: number; c: number; f: number }; source: 'taco' | 'custom' | 'ia'; tacoId?: number }`
- `dietLog: Record<date, DietDay>` com `DietDay = { meals: (Meal & { done: boolean; items: (DietItem & { skipped?: boolean; swappedFrom?: string; extra?: boolean })[] })[]; goalKcal?: number }` — a cópia do dia, com a meta do dia.
- `waterLog: Record<date, { ml: number; goalMl: number }>`
- `foods: DietItem[]` — só os alimentos criados pela pessoa (`source: 'custom'`). Recentes saem do `dietLog`.
- `profile.dietAnamnesis?: { goal: 'perder-rapido' | 'perder' | 'manter' | 'ganhar' | 'ganhar-rapido'; meals?: number; wake?: string; train?: string; sleep?: string; restrictions?: ('lactose' | 'gluten' | 'vegetariano' | 'vegano')[]; avoid?: string; eatOut?: 'casa' | 'fora' | 'misto'; notes?: string }` — quem lê se protege de valores estranhos, como já se faz com a anamnese de treino.
- `settings.water?: { enabled: boolean; goalMl: number; cupMl: number }` — ausente = desligada.

Totais de qualquer dia (hoje ou passado) vêm de **uma função pura** sobre a cópia do dia (`daySummary(day) → { kcal, p, c, f, mealsDone, mealsTotal, swaps, extras, skipped }`), usada pela aba, Histórico, cartão, PDF e conquistas.

## 9. Integração com o código (pontos que mudam)

- `App.tsx:90`: `<ComingSoon title="Dieta" />` → a aba nova; apagar `src/shell/ComingSoon.tsx`; atualizar `App.test.tsx` ("chega em breve").
- `PlanImport.tsx:137` e `planFormat.test.ts`: texto do aviso de dieta.
- `AchievementsScreen.test.tsx`: "de 12" continua pra quem não tem dieta; teste novo pra "de 15".
- `HistoryScreen`: carregar `dietLog`/`waterLog` junto do "Carregando…" e somar ao ponto do calendário.
- `EvolutionTab`: estado vazio, cartão, `deps` do PDF. `report.ts`: `period.start` e seção de dieta.
- Reaproveitar: `EmptyState`, `formatDayLabel`, `parseDecimal`/`formatDec`, `aboutMe`, `Chips`/`MultiChips`, `Step`/padrão do `PlanImport`, `fetchCatalog`/`searchCatalog`, padrão do `CatalogPicker`, `startSession` (cópia).

## 10. Critérios de aceitação

- Testes unitários do casamento: nome igual; candidato por palavras; "cru" vs "cozido" decidido pela kcal da IA; "com pele" não casa com "sem pele"; alimento criado casa antes da TACO; sem internet tudo vira estimativa; kcal ausente vira "sem valores".
- Testes do `parseDietFormat`: cada regra de §7.7 com a mensagem; arquivo só de dieta no import de treino dá a mensagem certa e não grava nada.
- Invariantes da cópia do dia: editar ou substituir o cardápio não muda dias passados nem as marcações de hoje (se houver); `daySummary` com trocas, pulos e extras.
- Conquistas: dia 100% exige ≥ 1 refeição e nenhum extra; só dias fechados; dia sem cópia quebra a sequência; água lê só o `waterLog`; "de 12" sem dieta e "de 15" com.
- Backup: ida e volta com as chaves novas; backup antigo sem elas continua importando.
- iPhone instalado, em modo avião: a aba abre, marca, troca usando recentes, pula item, soma água; import sem rede vira estimativa com o aviso.

## 11. Mudanças em relação à spec de produto

- Sem modelos prontos de dieta nem sugestão de meta (adiados/cortados pelo Yago).
- Dieta e água só no dia de hoje; a spec de produto previa corrigir dias anteriores. Corrigir um dia passado é apagar no Histórico.
- Gráficos de kcal e água por dia ficam pra depois; no lugar, o cartão "Dieta · 30 dias".
- Importar dieta funciona offline (vira estimativa), diferente do import de treino.
- A água não entra na montagem; liga nas Configurações ou pelo link da aba.

## 12. O que fica pro construtor

- Layout fino seguindo `docs/design/dieta.html` e os componentes existentes.
- Texto exato do prompt e os ~15 exemplos de nomes (tirados do `taco.json`).
- Ícones das 3 conquistas novas.
