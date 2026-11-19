import { HEADER } from './envelope'

export const listRule = (url: string, noun: string, detail: string, fallback: string) =>
  `Abra a lista em ${url} e use exatamente um nome dela para cada ${noun}${detail} ${fallback} Se não conseguir abrir o link, diga isso e me peça pra colar a lista aqui, em vez de inventar nomes.`

export const COPYABLE_JSON_RULE =
  'Na resposta final, entregue somente um único bloco de código Markdown com a linguagem `json`, como no exemplo, para eu copiar e colar no Pump. Inclua um objeto JSON válido e completo, sem comentários. Não escreva texto fora do bloco.'

export const aboutMe = (lines: string[]) => `Sobre mim:\n${lines.length ? lines.join('\n') : '- (ainda não contei nada)'}`

export const askFirst = (what: string, missing: string) =>
  `Senão, se faltar algo importante pra montar um bom ${what} (${missing}), me pergunte primeiro, tudo numa mensagem só, e espere minha resposta. Nessa hora não mande JSON.`

/** campos e exemplo de uma metade do arquivo, com o cabeçalho comum na frente */
export const formatSpec = (fields: string, exampleTitle: string, example: string) => `Formato:
- "formato": sempre "${HEADER.formato}".
- "versao": sempre ${HEADER.versao}.
${fields}

${exampleTitle}:
\`\`\`json
{
  "formato": "${HEADER.formato}",
  "versao": ${HEADER.versao},
${example}
}
\`\`\`

${COPYABLE_JSON_RULE}`

export const adjustPrompt = (what: string, rules: string[], json: string) => `Este é meu plano de ${what} no formato do app Pump. Em seguida eu digo o que quero mudar.

Regras:
${['Mude só o que eu pedir. O resto fica igual, inclusive o formato e os nomes dos campos.', ...rules, COPYABLE_JSON_RULE].map((r, i) => `${i + 1}. ${r}`).join('\n')}

Meu plano atual:
\`\`\`json
${json}
\`\`\`
`
