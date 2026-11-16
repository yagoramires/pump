# Pump — app web de treino e dieta (design)

Data: 2026-11-16 · Status: aprovado pelo Yago em 2026-11-16
Nome do app: **Pump** (escolha do Yago). Pasta: `~/Documents/personal-projects/pump`.

## 1. Intenção e porquê

Um app que a pessoa usa **na academia** pra ver e marcar o treino do dia, e **em casa** pra ver o que comer, acompanhar a evolução e se sentir recompensada pela constância.

É **web** porque instalar app nativo no iPhone exige pagar a Apple. Ele precisa parecer um app no celular: instalável na tela de início, em tela cheia e funcionando offline.

Não tem **conta nem banco de dados**. Os dados da pessoa ficam no navegador dela, e o app em si é só arquivos estáticos.

## 2. Objetivos

1. Montar o plano de treino e de dieta na primeira vez, partindo de um modelo pronto ou do zero, e com itens que a própria pessoa cria.
2. No dia a dia, abrir direto no treino ou na dieta de hoje, marcar o que fez e cronometrar o descanso.
3. Acompanhar a evolução: histórico diário, gráficos, peso, medidas, % de gordura e fotos.
4. Conquistas ("besteirinhas") que recompensam constância no treino, na dieta e na evolução.
5. Não perder os dados: app instalável (escapa da limpeza de 7 dias do Safari) + backup em arquivo.

## 3. Não-objetivos (v1)

- Conta, login, servidor, banco de dados.
- Importar ficha por foto ou PDF dentro do app. No lugar disso, existe o formato Pump pra usar com uma IA da própria pessoa (§7.6).
- Sincronizar com o Google Drive. Fica pra depois, como backup opcional na pasta escondida do Drive da própria pessoa.
- Vercel. Ela está no limite, então a hospedagem é o GitHub Pages (ver §11).
- Notificações push, social, compartilhamento, IA, cálculo automático de meta calórica.

## 4. Anti-objetivos (falhou mesmo que "funcione")

- A pessoa **perde o histórico sem aviso**.
- O treino de hoje **não abre sem internet** na academia.
- Usar o app no meio da série é lento: alvos de toque pequenos, muitos toques, coisas que exigem duas mãos.
- O visual fica genérico ou usa emojis. O visual é o **tema Grafite do NeyHub, com ícones de traço**.
- O app guarda no navegador coisas que não são da pessoa, como o catálogo inteiro (ver §8).

## 5. Restrições

- **Web app responsivo, pensado primeiro pro celular**, com interface em pt-BR.
- **PWA instalável e funcionando offline.** O código do app (JS/CSS/HTML) fica em cache pra abrir sem rede.
- **Dados só no navegador** (IndexedDB). Ao abrir, pedir `navigator.storage.persist()`.
- **Não guardar o catálogo no navegador.** Exercícios e alimentos vêm do site quando a pessoa monta ou edita o plano. Só os previews dos exercícios do plano atual ficam guardados.
- **Sem custo**: sem serviço pago e sem API paga.
- Commits sem coautoria do Claude. Não publicar nem dar push sem OK explícito do Yago.

## 6. Navegação e telas

Menu flutuante em pílula, embaixo da tela, com três ícones: **Treino (halter)**, **Evolução (gráfico, no meio)** e **Dieta (talheres)**. O app abre na aba do último uso *(chamada minha)*. As configurações e o backup ficam num ícone de engrenagem no topo *(chamada minha)*.

Referência visual aprovada: `docs/design/mockup-dia-a-dia-v2.html` (não é pixel-final, mas a estrutura e o tema foram aprovados).

### Tema Grafite (tokens do NeyKit, `neyhub/Sources/NeyKit/Theme.swift`)

