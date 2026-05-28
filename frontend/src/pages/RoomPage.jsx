import { useState, useEffect, lazy, Suspense } from "react";
import { useParams, Link } from "react-router-dom";
import { roomApi, questionApi } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { useSocket } from "../hooks/useSocket";
import { useTimer } from "../hooks/useTimer";
import { Button, Card, Badge, Spinner } from "../components/ui";
import { LANG_MAP, STATUS_PT, STATUS_COLOR } from "../constants";

const Editor = lazy(() => import("@monaco-editor/react"));

// Página de gestão da sala: adicionar perguntas, iniciar exame, monitorizar alunos
export default function RoomPage() {
  const { id } = useParams();
  useAuthStore(); // garante que o store está iniciado
  const { socketRef, connected } = useSocket(null); // professor autentica via cookie httpOnly

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [progress, setProgress] = useState({});
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [qForm, setQForm] = useState({
    promptText: "",
    referenceCode: "# Escreve aqui o código de referência\n",
    language: "PYTHON",
    orderIndex: 0,
  });
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);

  // Correção por testes (só Python/JS): inputs gerados pela IA, outputs vindos da referência
  const [genTests, setGenTests] = useState(null); // array de { inputText, expected } ou null
  const [functionName, setFunctionName] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const testsSupported = qForm.language === "PYTHON" || qForm.language === "JAVASCRIPT";

  // Hook do timer baseado em room.startedAt
  const { formatted, remaining } = useTimer(room?.startedAt, room?.timerSeconds);

  // Carrega dados iniciais da sala
  useEffect(() => {
    roomApi.get(id).then((r) => {
      setRoom(r.data);
      setStudents(r.data.students || []);
      setQForm((f) => ({ ...f, orderIndex: r.data.questions?.length || 0 }));
      setLoading(false);
      document.title = `${r.data.name} — CodeCheck`;
    }).catch(() => setLoading(false));
  }, [id]);

  // Eventos de socket após carregar a sala
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !room) return;

    // Emite teacher:join a cada reconexão para manter o canal privado ativo
    const joinChannel = () => socket.emit("teacher:join", room.id);
    joinChannel();
    socket.on("connect", joinChannel);

    socket.on("student:joined", (student) => {
      setStudents((prev) => [...prev.filter((s) => s.id !== student.id), student]);
    });

    socket.on("submission:evaluated", (data) => {
      setSubmissions((prev) => ({
        ...prev,
        [`${data.studentId}:${data.questionId}`]: data,
      }));
    });

    socket.on("room:finished", () => {
      setRoom((r) => ({ ...r, status: "FINISHED" }));
    });

    socket.on("submission:progress", ({ studentId, questionId, status }) => {
      setProgress((prev) => ({ ...prev, [`${studentId}:${questionId}`]: status }));
    });

    return () => {
      socket.off("connect", joinChannel);
      socket.off("student:joined");
      socket.off("submission:evaluated");
      socket.off("room:finished");
      socket.off("submission:progress");
    };
  }, [socketRef, room]);

  function resetForm() {
    setQForm({
      promptText: "",
      referenceCode: "# Escreve aqui o código de referência\n",
      language: "PYTHON",
      orderIndex: (room?.questions?.length || 0) + 1,
    });
    setGenTests(null);
    setFunctionName(null);
    setGenError("");
  }

  // Gera testes automaticamente: a IA sugere inputs, a referência dá os outputs esperados
  async function handleGenerateTests() {
    setGenerating(true);
    setGenError("");
    try {
      const res = await questionApi.generateTests({
        promptText: qForm.promptText,
        referenceCode: qForm.referenceCode,
        language: qForm.language,
      });
      setFunctionName(res.data.functionName);
      setGenTests(
        res.data.testCases.map((c) => ({
          inputText: JSON.stringify(c.input),
          expected: c.expected,
        }))
      );
    } catch (err) {
      setGenError(err.response?.data?.error || "Não foi possível gerar os testes.");
    } finally {
      setGenerating(false);
    }
  }

  function updateTest(i, field, value) {
    setGenTests((t) => t.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  }
  function removeTest(i) {
    setGenTests((t) => t.filter((_, idx) => idx !== i));
  }
  function addTest() {
    setGenTests((t) => [...(t || []), { inputText: "[]", expected: "" }]);
  }

  // Adiciona uma nova pergunta à sala
  async function handleAddQuestion(e) {
    e.preventDefault();

    // Converte os testes editados (inputText JSON → array). Bloqueia se algum JSON for inválido.
    let testCases;
    if (genTests?.length) {
      try {
        testCases = genTests.map((row) => ({
          input: JSON.parse(row.inputText),
          expected: row.expected,
        }));
      } catch {
        setGenError("Há um input com JSON inválido. Corrige antes de guardar (ex: [\"radar\"]).");
        return;
      }
    }

    setSaving(true);
    try {
      const res = await questionApi.create({
        ...qForm,
        roomId: id,
        orderIndex: Number(qForm.orderIndex),
        functionName: testCases ? functionName : undefined,
        testCases,
      });
      setRoom((r) => ({ ...r, questions: [...(r.questions || []), res.data] }));
      resetForm();
      setShowQuestionForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteQuestion(qid) {
    if (!confirm("Eliminar pergunta?")) return;
    try {
      await questionApi.delete(qid);
      setRoom((r) => ({ ...r, questions: r.questions.filter((q) => q.id !== qid) }));
    } catch {
      // servidor recusou — não atualiza estado local
    }
  }

  async function handleStart() {
    if (!confirm("Iniciar o exame? O timer começa imediatamente.")) return;
    setStarting(true);
    try {
      const res = await roomApi.start(id);
      setRoom(res.data);
    } finally {
      setStarting(false);
    }
  }

  // Termina o exame antecipadamente
  async function handleFinish() {
    if (!confirm("Terminar o exame antecipadamente?")) return;
    const res = await roomApi.finish(id);
    setRoom(res.data);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // Cor do timer muda nos últimos 5 minutos
  const timerColor = remaining < 300 ? "text-danger" : "text-[#00c8ff]";

  return (
    <div className="min-h-screen bg-ink-950">
      {/* Cabeçalho com nome da sala, estado e ações */}
      <header className="border-b border-ink-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-ink-400 hover:text-ink-200 font-mono text-sm">
            ← Dashboard
          </Link>
          <span className="text-ink-700">|</span>
          <h1 className="font-display text-lg font-bold text-white">{room.name}</h1>
          <Badge color={STATUS_COLOR[room.status]}>{STATUS_PT[room.status]}</Badge>
          {/* Indicador discreto do estado da ligação WebSocket */}
          {!connected && (
            <span className="text-xs font-mono text-warn flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-warn animate-pulse" />
              Sem ligação
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {room.status === "ACTIVE" && (
            <div className={`font-mono text-2xl font-bold tabular-nums ${timerColor}`}>
              {formatted}
            </div>
          )}
          {room.status === "WAITING" && (
            <Button onClick={handleStart} loading={starting} disabled={!room.questions?.length}>
              Iniciar exame
            </Button>
          )}
          {room.status === "ACTIVE" && (
            <Button variant="danger" onClick={handleFinish}>Terminar</Button>
          )}
          {room.status === "FINISHED" && (
            <Link to={`/rooms/${id}/results`}>
              <Button variant="outline">Ver resultados</Button>
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-3 gap-6">
        {/* Coluna esquerda: lista de perguntas */}
        <div className="col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-sm text-ink-300 uppercase tracking-widest">
              Perguntas ({room.questions?.length || 0})
            </h2>
            {room.status === "WAITING" && (
              <Button variant="ghost" onClick={() => {
                if (showQuestionForm) resetForm();
                setShowQuestionForm(!showQuestionForm);
              }}>
                {showQuestionForm ? "Cancelar" : "+ Adicionar"}
              </Button>
            )}
          </div>

          {/* Formulário de criação de pergunta */}
          {showQuestionForm && (
            <Card className="animate-fade-in">
              <form onSubmit={handleAddQuestion} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono text-ink-300 uppercase tracking-widest">
                    Enunciado
                  </label>
                  <textarea
                    rows={3}
                    className="bg-ink-700 border border-ink-600 rounded-lg px-4 py-2.5 text-ink-100 font-mono text-sm
                      placeholder:text-ink-500 focus:outline-none focus:border-[#00c8ff] resize-none transition-colors"
                    placeholder="Escreve uma função que..."
                    value={qForm.promptText}
                    onChange={(e) => setQForm({ ...qForm, promptText: e.target.value })}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono text-ink-300 uppercase tracking-widest">
                    Linguagem
                  </label>
                  <select
                    className="bg-ink-700 border border-ink-600 rounded-lg px-4 py-2.5 text-ink-100 font-mono text-sm
                      focus:outline-none focus:border-[#00c8ff] transition-colors"
                    value={qForm.language}
                    onChange={(e) => setQForm({ ...qForm, language: e.target.value })}
                  >
                    {Object.keys(LANG_MAP).map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono text-ink-300 uppercase tracking-widest">
                    Código de referência (oculto para alunos)
                  </label>
                  <div className="rounded-lg overflow-hidden border border-ink-600">
                    <Suspense fallback={<div className="h-[200px] bg-ink-900 animate-pulse" />}>
                      <Editor
                        height="200px"
                        language={LANG_MAP[qForm.language]}
                        value={qForm.referenceCode}
                        onChange={(v) => setQForm({ ...qForm, referenceCode: v || "" })}
                        theme="vs-dark"
                        options={{
                          minimap: { enabled: false },
                          fontSize: 13,
                          scrollBeyondLastLine: false,
                        }}
                      />
                    </Suspense>
                  </div>
                </div>

                {/* Correção por testes (opcional) — só Python/JS */}
                <div className="flex flex-col gap-2 border-t border-ink-700 pt-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono text-ink-300 uppercase tracking-widest">
                      Correção por testes <span className="text-ink-500 normal-case">(opcional)</span>
                    </label>
                    {testsSupported && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleGenerateTests}
                        loading={generating}
                        disabled={!qForm.promptText.trim() || !qForm.referenceCode.trim()}
                      >
                        {genTests ? "Regenerar testes" : "Gerar testes automaticamente"}
                      </Button>
                    )}
                  </div>

                  {!testsSupported ? (
                    <p className="text-ink-500 font-mono text-xs">
                      Disponível apenas para Python e JavaScript. Nas outras linguagens, a nota é dada pela IA.
                    </p>
                  ) : (
                    <p className="text-ink-500 font-mono text-xs">
                      A IA sugere os inputs; os resultados esperados saem do teu código de referência. Podes editar ou apagar antes de guardar — se não gerares nada, a nota fica a cargo da IA.
                    </p>
                  )}

                  {genError && <p className="text-danger font-mono text-xs" role="alert">{genError}</p>}

                  {genTests && (
                    <div className="flex flex-col gap-2 mt-1">
                      {functionName && (
                        <p className="text-ink-400 font-mono text-xs">
                          Função detetada: <span className="text-[#00c8ff]">{functionName}</span>
                        </p>
                      )}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex gap-2 text-[10px] font-mono text-ink-500 uppercase tracking-widest px-1">
                          <span className="flex-1">Input (JSON)</span>
                          <span className="flex-1">Resultado esperado</span>
                          <span className="w-8" />
                        </div>
                        {genTests.map((row, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <input
                              className="flex-1 bg-ink-700 border border-ink-600 rounded px-2 py-1.5 text-ink-100 font-mono text-xs focus:outline-none focus:border-[#00c8ff]"
                              value={row.inputText}
                              onChange={(e) => updateTest(i, "inputText", e.target.value)}
                              placeholder='["radar"]'
                            />
                            <input
                              className="flex-1 bg-ink-700 border border-ink-600 rounded px-2 py-1.5 text-ink-100 font-mono text-xs focus:outline-none focus:border-[#00c8ff]"
                              value={row.expected}
                              onChange={(e) => updateTest(i, "expected", e.target.value)}
                              placeholder="True"
                            />
                            <button
                              type="button"
                              onClick={() => removeTest(i)}
                              className="w-8 text-ink-500 hover:text-danger font-mono text-sm"
                              title="Remover teste"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={addTest}
                        className="self-start text-ink-400 hover:text-[#00c8ff] font-mono text-xs mt-1"
                      >
                        + Adicionar caso manual
                      </button>
                    </div>
                  )}
                </div>

                <Button type="submit" loading={saving} className="self-start">
                  Guardar pergunta
                </Button>
              </form>
            </Card>
          )}

          {/* Lista de perguntas */}
          {room.questions?.length === 0 ? (
            <p className="text-ink-600 font-mono text-sm text-center py-8">
              Nenhuma pergunta adicionada.
            </p>
          ) : (
            room.questions?.map((q, i) => (
              <Card key={q.id} className="animate-fade-in">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <span className="text-xs font-mono text-[#00c8ff] mb-2 block">
                      Pergunta {i + 1} &middot; {q.language}
                      {q.testCases?.length > 0 && (
                        <span className="text-ink-500"> &middot; {q.testCases.length} testes</span>
                      )}
                    </span>
                    <p className="text-ink-100 text-sm leading-relaxed">{q.promptText}</p>
                  </div>
                  {room.status === "WAITING" && (
                    <Button variant="danger" onClick={() => handleDeleteQuestion(q.id)}>
                      Eliminar
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Coluna direita: lista de alunos com indicadores de progresso */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-sm text-ink-300 uppercase tracking-widest">Alunos</h2>
            <div className="font-mono text-xl font-bold text-[#00c8ff] bg-[#00c8ff]/10 px-3 py-1 rounded-lg tracking-widest">
              {room.code}
            </div>
          </div>

          <p className="text-ink-500 text-xs font-mono">
            Partilha este código com os alunos para entrarem.
          </p>

          {students.length === 0 ? (
            <p className="text-ink-600 font-mono text-xs text-center py-6">
              A aguardar alunos...
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {students.map((s) => (
                <div key={s.id} className="bg-ink-800 rounded-lg px-3 py-2.5 flex items-center justify-between">
                  <span className="font-mono text-sm text-ink-200">
                    {s.nickname}
                    {s.studentNumber && (
                      <span className="text-ink-500 text-xs ml-2">#{s.studentNumber}</span>
                    )}
                  </span>
                  {/* Pontos coloridos representam o estado de cada submissão */}
                  <div className="flex gap-1">
                    {room.questions?.map((q) => {
                      const sub = submissions[`${s.id}:${q.id}`];
                      const prog = progress[`${s.id}:${q.id}`];
                      // Com score IA → verde/laranja/vermelho
                      // Executado sem score → branco
                      // A executar → azul pulsante
                      // Sem submissão → cinzento
                      let className = "w-2 h-2 rounded-full ";
                      let title = "Sem submissão";
                      if (sub?.score !== undefined && sub.score !== null) {
                        className += sub.score >= 70 ? "bg-[#00c8ff]" : sub.score >= 40 ? "bg-warn" : "bg-danger";
                        title = `Score: ${sub.score}`;
                      } else if (prog === "Accepted" || prog === "Runtime Error" || prog === "Error") {
                        className += "bg-ink-200";
                        title = "Executado — a aguardar análise IA";
                      } else if (prog) {
                        className += "bg-blue-400 animate-pulse";
                        title = "A executar...";
                      } else {
                        className += "bg-ink-600";
                      }
                      return <div key={q.id} title={title} className={className} />;
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
