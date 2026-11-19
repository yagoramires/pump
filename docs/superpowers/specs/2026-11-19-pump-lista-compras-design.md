# Pump · Lista de compras e ajustes da Evolução

Data: 2026-11-19 · Aprovado pelo Yago ("top isso")

## Lista de compras
- **Onde:** menu ⋯ da aba Dieta → "Lista de compras" (tela cheia, `Overlay`).
- **Período:** Semana / Mês (7 ou 30 dias), Tabs segmentadas.
- **Conta (proporcional, opção A escolhida pelo Yago):** cada refeição entra 1×/dia; as opções da refeição dividem os dias igualmente; com mais de um cardápio, os dias se dividem igualmente entre os cardápios. Quantidade de um item = gramas × dias ÷ (nº de opções da refeição × nº de cardápios), somada por alimento (mesmo `tacoId`, ou mesmo nome normalizado para itens sem TACO).
- **Itens:** em ordem alfabética; gramas ≥ 1000 viram kg com 1 casa (`4,2 kg`), abaixo disso `g` arredondado; quando todas as ocorrências do alimento têm porção caseira contável com a mesma unidade (ex.: "2 ovos", "1 unidade", "1 fatia"), mostra embaixo "≈ N <unidade>" (arredondado pra cima).
- **Marcar o comprado:** `Checkbox` por item, marcas salvas (sobrevivem a fechar o app) e "Limpar marcações".
- **Copiar lista:** copia em texto ("• Arroz, tipo 1, cozido — 4,2 kg (≈ …)"), com o padrão de copiar já existente (toast).
- **Visual:** componentes shadcn e convenções do app (TabHeader/BackHeader, Card, Checkbox, Tabs segmentadas, tokens de fonte).
- **Fora:** conversão cru×cozido; agrupar por seção do mercado (a TACO do app não tem categoria).

## Ajustes pedidos junto
- **Período do gráfico de Peso (Evolução):** opções **7 d / 30 d / 90 d / Tudo** (hoje 30/90/Tudo).
- **Hover:** ações de texto dentro de cartões (ex.: "Ver todas" em Conquistas, "Nova foto"/"Comparar") não podem ganhar caixa de fundo no hover — usar `variant="link"` (muda cor/sublinha, sem caixa, alinhado à borda do conteúdo). Itens não selecionados das Tabs segmentadas (30 d / 90 d / Tudo, ângulos, Semana/Mês) no hover mudam só a cor do texto, sem fundo; o fundo fica só no selecionado. Aplicar o mesmo critério em qualquer outra ação de texto em cabeçalho de cartão.