| token | valor |
|---|---|
| bg | `#121315` |
| card | `#1a1b1f` (borda `#25272c`) |
| border | `#24262a` |
| text | `#d8d9dc` · strong `#fff` |
| muted / label | `#6e7179` / `#5d6068` |
| accent | `#c6ff3d` (texto sobre ele `#111111`) |
| destaque suave (timer) | fundo `#1c2410`, borda `#3c5214` |
| ghost | borda `#33363c`, texto `#9a9ca3` |
| selected | `#22242a` |
| raios | card 10px |

Ícones de traço no estilo Lucide. Fonte do sistema (`-apple-system`). Só tema escuro.

## 7. Funcionalidades

### 7.1 Primeira vez (montagem)

Um passo a passo em que dá pra pular qualquer etapa *(chamada minha)*:

1. **Perfil:** sexo e altura (pro % de gordura), peso atual.
2. **Treino:** a pessoa escolhe um plano pronto ou monta do zero.
   - Planos prontos *(a lista é chamada minha)*: Fullbody 3×/semana, AB, ABC, ABCD, Superior/Inferior. Ela ajusta o que quiser.
   - Do zero: cria treinos (A, B, C…) com nome, escolhe os exercícios no catálogo (com busca e filtro por músculo e aparelho) e define séries × repetições × carga e o descanso por exercício (padrão de 90 s, *chamada minha*).
   - Ela pode **criar um exercício próprio** com nome, grupo muscular e observação. Sem imagem na v1 *(chamada minha)*.
   - Para cada treino, indica em quais dias da semana faz *(chamada minha)*.
3. **Dieta:** a pessoa monta o cardápio, ou parte de um dos 3 modelos prontos *(chamada minha)*.
   - O cardápio tem refeições (nome + horário) com alimentos e a quantidade em gramas.
   - Há **um cardápio que vale todo dia** na v1 *(chamada minha)*.
   - Ela pode **criar um alimento próprio** informando kcal, proteína, carboidrato e gordura por 100 g.
   - A meta de calorias é opcional e digitada por ela *(chamada minha)*.
4. **Água:** liga ou desliga. A meta é ajustável, com sugestão inicial de 35 ml × peso *(chamada minha)*. Cada copo vale 250 ml, ajustável.

Ao salvar o plano, **o nome e os parâmetros de cada exercício e alimento usado são copiados pros dados da pessoa**. Assim o plano abre offline e não depende do catálogo.

Tudo isso pode ser editado depois, nas configurações e em cada aba.

### 7.2 Aba Treino (dia a dia)

- Mostra o treino do dia pelos dias da semana. Se hoje não tem treino, mostra "Descanso" e deixa escolher um treino manualmente *(chamada minha)*.
- Cada exercício mostra séries × reps × carga, uma miniatura do preview e tracinhos por série.
- **Preview:** tocar na miniatura abre o preview em tela maior, alternando as 2 fotos (início e fim do movimento) a cada ~1 s, com as instruções em pt-BR.
- **Marcar série:** um toque marca. Dá pra ajustar a carga ou as reps que de fato fez, e o valor real vai pro histórico.
- **Cronômetro de descanso:** começa sozinho ao marcar uma série, com o tempo do exercício. Dá pra pular ou somar 15 s. No fim, vibra onde houver suporte e toca um som curto *(chamada minha; o iOS não vibra pela web)*.
- **"Concluir treino"** é o check-in do dia. Salva o treino no histórico e verifica as conquistas.

### 7.3 Aba Dieta (dia a dia)

- No topo, as kcal do dia (feito/meta) em barra e os macros resumidos *(chamada minha)*. Abaixo, os copos de água, se estiver ligado, onde um toque soma ou tira um copo.
- As refeições do cardápio aparecem com horário e alimentos, cada uma com um círculo pra marcar como feita.
- **Saiu do plano:** dá pra trocar um alimento da refeição de hoje (sem mexer no cardápio) ou adicionar um extra. O total do dia mostra o que ela comeu de verdade.
  - Escolher no catálogo TACO usa internet. Sem rede, dá pra escolher entre os alimentos do plano, os criados pela pessoa e os **usados recentemente**, porque todo alimento usado é copiado pros dados dela *(chamada minha)*.

