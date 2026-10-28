import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck, ShieldX, RefreshCw, ChevronRight, Loader2 } from "lucide-react";
import * as api from "../api";
import { JsonBlock } from "./TracePanel";

const TONES = {
  brand: { pill: "bg-brand/10 text-brand border-brand/30", dot: "bg-brand ring-brand/20" },
  brand2: { pill: "bg-brand-2/10 text-brand-2 border-brand-2/30", dot: "bg-brand-2 ring-brand-2/20" },
  bad: { pill: "bg-bad/10 text-bad border-bad/30", dot: "bg-bad ring-bad/20" },
  accent: { pill: "bg-accent/10 text-accent border-accent/30", dot: "bg-accent ring-accent/20" },
  warn: { pill: "bg-warn/10 text-warn border-warn/30", dot: "bg-warn ring-warn/20" },
  ok: { pill: "bg-ok/10 text-ok border-ok/30", dot: "bg-ok ring-ok/20" },
  neutral: { pill: "bg-surface-2 text-muted border-line", dot: "bg-subtle ring-line" },
};

const EVENT_TONES = {
  login_success: "brand2",
  login: "brand2",
  login_failed: "bad",
  access_denied: "bad",
  tool_error: "bad",
  tool_call: "brand",
  approval_requested: "warn",
  approval_granted: "accent",
  approval_rejected: "warn",
  memory_saved: "ok",
  memory_blocked: "warn",
};

function toneFor(event = "") {
  if (EVENT_TONES[event]) return TONES[EVENT_TONES[event]];
  if (event.includes("error") || event.includes("denied") || event.includes("failed")) return TONES.bad;
  if (event.startsWith("login")) return TONES.brand2;
  if (event.startsWith("approval")) return TONES.accent;
  if (event.startsWith("tool")) return TONES.brand;
  return TONES.neutral;
}

function EventRow({ ev, index }) {
  const [open, setOpen] = useState(false);
  const hasDetails = ev.details && Object.keys(ev.details).length > 0;
  const tone = toneFor(ev.event);

  return (
    <motion.li
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.6) }}
      className="relative pl-7"
    >
      <span className={`absolute left-[5px] top-4 w-2.5 h-2.5 rounded-full ring-4 ${tone.dot}`} />
      <div className="glass rounded-xl px-4 py-3 transition-colors hover:border-line-strong hover:bg-brand/5">
        <button
          onClick={() => hasDetails && setOpen(!open)}
          className="w-full flex flex-wrap items-center gap-x-3 gap-y-1 text-left text-xs"
        >
          <span className="font-mono text-subtle">#{ev.seq}</span>
          <span className={`rounded-full border px-2.5 py-0.5 font-semibold ${tone.pill}`}>
            {ev.event}
          </span>
          <span className="text-fg font-medium">{ev.actor}</span>
          <span className="text-subtle">{ev.ts ? new Date(ev.ts).toLocaleString() : ""}</span>
          <span className="ml-auto font-mono text-muted" title={ev.hash}>
            {ev.hash ? `${ev.hash.slice(0, 10)}…` : ""}
          </span>
          {hasDetails && (
            <motion.span animate={{ rotate: open ? 90 : 0 }} className="text-muted">
              <ChevronRight size={14} />
            </motion.span>
          )}
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <JsonBlock data={ev.details} className="mt-3" />
              {ev.prev_hash && (
                <p className="mt-2 text-[10px] font-mono text-muted break-all">prev: {ev.prev_hash}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.li>
  );
}

export default function AuditView({ onError }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api
      .getAudit()
      .then(setData)
      .catch((e) => onError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const events = [...(data?.events || [])].reverse();
  const valid = data?.chain_valid;

  return (
    <div className="flex-1 overflow-y-auto scroll-thin px-4 md:px-8 py-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <h2 className="text-xl font-bold text-gradient">Audit log</h2>
          {data && (
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                valid ? "bg-ok/10 text-ok border-ok/30" : "bg-bad/10 text-bad border-bad/30"
              }`}
            >
              {valid ? <ShieldCheck size={14} /> : <ShieldX size={14} />}
              {valid ? "Hash chain verified ✓" : "Tampering detected"}
            </motion.span>
          )}
          <button
            onClick={load}
            className="ml-auto p-2 rounded-lg glass text-muted hover:text-fg hover:border-line-strong transition-colors"
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {loading && !data ? (
          <div className="grid place-items-center py-20 text-muted">
            <Loader2 className="animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-subtle">No audit events yet.</p>
        ) : (
          <ol className="relative space-y-3 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-px before:bg-line">
            {events.map((ev, i) => (
              <EventRow key={ev.seq ?? i} ev={ev} index={i} />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
