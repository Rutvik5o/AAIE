import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Check, X, ArrowRight, Clock } from "lucide-react";
import { JsonBlock } from "./TracePanel";
import { RuleChip } from "./Pills";

// Seconds left until expires_at (null when the backend sent no expiry).
function useSecondsLeft(expiresAt, active) {
  const calc = () => (expiresAt ? Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000)) : null);
  const [left, setLeft] = useState(calc);

  useEffect(() => {
    setLeft(calc());
    if (!expiresAt || !active) return;
    const id = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(id);
  }, [expiresAt, active]);

  return left;
}

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function ApprovalCard({ action, decision, busy, onDecide }) {
  const done = Boolean(decision);
  const left = useSecondsLeft(action.expires_at, !done);
  const expired = left === 0;
  const change = action.change;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.1 }}
      className="relative mt-3 rounded-2xl border border-warn/30 bg-warn/5 p-4 overflow-hidden"
    >
      {!done && !expired && (
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-warn/40 pointer-events-none"
          animate={{ opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      <div className="flex flex-wrap items-center gap-2 text-warn">
        <ShieldAlert size={16} />
        <span className="text-xs font-semibold uppercase tracking-wider">Approval required</span>
        {action.tool && <span className="ml-auto font-mono text-[11px] text-warn/80">{action.tool}</span>}
      </div>
      <p className="mt-2 text-sm text-fg">{action.summary || "The agent wants to perform an action."}</p>

      {change ? (
        <div className="mt-3 rounded-xl border border-line bg-surface-2/60 p-3 text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle mb-1.5">{change.label || change.field}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted line-through decoration-bad/60">{change.old_value || "(empty)"}</span>
            <ArrowRight size={14} className="text-subtle shrink-0" />
            <span className="rounded-md bg-ok/10 border border-ok/30 px-2 py-0.5 font-semibold text-ok">{change.new_value}</span>
          </div>
        </div>
      ) : (
        action.args && <JsonBlock data={action.args} className="mt-3" />
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {action.rule && (
          <span className="inline-flex items-center gap-1.5 text-muted">
            <RuleChip rule={action.rule} />
            {action.rule_text}
          </span>
        )}
        {!done && left != null && (
          <span className={`ml-auto inline-flex items-center gap-1 font-medium tabular-nums ${expired ? "text-bad" : "text-warn"}`}>
            <Clock size={13} />
            {expired ? "Expired" : `Expires in ${mmss(left)}`}
          </span>
        )}
      </div>

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
              disabled={busy || expired}
              onClick={() => onDecide(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-gradient glow px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