### 7.4 Aba Evolução

- **Histórico dia a dia** (calendário ou lista): treino feito (qual, cargas), refeições seguidas ou trocadas, kcal, água, peso do dia. Dá pra corrigir dias anteriores, por exemplo quando esqueceu de dar check-in *(chamada minha)*.
- **Gráficos:** peso, % de gordura, medidas, carga por exercício (a maior carga de cada sessão), treinos por semana, kcal e água por dia.
- **Peso e medidas:** a pessoa registra quando quiser o peso, pescoço, cintura e quadril (os usados no cálculo), além de braço, peito e coxa *(estes três são chamada minha)*.
- **% de gordura**: fórmula US Navy, **copiada do gorgonoid.com/bf** (decisão do Yago), em cm, `log10`:
  - Homem: `bf = 495 / (1.0324 − 0.19077·log10(cintura − pescoço) + 0.15456·log10(altura)) − 450 + 2`
  - Mulher: `bf = 495 / (1.29579 − 0.35004·log10(cintura + quadril − pescoço) + 0.221·log10(altura)) − 450`
  - O `+2` do masculino é ajuste do gorgonoid e fica. O resultado aparece como estimativa.
- **Fotos de progresso:** a pessoa tira ou escolhe uma foto, que fica com a data, e compara duas lado a lado. As fotos são redimensionadas no aparelho (lado maior de ~1280 px, JPEG) pra ocupar pouco espaço *(chamada minha)*.
- **Estante de medalhas:** as conquistas ganhas e as bloqueadas, que aparecem apagadas.

### 7.5 Conquistas

Ao ganhar uma, aparece uma comemoração rápida na tela. A lista inicial é chamada minha, aprovada pelo Yago:

- **Treino:** primeiro treino; 3, 7 e 30 treinos seguidos; 10, 50 e 100 treinos; recorde de carga num exercício.
  - "Seguidos" conta os dias de treino do plano: dia de descanso não quebra a sequência, faltar a um treino agendado quebra *(chamada minha)*.
- **Dieta:** dia 100% no plano; 7 dias seguidos seguindo a dieta; meta de água batida 7 dias seguidos.
- **Evolução:** primeira foto; −1 kg e −5 kg em relação ao primeiro peso; −1 ponto de % de gordura.

A lista fica num arquivo de dados, pra ser fácil acrescentar mais.

### 7.6 Formato Pump: importar e exportar plano via IA (pedido do Yago)

Não existe IA dentro do app. A pessoa usa a IA dela (ChatGPT etc.) com um formato padrão do app.

- **Formato:** JSON com chaves em português, no esquema `{ "formato": "pump-plano", "versao": 1, "treinos": [...], "dieta": {...} }`.
  - Cada treino tem `letra`, `nome`, `dias` (`"seg"`…`"dom"`) e `exercicios`.
  - Cada exercício tem `nome`, `series`, `reps` (texto), `cargaKg`, `descansoSeg` e `obs`.
  - A parte `dieta` entra na Fase 2. Até lá ela é ignorada, e o app avisa.
- **Copiar prompt pra IA:** copia um texto pronto que explica o formato, traz um exemplo e pede pra IA responder só o JSON. Serve pra transcrever a ficha do personal ou pra ajustar o plano atual.
- **Exportar plano no formato Pump:** copia ou baixa o plano atual pra pessoa entregar à IA ajustar.
- **Importar:** a pessoa cola o texto ou escolhe um arquivo. O app aceita o JSON mesmo dentro de um bloco de código da resposta.
  - O app valida e, se houver erro, lista os problemas em pt-BR.
  - Antes de importar, mostra um resumo: os treinos e quantos exercícios cada um tem.
  - Só depois de confirmar, substitui o plano.
- **Casamento com o catálogo:** pelo nome, sem diferenciar acento nem maiúscula. O que não casar vira exercício criado pela pessoa, e o resumo lista esses nomes *(chamada minha)*.
- **Precisa de internet** pra casar os nomes com o catálogo. Sem rede, o app avisa e não importa *(chamada minha)*.
- Fica nas Configurações e também como terceira opção na montagem: "Importar de uma IA".

