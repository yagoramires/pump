# Pump — Fase 2: Dieta e água (design)

Data: 2026-11-18 · Status: rascunho para aprovação do Yago · Mockup: `docs/design/dieta.html`

Parte da spec de produto `docs/superpowers/specs/2026-11-16-pump-design.md` (§7.1 passo 3–4, §7.3, §7.5, §7.6). Onde esta spec muda algo de lá, vale esta.

## 1. Intenção

O Yago controla o treino na academia pelo Pump, e quer controlar a dieta em casa no mesmo app, sem conta e sem banco de dados. A dieta segue um **cardápio fixo** (o do nutricionista ou um gerado pela IA da própria pessoa). No dia a dia ela marca o que comeu, troca o que saiu do plano e vê as calorias e os macros do dia.

O ponto especial, pedido pelo Yago, é **gerar a dieta com IA** do mesmo jeito que já existe no treino: o app faz uma anamnese curta, monta um prompt pronto, a pessoa cola na IA dela e cola a resposta de volta.

## 2. Objetivos

1. Aba Dieta: kcal e macros do dia contra a meta, copos de água, refeições do cardápio com check.
2. "Saiu do plano": trocar um alimento ou adicionar um extra **só hoje**, sem mexer no cardápio.
3. Montar o cardápio por quatro caminhos: **Gerar com IA** (principal), **Modelo pronto**, **Do zero** e **Importar**.
4. Alimentos da **TACO** (4ª edição), mais alimentos criados pela pessoa e itens com valores estimados pela IA.
5. Água: liga/desliga, meta e tamanho do copo.
6. Evolução: cartão de dieta, dieta e água no detalhe do dia do Histórico, 3 conquistas novas e uma seção de dieta no PDF.

## 3. Fora do escopo (não-objetivos)

- IA dentro do app. A IA é sempre a da pessoa, via prompt copiado.
- Cardápios diferentes por dia da semana (um cardápio vale todo dia, como na spec de produto).
- Leitor de código de barras, fotos de refeição, banco de marcas comerciais.
- Marcar dieta ou água em dias passados. Só hoje, igual à Evolução.
- Micronutrientes (sódio, ferro etc.). Só kcal, proteína, carboidrato e gordura.
- Mudar a montagem inicial (perfil + treino). Dieta não entra nela.

**Anti-objetivos (seria fracasso mesmo funcionando):**
- O prompt ficar enorme (colar a TACO inteira). O Yago pediu explicitamente só o padrão.
- Números de calorias "inventados" sem aviso: todo valor que não vem da TACO nem da pessoa aparece marcado como **estimativa da IA**.
- Obrigar quem só treina a passar por telas de dieta.

## 4. Restrições

- Mesmas da base: React 19 + Vite + TS + Tailwind v4 + shadcn, pt-BR, só tema escuro, ícones lucide, sem emojis, alvos ≥ 44 px, inputs com 16 px, sem barras de rolagem visíveis, `usePersisted` com updater e nunca copiar dado salvo antes de `loaded`.
- A TACO é um JSON estático em `public/catalog/` (como o catálogo de exercícios): **não entra no precache** e só é baixada quando precisa (buscar, trocar, importar). Offline, a escolha de alimento usa os do cardápio, os criados e os recentes.
- Todo alimento usado é **copiado** pros dados da pessoa (nome + valores por 100 g), pra o cardápio abrir offline e não depender da TACO.
- Backup continua na versão 1; aceita as chaves novas e backups antigos continuam válidos.
- Fonte: TACO 4ª edição (NEPA/UNICAMP, 2011), via o CSV do repositório `raulfdm/taco-api` (MIT), convertido uma vez por script para JSON. Citar a fonte no app (Configurações → Sobre, ou rodapé da busca).

## 5. Abordagens consideradas (escolhidas na conversa)

**Quantidade dos alimentos**
| | Abordagem | Troca |
|---|---|---|
| A | Só gramas | Simples, mas ninguém pesa arroz |
| B | Gramas + tabela de medidas caseiras | Exige montar e traduzir uma tabela nova |
| **C (escolhida)** | Gramas + rótulo de porção por item ("2 un · 100 g") | A dieta do nutricionista já vem assim; nada novo pra manter |

