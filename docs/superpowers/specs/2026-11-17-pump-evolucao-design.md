# Pump: Evolução, fotos, conquistas e PDF (design)

Data: 2026-11-17 · Status: aprovado pelo Yago ("é isso, … começa")
Mockup aprovado: [`docs/design/evolucao-e-pdf.html`](../../design/evolucao-e-pdf.html), com 6 telas e 4 páginas de PDF.
Base: o produto ([`2026-11-16-pump-design.md`](2026-11-16-pump-design.md), §7.4 e §7.5) e o visual ([`2026-11-16-pump-redesign-ui-design.md`](2026-11-16-pump-redesign-ui-design.md)), que continuam valendo.

## 1. Intenção

Tirar a aba Evolução do "em breve" e entregar a pessoa acompanhando o próprio progresso:
- **Peso e medidas:** com % de gordura e gráficos.
- **Fotos:** de frente, lado e costas, com comparação antes/depois.
- **Conquistas:** pequenas, pra se sentir recompensada.
- **Histórico:** o que foi feito em cada dia.

Entram também duas ideias novas do Yago:
- **PDF de evolução:** um registro bonito, em várias seções, que a própria pessoa guarda no celular ou manda no WhatsApp. Ele compara a foto do dia zero com a atual e mostra os números.
- **"Enviar backup":** um botão claro pra mandar o backup pelo WhatsApp ou salvar em Arquivos.

## 2. Objetivos

1. **Registrar peso e medidas** com data. O % de gordura é calculado pela fórmula do gorgonoid (US Navy, com +2 no masculino), igual à spec do produto.
2. **Registrar um conjunto de fotos** (frente, lado e costas, cada uma opcional) com data:
   - câmera com silhueta-guia ou foto da galeria;
   - comparação de dois registros por ângulo.
3. **Tela principal da Evolução:**
   - números de destaque (peso, gordura, treinos);
   - gráfico de peso;
   - medidas;
   - fotos;
   - prévia das conquistas;
   - botões "Registrar" e "Gerar PDF".
4. **Conquistas de treino e evolução.** As de dieta e água ficam pra Fase 2, porque essa parte ainda não existe. Ao ganhar uma, aparece uma comemoração rápida, e existe uma estante com todas.
5. **Histórico:** calendário mensal com os dias de treino e de medidas. Tocar num dia mostra o que houve.
6. **PDF de evolução** com as seções do mockup, gerado no próprio celular e aberto na folha de compartilhar.
7. **Botão "Enviar backup (WhatsApp, Arquivos…)"** nas Configurações, usando a mesma folha de compartilhar.

## 3. Não-objetivos

- Dieta e água (Fase 2), e as conquistas que dependem delas.
- Editar ou corrigir treinos de dias passados pelo histórico, que só mostra.
- Servidor, conta ou nuvem. Também não haverá envio direto pro WhatsApp sem a folha de compartilhar, porque um app web não consegue.
- Histórico de versões do plano de treino (ver "sequências" em §6.4).

## 4. Anti-objetivos (falhou mesmo que funcione)

- **Perder ou corromper dados.** As fotos ficam só no aparelho e entram no backup. Restaurar um backup precisa trazer as fotos de volta.
- **Deixar o app pesado:** a biblioteca do PDF só carrega quando a pessoa toca em "Gerar PDF", e as fotos são reduzidas antes de guardar.
- **PDF feio ou genérico.** Ele precisa seguir o visual do Pump: fundo escuro, verde-limão, números grandes.
- **Conquista que dispara errado** ou comemora a mesma coisa duas vezes.

## 5. Restrições

- **Dados:** tudo local, no IndexedDB do idb-keyval, com o mesmo store compartilhado (`usePersisted`, que grava a partir do último valor salvo).
- **Visual:** segue o padrão do redesign, com tokens do Yield, shadcn, inputs ≥ 16px, alvos ≥ 44px, sem barras de rolagem e só ícones lucide.
- **Backup** continua na versão 1. Ele aceita as chaves novas, e backups antigos, que não têm essas chaves, continuam válidos.
- **Commits** sem coautoria. Push na `main` publica no Pages, por isso só com OK do Yago.

