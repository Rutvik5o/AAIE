import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck, ShieldX, RefreshCw, ChevronRight, Loader2 } from "lucide-react";
import * as api from "../api";
import { JsonBlock } from "./TracePanel";
import { Pill, RuleChip } from "./Pills";
import Logo from "./Logo";

const WRITE_ACTIONS = ["update_contact_details", "create_support_ticket", "save_memory", "clear_memory"];

const FILTERS = {
  all: { label: "All", test: () => true },
  denied: { label: "Denied", test: (e) => e.permission === "denied" },
  approvals: { label: "Approvals", test: (e) => e.approval && e.approval !== "not_required" },
  writes: { label: "Writes", test: (e) => WRITE_ACTIONS.includes(e.action) },
};

// Desktop grid: Time · Who · Action · Target · Permission · Approval · Result
const GRID = "md:grid md:grid-cols-[9rem_5rem_minmax(0,1fr)_5rem_8rem_7rem_7rem_1rem] md:items-center md:gap-3";

const time = (ts) => (ts ? new Date(ts).toLocaleString() : "—");
const short = (h) => (h ? `${h.slice(0, 12)}…` : "—");

function Cell({ label, children }) {
  // On mobile each cell shows its own label; on desktop the header row does that.
  return (
    <div className="flex items-center gap-2 md:block min-w-0">
      <span className="md:hidden w-20 shrink-0 text-[10px] uppercase tracking-wide text-subtle">{label}</span>
      {children}
    </div>
  );
}

function EventRow({ ev, index }) {
  const [open, setOpen] = useState(false);
  const denied = ev.permission === "denied";

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.4) }}
      className={`border-t border-line first:border-t-0 ${denied ? "bg-bad/5" : ""}`}
    >
      <button
        onClick={() => setOpen(!open)}
        className={`w-full text-left text-xs px-4 py-3 space-y-1.5 md:space-y-0 hover:bg-brand/5 transition-colors ${GRID}`}
      >
        <Cell label="Time">
          <span className="text-muted">
            <span className="font-mono text-subtle mr-1.5">#{ev.seq}</span>
            {time(ev.ts)}
          </span>
        </Cell>
        <Cell label="Who">
          <span className="font-mono font-medium text-fg">{ev.actor || "—"}</span>
        </Cell>
        <Cell label="Action">
          <span className="font-mono text-fg truncate">{ev.action || "—"}</span>
        </Cell>
        <Cell label="Target">
          <span
            className={`font-mono ${ev.target && ev.target !== ev.actor ? "text-bad font-semibold" : "text-muted"}`}
            title={ev.target && ev.target !== ev.actor ? "Different student from the actor" : undefined}
          >
            {ev.target || "—"}
          </span>
        </Cell>
        <Cell label="Permission">
          <span className="inline-flex items-center gap-1">
            <Pill value={ev.permission} />
            <RuleChip rule={ev.rule} />
          </span>
        </Cell>
        <Cell label="Approval">
          <Pill value={ev.approval} />
        </Cell>
        <Cell label="Result">
          <Pill value={ev.result} />
        </Cell>
        <motion.span animate={{ rotate: open ? 90 : 0 }} className="hidden md:block text-muted">
          <ChevronRight size={14} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <JsonBlock data={ev.details ?? {}} />
              <p className="mt-2 text-[10px] font-mono text-muted break-all">
                hash: <span title={ev.hash}>{short(ev.hash)}</span> · prev: <span title={ev.prev_hash}>{short(ev.prev_hash)}</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

export default function AuditView({ onError }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  function load() {
    setLoading(true);
    api
      .getAudit()
      .then(setData)
      .catch((e) => onError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const all = [...(data?.events || [])].reverse();
  const events = all.filter(FILTERS[filter].test);
  const valid = data?.chain_valid;

  return (
    <div className="flex-1 overflow-y-auto scroll-thin px-4 md:px-8 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <div>
              <h2 className="text-xl font-bold text-gradient leading-tight">Audit log</h2>
              <p className="text-xs text-muted">Who did what, whether it was allowed, approved and what happened</p>
            </div>
          </div>
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

        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(FILTERS).map(([key, f]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                filter === key
                  ? "bg-brand/10 text-brand border-brand/40"
                  : "border-line text-muted hover:text-fg hover:border-line-strong"
              }`}
            >
              {f.label}
              <span className="ml-1.5 text-subtle">{all.filter(f.test).length}</span>
            </button>
          ))}
        </div>

        {loading && !data ? (
          <div className="grid place-items-center py-20 text-muted">
            <Loader2 className="animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-subtle">No audit events{filter === "all" ? " yet" : " match this filter"}.</p>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <div className={`hidden px-4 py-3 bg-surface-2/60 text-subtle uppercase text-[11px] font-semibold tracking-wide ${GRID}`}>
              {["Time", "Who", "Action", "Target", "Permission", "Approval", "Result", ""].map((h, i) => (
                <span key={i}>{h}</span>
              ))}
            </div>
            <ol>
              {events.map((ev, i) => (
                <EventRow key={ev.seq ?? i} ev={ev} index={i} />
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