## 8. Dados: o que fica onde

| O quê | Onde |
|---|---|
| Código do app | cache do service worker (pra abrir offline) |
| Catálogo de exercícios (~800) e alimentos (TACO) | JSON estático no site, buscado quando precisa (montar ou editar o plano, trocar alimento). O service worker **não** guarda esses arquivos; o cache HTTP normal do navegador não conta. |
| Previews (fotos) dos exercícios **do plano atual** | Cache API. Ao trocar o plano, sai o antigo e entra o novo. |
| Perfil, plano, histórico, água, medidas, fotos, itens criados, conquistas | IndexedDB |

### Backup

- **Exportar** baixa um arquivo `.json` com tudo, inclusive as fotos em base64, e o número de versão do formato *(chamada minha)*.
- **Importar** restaura o arquivo, substituindo os dados depois de uma confirmação.
- **Lembrete** pra fazer backup quando passar 14 dias sem um *(chamada minha)*.
- **Instalar**: quando o app abre no Safari sem estar instalado, aparece um aviso explicando "Compartilhar → Adicionar à Tela de Início" e por que isso protege os dados.
- **No iPhone, o Safari e o app instalado não compartilham dados.** Por isso, no iOS fora do modo instalado, a primeira tela é o convite pra instalar, antes da montagem. Dá pra "continuar no navegador mesmo assim", com o aviso de que os dados não passam sozinhos pro app instalado. Se já houver dados no Safari, o aviso oferece exportar o backup pra importar no app instalado *(chamada minha)*.

## 9. Fontes de conteúdo

- **Exercícios:** [free-exercise-db](https://github.com/yuhonas/free-exercise-db), domínio público, ~800 exercícios com 2 fotos cada.
  - **Tudo traduzido pra pt-BR**: nome, músculos, aparelho e instruções (pedido do Yago). O Claude traduz durante a construção, em lotes, com um glossário fixo de músculos e aparelhos pra manter os termos iguais, e salva no JSON do repositório. O Yago revisa por amostragem, sem travar a v1.
  - As fotos são carregadas do repositório original via jsDelivr, fixadas num commit *(chamada minha; dá pra trocar por hospedar junto)*.
- **Alimentos:** tabela TACO (NEPA/UNICAMP), já em português, com kcal e macros por 100 g, convertida pra JSON uma vez.

## 10. Tecnologia (chamada minha, aprovada pelo Yago)

React + TypeScript + Vite, como PWA. IndexedDB e repositório público no GitHub do Yago (provável `yagoramires/pump`, confirmar no primeiro push).

O builder escolhe a lib de gráficos, a de IndexedDB e a de PWA, preferindo as menores.

## 11. Hospedagem: GitHub Pages (decisão do Yago)

O desenvolvimento roda local (`vite`). O **iPhone só instala o PWA e roda o service worker em HTTPS**, então a v1 é publicada no **GitHub Pages** (grátis) desde o começo, pra testar no aparelho de verdade. Isso exige configurar o `base` do Vite e o escopo do service worker pro caminho do Pages (`/<repo>/`), e publicar por GitHub Actions.

**A v1 só está pronta depois de testar no iPhone instalado**: abre o treino de hoje em modo avião, os previews do plano aparecem offline, e o backup exporta e importa. O Yago aprovou subir o repositório público pro Pages. O nome do repo é confirmado com ele na hora do primeiro push.

## 12. Deixado pro builder

- O modelo de dados exato e a estrutura de pastas.
- O conteúdo dos planos de treino prontos e dos 3 cardápios modelo, que devem ser sensatos e comuns no Brasil.
- Animações, a comemoração das conquistas e os estados vazios, sempre dentro do tema Grafite.
- Como fazer a busca no catálogo.
- O texto das telas, que deve ser curto, em pt-BR e direto.
