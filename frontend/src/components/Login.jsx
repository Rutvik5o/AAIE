import { useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { GraduationCap, KeyRound, LogIn, Loader2, Info } from "lucide-react";
import * as api from "../api";

export default function Login({ notice, onLogin }) {
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

  return (
    <div className="relative min-h-screen grid place-items-center px-4 font-sans overflow-hidden">
      <motion.div
        className="blob bg-indigo-600 w-[520px] h-[520px] -top-40 -left-40"
        animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
        transition={{ duration: 14, repeat: Infinity }}
      />
      <motion.div
        className="blob bg-fuchsia-600 w-[420px] h-[420px] -bottom-32 -right-20"
        animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
        transition={{ duration: 12, repeat: Infinity }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <motion.form animate={shake} onSubmit={submit} className="glass rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center mb-8">
            <motion.div
              initial={{ rotate: -20, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", delay: 0.15 }}
              className="grid place-items-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg shadow-indigo-500/40 mb-4"
            >
              <GraduationCap size={28} />
            </motion.div>
            <h1 className="text-2xl font-bold">Campus Assist</h1>
            <p className="text-sm text-slate-400 mt-1">Sign in to your student support agent</p>
          </div>

          <label className="block text-xs font-medium text-slate-400 mb-1.5">Student ID</label>
          <input
            list="students"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="e.g. S1001"
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-indigo-400 transition"
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
                  className={`text-xs rounded-lg px-3 py-1.5 border transition ${
                    studentId === s.student_id
                      ? "border-indigo-400 bg-indigo-500/20 text-indigo-100"
                      : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {s.name} <span className="text-slate-500">{s.student_id}</span>
                </motion.button>
              ))}
            </div>
          )}

          <label className="block text-xs font-medium text-slate-400 mb-1.5 mt-5">PIN</label>
          <div className="relative">
            <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="w-full rounded-xl bg-white/5 border border-white/10 pl-11 pr-4 py-3 text-sm outline-none focus:border-indigo-400 transition"
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            disabled={busy}
            className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl py-3 font-semibold bg-gradient-to-r from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/30 disabled:opacity-60"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            Sign in
          </motion.button>

          <p className="mt-5 flex items-start gap-2 text-xs text-slate-500">
            <Info size={14} className="shrink-0 mt-0.5" />
            Demo credentials: PIN = last 4 digits of student ID (e.g. S1001 → 1001)
          </p>
        </motion.form>
      </motion.div>
    </div>
  );
}
