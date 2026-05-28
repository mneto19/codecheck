import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useStudentStore } from "../store/authStore";
import { useSocket } from "../hooks/useSocket";
import { useTimer } from "../hooks/useTimer";
import { submissionApi } from "../services/api";
import { Button } from "../components/ui";
import ExamHeader from "./exam/ExamHeader";
import QuestionNav from "./exam/QuestionNav";
import EditorPanel from "./exam/EditorPanel";
import SubmissionPanel from "./exam/SubmissionPanel";

const codeKey   = (roomId, qid) => `codecheck:code:${roomId}:${qid}`;
const getCode   = (key) => localStorage.getItem(key);
const saveCode  = (key, val) => localStorage.setItem(key, val);
const clearCode = (key) => localStorage.removeItem(key);

export default function ExamPage() {
  const navigate = useNavigate();
  const { student, token, room, clearSession } = useStudentStore();
  const { socketRef, connected } = useSocket(token, student?.id);

  const [activeQuestion, setActiveQuestion] = useState(0);
  const [codes, setCodes]           = useState({});
  const [results, setResults]       = useState({});
  const [submitting, setSubmitting] = useState({});
  const [examRoom, setExamRoom]     = useState(room);
  const [pasteStats, setPasteStats] = useState({});
  const activeQuestionIdRef         = useRef(null);

  const { formatted, remaining, expired } = useTimer(examRoom?.startedAt, examRoom?.timerSeconds);

  useEffect(() => {
    document.title = room ? `${room.name} — CodeCheck` : "Exame — CodeCheck";
  }, [room]);

  useEffect(() => {
    if (!student || !token || !room) navigate("/join", { replace: true });
  }, [student, token, room, navigate]);

  // Mantém o ref a apontar para a pergunta visível, para atribuir "pastes" corretamente
  useEffect(() => {
    activeQuestionIdRef.current = room?.questions?.[activeQuestion]?.id ?? null;
  }, [room, activeQuestion]);

  // Restaura rascunhos guardados no localStorage entre refreshes
  useEffect(() => {
    if (!room?.questions) return;
    const initial = {};
    room.questions.forEach((q) => {
      initial[q.id] = getCode(codeKey(room.id, q.id)) || "";
    });
    setCodes(initial);
  }, [room]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.on("room:started", ({ startedAt, timerSeconds }) => {
      setExamRoom((r) => ({ ...r, status: "ACTIVE", startedAt, timerSeconds }));
    });
    socket.on("room:finished", () => {
      setExamRoom((r) => ({ ...r, status: "FINISHED" }));
    });
    socket.on("submission:result", ({ questionId, status, output, score, summary }) => {
      setResults((r) => ({ ...r, [questionId]: { status, output, score, summary } }));
    });

    return () => {
      socket.off("room:started");
      socket.off("room:finished");
      socket.off("submission:result");
    };
  }, [socketRef]);

  function handleCodeChange(questionId, value) {
    setCodes((c) => ({ ...c, [questionId]: value }));
    if (room) saveCode(codeKey(room.id, questionId), value);
  }

  // Acumula colagens por pergunta. Estável (lê a pergunta ativa via ref) porque o
  // handler do Monaco é registado uma só vez no mount do editor.
  const handlePaste = useCallback((chars) => {
    const qid = activeQuestionIdRef.current;
    if (!qid) return;
    setPasteStats((p) => {
      const cur = p[qid] || { count: 0, chars: 0 };
      return { ...p, [qid]: { count: cur.count + 1, chars: cur.chars + chars } };
    });
  }, []);

  async function handleSubmit(questionId) {
    const code = codes[questionId];
    if (!code?.trim()) return;

    setSubmitting((s) => ({ ...s, [questionId]: true }));
    try {
      const stats = pasteStats[questionId] || { count: 0, chars: 0 };
      const res = await submissionApi.submit({
        questionId,
        studentCode: code,
        pasteCount: stats.count,
        pastedChars: stats.chars,
      });
      setResults((r) => ({ ...r, [questionId]: res.data }));
    } catch (err) {
      const msg = err.response?.data?.error || "Erro ao submeter. Tenta novamente.";
      setResults((r) => ({ ...r, [questionId]: { error: msg, status: "Error" } }));
    } finally {
      setSubmitting((s) => ({ ...s, [questionId]: false }));
    }
  }

  function handleLeave() {
    room?.questions?.forEach((q) => clearCode(codeKey(room.id, q.id)));
    clearSession();
    navigate("/", { replace: true });
  }

  if (!student || !room) return null;

  const questions  = room.questions || [];
  const currentQ   = questions[activeQuestion];
  const isFinished = examRoom?.status === "FINISHED" || expired;
  const isWaiting  = examRoom?.status === "WAITING";

  const timerColor =
    remaining === null  ? "text-ink-400" :
    remaining < 120     ? "text-danger"  :
    remaining < 300     ? "text-warn"    :
    "text-[#00c8ff]";

  return (
    <div className="min-h-screen bg-ink-950 flex flex-col">
      <ExamHeader
        room={room}
        student={student}
        connected={connected}
        isWaiting={isWaiting}
        isFinished={isFinished}
        formatted={formatted}
        timerColor={timerColor}
        onLeave={handleLeave}
      />

      {/* Alerta de tempo */}
      {!isWaiting && !isFinished && remaining !== null && remaining > 0 && remaining <= 300 && (
        <div
          role="alert"
          className={`px-6 py-2 text-center font-mono text-sm font-bold border-b shrink-0
            ${remaining <= 60
              ? "bg-danger/10 border-danger/30 text-danger animate-pulse"
              : "bg-warn/10 border-warn/30 text-warn"}`}
        >
          {remaining <= 60
            ? "⚠ Menos de 1 minuto! Submete o teu código agora."
            : "⚠ Menos de 5 minutos — verifica as tuas submissões."}
        </div>
      )}

      {isWaiting ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="pulse-acid w-4 h-4 rounded-full bg-[#00c8ff]" aria-hidden="true" />
          <p className="font-mono text-ink-300 text-lg" role="status">
            A aguardar que o professor inicie o exame...
          </p>
          <p className="font-mono text-ink-600 text-sm">
            Sala: <span className="text-[#00c8ff]">{room.code}</span>
          </p>
        </div>
      ) : isFinished ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="font-display text-3xl font-bold text-white">Exame concluído.</p>
          <p className="font-mono text-ink-400 text-sm">
            O professor irá analisar as tuas submissões.
          </p>
          <Button onClick={handleLeave} aria-label="Sair e voltar à página inicial" className="mt-4">
            Sair
          </Button>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <QuestionNav
            questions={questions}
            results={results}
            activeQuestion={activeQuestion}
            setActiveQuestion={setActiveQuestion}
          />

          {currentQ && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <EditorPanel
                question={currentQ}
                questionIndex={activeQuestion}
                code={codes[currentQ.id] || ""}
                onChange={(v) => handleCodeChange(currentQ.id, v)}
                onPaste={handlePaste}
                isFinished={isFinished}
              />
              <SubmissionPanel
                result={results[currentQ.id]}
                submitting={!!submitting[currentQ.id]}
                onSubmit={() => handleSubmit(currentQ.id)}
                isFinished={isFinished}
                hasCode={!!codes[currentQ.id]?.trim()}
                isLast={activeQuestion === questions.length - 1}
                onLeave={handleLeave}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
