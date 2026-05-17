import { create } from "zustand";

// Store global do docente com persistência em localStorage
export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem("user") || "null"),
  token: localStorage.getItem("token") || null,

  // Guarda credenciais após login/registo
  setAuth: (user, token) => {
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("token", token);
    set({ user, token });
  },

  // Limpa credenciais ao sair
  logout: () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    set({ user: null, token: null });
  },
}));

// Store do aluno com persistência em sessionStorage (apaga ao fechar tab)
export const useStudentStore = create((set) => ({
  student: JSON.parse(sessionStorage.getItem("student") || "null"),
  token: sessionStorage.getItem("studentToken") || null,
  room: JSON.parse(sessionStorage.getItem("room") || "null"),

  // Inicia sessão do aluno
  setSession: (student, token, room) => {
    sessionStorage.setItem("student", JSON.stringify(student));
    sessionStorage.setItem("studentToken", token);
    sessionStorage.setItem("room", JSON.stringify(room));
    set({ student, token, room });
  },

  // Termina sessão do aluno
  clearSession: () => {
    sessionStorage.clear();
    set({ student: null, token: null, room: null });
  },
}));
