const API = "http://localhost:8081";

const getCsrfTokenFromCookie = () => {
  const match = document.cookie.match(/(?:^|; )csrfToken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
};

const request = async (path, options = {}) => {
  const method = (options.method || "GET").toUpperCase();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrfToken = getCsrfTokenFromCookie();
    if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
  }

  const res = await fetch(`${API}${path}`, {
    ...options,
    method,
    headers,
    credentials: "include", // sends/receives the httpOnly token cookie + csrfToken cookie automatically
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
};

export const authApi = {
  login: (email, password) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  signup: (payload) =>
    request("/auth/signup", { method: "POST", body: JSON.stringify(payload) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),
};

export const employeesApi = {
  list: (search = "") =>
    request(`/employees?search=${encodeURIComponent(search)}`),
  create: (payload) =>
    request("/employees", { method: "POST", body: JSON.stringify(payload) }),
  update: (id, payload) =>
    request(`/employees/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  remove: (id) => request(`/employees/${id}`, { method: "DELETE" }),
  regenerateInvite: (id) =>
    request(`/employees/${id}/regenerate-invite`, { method: "PUT" }),
};

export const departmentsApi = {
  list: () => request("/departments"),
};

export const projectsApi = {
  list: (search = "") =>
    request(`/projects?search=${encodeURIComponent(search)}`),
  get: (id) => request(`/projects/${id}`),
  create: (payload) =>
    request("/projects", { method: "POST", body: JSON.stringify(payload) }),
  update: (id, payload) =>
    request(`/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  remove: (id) => request(`/projects/${id}`, { method: "DELETE" }),
  progress: (id) => request(`/projects/${id}/progress`),
};

export const tasksApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/tasks${qs ? `?${qs}` : ""}`);
  },
  create: (payload) =>
    request("/tasks", { method: "POST", body: JSON.stringify(payload) }),
  update: (id, payload) =>
    request(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  remove: (id) => request(`/tasks/${id}`, { method: "DELETE" }),
};
