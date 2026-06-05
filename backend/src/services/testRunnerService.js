const { executeRaw } = require("./codeExecutionService");

// Linguagens onde a correção por testes (equivalência funcional) é suportada.
// Python e JS são dinâmicas e não compilam — chamar a função do aluno é trivial e robusto.
const TEST_SUPPORTED_LANGUAGES = ["PYTHON", "JAVASCRIPT"];

const CASE_MARKER = "___CC_CASE___";
const ERR_PREFIX = "___CC_ERR___";

function isTestSupported(language) {
  return TEST_SUPPORTED_LANGUAGES.includes(language);
}

// Extrai o nome da função principal do código (assinatura canónica definida na referência).
function extractFunctionName(code, language) {
  if (!code) return null;
  if (language === "PYTHON") {
    const m = code.match(/def\s+([A-Za-z_]\w*)\s*\(/);
    return m ? m[1] : null;
  }
  if (language === "JAVASCRIPT") {
    const m =
      code.match(/function\s+([A-Za-z_$][\w$]*)\s*\(/) ||
      code.match(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/) ||
      code.match(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*function/);
    return m ? m[1] : null;
  }
  return null;
}

// Constrói um programa que lê os inputs (JSON via stdin), chama a função para cada um
// e imprime o resultado delimitado por um marcador. Erros são capturados por caso.
function buildHarness(code, language, fn) {
  if (language === "PYTHON") {
    return `${code}

import sys as __cc_sys, json as __cc_json
try:
    __cc_data = __cc_json.loads(__cc_sys.stdin.read() or "[]")
except Exception:
    __cc_data = []
for __cc_args in __cc_data:
    print("${CASE_MARKER}")
    try:
        print(${fn}(*__cc_args))
    except Exception as __cc_e:
        print("${ERR_PREFIX}" + repr(__cc_e))
`;
  }
  // JAVASCRIPT (Node.js)
  return `${code}

;(function () {
  var __cc_raw = "";
  try { __cc_raw = require('fs').readFileSync(0, 'utf8'); } catch (e) {}
  var __cc_data = [];
  try { __cc_data = JSON.parse(__cc_raw || "[]"); } catch (e) {}
  for (var __cc_i = 0; __cc_i < __cc_data.length; __cc_i++) {
    console.log("${CASE_MARKER}");
    try { console.log(${fn}.apply(null, __cc_data[__cc_i])); }
    catch (__cc_e) { console.log("${ERR_PREFIX}" + String(__cc_e)); }
  }
})();
`;
}

function normalize(s) {
  return (s || "").replace(/\r\n/g, "\n").trim();
}

// Separa o output em blocos por marcador. O bloco 0 é o output próprio do aluno (ignorado).
function parseOutputs(output, count) {
  const parts = output.split(CASE_MARKER);
  const results = [];
  for (let i = 1; i <= count; i++) {
    if (i < parts.length) {
      const chunk = normalize(parts[i]);
      const errored = chunk.startsWith(ERR_PREFIX);
      results.push({
        output: errored ? chunk.slice(ERR_PREFIX.length) : chunk,
        errored,
      });
    } else {
      // Faltou este caso — o programa rebentou antes de lá chegar
      results.push({ output: null, errored: true });
    }
  }
  return results;
}

// Corre o código com cada conjunto de argumentos. inputs = [[arg1, arg2], [arg1], ...]
async function runCases(code, language, fn, inputs) {
  if (!fn || !inputs?.length) return [];
  const harness = buildHarness(code, language, fn);
  const { output } = await executeRaw(harness, language, JSON.stringify(inputs));
  return parseOutputs(output, inputs.length);
}

// Calcula os outputs esperados correndo a REFERÊNCIA do professor com os inputs criados.
// Descarta inputs onde a própria referência rebenta (input inválido) — assim a IA nunca
// define uma "resposta certa" errada; o esperado vem sempre do código de confiança.
async function computeExpectedFromReference(referenceCode, language, fn, inputs) {
  const results = await runCases(referenceCode, language, fn, inputs);
  const cases = [];
  inputs.forEach((input, i) => {
    const r = results[i];
    if (r && !r.errored && r.output !== null) {
      cases.push({ input, expected: r.output });
    }
  });
  return cases;
}

// Avalia o código do aluno contra os casos guardados. Devolve { score, passed, total, details }.
async function gradeAgainstCases(studentCode, language, fn, cases) {
  if (!fn || !cases?.length) return null;
  const inputs = cases.map((c) => c.input);
  const results = await runCases(studentCode, language, fn, inputs);

  let passed = 0;
  const details = cases.map((c, i) => {
    const r = results[i] || { output: null, errored: true };
    const ok = !r.errored && normalize(r.output) === normalize(c.expected);
    if (ok) passed++;
    return { input: c.input, expected: c.expected, got: r.output, ok };
  });

  return {
    score: Math.round((passed / cases.length) * 100),
    passed,
    total: cases.length,
    details,
  };
}

module.exports = {
  TEST_SUPPORTED_LANGUAGES,
  isTestSupported,
  extractFunctionName,
  runCases,
  computeExpectedFromReference,
  gradeAgainstCases,
};
