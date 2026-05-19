import { create } from "zustand";
import api from "../services/api";

// Store global do docente — token guardado em cookie httpOnly (não acessível ao JS)
// Só o objeto user é persistido em localStorage para manter o nome na UI
export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem("user") || "null"),

  setAuth: (user) => {
    localStorage.setItem("user", JSON.stringify(user));
    set({ user });
  },

  logout: () => {
    api.post("/auth/logout").catch(() => {});
    localStorage.removeItem("user");
    set({ user: null });
  },
}));

// Store do aluno com persistência em sessionStorage (apaga ao fechar tab)
export const useStudentStore = create((set) => ({
  student: JSON.parse(sessionStorage.getItem("student") || "null"),
  token: sessionStorage.getItem("studentToken") || null,
  room: JSON.parse(sessionStorage.getItem("room") || "null"),

  setSession: (student, token, room) => {
    sessionStorage.setItem("student", JSON.stringify(student));
    sessionStorage.setItem("studentToken", token);
    sessionStorage.setItem("room", JSON.stringify(room));
    set({ student, token, room });
  },

  clearSession: () => {
    sessionStorage.clear();
    set({ student: null, token: null, room: null });
  },
}));
