import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import RoomPage from "./pages/RoomPage";
import ResultsPage from "./pages/ResultsPage";
import JoinPage from "./pages/JoinPage";
import ExamPage from "./pages/ExamPage";
import LandingPage from "./pages/LandingPage";

// Componente que protege rotas que requerem autenticação de docente
// Guarda proteção: verifica user em localStorage; o backend valida o cookie em cada pedido
function PrivateRoute({ children }) {
  const { user } = useAuthStore();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas do docente */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/rooms/:id" element={<PrivateRoute><RoomPage /></PrivateRoute>} />
        <Route path="/rooms/:id/results" element={<PrivateRoute><ResultsPage /></PrivateRoute>} />

        {/* Rotas do aluno */}
        <Route path="/join" element={<JoinPage />} />
        <Route path="/exam" element={<ExamPage />} />

        {/* Página inicial */}
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
