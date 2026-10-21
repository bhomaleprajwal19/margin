// Thin fetch wrapper: adds the auth token, parses JSON, and turns DRF errors into readable ones.
const BASE = (import.meta.env.VITE_API_URL || "") + "/api";
const TOKEN_KEY = "margin.token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(status, data) {
    super(flattenErrors(data) || `Request failed (${status})`);
    this.status = status;
    this.data = data;
  }
  // Field-level messages, e.g. { title: "Title can't be blank." }
  get fields() {
    if (!this.data || typeof this.data !== "object") return {};
    return Object.fromEntries(
      Object.entries(this.data)
        .filter(([k]) => k !== "non_field_errors" && k !== "detail")
        .map(([k, v]) => [k, Array.isArray(v) ? v.join(" ") : String(v)]),
    );
  }
}

function flattenErrors(data) {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  if (data.non_field_errors) return data.non_field_errors.join(" ");
  const first = Object.values(data)[0];
  return Array.isArray(first) ? first.join(" ") : "";
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn);

export async function api(path, { method = "GET", body, query } = {}) {
  const url = new URL(BASE + path, window.location.origin);
  if (query) {
    Object.entries(query).forEach(([k, v]) => v != null && v !== "" && url.searchParams.set(k, v));
  }
  const headers = { Accept: "application/json" };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Token ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, { detail: "Can’t reach the server. Check your connection and try again." });
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);

  if (res.status === 401 && token) onUnauthorized(data?.detail);
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

export const Projects = {
  list: () => api("/projects/", { query: { archived: 0 } }),
  get: (id) => api(`/projects/${id}/`),
  create: (data) => api("/projects/", { method: "POST", body: data }),
  update: (id, data) => api(`/projects/${id}/`, { method: "PATCH", body: data }),
  remove: (id) => api(`/projects/${id}/`, { method: "DELETE" }),
};

export const Tasks = {
  list: (query) => api("/tasks/", { query }),
  create: (data) => api("/tasks/", { method: "POST", body: data }),
  update: (id, data) => api(`/tasks/${id}/`, { method: "PATCH", body: data }),
  remove: (id) => api(`/tasks/${id}/`, { method: "DELETE" }),
  move: (id, status, position) =>
    api(`/tasks/${id}/move/`, { method: "POST", body: { status, position } }),
};

export const Auth = {
  login: (data) => api("/auth/login/", { method: "POST", body: data }),
  register: (data) => api("/auth/register/", { method: "POST", body: data }),
  logout: () => api("/auth/logout/", { method: "POST" }),
  me: () => api("/auth/me/"),
};

export const getDashboard = () => api("/dashboard/");