**De onde vêm os valores nutricionais dos itens da IA**
| | Abordagem | Troca |
|---|---|---|
| A | Só a IA informa | Offline e simples, mas a IA erra números |
| B | Só a TACO (casar por nome) | Confiável, mas trabalhoso no import |
| **C (escolhida)** | TACO primeiro, valor da IA como reserva marcado "estimativa da IA" | Um passo só, confiável onde dá |

**Como o prompt ajuda o casamento com a TACO**
| | Abordagem | Troca |
|---|---|---|
| A | Lista numerada da TACO no prompt (~25 mil caracteres) | Casa quase tudo, prompt enorme |
| **B (escolhida pelo Yago)** | Só o padrão de nomes da TACO, com ~15 exemplos | Prompt curto; os poucos que não casam caem na reserva e na revisão |

A arquitetura segue o que o app já faz no treino (anamnese → prompt → colar → revisar → editor; catálogo estático buscado sob demanda; itens copiados pros dados). Não há outra forma sensata dentro das restrições.

## 6. O que o Yago decidiu

1. **Aba Dieta** como no mockup: kcal feito/meta em barra, macros P/C/G, copos de água, refeições com círculo de check, refeição aberta mostra os itens e as trocas em verde.
2. **Porções (C):** cada item tem gramas e um rótulo de porção opcional.
3. **Gerar com IA** com anamnese própria da dieta. Objetivos da dieta: **perder peso rápido, perder peso, manter, ganhar peso, ganhar peso rápido**.
4. **Valores (C)** e **prompt com só o padrão da TACO**.
5. Sem etiqueta "TACO" nos itens. Só os itens fora dela mostram **"estimativa da IA"**.
6. Mockup aprovado ("me parece ok").

## 7. Comportamento

### 7.1 Aba Dieta vazia (convite) — mockup tela 1
Sem cardápio salvo: ícone, "Monte seu cardápio", botão principal **Gerar com IA** e três botões menores **Modelo**, **Do zero**, **Importar**.

### 7.2 Gerar com IA — mockup telas 2 e 3
1. **Anamnese da dieta** (tudo opcional menos o objetivo, salva no perfil e pré-preenchida da próxima vez):
   - Objetivo (5 opções acima).
   - Refeições por dia: 3 a 7.
   - Horários: acorda, treina, dorme (HH:MM).
   - Restrições (múltipla): sem lactose, sem glúten, vegetariano, vegano.
   - "Não como" (texto livre).
   - Onde come: em casa, fora, misto.
   - Idade, só quando ainda não existir (é a mesma idade da anamnese de treino; preencher aqui preenche lá). *Chamada minha: sem idade não há sugestão de meta.*
   - Observações (texto livre).
2. **Copiar prompt pra IA.** O prompt leva:
   - perfil (sexo, altura, peso, idade se houver), objetivo e dias de treino da anamnese de treino, a anamnese da dieta;
   - a meta sugerida (§7.6) como referência;
   - a regra: **nomes dos alimentos no padrão da TACO 4ª edição**, com ~15 exemplos reais ("Arroz, tipo 1, cozido", "Feijão, carioca, cozido", "Frango, peito, sem pele, grelhado", "Ovo, de galinha, inteiro, cozido/10minutos", "Pão, trigo, francês", "Banana, prata, crua", "Aveia, flocos, crua", "Leite, de vaca, desnatado, UHT"…);
   - para cada item: gramas, porção caseira e os valores **da quantidade indicada** (kcal, proteína, carboidrato, gordura), que o app usa só se o alimento não casar com a TACO;
   - o formato JSON (§7.7) com um exemplo, e o pedido de responder só o JSON.
   - Serve também pra transcrever a dieta de um nutricionista (o texto pede pra respeitar a dieta colada, se houver).
3. **Colar resposta:** caixa de texto (aceita o JSON dentro de bloco de código, como no treino). Valida e lista erros em pt-BR.
4. **Revisar:** meta kcal e macros, refeições com horário, itens com porção e kcal. Itens que não casaram mostram **"estimativa da IA"** e um aviso no rodapé ("N itens fora da TACO usam os números da IA. Toque pra trocar."). Botões **Editar** (abre o editor com o cardápio) e **Usar cardápio** (substitui o cardápio atual, com confirmação se já existir um).

