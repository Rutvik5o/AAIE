import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, MessageSquare, BarChart3, ShieldCheck } from "lucide-react";
import * as api from "./api";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import ChatView from "./components/ChatView";
import EvalView from "./components/EvalView";
import AuditView from "./components/AuditView";
import Toast from "./components/Toast";

const TABS = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "eval", label: "Evaluation", icon: BarChart3 },
  { id: "audit", label: "Audit", icon: ShieldCheck },
];

function loadStudent() {
  try {
    return JSON.parse(sessionStorage.getItem("campus_student"));
  } catch {
    return null;
  }
}

function saveStudent(student) {
  try {
    if (student) sessionStorage.setItem("campus_student", JSON.stringify(student));
    else sessionStorage.removeItem("campus_student");
  } catch {
    /* storage unavailable */
  }
}

export default function App() {
  const [student, setStudent] = useState(() => (api.getToken() ? loadStudent() : null));
  const [loginNotice, setLoginNotice] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [facts, setFacts] = useState([]);
  const [tab, setTab] = useState("chat");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    api.setUnauthorizedHandler(() => {
      saveStudent(null);
      setStudent(null);
      setLoginNotice("Session expired. Please log in again.");
    });
  }, []);

  useEffect(() => {
    if (!student) return;
    startSession();
    refreshMemory();
  }, [student]);

  function handleLogin(res) {
    api.setToken(res.token);
    saveStudent(res.student);
    setLoginNotice(null);
    setTab("chat");
    setStudent(res.student);
  }

  async function handleLogout() {
    await api.logout();
    api.setToken(null);
    saveStudent(null);
    setStudent(null);
    setMessages([]);
    setFacts([]);
  }

  async function startSession() {
    setMessages([]);
    try {
      const res = await api.newSession();
      setSessionId(res?.session_id);
    } catch (e) {
      setError(e.message);
    }
  }

  async function refreshMemory() {
    try {
      const res = await api.getMemory();
      setFacts(res?.facts || []);
    } catch (e) {
      setError(e.message);
    }
  }

  async function forgetAll() {
    try {
      await api.clearMemory();
      setFacts([]);
    } catch (e) {
      setError(e.message);
    }
  }

  function addReply(res) {
    setMessages((m) => [
      ...m,
      { role: "assistant", content: res?.answer || "", trace: res?.trace, pending: res?.pending_action },
    ]);
    refreshMemory();
  }

  async function run(userText, call) {
    if (sending) return;
    if (userText) setMessages((m) => [...m, { role: "user", content: userText }]);
    setSending(true);
    try {
      addReply(await call());
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: e.message, error: true }]);
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  const send = (text) => text.trim() && run(text, () => api.sendChat(sessionId, text));

  function decide(index, approved) {
    setMessages((m) =>
      m.map((msg, i) => (i === index ? { ...msg, decision: approved ? "approved" : "rejected" } : msg))
    );
    run(null, () => api.approve(messages[index].pending.action_id, approved));
  }

  if (!student) return <Login notice={loginNotice} onLogin={handleLogin} />;

  return (
    <div className="relative flex h-screen overflow-hidden font-sans">
      <div className="blob bg-indigo-600 w-[480px] h-[480px] -top-40 -left-32" />
      <div className="blob bg-fuchsia-600 w-[380px] h-[380px] top-1/2 -right-24" />
      <div className="blob bg-sky-600 w-[320px] h-[320px] -bottom-32 left-1/3" />

      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        student={student}
        onLogout={handleLogout}
        onNewSession={() => {
          startSession();
          setMenuOpen(false);
        }}
        sessionId={sessionId}
        facts={facts}
        onForget={forgetAll}
      />

      <main className="relative z-10 flex flex-1 flex-col min-w-0">
        <header className="flex items-center gap-3 px-4 md:px-8 py-4 border-b border-white/5">
          <button className="md:hidden p-2 rounded-lg glass" onClick={() => setMenuOpen(true)}>
            <Menu size={18} />
          </button>
          <nav className="glass rounded-xl p-1 flex gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="relative px-3 sm:px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2"
              >
                {tab === id && (
                  <motion.span
                    layoutId="tab-pill"
                    className="absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-500/80 to-violet-500/80"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon size={16} className="relative" />
                <span className="relative">{label}</span>
              </button>
            ))}
          </nav>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
            className="flex-1 min-h-0 flex flex-col"
          >
            {tab === "chat" && (
              <ChatView messages={messages} sending={sending} onSend={send} onDecide={decide} />
            )}
            {tab === "eval" && <EvalView onError={setError} />}
            {tab === "audit" && <AuditView onError={setError} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <Toast message={error} onClose={() => setError(null)} />
    </div>
  );
}
