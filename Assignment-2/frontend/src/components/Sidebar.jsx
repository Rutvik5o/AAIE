import { AnimatePresence, motion } from "framer-motion";
import { Plus, LogOut, X } from "lucide-react";
import { Brand } from "./Logo";
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
        <Brand />
        <button
          className="ml-auto md:hidden p-1.5 rounded-lg text-muted hover:text-fg hover:bg-surface-2/60 transition-colors"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>

      <div className="glass rounded-2xl p-4 flex items-center gap-3">
        <div className="grid place-items-center w-11 h-11 shrink-0 rounded-full bg-brand-gradient text-white font-bold text-sm shadow-sm">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate text-fg">{student?.name}</p>
          <p className="text-xs text-muted truncate">
            {student?.student_id} · {student?.programme}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onLogout}
          title="Log out"
          className="p-2 rounded-lg text-muted hover:text-bad hover:bg-bad/10 transition-colors"
        >
          <LogOut size={16} />
        </motion.button>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={onNewSession}
        className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-brand border border-brand/30 bg-brand/5 hover:bg-brand/10 hover:border-brand/50 transition-colors"
      >
        <Plus size={16} /> New session
      </motion.button>
      {sessionId && (
        <p className="-mt-3 text-center text-[11px] text-subtle font-mono">session {sessionId}</p>
      )}

      <MemoryCard facts={facts} onForget={onForget} />
    </div>
  );

  return (
    <>
      <aside className="relative z-10 hidden md:block w-80 shrink-0 bg-surface/60 backdrop-blur-xl backdrop-saturate-150 border-r border-line shadow-[var(--shadow)]">
        {content}
      </aside>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-40 w-80 max-w-[85vw] bg-surface/95 backdrop-blur-xl border-r border-line shadow-2xl md:hidden"
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