## 6. Como fica

### 6.1 Dados

- **`measurements: Measurement[]`**, com `Measurement = { id, date, weightKg?, neckCm?, waistCm?, hipCm?, armCm?, chestCm?, thighCm? }`. A `date` vem do `todayKey`.
  - Existe **uma por data**: registrar de novo no mesmo dia substitui *(chamada minha)*.
  - Salvar com peso também atualiza `profile.weightKg` *(chamada minha)*.
- **`photoSets: PhotoSet[]`**, com `PhotoSet = { id, date, frente?, lado?, costas? }`, em que cada ângulo é o id de uma foto.
  - Também existe um por data. Tirar outra foto do mesmo ângulo no mesmo dia substitui a anterior.
- **Fotos:** cada uma fica numa chave própria, `photo:<id>`, como data URL JPEG.
  - São reduzidas no aparelho até o lado maior ter 1280px, com qualidade 0.8 *(chamada minha)*.
  - Assim, salvar o resto não regrava megabytes a cada toque.
  - Apagar um registro apaga as fotos dele.
- **Conquistas não são guardadas:** são calculadas a partir dos dados. Só fica salvo `settings.seenAchievements?: string[]`, pra saber o que já foi comemorado.
- **Backup:**
  - `USER_KEYS` ganha `measurements` e `photoSets`;
  - o parser passa a aceitar chaves `photo:<id>` cujo valor seja uma string começando com `data:image/`. Qualquer outra coisa é rejeitada com "Backup com conteúdo desconhecido".
- **% de gordura:** `bodyFat(sex, heightCm, neckCm, waistCm, hipCm?)`, com as fórmulas exatas da spec do produto §7.4.
  - Masculino: `495 / (1.0324 − 0.19077·log10(cintura − pescoço) + 0.15456·log10(altura)) − 450 + 2`.
  - Feminino: `495 / (1.29579 − 0.35004·log10(cintura + quadril − pescoço) + 0.221·log10(altura)) − 450`.
  - Devolve `null` se faltar algum dado ou se o valor dentro do log for ≤ 0. Arredonda pra 1 casa.

### 6.2 Telas (detalhe no mockup)

1. **Evolução (aba)**
   - **Topo:** rótulo "Desde {data} · {N} dias" e o título.
   - **Números de destaque:**
     - Peso: o último, com a diferença pro primeiro.
     - Gordura: o último calculável, com a diferença em pontos.
     - Treinos: os concluídos, com a média por semana desde o primeiro.
     - A diferença aparece em verde se melhorou e em `text-2` se não. Sem dado, mostra "—".
   - **Cards:**
     - **Peso:** gráfico de linha em SVG próprio, sem biblioteca, com chips "30 d", "90 d" e "Tudo" *(chamada minha)*.
     - **Medidas:** primeiro → último por medida, com a diferença.
     - **Fotos:** o último registro em 3 miniaturas, mais "Comparar" e "Nova foto".
     - **Conquistas:** as ganhas mais recentes, mais "Ver todas".
     - **Histórico:** uma linha que abre o calendário.
   - **Botões embaixo:** "Registrar", que abre uma gaveta pra escolher entre "Medidas" e "Fotos" *(chamada minha)*, e "Gerar PDF".
   - **Estado vazio:** o `EmptyState` convida a registrar as primeiras medidas e fotos.
2. **Registrar medidas** (gaveta)
   - Data de hoje.
   - Campos: peso, pescoço, cintura, quadril (só no perfil feminino *(chamada minha)*), braço, peito e coxa, com unidade e vírgula decimal.
   - O % de gordura aparece na hora quando há dados.
   - "Salvar" grava. Campos vazios ficam de fora.
