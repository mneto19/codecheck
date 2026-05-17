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
- correctness_score: baseia-te na FASE 1. Penaliza fortemente componentes em falta.
  * Output correto com código errado: máximo 40
  * Erro de execução: máximo 25
  * Código estruturalmente diferente mas output correto: máximo 50
- gerado_por_ia: true/false baseado na FASE 2
- grau_de_certeza: 0-100. Sê conservador — só marca true se tiveres evidências concretas.
- Se gerado_por_ia=true: correctness_score = 0 automaticamente

IMPORTANTE: Todos os campos de texto (motivo, logic_differences, style_notes, summary) devem ser escritos em português de Portugal. Usa vocabulário e ortografia de Portugal (não do Brasil).

Responde APENAS com um JSON array válido, sem markdown, sem texto extra.

Submissões:
[${items}]

Formato obrigatório:
[{"id":"...","correctness_score":0,"gerado_por_ia":false,"grau_de_certeza":0,"motivo":"...","logic_differences":["..."],"style_notes":["..."],"summary":"..."}]

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
      temperature: 0.1,
      max_tokens: 3000,
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
    const results = JSON.parse(clean);
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

module.exports = { compareCodeBatch };
