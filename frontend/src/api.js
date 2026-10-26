const TOKEN_KEY = "campus_token";
let onUnauthorized = () => {};

export function getToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn);

async function request(path, { auth = true, ...options } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`/api${path}`, { headers, ...options });
  } catch {
    throw new Error("Cannot reach the backend. Is it running on port 8000?");
  }

  const data = await res.json().catch(() => null);
  if (res.status === 401 && auth) {
    setToken(null);
    onUnauthorized();
    throw new Error("Session expired. Please log in again.");
  }
  if (!res.ok) {
    const detail = typeof data?.detail === "string" ? data.detail : `Server error ${res.status}`;
    throw new Error(detail);
  }
  return data;
}

const post = (path, body, opts) =>
  request(path, { method: "POST", body: JSON.stringify(body || {}), ...opts });

export const getStudents = () => request("/students", { auth: false });
export const login = (student_id, pin) => post("/login", { student_id, pin }, { auth: false });
export const logout = () => post("/logout").catch(() => null);
export const newSession = () => post("/session/new");
export const sendChat = (session_id, message) => post("/chat", { session_id, message });
export const approve = (action_id, approved) => post("/approve", { action_id, approved });
export const getMemory = () => request("/memory");
export const clearMemory = () => request("/memory", { method: "DELETE" });
export const getEval = () => request("/eval");
export const getAudit = () => request("/audit");