3. **Nova foto** (tela cheia)
   - Abas Frente, Lado e Costas.
   - Câmera ao vivo (`getUserMedia`) com a silhueta-guia por cima, troca entre a câmera da frente e a de trás, e um temporizador de 5 s opcional pra fotografar sozinho *(chamada minha)*.
   - Botões: disparar, Galeria (input de arquivo, que funciona mesmo sem câmera) e Pular.
   - Depois de cada ângulo, mostra a prévia com "Usar" e "Refazer".
   - **Sem permissão ou sem câmera:** fica só a galeria, com um aviso.
4. **Comparar**
   - Abas de ângulo, duas fotos lado a lado com a data em cima e a mais recente em verde.
   - Chips pra trocar o "Antes" e o "Depois", que abrem uma lista de registros numa gaveta.
   - Embaixo, as diferenças de peso, cintura e gordura entre as duas datas, usando a medida mais próxima de cada data.
5. **Conquistas:** estante de 3 por linha. As ganhas ficam em verde com a data. As bloqueadas aparecem apagadas, com o progresso ("falta 12").
6. **Histórico**
   - Calendário do mês com navegação ‹ ›.
   - Dias com treino concluído em `accent-bg`, dias com medida ou foto com um ponto, e hoje com contorno.
   - Tocar num dia lista o treino (nome, séries, volume e minutos via `sessionStats`), as medidas e as fotos daquele dia.
7. **Configurações**
   - "Exportar backup" vira **"Enviar backup"**, com o ícone `Share2`, o subtítulo "WhatsApp, Arquivos… · Último: …" e o mesmo `exportBackup`.

### 6.3 PDF de evolução

- **Ferramenta:** `@react-pdf/renderer`, importado sob demanda com `import()` quando a pessoa toca em "Gerar PDF", pra não pesar o carregamento do app *(chamada minha)*.
- **Formato:** páginas A4 escuras (`#0b0c0d`), com o verde do Pump, a fonte padrão (Helvetica, que tem acentos do português) e rodapé "Gerado pelo Pump · n/N".
- **Seções** (as que não tiverem dados são puladas):
  1. **Capa:** a logo "pump.", "Relatório de evolução", o período (do primeiro registro até hoje), os dias de acompanhamento e quatro números grandes (peso, gordura, treinos, volume total em toneladas).
  2. **Antes e depois:** o primeiro registro de fotos contra o mais recente, um par por ângulo que existir nos dois, com até 2 pares por página.
  3. **Corpo:** gráfico do peso (Svg do react-pdf) e tabela das medidas e da gordura (início → atual, com a diferença), com a nota "% de gordura: estimativa (US Navy)".
  4. **Treino:** treinos concluídos, média por semana, as 5 maiores evoluções de carga por exercício (primeira → maior) e as conquistas do período.
- **Saída:** o arquivo `pump-evolucao-YYYY-MM-DD.pdf` vai pela folha de compartilhar (`navigator.share` com arquivo). Se não der, faz download. Enquanto gera, o botão mostra "Gerando…". Se der erro, aparece um toast.

### 6.4 Conquistas (cálculo)

Uma função pura `computeAchievements(data, today)` devolve `{ id, title, earnedAt?, progress? }`.

**Lista:**
- **Treino:**
  - primeiro treino;
  - 3, 7 e 30 treinos seguidos;
  - 10, 50 e 100 treinos;
  - recorde de carga.
- **Evolução:**
  - primeira foto;
  - −1 kg e −5 kg em relação à primeira pesagem;
  - −1 ponto de gordura em relação ao primeiro cálculo.

**Regras:**
- **Seguidos:** contam os dias de treino do plano atual.
  - Um dia sem treino previsto não quebra a sequência.
  - Um dia de treino previsto sem sessão concluída quebra. Hoje ainda não conta como falta.
  - Treinar num dia não previsto também soma.
  - Limite: usa os dias do plano **atual** pra todo o passado *(chamada minha; não existe histórico do plano)*.
