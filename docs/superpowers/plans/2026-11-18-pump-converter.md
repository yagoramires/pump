# Converter e listas do catálogo · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Listas públicas de exercícios e alimentos por link, prompts que usam essas listas, e o botão "Converter" (treino e dieta) que gera um prompt de transcrição.

**Architecture:** Um script gera `public/catalog/exercicios.txt` e `alimentos.txt` a partir dos JSONs do catálogo (commitados, com teste de sincronia). Os prompts ganham o link e um prompt irmão de conversão. As telas de import viram "Gerar com IA" / "Converter".

**Tech Stack:** React 19, Vite, TS, Tailwind v4 + shadcn/ui, vitest + Testing Library + fake-indexeddb, bun.

**Spec:** `docs/superpowers/specs/2026-11-18-pump-converter-design.md`

## Global Constraints

- Texto em pt-BR, lucide de traço, nunca emoji; reaproveitar `Step`, `BackHeader`, `BottomBar`, `SettingsRow`, `usePastedReview`/ImportFlow existentes.
- URLs exatas: `https://yagoramires.github.io/pump/catalog/exercicios.txt` e `https://yagoramires.github.io/pump/catalog/alimentos.txt` (constantes em `src/catalog/urls.ts`).
- Formato Pump e validações não mudam.
- Commits sem `Co-Authored-By` e sem "Generated with Claude". Sem push. Nunca apagar pastas inteiras nem usar pkill.
- bun: `bun run test`, `bunx tsc -b`, `bun run lint`, `bun run build`. graphify: `graphify query` antes do primeiro grep; `graphify update .` depois (não commitar `graphify-out`).

## Review Focus

1. Lista commitada desatualizada depois de alguém mexer no catálogo → teste de sincronia falha.
2. Prompt passa do limite de tamanho já testado (diet prompt tem teste de ≤ 6000 caracteres com perfil vazio) → manter os limites existentes verdes.
3. Quem já tem o JSON pronto consegue colar direto no "Converter" sem copiar prompt.
4. Ajustes do treino continuam com "Exportar".
5. Nomes na revisão: listas longas não quebram o layout (mostrar até 5 nomes + "e mais N").

---

### Task 1: Listas do catálogo

**Files:** Create `scripts/build-catalog-lists.ts`, `scripts/build-catalog-lists.test.ts`, `public/catalog/exercicios.txt`, `public/catalog/alimentos.txt`; Modify `src/catalog/urls.ts`, `package.json` (script `catalog:lists`).

**Interfaces:**
- `exerciseList(exercises: Exercise[]): string` e `foodList(foods: TacoFood[]): string` (puras, no script).
- `EXERCISE_LIST_URL`, `FOOD_LIST_URL` em `src/catalog/urls.ts`.
- Formato `exercicios.txt`: linha 1 `Exercícios do app Pump (catálogo). Use exatamente um destes nomes.`; depois blocos `## <músculo>` (primeiro valor de `muscles`, ordem alfabética pt-BR; sem músculo → `## outros`) com linhas `Nome (equipamento)`, nomes em ordem alfabética.
- Formato `alimentos.txt`: linha 1 `Alimentos da tabela TACO (4ª edição). Use exatamente um destes nomes.`; depois um nome por linha, na ordem do `taco.json`.

- [ ] Teste: cabeçalhos; todos os 876/591 nomes presentes; agrupamento; **o arquivo commitado é igual a `exerciseList(json)` / `foodList(json)`**.
- [ ] Ver falhar, implementar, gerar os arquivos com `bun run catalog:lists`, verde. Commit `feat: listas do catálogo para a IA`.

### Task 2: Prompts com link e prompts de conversão

**Files:** Modify `src/workout/prompt.ts`, `src/diet/prompt.ts` (+ testes).

**Interfaces:**
- `buildPrompt(profile)` (treino, gerar) e `buildDietPrompt(profile, measurements, today)` (dieta, gerar) passam a incluir o link da lista e as regras: "Abra a lista em <URL> e use exatamente um nome dela para cada exercício/alimento. Só use outro nome se nenhum da lista servir. Se não conseguir abrir o link, me diga isso antes de responder, em vez de inventar nomes." O treino perde "Use os nomes dos exercícios como se fala em academia…"; a dieta mantém os exemplos TACO.
- Novos: `buildConvertPrompt(): string` (treino) e `buildDietConvertPrompt(): string` (dieta): "Vou te mandar minha ficha/dieta (PDF, foto ou texto). Transcreva para o formato Pump sem mudar séries, repetições, cargas, descansos / quantidades e gramas…", mesmas regras de lista, mesmo bloco de formato e exemplo do prompt de gerar (reaproveitar a parte comum, sem duplicar o bloco de formato), "Responda SOMENTE com o JSON".
- [ ] Testes: cada prompt contém sua URL, "exatamente um nome", "não conseguir abrir o link"; conversão contém "sem mudar"; gerar treino não contém "como se fala em academia"; limites de tamanho existentes continuam verdes.
- [ ] Ver falhar, implementar, verde. Commit `feat: prompts usam as listas do catálogo e prompts de conversão`.

### Task 3: Telas "Gerar com IA" e "Converter"

**Files:** Modify `src/workout/PlanImport.tsx` (prop `mode: 'ia' | 'convert'`), `src/onboarding/Onboarding.tsx`, `src/workout/WorkoutSettings.tsx`, `src/diet/DietImport.tsx` (mode `'ia' | 'convert'` no lugar de `'import'`), `src/diet/DietStart.tsx`, `src/diet/DietSettings.tsx` + testes.

**Comportamento:**
- Treino `mode="ia"`: título "Gerar com IA", anamnese do treino + "Copie o prompt" (`buildPrompt`) + colar. `mode="convert"`: título "Converter ficha", passos "Copie o prompt" (`buildConvertPrompt`), "Mande pra sua IA junto com sua ficha" (sub "PDF, foto ou texto"), "Cole a resposta aqui"; sem anamnese.
- Montagem passo 4: botões "Do zero", "Gerar com IA", "Converter" (grid de 3, mesmo estilo). Ajustes do treino: linhas "Gerar com IA" e "Converter" (e "Exportar" onde estiver hoje — se hoje export está dentro do PlanImport, manter acessível pelo "Converter").
- Dieta `mode="convert"`: título "Converter dieta", mesmos 3 passos com `buildDietConvertPrompt`; o botão "Importar" do `DietStart` vira "Converter" (ícone `FileInput` ou `Upload`); Ajustes da dieta ganham a linha "Converter".
- Revisão: treino mostra `N exercícios sem prévia (fora do catálogo)` + até 5 nomes e "e mais N"; dieta lista até 5 nomes fora da TACO junto da contagem existente.
- [ ] Testes: entradas e títulos; botão copia o prompt certo (spy do clipboard como nos testes atuais); colar JSON direto funciona no Converter; revisão lista nomes.
- [ ] Ver falhar, implementar, verde (tsc, lint, test). Commit `feat: converter ficha e dieta`.

### Task 4: Conferência visual

- [ ] `bun run dev`, Playwright 390×844: montagem passo 4, Ajustes (treino/dieta), as duas telas de treino, Converter dieta, revisão com nomes fora do catálogo; `bun run build` e conferir que `dist/catalog/exercicios.txt` e `alimentos.txt` existem. Corrigir divergências; fechar navegador; apagar só os arquivos `.playwright-mcp/` criados nesta execução; parar só o dev server iniciado (pelo PID). Commit se houver correção.
