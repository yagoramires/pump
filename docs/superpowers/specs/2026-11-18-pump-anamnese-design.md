# Pump · Anamnese inicial única e check-in semanal

Data: 2026-11-18 · Mockup: `docs/design/anamnese.html` (aprovado pelo Yago)

## 1. Problema

Hoje o perfil (sexo, altura, peso) é pedido na montagem, mas o resto se repete: a idade e as observações aparecem em "Gerar com IA" do treino, e os horários e o objetivo em "Gerar com IA" da dieta. O peso fica duplicado no perfil e nas medidas da Evolução. A Evolução só começa quando a pessoa lembra de abrir a gaveta de medidas, e nada pede a atualização semanal.

## 2. O que muda

1. A montagem vira 5 passos: **Sobre você → Objetivos → Dia zero → Treino → Dieta**.
2. As perguntas comuns aos dois são feitas uma vez (passos 1 e 2). Cada "Gerar com IA" pergunta só o que é dele.
3. A Evolução começa no passo 3 (dia zero), e toda semana o app pede peso, medidas e fotos num dia fixo.
4. Objetivo da alimentação e foco do treino são separados, e um não entra no prompt do outro.
5. O peso mora só nas medidas da Evolução.

## 3. Montagem (quem abre o app pela primeira vez)

Barra de progresso com 5 traços (o componente `Steps` atual cresce de 2 para 5).

**Passo 1 · Sobre você**
- Sexo (obrigatório), idade, altura (obrigatória), horários de acordar, treinar e dormir (`HH:MM`), dias de treino por semana (1–7), "Lesões, limitações ou observações".
- "Continuar" e "Restaurar backup" (o restaurar sai daqui, como hoje). Restaurar um backup conclui a montagem como hoje.

**Passo 2 · Objetivos**
- "Objetivo da alimentação": Perder rápido / Perder peso / Manter / Ganhar peso / Ganhar rápido. Opcional, sem padrão.
- "Foco do treino": Hipertrofia (padrão) / Força / Condicionamento.
- Texto de apoio do mockup embaixo de cada grupo.

**Passo 3 · Dia zero**
- Peso (obrigatório). Medidas opcionais (os campos de `FIELDS` sem o peso). Quando há pescoço e cintura (e quadril no feminino), mostra "Gordura estimada: X%" com `bodyFat`.
- Fotos opcionais frente/lado/costas, reaproveitando a captura da Evolução.
- "Atualizar toda semana na": D S T Q Q S S, com o dia de hoje marcado.
- "Continuar" grava a medição de hoje (via `upsertMeasurement`), as fotos e o dia do check-in.

**Passo 4 · Treino** — igual ao passo de treino atual (modelos, Gerar com IA, Do zero, Importar, Pular por agora).

**Passo 5 · Dieta** — Gerar com IA / Do zero / Importar / Pular por agora, abrindo os mesmos fluxos da aba Dieta vazia. Terminar ou pular conclui a montagem (`onboardingDone`, `firstUseAt`).

"Voltar" nos passos 2–5 volta um passo sem perder o que foi preenchido.

## 4. Quem já usa

- Na aba Evolução, uma vez: cartão "Complete sua anamnese · 3 passos rápidos. O que você já respondeu vem preenchido." com botão "Completar" e um × que esconde de vez.
- "Completar" abre os passos 1–3 em tela cheia, preenchidos com o que já existe (perfil, anamneses antigas, última medição). No passo 3, se já houver medição hoje, ela vem preenchida; senão grava uma nova.
- Concluir ou fechar no × grava `settings.anamnesisAt` e o cartão some. Ninguém perde treino, dieta, histórico ou fotos.
- Usuário novo que passou pela montagem já tem `anamnesisAt`, então nunca vê o cartão.

## 5. Dados

`Profile` passa a ser:

```ts
type Focus = 'hipertrofia' | 'forca' | 'condicionamento'
interface Profile {
  sex: Sex; heightCm: number
  age?: number; wake?: string; train?: string; sleep?: string
  daysPerWeek?: number; notes?: string
  dietGoal?: DietGoal; focus?: Focus
  anamnesis?: Anamnesis        // só treino: level, place, split, extras, weak, minutes
  dietAnamnesis?: DietAnamnesis // só dieta: meals, restrictions, avoid, eatOut, notes
}
```

- Saem do `Profile`: `weightKg`. Saem do `Anamnesis`: `goal`, `age`, `daysPerWeek`, `notes`. Saem do `DietAnamnesis`: `goal`, `wake`, `train`, `sleep` (`goal` deixa de ser obrigatório porque sai).
- `Settings` ganha `checkInDay?: number` (0 = domingo … 6 = sábado, como `Date.getDay`) e `anamnesisAt?: string` (`todayKey`).

