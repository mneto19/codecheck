import { useState, useEffect, lazy, Suspense } from "react";
import { useParams, Link } from "react-router-dom";
import { resultsApi } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { useSocket } from "../hooks/useSocket";
import { Card, Badge, Button, Spinner, ScoreRing } from "../components/ui";
import { LANG_MAP } from "../constants";

const Editor = lazy(() => import("@monaco-editor/react"));

export default function ResultsPage() {
  const { id } = useParams();
  const { token } = useAuthStore();
  const { socketRef } = useSocket(token);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [subDetail, setSubDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [view, setView] = useState("resultados");

  useEffect(() => {
    resultsApi.getRoom(id).then((r) => {
      setData(r.data);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !id) return;

    const joinChannel = () => socket.emit("teacher:join", id);
    joinChannel();
    socket.on("connect", joinChannel);

    socket.on("submission:evaluated", ({ submissionId, score, summary, geradoPorIa, grauDeCerteza, motivo }) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          students: prev.students.map((s) => ({
            ...s,
            submissions: s.submissions.map((sub) =>
              sub.id === submissionId
                ? {
                    ...sub,
                    aiCorrectnessScore: score,
                    aiSummary: summary,
                    aiGeneratedByAi: geradoPorIa,
                    aiCertaintyDegree: grauDeCerteza,
                    aiReason: motivo,
                  }
                : sub
            ),
          })),
        };
      });
    });

    return () => {
      socket.off("connect", joinChannel);
      socket.off("submission:evaluated");
    };
  }, [socketRef, id]);

  async function loadSubmission(subId) {
    setLoadingDetail(true);
    const res = await resultsApi.getSubmission(subId);
    setSubDetail(res.data);
    setLoadingDetail(false);
  }

  async function handleReanalyze() {
    setAnalyzing(true);
    await resultsApi.analyze(id).catch(() => {});
    setAnalyzing(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const { room, students } = data;

  function avgScore(student) {
    const subs = student.submissions.filter((s) => s.aiCorrectnessScore !== null);
    if (!subs.length) return null;
    return Math.round(subs.reduce((a, s) => a + s.aiCorrectnessScore, 0) / subs.length);
  }

  function exportCSV() {
    const questions = (students[0]?.submissions || [])
      .map((s) => s.question)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    const headers = ["Nº", "Nome", ...questions.map((_, i) => `P${i + 1}`), "Média", "IA?"];
    const rows = [...students]
      .sort((a, b) => (a.studentNumber || "").localeCompare(b.studentNumber || ""))
      .map((s) => {
        const avg = avgScore(s);
        const subs = [...s.submissions].sort((a, b) => a.question.orderIndex - b.question.orderIndex);
        const hasIa = subs.some((sub) => sub.aiGeneratedByAi);
        const maxCert = Math.max(0, ...subs.map((sub) => sub.aiCertaintyDegree || 0));
        return [
          s.studentNumber || "",
          s.nickname,
          ...questions.map((q) => subs.find((sub) => sub.question.id === q.id)?.aiCorrectnessScore ?? ""),
          avg ?? "",
          hasIa ? `Sim (${maxCert}%)` : "Não",
        ];
      });
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `notas_${room.name.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="min-h-screen bg-ink-950">
      <header className="border-b border-ink-800 px-6 py-4 flex items-center gap-4">
        <Link to="/dashboard" className="text-ink-400 hover:text-ink-200 font-mono text-sm">
          ← Dashboard
        </Link>
        <span className="text-ink-700">|</span>
        <h1 className="font-display text-lg font-bold text-white">{room.name}</h1>
        <Badge color="default">Terminada</Badge>
        <Button onClick={handleReanalyze} loading={analyzing} variant="ghost">
          {analyzing ? "A analisar..." : "Re-analisar IA"}
        </Button>
        <div className="ml-auto flex gap-2">
          <Button variant={view === "resultados" ? "outline" : "ghost"} onClick={() => setView("resultados")}>
            Resultados
          </Button>
          <Button variant={view === "tabela" ? "outline" : "ghost"} onClick={() => setView("tabela")}>
            Tabela de Notas
          </Button>
          {view === "tabela" && (
            <Button variant="ghost" onClick={exportCSV}>
              Exportar CSV
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* ── Vista: Tabela de Notas ── */}
        {view === "tabela" && (() => {
          const questions = students[0]?.submissions
            ?.map(s => s.question)
            ?.sort((a, b) => a.orderIndex - b.orderIndex) || [];
          return (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-bold text-white">Tabela de Notas Finais</h2>
                <span className="text-ink-500 font-mono text-xs">{students.length} aluno{students.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-ink-800">
                <table className="w-full text-sm font-mono">
                  <thead>
                    <tr className="border-b border-ink-800 bg-ink-900">
                      <th className="text-left px-4 py-3 text-ink-400 font-normal">Nº</th>
                      <th className="text-left px-4 py-3 text-ink-400 font-normal">Nome</th>
                      {questions.map((q, i) => (
                        <th key={q.id} className="text-center px-4 py-3 text-ink-400 font-normal">
                          P{i + 1}
                        </th>
                      ))}
                      <th className="text-center px-4 py-3 text-[#00c8ff] font-normal">Média</th>
                      <th className="text-center px-4 py-3 text-warn font-normal">IA?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...students].sort((a, b) => (a.studentNumber || "").localeCompare(b.studentNumber || "")).map((s) => {
                      const avg = avgScore(s);
                      const sortedSubs = [...s.submissions].sort((a, b) => a.question.orderIndex - b.question.orderIndex);
                      const hasIa = sortedSubs.some(sub => sub.aiGeneratedByAi);
                      const maxCertainty = Math.max(0, ...sortedSubs.map(sub => sub.aiCertaintyDegree || 0));
                      return (
                        <tr key={s.id} className="border-b border-ink-800 hover:bg-ink-900/50 transition-colors">
                          <td className="px-4 py-3 text-ink-400">{s.studentNumber || "—"}</td>
                          <td className="px-4 py-3 text-ink-100">{s.nickname}</td>
                          {questions.map((q) => {
                            const sub = sortedSubs.find(sub => sub.question.id === q.id);
                            const score = sub?.aiCorrectnessScore ?? null;
                            return (
                              <td key={q.id} className="px-4 py-3 text-center">
                                {score !== null ? (
                                  <span className={`font-bold ${score >= 70 ? "text-[#00c8ff]" : score >= 40 ? "text-warn" : "text-danger"}`}>
                                    {score}
                                  </span>
                                ) : (
                                  <span className="text-ink-600">—</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-center">
                            {avg !== null ? (
                              <span className={`font-bold text-base ${avg >= 70 ? "text-[#00c8ff]" : avg >= 40 ? "text-warn" : "text-danger"}`}>
                                {avg}
                              </span>
                            ) : <span className="text-ink-600">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {hasIa ? (
                              <span className="text-danger font-bold" title={`Certeza: ${maxCertainty}%`}>
                                Sim ({maxCertainty}%)
                              </span>
                            ) : (
                              <span className="text-ink-500">Não</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* ── Vista: Resultados Individuais ── */}
        {view === "resultados" && <div className="flex gap-6">
        {/* Coluna esquerda: lista de alunos com pontuação média */}
        <div className="w-72 flex flex-col gap-3 shrink-0">
          <h2 className="font-mono text-xs text-ink-400 uppercase tracking-widest mb-1">
            Alunos ({students.length})
          </h2>
          {students.map((s) => {
            const avg = avgScore(s);
            const isSelected = selected?.id === s.id;
            return (
              <button
                key={s.id}
                onClick={() => { setSelected(s); setSubDetail(null); }}
                className={`w-full text-left bg-ink-800 border rounded-xl px-4 py-3 transition-all
                  ${isSelected
                    ? "border-[#00c8ff] bg-[#00c8ff]/5"
                    : "border-ink-700 hover:border-ink-500"}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-sm text-ink-100">{s.nickname}</span>
                    {s.studentNumber && (
                      <span className="font-mono text-xs text-ink-500 ml-2">#{s.studentNumber}</span>
                    )}
                  </div>
                  {avg !== null ? (
                    <span className={`font-mono text-sm font-bold ${
                      avg >= 70 ? "text-[#00c8ff]" : avg >= 40 ? "text-warn" : "text-danger"
                    }`}>
                      {avg}
                    </span>
                  ) : (
                    <span className="font-mono text-xs text-ink-600">sem dados</span>
                  )}
                </div>
                <p className="text-ink-500 text-xs font-mono mt-0.5">
                  {s.submissions.length} submissão{s.submissions.length !== 1 ? "s" : ""}
                </p>
              </button>
            );
          })}
        </div>

        {/* Coluna direita: detalhe das submissões do aluno selecionado */}
        <div className="flex-1">
          {!selected ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-ink-600 font-mono text-sm">
                Seleciona um aluno para ver os resultados.
              </p>
            </div>
          ) : (
            <div className="animate-fade-in flex flex-col gap-4">
              <h2 className="font-display text-xl font-bold text-white">{selected.nickname}</h2>

              {/* Lista resumida de cada submissão do aluno */}
              {[...selected.submissions].sort((a, b) => a.question.orderIndex - b.question.orderIndex).map((sub) => (
                <Card
                  key={sub.id}
                  className="cursor-pointer hover:border-ink-500 transition-colors"
                  onClick={() => loadSubmission(sub.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <span className="text-xs font-mono text-[#00c8ff] mb-1 block">
                        Pergunta {sub.question.orderIndex + 1} &middot; {sub.question.language}
                      </span>
                      <p className="text-ink-200 text-sm leading-relaxed">{sub.question.promptText}</p>
                      {sub.aiSummary && (
                        <p className="text-ink-400 text-xs font-mono mt-2 leading-relaxed">
                          {sub.aiSummary}
                        </p>
                      )}
                    </div>
                    {sub.aiCorrectnessScore !== null ? (
                      <ScoreRing score={sub.aiCorrectnessScore} />
                    ) : (
                      <span className="text-ink-600 text-xs font-mono">A analisar...</span>
                    )}
                  </div>
                </Card>
              ))}

              {/* Detalhe completo de uma submissão */}
              {loadingDetail && <Spinner />}

              {subDetail && (
                <Card className="animate-fade-in border-[#00c8ff]/30">
                  <h3 className="font-mono text-sm text-[#00c8ff] uppercase tracking-widest mb-4">
                    Detalhe da submissão
                  </h3>

                  {/* Lado a lado: código do aluno e código de referência */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs font-mono text-ink-400 mb-2 uppercase tracking-widest">
                        Código do aluno
                      </p>
                      <div className="rounded-lg overflow-hidden border border-ink-600">
                        <Suspense fallback={<div className="h-[200px] bg-ink-900 animate-pulse" />}>
                          <Editor
                            height="200px"
                            language={LANG_MAP[subDetail.question.language]}
                            value={subDetail.studentCode}
                            theme="vs-dark"
                            options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12, scrollBeyondLastLine: false }}
                          />
                        </Suspense>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-mono text-ink-400 mb-2 uppercase tracking-widest">
                        Código de referência
                      </p>
                      <div className="rounded-lg overflow-hidden border border-ink-600">
                        <Suspense fallback={<div className="h-[200px] bg-ink-900 animate-pulse" />}>
                          <Editor
                            height="200px"
                            language={LANG_MAP[subDetail.question.language]}
                            value={subDetail.referenceCode}
                            theme="vs-dark"
                            options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12, scrollBeyondLastLine: false }}
                          />
                        </Suspense>
                      </div>
                    </div>
                  </div>

                  {/* Outputs lado a lado: aluno vs esperado */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs font-mono text-ink-400 mb-2 uppercase tracking-widest">
                        Output do aluno
                        {subDetail.executionError && (
                          <span className="text-danger ml-2">· erro</span>
                        )}
                      </p>
                      <pre className="bg-ink-900 rounded-lg px-4 py-3 text-ink-200 text-xs font-mono whitespace-pre-wrap min-h-12">
                        {subDetail.executionError || subDetail.executionOutput || "(sem output)"}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs font-mono text-[#00c8ff] mb-2 uppercase tracking-widest">
                        Output esperado (referência)
                      </p>
                      <pre className="bg-ink-900 rounded-lg px-4 py-3 text-[#00c8ff] text-xs font-mono whitespace-pre-wrap min-h-12">
                        {subDetail.referenceOutput || "(não calculado — clica Re-analisar IA)"}
                      </pre>
                    </div>
                  </div>

                  {/* Diferenças lógicas detetadas pela IA */}
                  {subDetail.aiLogicDifferences?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-mono text-warn mb-2 uppercase tracking-widest">
                        Diferenças lógicas
                      </p>
                      <ul className="flex flex-col gap-1">
                        {subDetail.aiLogicDifferences.map((d, i) => (
                          <li key={i} className="text-ink-300 text-sm font-mono flex gap-2">
                            <span className="text-warn shrink-0">•</span>{d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Notas de estilo da IA */}
                  {subDetail.aiStyleNotes?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-mono text-blue-400 mb-2 uppercase tracking-widest">
                        Notas de estilo
                      </p>
                      <ul className="flex flex-col gap-1">
                        {subDetail.aiStyleNotes.map((n, i) => (
                          <li key={i} className="text-ink-300 text-sm font-mono flex gap-2">
                            <span className="text-blue-400 shrink-0">•</span>{n}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Deteção de uso de IA */}
                  {subDetail.aiGeneratedByAi !== null && subDetail.aiGeneratedByAi !== undefined && (
                    <div className={`rounded-lg px-4 py-3 border ${subDetail.aiGeneratedByAi ? "border-danger/40 bg-danger/5" : "border-ink-700 bg-ink-900"}`}>
                      <div className="flex items-center justify-between">
                        <p className={`text-xs font-mono uppercase tracking-widest font-bold ${subDetail.aiGeneratedByAi ? "text-danger" : "text-ink-400"}`}>
                          {subDetail.aiGeneratedByAi ? "⚠ Suspeito de gerado por IA" : "Sem indícios de IA"}
                        </p>
                        <span className="text-xs font-mono text-ink-500">
                          Certeza: {subDetail.aiCertaintyDegree ?? 0}%
                        </span>
                      </div>
                      {subDetail.aiReason && (
                        <p className="text-ink-300 text-xs font-mono mt-2 leading-relaxed">{subDetail.aiReason}</p>
                      )}
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}
        </div>
        </div>}
      </main>
    </div>
  );
}
