import { motion } from "framer-motion";
import { ShieldAlert, Check, X } from "lucide-react";
import { JsonBlock } from "./TracePanel";

export default function ApprovalCard({ action, decision, busy, onDecide }) {
  const done = Boolean(decision);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.1 }}
      className="relative mt-3 rounded-2xl border border-warn/30 bg-warn/5 p-4 overflow-hidden"
    >
      {!done && (
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-warn/40 pointer-events-none"
          animate={{ opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      <div className="flex items-center gap-2 text-warn">
        <ShieldAlert size={16} />
        <span className="text-xs font-semibold uppercase tracking-wider">Approval required</span>
        {action.tool && <span className="ml-auto font-mono text-[11px] text-warn/80">{action.tool}</span>}
      </div>
      <p className="mt-2 text-sm text-fg">{action.summary || "The agent wants to perform an action."}</p>
      {action.args && <JsonBlock data={action.args} className="mt-3" />}

      <div className="mt-4 flex gap-2">
        {done ? (
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
              decision === "approved" ? "bg-ok/10 border border-ok/30 text-ok" : "bg-bad/10 border border-bad/30 text-bad"
            }`}
          >
            {decision === "approved" ? <Check size={14} /> : <X size={14} />}
            {decision === "approved" ? "Approved" : "Rejected"}
          </span>
        ) : (
          <>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              disabled={busy}
              onClick={() => onDecide(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-gradient glow px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              <Check size={14} /> Approve
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              disabled={busy}
              onClick={() => onDecide(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface/40 px-4 py-1.5 text-xs font-semibold text-muted hover:text-bad hover:border-bad/40 hover:bg-bad/5 transition-colors disabled:opacity-50"
            >
              <X size={14} /> Reject
            </motion.button>
          </>
        )}
      </div>
    </motion.div>
  );
}
