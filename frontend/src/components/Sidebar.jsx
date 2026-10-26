import { AnimatePresence, motion } from "framer-motion";
import { GraduationCap, Plus, LogOut, X } from "lucide-react";
import MemoryCard from "./MemoryCard";

export default function Sidebar({ open, onClose, student, onLogout, sessionId, onNewSession, facts, onForget }) {
  const initials = (student?.name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  const content = (
    <div className="flex h-full flex-col gap-5 p-5 overflow-y-auto scroll-thin">
      <div className="flex items-center gap-3">
        <div className="grid place-items-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg shadow-indigo-500/30">
          <GraduationCap size={22} />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight">Campus Assist</h1>
          <p className="text-xs text-slate-400">AI Student Support Agent</p>
        </div>
        <button className="ml-auto md:hidden text-slate-400" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className="glass rounded-2xl p-4 flex items-center gap-3">
        <div className="grid place-items-center w-11 h-11 rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 font-bold text-sm">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">{student?.name}</p>
          <p className="text-xs text-slate-400">
            {student?.student_id} · {student?.programme}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onLogout}
          title="Log out"
          className="p-2 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10"
        >
          <LogOut size={16} />
        </motion.button>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={onNewSession}
        className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold bg-gradient-to-r from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/25"
      >
        <Plus size={16} /> New session
      </motion.button>
      {sessionId && (
        <p className="-mt-3 text-center text-[11px] text-slate-500 font-mono">session {sessionId}</p>
      )}

      <MemoryCard facts={facts} onForget={onForget} />
    </div>
  );

  return (
    <>
      <aside className="relative z-10 hidden md:block w-80 shrink-0 glass border-y-0 border-l-0">{content}</aside>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-30 bg-black/60 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-40 w-80 max-w-[85vw] bg-[#0b1030]/95 backdrop-blur-xl border-r border-white/10 md:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
            >
              {content}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
