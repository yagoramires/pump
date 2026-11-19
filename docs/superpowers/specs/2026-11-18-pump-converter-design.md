# Pump · Converter ficha/dieta e listas do catálogo por link

Data: 2026-11-18 · Aprovado pelo Yago ("é isso")

## 1. Problema

- Quem já tem ficha ou dieta (PDF, foto, texto do personal/nutricionista) não tem um caminho claro: o "Importar" só aceita o JSON do Pump, que ninguém tem sem passar por uma IA.
- A maioria dos exercícios que a IA devolve não casa com o catálogo (o import só reconhece nome idêntico, ignorando caixa e acento) e vira exercício próprio, sem prévia. O prompt pede "nome como se fala na academia", então a IA inventa variações. Na dieta, a regra do prompt é o padrão de nome da TACO com exemplos, sem a lista.

## 2. O que muda

1. **Listas públicas por link** (opção C escolhida pelo Yago): dois arquivos de texto publicados com o app no GitHub Pages, gerados a partir dos catálogos que o app já tem:
   - `https://yagoramires.github.io/pump/catalog/exercicios.txt` — os 876 exercícios, agrupados pelo primeiro músculo, `Nome (equipamento)` por linha.
   - `https://yagoramires.github.io/pump/catalog/alimentos.txt` — os 591 alimentos da TACO, um nome por linha.
   - Cada arquivo começa com uma linha dizendo o que é e como usar ("Use exatamente um destes nomes.").
   - Gerados por script a partir de `public/catalog/exercises.json` e `taco.json`, commitados, com teste que falha se o arquivo commitado divergir do gerado.
2. **Prompts usam as listas**: "Gerar com IA" (treino e dieta) e o novo "Converter" (treino e dieta) mandam a IA abrir o link e usar exatamente um nome da lista; só criar nome novo se nenhum servir; se não conseguir abrir o link, dizer isso antes de responder (em vez de inventar). O prompt da dieta mantém os exemplos de nome da TACO.
3. **Converter** no lugar do "Importar" (opção A):
   - Dieta: o botão "Importar" do estado vazio passa a "Converter" e a tela "Converter dieta" tem 3 passos: "1. Copie o prompt", "2. Mande pra sua IA junto com sua dieta (PDF, foto ou texto)", "3. Cole a resposta aqui" (texto ou arquivo, como hoje). Quem já tem o JSON pula pro 3.
   - Treino: hoje "Importar de IA" (montagem) e "Importar/exportar via IA" (Ajustes) abrem uma tela única com o prompt de gerar + colar. Passam a ser duas entradas: **"Gerar com IA"** (anamnese do treino + prompt de gerar, como hoje) e **"Converter"** (3 passos como na dieta, prompt de conversão, sem anamnese). Na montagem e nos Ajustes aparecem as duas; "Exportar" continua nos Ajustes onde já está.
   - O prompt de conversão só transcreve: não muda séries, repetições, cargas, descansos nem quantidades/gramas; troca o nome de cada exercício/alimento pelo equivalente da lista quando existir; o que não tiver equivalente mantém o nome original. Responde só com o JSON do formato Pump (mesmo formato e validações de hoje).
4. **Revisão mostra o que ficou fora**: no treino, "N exercícios sem prévia (fora do catálogo)" com os nomes; na dieta, a contagem de itens fora da TACO que já existe passa a listar os nomes. Dá pra salvar mesmo assim.

## 3. Fora do escopo

- Busca por semelhança no app (nome errado da IA continua virando exercício próprio).
- Ler PDF/foto dentro do app (quem lê é a IA da pessoa).

## 4. Testes

- Listas: arquivo commitado igual ao gerado; contém todos os nomes; agrupamento por músculo; cabeçalho.
- Prompts: contêm o link certo, a regra de usar nome exato e o aviso de link inacessível; conversão diz para não alterar números; dieta mantém exemplos TACO.
- UI: botões "Gerar com IA"/"Converter" nas entradas do treino e "Converter" na dieta; copiar o prompt certo em cada tela; revisão lista os nomes fora do catálogo/TACO.
