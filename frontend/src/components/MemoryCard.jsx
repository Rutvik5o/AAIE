import { AnimatePresence, motion } from "framer-motion";
import { Brain, Trash2 } from "lucide-react";

export default function MemoryCard({ facts = [], onForget }) {
  return (
    <div className="glass rounded-2xl p-4 flex-1 min-h-40">
      <div className="flex items-center gap-2 mb-3">
        <Brain size={16} className="text-fuchsia-400" />
        <h2 className="text-sm font-semibold">Long-term memory</h2>
        <span className="ml-auto text-xs text-slate-500">{facts.length} facts</span>
      </div>

      {facts.length === 0 ? (
        <p className="text-xs text-slate-500">Nothing remembered yet. Facts the agent saves will appear here.</p>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {facts.map((f, i) => (
              <motion.li
                key={`${f.key}-${f.value}-${i}`}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="rounded-lg bg-white/5 px-3 py-2 text-xs hover:bg-white/10 transition"
              >
                <span className="text-fuchsia-300 font-medium">{f.key}</span>
                <span className="text-slate-300">: {String(f.value ?? "")}</span>
                {f.saved_at && (
                  <p className="text-[10px] text-slate-500 mt-0.5">{new Date(f.saved_at).toLocaleString()}</p>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {facts.length > 0 && (
        <button
          onClick={onForget}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg border border-rose-500/30 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/10 transition"
        >
          <Trash2 size={14} /> Forget all
        </button>
      )}
    </div>
  );
}
