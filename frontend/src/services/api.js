import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  withCredentials: true, // envia cookie httpOnly automaticamente em cada pedido
});

// Apenas o token de aluno é enviado via header (sessionStorage, sessão temporária)
api.interceptors.request.use((config) => {
  const studentToken = sessionStorage.getItem("studentToken");
  if (studentToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${studentToken}`;
  }
  return config;
});

// Em caso de 401, limpa dados locais e redireciona para login (apenas rotas de professor)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const isStudentRoute = window.location.pathname.startsWith("/exam");
      const isAuthEndpoint = err.config?.url?.includes("/auth/");
      if (!isStudentRoute && !isAuthEndpoint) {
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  register: (data) => api.post("/auth/register", data),
  login:    (data) => api.post("/auth/login", data),
  me:       ()     => api.get("/auth/me"),
  logout:   ()     => api.post("/auth/logout"),
};

export const roomApi = {
  create: (data) => api.post("/rooms", data),
  list:   ()     => api.get("/rooms"),
  get:    (id)   => api.get(`/rooms/${id}`),
  delete: (id)   => api.delete(`/rooms/${id}`),
  start:  (id)   => api.post(`/rooms/${id}/start`),
  finish: (id)   => api.post(`/rooms/${id}/finish`),
};

export const questionApi = {
  create:        (data)     => api.post("/questions", data),
  update:        (id, data) => api.put(`/questions/${id}`, data),
  delete:        (id)       => api.delete(`/questions/${id}`),
  generateTests: (data)     => api.post("/questions/generate-tests", data),
};

export const studentApi = {
  join:    (data) => api.post("/students/join", data),
  getRoom: (code) => api.get(`/students/room/${code}`),
};

export const submissionApi = {
  submit: (data) => api.post("/submissions", data),
};

export const resultsApi = {
  getRoom:       (roomId) => api.get(`/results/room/${roomId}`),
  getSubmission: (id)     => api.get(`/results/submission/${id}`),
  analyze:       (roomId) => api.post(`/results/room/${roomId}/analyze`),
};

export default api;
