import { AnimatePresence, motion } from "framer-motion";
import { Brain, Trash2 } from "lucide-react";

export default function MemoryCard({ facts = [], onForget }) {
  return (
    <div className="glass rounded-2xl p-4 flex-1 min-h-40">
      <div className="flex items-center gap-2 mb-3">
        <span className="grid place-items-center w-7 h-7 rounded-lg bg-brand/10 text-brand">
          <Brain size={15} />
        </span>
        <h2 className="text-sm font-semibold text-fg">Long-term memory</h2>
        <span className="ml-auto text-[11px] font-medium text-muted rounded-full bg-surface-2/60 border border-line px-2 py-0.5">
          {facts.length} facts
        </span>
      </div>

      {facts.length === 0 ? (
        <p className="text-xs text-subtle leading-relaxed">Nothing remembered yet. Facts the agent saves will appear here.</p>
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
                className="flex gap-2.5 rounded-xl bg-surface-2/60 border border-line px-3 py-2 text-xs hover:border-line-strong transition-colors"
              >
                <span className="mt-1.5 w-1.5 h-1.5 shrink-0 rounded-full bg-brand" />
                <div className="min-w-0">
                  <span className="text-brand font-medium">{f.key}</span>
                  <span className="text-fg/90">: {String(f.value ?? "")}</span>
                  {f.saved_at && (
                    <p className="text-[10px] text-subtle mt-0.5">{new Date(f.saved_at).toLocaleString()}</p>
                  )}
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {facts.length > 0 && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onForget}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-line py-2 text-xs font-medium text-muted hover:text-bad hover:border-bad/30 hover:bg-bad/10 transition-colors"
        >
          <Trash2 size={14} /> Forget all
        </motion.button>
      )}
    </div>
  );
}