### 7.3 Casamento com a TACO no import
Para cada item: normalizar o nome (minúsculas, sem acento, sem pontuação) e procurar na TACO:
1. igual ao nome normalizado de um alimento → casa;
2. senão, o alimento cujo nome contém **todas** as palavras do item (ignorando "de", "da", "com" etc.), preferindo o de nome mais curto → casa;
3. senão → item com os valores da IA convertidos pra 100 g, marcado `source: 'ia'`. Sem valores da IA, o item entra com 0 kcal e aparece na revisão como "sem valores — escolha na TACO".

Se a TACO não carregar (sem internet), todos os itens entram como estimativa e o app avisa: "Sem internet: usei os números da IA. Dá pra trocar depois."

### 7.4 Dia a dia — mockup tela 4
- Topo: rótulo do dia ("Terça · 18 nov"), título "Dieta", engrenagem (configurações).
- Cartão de calorias: `{feito} / {meta} kcal` e barra; macros P/C/G `{feito}/{meta} g`. Sem meta: mostra só o feito, sem barra.
- Cartão de água (se ligado): `{x} de {meta} L` e um copo por unidade da meta (arredondado pra cima). Tocar num copo vazio soma 1; tocar no último cheio tira 1.
- Refeições em ordem de horário: círculo marca/desmarca a refeição inteira; a linha mostra horário, kcal (já com trocas) e "N troca(s)"/"N extra(s)". Tocar abre os itens.
- Item aberto: tocar abre a gaveta **Trocar** (tela 5) só pra hoje; um link "Adicionar extra" no fim da refeição abre a mesma gaveta em modo extra. Trocas e extras podem ser desfeitos.
- **O que conta como comido:** itens das refeições marcadas (com as trocas aplicadas) + extras das refeições marcadas. Extra adicionado numa refeição não marcada fica pendente até marcar.
- Botão de editar cardápio na engrenagem/configurações e no fim da aba.