**Migração** (uma função pura de perfil, aplicada na leitura dos dados e no import de backup, idempotente):
- `anamnesis.age/daysPerWeek/notes` e `dietAnamnesis.wake/train/sleep` sobem para o perfil.
- `dietGoal` = `dietAnamnesis.goal`; se não houver: treino `emagrecer` → `perder`, `hipertrofia` → `ganhar`, os outros ficam sem objetivo.
- `focus`: `hipertrofia`/`emagrecer` → `hipertrofia`, `forca` → `forca`, `saude` → `condicionamento`; sem objetivo → nenhum (o padrão hipertrofia só é aplicado no formulário).
- `weightKg > 0` sem nenhuma medição de peso vira uma medição de peso datada de `firstUseAt` (ou hoje). Depois disso `weightKg` é removido.
- Backups antigos continuam importando; o formato do arquivo não muda de versão.

## 6. Evolução

- `goalDirection(profile)` passa a olhar só `dietGoal`: `perder*` → `loss`, `ganhar*` → `gain`, `manter` ou vazio → `null`.
- Com `null`: o peso fica em cor neutra (nem verde nem vermelho) na aba, no comparar fotos, no resumo semanal e no PDF; as conquistas de peso (`weight-small`, `weight-big`) não aparecem nem contam no total. Medidas também ficam neutras.
- O peso do Perfil nos Ajustes passa a vir da última medição.
- A gaveta de medidas para de gravar `profile.weightKg`.

## 7. Check-in semanal

- **Quando está pendente:** existe pelo menos uma medição de peso, `checkInDay` está definido, hoje é o dia do check-in desta semana ou depois (semana Dom–Sáb, `weekStart`) e não há medição de peso datada desse dia em diante.
- **Como aparece:** ponto na aba Evolução da barra de navegação e o cartão "Atualizar semana · Hoje é {dia}, seu dia de atualizar." (ou "Era {dia}, …" se já passou) no topo da aba Evolução. Fica até fazer. Sem notificação push.
- **Fluxo:** peso e medidas (a gaveta de medidas atual) → fotos (pode pular) → resumo.
- **Resumo "Semana N"** (N = semanas desde a primeira medição de peso, começando em 1): variação de peso desde a medição anterior em destaque, peso atual, linhas de medidas que mudaram e gordura, fotos tiradas ("3 de 3"), "Desde o dia zero: X kg em N semanas", botões "Pronto" e "Comparar fotos". Cores pelo `goalDirection`.
- `checkInDay` muda nos Ajustes (linha no Perfil). Quem já usa e não tem `checkInDay` ganha o dia ao completar a anamnese; sem ele, não há check-in.

## 8. Prompts

**Dieta** leva: sexo, idade, altura, peso da última medição, % de gordura (US Navy via `bodyFat`, da última medição com os campos necessários; omitido se faltar), massa magra = peso × (1 − %gordura), medidas atuais, tendência ("−1,2 kg nas últimas 4 semanas", da medição mais antiga dentro de 28 dias até a última; omitida com menos de duas medições), objetivo da alimentação, horários de acordar/treinar/dormir, observações do perfil e a anamnese da dieta. **Não leva** o foco do treino (sai a linha "Objetivo no treino").

**Treino** leva: sexo, idade, altura, foco do treino, dias por semana, observações do perfil e a anamnese do treino (nível, onde treina, divisão, pontos fracos, extras, tempo por treino). **Não leva** objetivo da alimentação, peso, gordura ou medidas.

Os formulários de "Gerar com IA" perdem os campos que foram para o perfil (idade, dias por semana, lesões no treino; objetivo e horários na dieta). Se o perfil não tiver um desses dados, a pessoa edita no Perfil; o "Gerar com IA" não pergunta de novo.

## 9. Ajustes

A linha "Perfil" abre os passos 1 e 2 juntos numa tela (Sobre você + Objetivos) e o dia do check-in. O subtítulo mostra "{peso da última medição} kg · {altura} cm".

## 10. Fora do escopo

- Notificação push ou lembrete fora do app.
- Lembrete por e-mail/WhatsApp.
- Recalcular automaticamente a dieta quando o peso muda.
- Treinos do Apple Watch (tarefa separada).

## 11. Testes

- Migração: perfis e backups antigos de cada combinação (com/sem dieta, cada objetivo de treino, com/sem `weightKg`, já com medição) e idempotência.
- `goalDirection` com cada objetivo e vazio; conquistas de peso somem com `null`; golden da evolução atualizado só onde a regra mudou.
- Check-in pendente: antes do dia, no dia, depois do dia, já feito, virada de semana, sem dia definido, sem medição.
- Montagem: os 5 passos, voltar sem perder dados, peso obrigatório, restaurar backup no passo 1.
- Prompts: dieta com e sem gordura/tendência, sem foco do treino; treino sem objetivo da alimentação nem peso.
