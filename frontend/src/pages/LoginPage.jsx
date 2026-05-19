import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { Button, Input, Card } from "../components/ui";

// Página de login para docentes
export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.title = "Login — CodeCheck"; }, []);

  // Submete credenciais ao backend
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authApi.login(form);
      setAuth(res.data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login falhou");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center gap-1 text-ink-500 hover:text-ink-200 font-mono text-xs transition-colors">
            ← Início
          </Link>
        </div>
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-extrabold text-white mb-1">
            Code<span className="text-[#00c8ff]">Check</span>
          </h1>
          <p className="text-ink-400 text-sm font-mono">Acesso para docentes</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="docente@escola.pt"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            {error && <p className="text-danger text-sm font-mono">{error}</p>}
            <Button type="submit" loading={loading} className="w-full justify-center mt-2">
              Entrar
            </Button>
          </form>
        </Card>

        <p className="text-center text-ink-500 text-sm mt-4 font-mono">
          Sem conta?{" "}
          <Link to="/register" className="text-[#00c8ff] hover:underline">
            Registar
          </Link>
        </p>

        <div className="mt-6 text-center">
          <p className="text-ink-600 text-xs font-mono mb-2">Aluno? Entra pelo código de sala:</p>
          <Link to="/join">
            <Button variant="outline" className="mx-auto">
              Entrar como aluno
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
