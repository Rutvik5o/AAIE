import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck, ShieldX, RefreshCw, ChevronRight, Loader2 } from "lucide-react";
import * as api from "../api";
import { JsonBlock } from "./TracePanel";

const EVENT_COLORS = {
  login_success: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  login_failed: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  tool_call: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  tool_error: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  approval_requested: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  approval_granted: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  approval_rejected: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  memory_saved: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
  memory_blocked: "bg-pink-500/15 text-pink-300 border-pink-500/30",
  access_denied: "bg-red-500/20 text-red-300 border-red-500/40",
  logout: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

function EventRow({ ev, index }) {
  const [open, setOpen] = useState(false);
  const hasDetails = ev.details && Object.keys(ev.details).length > 0;

  return (
    <motion.li
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.6) }}
      className="relative pl-7"
    >
      <span className="absolute left-[5px] top-4 w-2.5 h-2.5 rounded-full bg-indigo-400 ring-4 ring-indigo-500/20" />
      <div className="glass rounded-xl px-4 py-3 hover:bg-white/[0.07] transition">
        <button
          onClick={() => hasDetails && setOpen(!open)}
          className="w-full flex flex-wrap items-center gap-x-3 gap-y-1 text-left text-xs"
        >
          <span className="font-mono text-slate-500">#{ev.seq}</span>
          <span className={`rounded-full border px-2.5 py-0.5 font-semibold ${EVENT_COLORS[ev.event] || "bg-white/5 text-slate-300 border-white/10"}`}>
            {ev.event}
          </span>
          <span className="text-slate-300">{ev.actor}</span>
          <span className="text-slate-500">{ev.ts ? new Date(ev.ts).toLocaleString() : ""}</span>
          <span className="ml-auto font-mono text-slate-500" title={ev.hash}>
            {ev.hash ? `${ev.hash.slice(0, 10)}…` : ""}
          </span>
          {hasDetails && (
            <motion.span animate={{ rotate: open ? 90 : 0 }} className="text-slate-400">
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
                <p className="mt-2 text-[10px] font-mono text-slate-500 break-all">prev: {ev.prev_hash}</p>
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
          <h2 className="text-xl font-bold">Audit log</h2>
          {data && (
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                valid ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/20 text-rose-300"
              }`}
            >
              {valid ? <ShieldCheck size={14} /> : <ShieldX size={14} />}
              {valid ? "Hash chain verified ✓" : "Tampering detected"}
            </motion.span>
          )}
          <button onClick={load} className="ml-auto p-2 rounded-lg glass hover:bg-white/10" title="Refresh">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {loading && !data ? (
          <div className="grid place-items-center py-20 text-slate-400">
            <Loader2 className="animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-slate-500">No audit events yet.</p>
        ) : (
          <ol className="relative space-y-3 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-px before:bg-white/10">
            {events.map((ev, i) => (
              <EventRow key={ev.seq ?? i} ev={ev} index={i} />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
