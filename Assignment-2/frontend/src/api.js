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

// Reads a Server-Sent Events response. Calls onEvent(event, data) for each
// status/token/reset event and resolves with the final "done" payload.
async function stream(path, body, onEvent) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Cannot reach the backend. Is it running on port 8000?");
  }
  if (res.status === 401) {
    setToken(null);
    onUnauthorized();
    throw new Error("Session expired. Please log in again.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(typeof data?.detail === "string" ? data.detail : `Server error ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop();
    for (const part of parts) {
      const event = part.match(/^event: (.*)$/m)?.[1];
      const data = JSON.parse(part.match(/^data: (.*)$/m)?.[1] || "{}");
      if (event === "done") return data;
      if (event === "error") throw new Error(data.detail || "Something went wrong");
      onEvent(event, data);
    }
  }
  throw new Error("The response ended unexpectedly. Please try again.");
}

export const streamChat = (session_id, message, onEvent) => stream("/chat/stream", { session_id, message }, onEvent);
export const streamApprove = (action_id, approved, onEvent) =>
  stream("/approve/stream", { action_id, approved }, onEvent);

const post = (path, body, opts) =>
  request(path, { method: "POST", body: JSON.stringify(body || {}), ...opts });

export const getStudents = () => request("/students", { auth: false });
export const login = (student_id, pin) => post("/login", { student_id, pin }, { auth: false });
export const logout = () => post("/logout").catch(() => null);
export const newSession = () => post("/session/new");
export const getMemory = () => request("/memory");
export const clearMemory = () => request("/memory", { method: "DELETE" });
export const getEval = () => request("/eval");
export const getAudit = () => request("/audit");
export const getPolicy = () => request("/policy", { auth: false });
