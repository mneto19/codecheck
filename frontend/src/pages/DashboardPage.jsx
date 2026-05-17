import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { roomApi } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { Button, Card, Badge, Spinner } from "../components/ui";

const STATUS_COLOR = { WAITING: "blue", ACTIVE: "green", FINISHED: "default" };
const STATUS_PT = { WAITING: "A aguardar", ACTIVE: "Em curso", FINISHED: "Terminada" };

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", timerSeconds: 1800 });

  useEffect(() => {
    roomApi.list().then((r) => {
      setRooms(r.data);
      setLoading(false);
    });
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await roomApi.create({
        name: form.name,
        timerSeconds: Number(form.timerSeconds),
      });
      navigate(`/rooms/${res.data.id}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Eliminar esta sala?")) return;
    await roomApi.delete(id);
    setRooms(rooms.filter((r) => r.id !== id));
  }

  return (
    <div className="min-h-screen bg-ink-950">
      <header className="border-b border-ink-800 px-6 py-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-white">
          Code<span className="text-[#00ff87]">Check</span>
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-ink-400 text-sm font-mono">{user?.name}</span>
          <Button variant="ghost" onClick={logout}>Sair</Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">Salas de exame</h2>
            <p className="text-ink-400 text-sm font-mono mt-1">
              {rooms.length} sala{rooms.length !== 1 ? "s" : ""} criada{rooms.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancelar" : "+ Nova sala"}
          </Button>
        </div>

        {showForm && (
          <Card className="mb-6 animate-fade-in">
            <h3 className="font-mono text-sm text-ink-300 uppercase tracking-widest mb-4">
              Nova sala
            </h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-xs font-mono text-ink-300 uppercase tracking-widest">
                    Nome da sala
                  </label>
                  <input
                    className="bg-ink-700 border border-ink-600 rounded-lg px-4 py-2.5 text-ink-100 font-mono text-sm
                      placeholder:text-ink-500 focus:outline-none focus:border-[#00ff87] transition-colors"
                    placeholder="ex: Prova Python - Turma A"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono text-ink-300 uppercase tracking-widest">
                    Duração
                  </label>
                  <select
                    className="bg-ink-700 border border-ink-600 rounded-lg px-4 py-2.5 text-ink-100 font-mono text-sm
                      focus:outline-none focus:border-[#00ff87] transition-colors"
                    value={form.timerSeconds}
                    onChange={(e) => setForm({ ...form, timerSeconds: e.target.value })}
                  >
                    <option value={600}>10 min</option>
                    <option value={1800}>30 min</option>
                    <option value={2700}>45 min</option>
                    <option value={3600}>60 min</option>
                    <option value={5400}>90 min</option>
                    <option value={7200}>120 min</option>
                  </select>
                </div>
              </div>
              <Button type="submit" loading={creating} className="self-start">
                Criar sala
              </Button>
            </form>
          </Card>
        )}

        {loading ? (
          <Spinner />
        ) : rooms.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-ink-500 font-mono text-sm">Nenhuma sala criada ainda.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rooms.map((room) => (
              <Card key={room.id} className="flex items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-4">
                  <div className="font-mono text-xl font-bold text-[#00ff87] bg-[#00ff87]/10 px-3 py-1.5 rounded-lg tracking-widest">
                    {room.code}
                  </div>
                  <div>
                    <p className="text-ink-100 font-body font-medium">{room.name}</p>
                    <p className="text-ink-500 text-xs font-mono mt-0.5">
                      {room._count?.questions || 0} pergunta{room._count?.questions !== 1 ? "s" : ""} &middot;{" "}
                      {room._count?.students || 0} aluno{room._count?.students !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge color={STATUS_COLOR[room.status]}>{STATUS_PT[room.status]}</Badge>
                  <Link to={`/rooms/${room.id}`}>
                    <Button variant="ghost">Gerir</Button>
                  </Link>
                  {room.status === "FINISHED" && (
                    <Link to={`/rooms/${room.id}/results`}>
                      <Button variant="outline">Resultados</Button>
                    </Link>
                  )}
                  {room.status === "WAITING" && (
                    <Button variant="danger" onClick={() => handleDelete(room.id)}>
                      Eliminar
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
