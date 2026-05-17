import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { roomApi, questionApi } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { useSocket } from "../hooks/useSocket";
import { useTimer } from "../hooks/useTimer";
import { Button, Card, Badge, Spinner } from "../components/ui";

// Mapeamento de linguagens internas para os IDs do Monaco Editor
const LANG_MAP = {
  PYTHON: "python", JAVASCRIPT: "javascript", JAVA: "java",
  C: "c", CPP: "cpp", CSHARP: "csharp",
};
const STATUS_PT = { WAITING: "A aguardar", ACTIVE: "Em curso", FINISHED: "Terminada" };
const STATUS_COLOR = { WAITING: "blue", ACTIVE: "green", FINISHED: "default" };

// Página de gestão de uma sala: adicionar perguntas, iniciar exame, monitorizar alunos
export default function RoomPage() {
  const { id } = useParams();
  const { token } = useAuthStore();
  const { socketRef, connected } = useSocket(token);

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

  // Hook do timer baseado em room.startedAt
  const { formatted, remaining } = useTimer(room?.startedAt, room?.timerSeconds);

  // Carrega dados iniciais da sala
  useEffect(() => {
    roomApi.get(id).then((r) => {
      setRoom(r.data);
      setStudents(r.data.students || []);
      setQForm((f) => ({ ...f, orderIndex: r.data.questions?.length || 0 }));
      setLoading(false);
    });
  }, [id]);

  // Subscreve eventos de socket após carregar a sala
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !room) return;

    // Junta-se ao canal privado do docente para esta sala
    // (Repete sempre que o socket reconecta)
    const joinChannel = () => socket.emit("teacher:join", room.id);
    joinChannel();
    socket.on("connect", joinChannel);

    // Aluno acabou de entrar na sala
    socket.on("student:joined", (student) => {
      setStudents((prev) => [...prev.filter((s) => s.id !== student.id), student]);
    });

    // Submissão foi avaliada pela IA
    socket.on("submission:evaluated", (data) => {
      setSubmissions((prev) => ({
        ...prev,
        [`${data.studentId}:${data.questionId}`]: data,
      }));
    });

    // Sala foi marcada como terminada
    socket.on("room:finished", () => {
      setRoom((r) => ({ ...r, status: "FINISHED" }));
    });

    // Progresso de execução do código do aluno
    socket.on("submission:progress", ({ studentId, questionId, status }) => {
      setProgress((prev) => ({ ...prev, [`${studentId}:${questionId}`]: status }));
    });

    // Limpa listeners ao desmontar
    return () => {
      socket.off("connect", joinChannel);
      socket.off("student:joined");
      socket.off("submission:evaluated");
      socket.off("room:finished");
      socket.off("submission:progress");
    };
  }, [socketRef, room]);

  // Adiciona uma nova pergunta à sala
  async function handleAddQuestion(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await questionApi.create({
        ...qForm,
        roomId: id,
        orderIndex: Number(qForm.orderIndex),
      });
      setRoom((r) => ({ ...r, questions: [...(r.questions || []), res.data] }));
      // Reset do formulário com índice incrementado
      setQForm({
        promptText: "",
        referenceCode: "# Escreve aqui o código de referência\n",
        language: "PYTHON",
        orderIndex: (room?.questions?.length || 0) + 1,
      });
      setShowQuestionForm(false);
    } finally {
      setSaving(false);
    }
  }

  // Elimina uma pergunta
  async function handleDeleteQuestion(qid) {
    if (!confirm("Eliminar pergunta?")) return;
    await questionApi.delete(qid);
    setRoom((r) => ({ ...r, questions: r.questions.filter((q) => q.id !== qid) }));
  }

  // Inicia o exame (timer começa a contar)
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
  const timerColor = remaining < 300 ? "text-danger" : "text-[#00ff87]";

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
              <Button variant="ghost" onClick={() => setShowQuestionForm(!showQuestionForm)}>
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
                      placeholder:text-ink-500 focus:outline-none focus:border-[#00ff87] resize-none transition-colors"
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
                      focus:outline-none focus:border-[#00ff87] transition-colors"
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
                  </div>
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
                    <span className="text-xs font-mono text-[#00ff87] mb-2 block">
                      Pergunta {i + 1} &middot; {q.language}
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
            <div className="font-mono text-xl font-bold text-[#00ff87] bg-[#00ff87]/10 px-3 py-1 rounded-lg tracking-widest">
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
                  <span className="font-mono text-sm text-ink-200">{s.nickname}</span>
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
                        className += sub.score >= 70 ? "bg-[#00ff87]" : sub.score >= 40 ? "bg-warn" : "bg-danger";
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