### 7.5 Trocar / extra — mockup tela 5
Gaveta com busca (TACO, usa internet), lista "Recentes e do cardápio" (funciona offline, inclui os criados), quantidade em gramas com −/+ (passo 10 g) e rótulo de porção opcional, botão **Trocar**/**Adicionar** e link **Criar alimento próprio** (nome + kcal, proteína, carbo, gordura por 100 g).

### 7.6 Editor do cardápio e meta — mockup tela 6
- Meta diária em kcal (editável) e, abaixo, a **sugestão** com botão "Usar". Macros-meta editáveis numa linha (P/C/G em g).
- Refeições: nome + horário, itens com nome, porção, gramas e kcal; adicionar/remover/reordenar itens e refeições.
- **Sugestão de meta** (chamada minha): Mifflin-St Jeor com sexo, peso, altura e idade (sem idade não há sugestão), vezes o fator de atividade pelos dias de treino (0–1: 1,2 · 2–3: 1,375 · 4–5: 1,55 · 6–7: 1,725), mais o ajuste do objetivo: perder rápido −750, perder −400, manter 0, ganhar +300, ganhar rápido +500. Piso de 1.200 kcal (F) e 1.500 kcal (M). Macros sugeridos: proteína 2 g/kg (1,6 em manter), gordura 0,8 g/kg, carboidrato o restante. Arredondar kcal pra dezena.
- **Modelos prontos** (chamada minha): 3 cardápios de 5 refeições feitos só com itens da TACO — "Perder peso (~1.800 kcal)", "Manter (~2.300 kcal)", "Ganhar peso (~2.800 kcal)". Abrem no editor.

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
- `treinos` passa a ser opcional quando `dieta` existe (e vice-versa); um arquivo sem nenhum dos dois é inválido.
- `metaKcal`, `macros`, `porcao` e os valores dos alimentos são opcionais. `gramas` > 0 é obrigatório.
- Os valores do alimento são da **quantidade indicada**, não por 100 g.
- O import da aba Treino continua lendo só `treinos`; se o arquivo trouxer `dieta`, o aviso passa a ser "A dieta deste arquivo pode ser importada na aba Dieta". O import da aba Dieta lê só `dieta`.
- **Exportar cardápio** no formato Pump (copiar), pra pedir ajuste à IA, como no treino.

### 7.8 Água
Nas Configurações: liga/desliga (padrão desligado até a pessoa ligar ou montar o cardápio pelo app, quando o app pergunta uma vez), meta em ml (sugestão 35 ml × peso, arredondada pra 250), copo em ml (padrão 250).

### 7.9 Evolução — mockup tela 7
- **Cartão "Dieta · 30 dias"** (aparece quando há cardápio): média de kcal dos dias com algo marcado vs. meta, "dias no plano" (dias 100%, §7.10) de 30, "água na meta" de 30 (se a água estiver ligada).
- **Histórico, detalhe do dia:** linha "Dieta · {kcal} kcal" com "{feitas} de {total} refeições · N troca(s) · N extra(s)" e linha "Água · {L}" com copos. O dia com dieta marcada também ganha o ponto no calendário.
- **Direção de "melhorou"** (muda a regra da Evolução, *chamada minha*): o objetivo da dieta, quando é perder (rápido ou não) ou ganhar (rápido ou não), decide a direção `loss`/`gain` em **todos** os lugares que hoje usam `goalDirection` (aba, Comparar, PDF e as conquistas de peso). "Manter" ou sem objetivo de dieta → vale a regra atual (objetivo do treino). Não existe estado neutro; assim as conquistas de peso nunca ficam impossíveis. Mudar o objetivo pode inverter o título dessas conquistas, como já acontece hoje ao mudar o objetivo do treino.
- **PDF:** nova seção "Dieta" (quando houver dias marcados): média de kcal vs. meta, dias no plano, dias com água na meta, no mesmo visual das outras seções.

### 7.10 Conquistas (12 → 15)
- **Dia no plano:** primeiro dia 100% — todas as refeições do cardápio marcadas e **nenhum extra** (trocas são permitidas).
- **7 dias na dieta:** 7 dias seguidos 100%.
- **Água 7 dias:** 7 dias seguidos com a meta de água batida (só conta com a água ligada).
- Mesma mecânica das atuais (calculadas dos dados, toast uma vez, estante com progresso "falta N").

## 8. Dados (proposta para o plano)

Chaves novas no IndexedDB (e no backup):
- `dietPlan`: `{ meals: Meal[]; goalKcal?: number; goalMacros?: { p: number; c: number; f: number } } | null`
- `Meal`: `{ id; name; time: 'HH:MM'; items: DietItem[] }`
- `DietItem`: `{ foodId: string; name: string; grams: number; portion?: string; per100: { kcal; p; c; f }; source: 'taco' | 'custom' | 'ia' }`
- `dietLog`: `Record<date, DietDay>`, com `DietDay = { meals: Record<mealId, { done: boolean; swaps?: Record<itemId, DietItem>; extras?: DietItem[] }>; snapshot?: DaySnapshot }` (itens do cardápio ganham `id` próprio, pra trocas não dependerem da posição).
- `DaySnapshot` (*chamada minha*): **congelado a cada mudança do dia** (marcar, trocar, extra): `{ kcal; p; c; f; mealsDone; mealsTotal; swaps; extras; goalKcal? }`. Evolução, Histórico, PDF e conquistas leem **só o snapshot** dos dias passados; o dia de hoje é calculado ao vivo. Assim, trocar ou editar o cardápio não apaga nem altera o passado.
- `waterLog`: `Record<date, { ml: number; goalMl: number }>` — guardar ml e a meta do dia, pra mudar copo ou meta não reescrever o passado.
- `foods`: alimentos criados e recentes (cópia com `per100`), com teto de recentes (chamada minha: 50).
- `profile.dietAnamnesis`; `settings.water: { enabled; goalMl; cupMl }`.
- `foodId`: `taco:<id>`, `custom:<uuid>` ou `ia:<uuid>`.

O cardápio salvo mantém os valores copiados. Os dias passados vivem no `snapshot`, então substituir o cardápio (IA, modelo, importar) não zera o histórico nem tira conquistas já ganhas. "Dia 100%" no snapshot = `mealsDone === mealsTotal && extras === 0`.

## 9. O que fica pro construtor

- Layout fino seguindo `docs/design/dieta.html` e os componentes existentes.
- Escolha dos ~15 exemplos de nomes no prompt e do texto exato do prompt.
- Os 3 modelos prontos (alimentos da TACO e porções).
- Detalhes do script de conversão da TACO (campos: id, nome, categoria, kcal, proteína, carboidrato, gordura; valores "NA"/"Tr" viram 0).
- Lista de palavras ignoradas no casamento por nome.
