import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { Button, Input, Card } from "../components/ui";

// Página de registo de novos docentes
export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Cria conta e faz login imediatamente
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authApi.register(form);
      setAuth(res.data.user, res.data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Registo falhou");
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
          <p className="text-ink-400 text-sm font-mono">Criar conta de docente</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Nome"
              placeholder="Prof. João Silva"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
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
              placeholder="Mínimo 8 caracteres"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
            />
            {error && <p className="text-danger text-sm font-mono">{error}</p>}
            <Button type="submit" loading={loading} className="w-full justify-center mt-2">
              Criar conta
            </Button>
          </form>
        </Card>

        <p className="text-center text-ink-500 text-sm mt-4 font-mono">
          Já tens conta?{" "}
          <Link to="/login" className="text-[#00c8ff] hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
