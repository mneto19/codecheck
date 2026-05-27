const axios = require("axios");

const JDOODLE_URL = "https://api.jdoodle.com/v1/execute";

const LANGUAGE_MAP = {
  PYTHON:     { language: "python3",  versionIndex: "3" },
  JAVASCRIPT: { language: "nodejs",   versionIndex: "4" },
  JAVA:       { language: "java",     versionIndex: "4" },
  C:          { language: "c",        versionIndex: "5" },
  CPP:        { language: "cpp17",    versionIndex: "1" },
  CSHARP:     { language: "csharp",   versionIndex: "3" },
};

async function executeCode(sourceCode, language, stdin = "") {
  const lang = LANGUAGE_MAP[language] || LANGUAGE_MAP.PYTHON;

  const response = await axios.post(
    JDOODLE_URL,
    {
      clientId:     process.env.JDOODLE_CLIENT_ID,
      clientSecret: process.env.JDOODLE_CLIENT_SECRET,
      script:       sourceCode,
      stdin,
      language:     lang.language,
      versionIndex: lang.versionIndex,
    },
    { timeout: 15000 }
  );

  const data = response.data;
  const output = data.output || "";
  // Só marca erro por falha da API ou por assinaturas reais de erro de runtime/compilação.
  // Evita falsos positivos de programas que legitimamente imprimem a palavra "error".
  const errorSignatures = /Traceback \(most recent call last\)|SyntaxError|NameError|TypeError|ValueError|IndexError|KeyError|AttributeError|Exception in thread|Segmentation fault|error: |fatal error|Unhandled exception|ReferenceError/i;
  const hasError = data.statusCode !== 200 || errorSignatures.test(output);

  return {
    status: hasError ? "Runtime Error" : "Accepted",
    stdout: hasError ? "" : data.output || "",
    stderr: hasError ? data.output || "" : "",
  };
}

module.exports = { executeCode };
