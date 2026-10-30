import { useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { KeyRound, LogIn, Loader2, Info } from "lucide-react";
import Logo from "./Logo";
import * as api from "../api";
import ThemeToggle from "./ThemeToggle";

export default function Login({ notice, onLogin, theme, onToggleTheme }) {
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState(notice);
  const [busy, setBusy] = useState(false);
  const shake = useAnimation();

  useEffect(() => {
    api
      .getStudents()
      .then((list) => setStudents(list || []))
      .catch((e) => setError(e.message));
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!studentId.trim() || !pin.trim()) return;
    setBusy(true);
    setError(null);
    try {
      onLogin(await api.login(studentId.trim().toUpperCase(), pin.trim()));
    } catch (err) {
      setError(err.message);
      shake.start({ x: [0, -12, 12, -8, 8, -4, 0], transition: { duration: 0.45 } });
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-xl bg-surface-2/60 border border-line py-3 text-sm text-fg placeholder:text-subtle outline-none focus:border-brand/60 focus:ring-4 focus:ring-brand/15 transition";

  return (
    <div className="relative z-10 min-h-screen grid place-items-center px-4 py-10 font-sans">
      <div className="fixed top-4 right-4 z-20">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <motion.form animate={shake} onSubmit={submit} className="glass rounded-3xl p-8 sm:p-9">
          <div className="flex flex-col items-center text-center mb-8">
            <motion.div
              initial={{ rotate: -20, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", delay: 0.15 }}
              className="mb-5"
            >
              <Logo size={72} animated />
            </motion.div>
            <h1 className="text-3xl font-extrabold tracking-tight text-fg">
              Campus <span className="text-gradient">Assist</span>
            </h1>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">AI Student Support Agent</p>
            <p className="text-sm text-muted mt-3">Sign in to get help with fees, scholarships and courses</p>
          </div>

          <label className="block text-xs font-medium text-muted mb-1.5">Student ID</label>
          <input
            list="students"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="e.g. S1001"
            className={`${inputCls} px-4`}
          />
          <datalist id="students">
            {students.map((s) => (
              <option key={s.student_id} value={s.student_id}>
                {s.name} · {s.programme}
              </option>
            ))}
          </datalist>

          {students.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {students.map((s) => (
                <motion.button
                  type="button"
                  key={s.student_id}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setStudentId(s.student_id)}
                  className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${
                    studentId === s.student_id
                      ? "border-brand/40 bg-brand/10 text-brand"
                      : "border-line bg-surface-2/60 text-muted hover:text-fg hover:border-line-strong"
                  }`}
                >
                  {s.name} <span className="font-mono text-subtle">{s.student_id}</span>
                </motion.button>
              ))}
            </div>
          )}

          <label className="block text-xs font-medium text-muted mb-1.5 mt-5">PIN</label>
          <div className="relative">
            <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className={`${inputCls} pl-11 pr-4`}
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-sm text-bad bg-bad/10 border border-bad/30 rounded-xl px-3 py-2"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            disabled={busy}
            className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl py-3 font-semibold bg-brand-gradient glow text-white disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            Sign in
          </motion.button>

          <p className="mt-5 flex items-start gap-2 text-xs text-subtle">
            <Info size={14} className="shrink-0 mt-0.5" />
            Demo credentials: PIN = last 4 digits of student ID (e.g. S1001 → 1001)
          </p>
        </motion.form>
      </motion.div>
    </div>
  );
}
