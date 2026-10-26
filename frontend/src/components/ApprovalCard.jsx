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
      className="relative mt-3 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 overflow-hidden"
    >
      {!done && (
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-amber-400/50 pointer-events-none"
          animate={{ opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      <div className="flex items-center gap-2 text-amber-200">
        <ShieldAlert size={16} />
        <span className="text-xs font-semibold uppercase tracking-wider">Approval required</span>
        {action.tool && <span className="ml-auto font-mono text-[11px] text-amber-300/80">{action.tool}</span>}
      </div>
      <p className="mt-2 text-sm text-slate-100">{action.summary || "The agent wants to perform an action."}</p>
      {action.args && <JsonBlock data={action.args} className="mt-3" />}

      <div className="mt-4 flex gap-2">
        {done ? (
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
              decision === "approved" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-emerald-950 disabled:opacity-50"
            >
              <Check size={14} /> Approve
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              disabled={busy}
              onClick={() => onDecide(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/40 px-4 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
            >
              <X size={14} /> Reject
            </motion.button>
          </>
        )}
      </div>
    </motion.div>
  );
}
