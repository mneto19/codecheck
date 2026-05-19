import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { studentApi } from "../services/api";
import { useStudentStore } from "../store/authStore";
import { Button } from "../components/ui";

export default function JoinPage() {
  const navigate = useNavigate();
  const { setSession } = useStudentStore();
  const [step, setStep] = useState("code");
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.title = "Entrar no Exame — CodeCheck"; }, []);

  async function handleSubmit(e) {
    e.preventDefault();

    if (step === "code") {
      if (code.length !== 6) return setError("O código tem 6 caracteres.");
      setError("");
      setStep("nickname");
      return;
    }

    if (step === "nickname") {
      if (!nickname.trim()) return setError("Introduz o teu nome.");
      setError("");
      setStep("number");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await studentApi.join({
        roomCode: code.toUpperCase(),
        nickname: nickname.trim(),
        studentNumber: studentNumber.trim() || undefined,
      });
      setSession(res.data.student, res.data.token, res.data.room);
      navigate("/exam");
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao entrar na sala.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-12">
          <h1 className="font-display text-5xl font-extrabold text-white tracking-tight">
            Code<span className="text-[#00c8ff]">Check</span>
          </h1>
          <p className="text-ink-400 font-mono text-sm mt-2">
            Plataforma de avaliação de código
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-6">
          {step === "code" ? (
            <>
              <p className="text-ink-300 font-mono text-sm text-center">
                Introduz o código de sala fornecido pelo teu professor.
              </p>
              <input
                autoFocus
                aria-label="Código de sala"
                className="w-full text-center text-4xl font-mono font-bold bg-ink-800 border-2 border-ink-600
                  focus:border-[#00c8ff] outline-none rounded-2xl px-6 py-5 text-white uppercase
                  tracking-[0.3em] transition-colors placeholder:text-ink-600 placeholder:tracking-[0.2em]"
                placeholder="XXXXXX"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
              />
              {error && <p className="text-danger font-mono text-sm" role="alert">{error}</p>}
              <Button type="submit" aria-label="Continuar para passo seguinte" className="w-full justify-center text-lg py-4">
                Continuar
              </Button>
            </>
          ) : step === "nickname" ? (
            <>
              <div className="flex items-center gap-3 bg-[#00c8ff]/10 border border-[#00c8ff]/30 rounded-xl px-5 py-3 w-full justify-center">
                <span className="text-[#00c8ff] font-mono text-xl font-bold tracking-widest">{code}</span>
              </div>
              <p className="text-ink-300 font-mono text-sm text-center">Qual é o teu nome?</p>
              <input
                autoFocus
                aria-label="Nome ou nickname"
                className="w-full text-center text-2xl font-mono font-semibold bg-ink-800 border-2 border-ink-600
                  focus:border-[#00c8ff] outline-none rounded-2xl px-6 py-4 text-white
                  transition-colors placeholder:text-ink-600"
                placeholder="O teu nome"
                maxLength={30}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
              />
              {error && <p className="text-danger font-mono text-sm">{error}</p>}
              <div className="flex gap-3 w-full">
                <Button variant="ghost" type="button" onClick={() => { setStep("code"); setError(""); }} className="flex-1 justify-center">
                  Voltar
                </Button>
                <Button type="submit" className="flex-1 justify-center text-lg py-4">
                  Continuar
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 bg-[#00c8ff]/10 border border-[#00c8ff]/30 rounded-xl px-5 py-3 w-full justify-center">
                <span className="text-[#00c8ff] font-mono text-xl font-bold tracking-widest">{code}</span>
                <span className="text-ink-500 font-mono text-sm">·</span>
                <span className="text-ink-300 font-mono text-sm">{nickname}</span>
              </div>
              <p className="text-ink-300 font-mono text-sm text-center">Qual é o teu número de aluno?</p>
              <input
                autoFocus
                aria-label="Número de aluno (opcional)"
                className="w-full text-center text-2xl font-mono font-semibold bg-ink-800 border-2 border-ink-600
                  focus:border-[#00c8ff] outline-none rounded-2xl px-6 py-4 text-white
                  transition-colors placeholder:text-ink-600"
                placeholder="ex: 12345"
                maxLength={20}
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
              />
              {error && <p className="text-danger font-mono text-sm">{error}</p>}
              <div className="flex gap-3 w-full">
                <Button variant="ghost" type="button" onClick={() => { setStep("nickname"); setError(""); }} className="flex-1 justify-center">
                  Voltar
                </Button>
                <Button type="submit" loading={loading} className="flex-1 justify-center text-lg py-4">
                  Entrar
                </Button>
              </div>
            </>
          )}
        </form>

        <div className="mt-10 text-center">
          <a href="/login" className="text-ink-600 hover:text-ink-400 font-mono text-xs transition-colors">
            Acesso de docente
          </a>
        </div>
      </div>
    </div>
  );
}