- **Recorde:** é ganho no primeiro dia em que uma sessão concluída supera a maior carga anterior de um exercício que já tinha sessão antes.
- **`earnedAt`:** é a primeira data em que a condição foi atingida.
- **Comemoração:** ao abrir a Evolução, ou depois de concluir um treino ou salvar medidas e fotos, cada conquista ganha que não está em `seenAchievements` aparece num toast "Conquista: {título}". Depois disso, ela é marcada como vista.
  - Na primeira vez que o recurso roda, as conquistas já existentes são marcadas como vistas **sem** toast, pra não chover comemoração *(chamada minha)*.

## 6.5 Detalhes resolvidos depois da revisão (chamadas minhas)

- **Recorde de carga** é **uma** conquista só, ganha no primeiro recorde. Não existe uma por exercício. São 12 conquistas no total; o "6 de 14" do mockup era ilustrativo.
- **Direção de "melhorou"** segue o objetivo da anamnese (`profile.anamnesis.goal`):
  - **Hipertrofia ou força:** peso, braço, peito e coxa subindo é verde, e as conquistas de peso viram **+1 kg** e **+3 kg**.
  - **Emagrecer, saúde ou sem objetivo:** peso, cintura e quadril descendo é verde, e as conquistas são −1 kg e −5 kg.
  - Gordura descendo é sempre verde, e a conquista de gordura é sempre −1 ponto.
- **Registrar de novo no mesmo dia** **junta campo a campo**:
  - a gaveta abre já preenchida com os valores de hoje;
  - apagar um campo e salvar remove aquele valor;
  - um registro sem nenhum valor é apagado.
- **Apagar registros:** no detalhe do dia, no Histórico, cada medida e cada registro de fotos tem "Apagar", com confirmação (AlertDialog). Apagar um registro de fotos apaga as chaves `photo:<id>` dele. Corrigir um dia passado é apagar e registrar de novo hoje; registrar em data passada fica fora.
- **`seenAchievements`** viaja dentro de `settings` no backup. Restaurar não comemora de novo o que já foi visto, e a supressão da primeira vez só vale quando o campo não existe.
- **PDF no iOS:** gerar demora e pode passar do tempo em que o iPhone aceita abrir a folha de compartilhar. Por isso, ao terminar, o botão vira **"Compartilhar PDF"** (um segundo toque abre a folha), com download se não houver suporte.

## 7. Abordagens consideradas pro PDF

| | Abordagem | Prós | Contras |
|---|---|---|---|
| **A (escolhida)** | `@react-pdf/renderer` sob demanda | PDF de verdade (texto nítido, vetorial), feito com componentes React, fotos e Svg | Biblioteca grande (~400 KB), carregada só ao gerar |
| B | `jsPDF` desenhando à mão | Leve | Layout trabalhoso, fácil de ficar feio |
| C | `html2canvas` + jsPDF | Reaproveita o HTML | Texto em imagem (borrado), pesado e lento no celular |
| D | Imprimir a página (`window.print`) | Zero dependência | No app instalado do iPhone, imprimir e compartilhar é desajeitado, sem controle das páginas |

## 8. Deixado pro builder

- Divisão em componentes e arquivos (sugestão: pasta `src/evolution/`) e o desenho exato do gráfico e da silhueta.
- Animação da comemoração (o toast basta).
- Textos curtos dos estados vazios e avisos.

## 9. Verificação

- **Testes:** `bun run test`, `bun run build` e `bun run lint` verdes, com testes para:
  - fórmula da gordura;
  - cálculo de conquistas (sequência com folga, recorde, −1 kg, primeira foto);
  - registro no mesmo dia substituindo;
  - backup aceitando `photo:` e recusando valor inválido;
  - restauração trazendo as fotos de volta.
- **Bundle:** o carregamento inicial não cresce com a biblioteca do PDF (ela vai num chunk separado).
- **Prints no Playwright** a 390×844 das telas, comparados com o mockup, e um PDF de exemplo gerado com dados fictícios, conferido visualmente.
- **Publicação:** só com o OK do Yago.
