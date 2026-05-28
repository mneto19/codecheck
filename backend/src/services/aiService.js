const axios = require("axios");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

async function compareCodeBatch(submissions) {
  const items = submissions
    .map(
      (s) =>
        `{"id":"${s.id}","lang":"${s.language}","enunciado":${JSON.stringify(s.promptText || "")},"ref":${JSON.stringify(s.referenceCode)},"ref_output":${JSON.stringify(s.referenceOutput || "")},"code":${JSON.stringify(s.studentCode)},"student_output":${JSON.stringify(s.executionOutput || "")},"error":${JSON.stringify(s.executionError || "")},"constraint":"${s.outputConstraint || "SEM_OUTPUT"}"}`
    )
    .join(",\n");

  const systemMessage = `És um professor universitário de programação e auditor de integridade académica português.
A tua prioridade é analisar o CÓDIGO em si — a sua lógica, estrutura e autenticidade.
O output de execução é informação secundária: um aluno pode obter o output correto por acidente ou com código completamente diferente do esperado.
Sê rigoroso, aprofundado e cético. Quando tiveres dúvida, escolhe o score mais baixo.
Responde SEMPRE em português de Portugal (não em inglês, não em português do Brasil).`;

  const prompt = `Para cada submissão, faz uma análise aprofundada em duas fases:

FASE 1 — AVALIAÇÃO DO CÓDIGO (prioridade máxima):
Lê primeiro o enunciado ("enunciado") para perceber o que era pedido ao aluno.
Compara linha a linha o código do aluno ("code") com o código do professor ("ref").
Identifica todos os componentes lógicos do código de referência (estruturas, algoritmos, condições, chamadas).
Verifica quais estão presentes, ausentes ou implementados de forma diferente no código do aluno.
O output ("student_output" vs "ref_output") é apenas um sinal adicional — NÃO é determinante.
Um output correto com código errado ou plagiado NÃO merit nota alta.

FASE 2 — DETEÇÃO DE IA (análise obrigatória para TODAS as submissões):
Independentemente da correção do código, analisa em profundidade se o código tem indícios de ser gerado por IA:
  * Tratamento de erros não pedido (try/except, validações desnecessárias)
  * Comentários explicativos excessivos ou enciclopédicos
  * Uso de métodos avançados não lecionados no contexto do exercício
  * Estrutura excessivamente limpa e perfeita para o nível esperado
  * Código genérico demais que resolve mais do que o pedido no enunciado
  * Nomes de variáveis demasiado descritivos (ex: "result_value" em vez de "res")
  * Docstrings ou type hints não solicitados

SCORING:
- correctness_score (0-100): baseia-te na FASE 1. Avalia APENAS a correção do código — de forma totalmente independente de qualquer suspeita de IA. Penaliza fortemente componentes em falta.
  * Output correto com código errado: máximo 40
  * Erro de execução: máximo 25
  * Código estruturalmente diferente mas output correto: máximo 50
  * Output que não corresponde ao esperado (incompleto ou diferente da referência): penaliza — significa que o aluno não respondeu totalmente ao pedido
- gerado_por_ia: true/false baseado na FASE 2. É um AVISO consultivo para o professor — NÃO influencia o correctness_score de forma alguma.
- grau_de_certeza: 0-100. Sê conservador — só marca true se tiveres evidências concretas.

IMPORTANTE: Todos os campos de texto (motivo, logic_differences, style_notes, summary) devem ser escritos em português de Portugal. Usa vocabulário e ortografia de Portugal (não do Brasil).

Responde APENAS com um objeto JSON válido, sem markdown, sem texto extra.

Submissões:
[${items}]

Formato obrigatório:
{"results":[{"id":"...","correctness_score":0,"gerado_por_ia":false,"grau_de_certeza":0,"motivo":"...","logic_differences":["..."],"style_notes":["..."],"summary":"..."}]}

motivo: indícios de IA encontrados ou "Sem indícios". Máx 200 caracteres, português de Portugal.
summary: resumo da avaliação. Máx 120 caracteres, português de Portugal.
logic_differences e style_notes: frases curtas em português de Portugal.`;

  const response = await axios.post(
    GROQ_URL,
    {
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt },
      ],
      temperature: 0,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      timeout: 30000,
    }
  );

  const text = response.data?.choices?.[0]?.message?.content || "";
  const clean = text.replace(/```json|```/g, "").trim();

  try {
    const parsed = JSON.parse(clean);
    // JSON mode devolve um objeto {"results":[...]}; tolera também um array directo
    const results = Array.isArray(parsed) ? parsed : parsed.results || [];
    return submissions.map((s) => {
      const r = results.find((res) => res.id === s.id);
      if (!r) return fallback(s.id);
      return r;
    });
  } catch {
    console.error("[Groq] falhou a fazer parse da resposta");
    return submissions.map((s) => fallback(s.id));
  }
}

function fallback(id) {
  return {
    id,
    correctness_score: null,
    gerado_por_ia: false,
    grau_de_certeza: 0,
    motivo: "",
    logic_differences: [],
    style_notes: [],
    summary: "Não foi possível analisar esta submissão.",
  };
}

// A IA sugere APENAS os inputs; os outputs esperados são calculados depois correndo a referência.
// Cada input é um array de argumentos pela ordem dos parâmetros da função.
async function generateTestInputs({ promptText, language, referenceCode, functionName }) {
  const systemMessage = `És um gerador de casos de teste para exercícios de programação.
Geras apenas os INPUTS (argumentos) para testar uma função — nunca os outputs.
Respondes sempre com JSON válido.`;

  const prompt = `Função a testar: ${functionName} (linguagem: ${language})
Enunciado: ${JSON.stringify(promptText || "")}
Código de referência do professor:
${referenceCode}

Gera entre 5 e 8 conjuntos de argumentos para testar esta função, cobrindo casos normais e casos-limite (vazios, zero, negativos, repetidos, etc.) que façam sentido para o enunciado.
EQUILÍBRIO: inclui uma mistura equilibrada de inputs que devem SATISFAZER a condição e inputs que NÃO a devem satisfazer. Se a função devolve True/False, mete aproximadamente metade de cada (ex: para palíndromos, tantos palíndromos como não-palíndromos). Não concentres os testes num só tipo de resultado — isso permite apanhar código que devolve sempre o mesmo valor.
Cada conjunto é um array com os argumentos pela ordem dos parâmetros da função.
Exemplos do formato: para uma função de 1 parâmetro → [["radar"], ["python"], [""]]; para 2 parâmetros → [[2,3],[10,-5]].
Usa apenas valores JSON (strings, números, booleanos, arrays, null). Não incluas a chamada à função, só os argumentos.

Responde APENAS com um objeto JSON: {"inputs": [[...], [...]]}`;

  const response = await axios.post(
    GROQ_URL,
    {
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 800,
      response_format: { type: "json_object" },
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      timeout: 20000,
    }
  );

  const text = response.data?.choices?.[0]?.message?.content || "";
  const clean = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);
  const inputs = Array.isArray(parsed) ? parsed : parsed.inputs || [];
  // Garante que cada input é um array de argumentos
  return inputs.filter((i) => Array.isArray(i));
}

module.exports = { compareCodeBatch, generateTestInputs };
