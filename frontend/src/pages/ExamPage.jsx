import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { useStudentStore } from "../store/authStore";
import { useSocket } from "../hooks/useSocket";
import { useTimer } from "../hooks/useTimer";
import { submissionApi } from "../services/api";
import { Button, Badge } from "../components/ui";

const LANG_MAP = {
  PYTHON: "python", JAVASCRIPT: "javascript", JAVA: "java",
  C: "c", CPP: "cpp", CSHARP: "csharp",
};

// Chave usada no sessionStorage para guardar o código do aluno por pergunta
// Formato: codecheck:code:<roomId>:<questionId>
const codeKey = (roomId, qid) => `codecheck:code:${roomId}:${qid}`;
const getCode = (key) => localStorage.getItem(key);
const setCode = (key, val) => localStorage.setItem(key, val);
const removeCode = (key) => localStorage.removeItem(key);

// Página principal do aluno durante o exame: editor de código, timer e submissão
export default function ExamPage() {
  const navigate = useNavigate();
  const { student, token, room, clearSession } = useStudentStore();
  const { socketRef, connected } = useSocket(token, student?.id);

  const [activeQuestion, setActiveQuestion] = useState(0);
  const [codes, setCodes] = useState({});
  const [results, setResults] = useState({});
  const [submitting, setSubmitting] = useState({});
  const [examRoom, setExamRoom] = useState(room);

  // Timer baseado no startedAt da sala
  const { formatted, remaining, expired } = useTimer(
    examRoom?.startedAt,
    examRoom?.timerSeconds
  );

  // Redireciona se não houver sessão ativa
  useEffect(() => {
    if (!student || !token || !room) navigate("/join", { replace: true });
  }, [student, token, room, navigate]);

  // Restaura código guardado em sessionStorage (caso o aluno tenha feito refresh)
  useEffect(() => {
    if (!room?.questions) return;
    const initial = {};
    room.questions.forEach((q) => {
      // Tenta recuperar do sessionStorage; fallback para string vazia
      const saved = getCode(codeKey(room.id, q.id));
      initial[q.id] = saved || "";
    });
    setCodes(initial);
  }, [room]);

  // Subscreve eventos de socket para sincronização em tempo real
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    // O docente iniciou o exame
    socket.on("room:started", ({ startedAt, timerSeconds }) => {
      setExamRoom((r) => ({ ...r, status: "ACTIVE", startedAt, timerSeconds }));
    });

    // O exame foi terminado (manualmente ou por timer)
    socket.on("room:finished", () => {
      setExamRoom((r) => ({ ...r, status: "FINISHED" }));
    });

    // Resultado da submissão (output de execução) enviado pelo worker
    socket.on("submission:result", ({ questionId, status, output, score, summary }) => {
      setResults((r) => ({ ...r, [questionId]: { status, output, score, summary } }));
    });

    return () => {
      socket.off("room:started");
      socket.off("room:finished");
      socket.off("submission:result");
    };
  }, [socketRef]);

  // Atualiza o código no estado e persiste em sessionStorage
  function handleCodeChange(questionId, value) {
    const newValue = value || "";
    setCodes((c) => ({ ...c, [questionId]: newValue }));
    // Persiste em sessionStorage para sobreviver a refreshes
    if (room) {
      setCode(codeKey(room.id, questionId), newValue);
    }
  }

  // Submete código para uma pergunta específica
  async function handleSubmit(questionId) {
    const code = codes[questionId];
    if (!code?.trim()) return;

    setSubmitting((s) => ({ ...s, [questionId]: true }));
    try {
      const res = await submissionApi.submit({ questionId, studentCode: code });
      setResults((r) => ({ ...r, [questionId]: res.data }));
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Erro ao submeter. Tenta novamente.";
      setResults((r) => ({
        ...r,
        [questionId]: { error: errorMsg, status: "Error" },
      }));
    } finally {
      setSubmitting((s) => ({ ...s, [questionId]: false }));
    }
  }

  // Aluno sai da sessão e limpa rascunhos guardados
  function handleLeave() {
    if (room?.questions) {
      // Remove rascunhos do sessionStorage
      room.questions.forEach((q) => {
        removeCode(codeKey(room.id, q.id));
      });
    }
    clearSession();
    navigate("/", { replace: true });
  }

  if (!student || !room) return null;

  const questions = room.questions || [];
  const currentQ = questions[activeQuestion];
  const isFinished = examRoom?.status === "FINISHED" || expired;
  const isWaiting = examRoom?.status === "WAITING";

  // Cor do timer muda à medida que o tempo se esgota
  const timerColor =
    remaining === null ? "text-ink-400" :
    remaining < 120 ? "text-danger" :
    remaining < 300 ? "text-warn" :
    "text-[#00c8ff]";

  return (
    <div className="min-h-screen bg-ink-950 flex flex-col">
      {/* Cabeçalho fixo */}
      <header className="border-b border-ink-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-white">
            Code<span className="text-[#00c8ff]">Check</span>
          </span>
          <span className="text-ink-700">|</span>
          <span className="font-mono text-sm text-ink-300">{room.name}</span>
          {/* Aviso visível quando o socket está desligado */}
          {!connected && !isFinished && (
            <span className="text-xs font-mono text-warn flex items-center gap-1.5 bg-warn/10 px-2 py-1 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-warn animate-pulse" />
              A reconectar...
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-sm text-ink-400">{student.nickname}</span>
          {isWaiting ? (
            <Badge color="blue">A aguardar início...</Badge>
          ) : isFinished ? (
            <Badge color="default">Exame terminado</Badge>
          ) : (
            <span className={`font-mono text-2xl font-bold tabular-nums ${timerColor}`}>
              {formatted}
            </span>
          )}
          <Button variant="ghost" onClick={handleLeave}>Sair</Button>
        </div>
      </header>

      {/* Alerta de tempo nos últimos 5 minutos */}
      {!isWaiting && !isFinished && remaining !== null && remaining > 0 && remaining <= 300 && (
        <div className={`px-6 py-2 text-center font-mono text-sm font-bold border-b shrink-0
          ${remaining <= 60
            ? "bg-danger/10 border-danger/30 text-danger animate-pulse"
            : "bg-warn/10 border-warn/30 text-warn"}`}>
          {remaining <= 60
            ? "⚠ Menos de 1 minuto! Submete o teu código agora."
            : "⚠ Menos de 5 minutos — verifica as tuas submissões."}
        </div>
      )}

      {/* Estado: à espera de início */}
      {isWaiting ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="pulse-acid w-4 h-4 rounded-full bg-[#00c8ff]" />
          <p className="font-mono text-ink-300 text-lg">
            A aguardar que o professor inicie o exame...
          </p>
          <p className="font-mono text-ink-600 text-sm">
            Sala: <span className="text-[#00c8ff]">{room.code}</span>
          </p>
        </div>
      ) : isFinished ? (
        // Estado: exame terminado
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="font-display text-3xl font-bold text-white">Exame concluído.</p>
          <p className="font-mono text-ink-400 text-sm">
            O professor irá analisar as tuas submissões.
          </p>
          <Button onClick={handleLeave} className="mt-4">Sair</Button>
        </div>
      ) : (
        // Estado: exame ativo, mostra editor e perguntas
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar com tabs de perguntas */}
          <div className="w-48 border-r border-ink-800 flex flex-col p-3 gap-1 shrink-0">
            <p className="text-xs font-mono text-ink-500 uppercase tracking-widest px-2 mb-2">
              Perguntas
            </p>
            {questions.map((q, i) => {
              const submitted = !!results[q.id];
              return (
                <button
                  key={q.id}
                  onClick={() => setActiveQuestion(i)}
                  className={`text-left px-3 py-2.5 rounded-lg text-sm font-mono transition-all flex items-center justify-between
                    ${activeQuestion === i
                      ? "bg-[#00c8ff]/10 text-[#00c8ff] border border-[#00c8ff]/30"
                      : "text-ink-400 hover:text-ink-200 hover:bg-ink-800"}`}
                >
                  <span>Pergunta {i + 1}</span>
                  {submitted && <span className="w-2 h-2 rounded-full bg-[#00c8ff] shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Área principal: enunciado, editor e output */}
          {currentQ && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Enunciado da pergunta */}
              <div className="border-b border-ink-800 px-6 py-4 shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono text-[#00c8ff] uppercase tracking-widest">
                    Pergunta {activeQuestion + 1}
                  </span>
                  <span className="text-xs font-mono text-ink-600">
                    &middot; {currentQ.language}
                  </span>
                </div>
                <p className="text-ink-100 text-sm leading-relaxed font-body">
                  {currentQ.promptText}
                </p>
              </div>

              {/* Editor Monaco ocupa o espaço disponível */}
              <div className="flex-1 overflow-hidden">
                <Editor
                  height="100%"
                  language={LANG_MAP[currentQ.language] || "python"}
                  value={codes[currentQ.id] || ""}
                  onChange={(v) => handleCodeChange(currentQ.id, v)}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineHeight: 22,
                    padding: { top: 16, bottom: 16 },
                    scrollBeyondLastLine: false,
                    readOnly: isFinished,
                  }}
                />
              </div>

              {/* Output da execução e botões de ação */}
              <div className="border-t border-ink-800 px-6 py-4 flex items-start gap-4 shrink-0 bg-ink-900">
                <div className="flex-1">
                  {results[currentQ.id] ? (
                    <div>
                      <p className="text-xs font-mono text-ink-400 uppercase tracking-widest mb-1">
                        Output do teu código &middot;{" "}
                        <span className={
                          ["Accepted", "Queued"].includes(results[currentQ.id].status)
                            ? "text-[#00c8ff]"
                            : "text-warn"
                        }>
                          {results[currentQ.id].status}
                        </span>
                      </p>
                      <pre className="text-sm font-mono text-ink-200 whitespace-pre-wrap max-h-24 overflow-auto">
                        {(() => {
                          const r = results[currentQ.id];
                          if (r.status === "Queued") return r.message || "A executar...";
                          if (r.output) return r.output;
                          if (r.error) return r.error;
                          if (r.status === "Accepted") return "Código executado sem erros.\nNão há output — adiciona print() para ver resultados.";
                          return "Sem output.";
                        })()}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-ink-600 text-xs font-mono">
                      Submete o código para ver o output. O teu código fica guardado entre refreshes.
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleSubmit(currentQ.id)}
                    loading={submitting[currentQ.id]}
                    disabled={isFinished || !codes[currentQ.id]?.trim()}
                  >
                    {results[currentQ.id] ? "Resubmeter" : "Submeter"}
                  </Button>
                  {activeQuestion === questions.length - 1 && (
                    <Button
                      variant="ghost"
                      onClick={handleLeave}
                      disabled={submitting[currentQ.id]}
                    >
                      Terminar e Sair
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}