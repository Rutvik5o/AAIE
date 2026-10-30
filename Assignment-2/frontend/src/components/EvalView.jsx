import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Target, Timer, ArrowDownToLine, ArrowUpFromLine, Wrench, Loader2, Terminal, RefreshCw, ChevronDown, GitCompare, ShieldCheck,
} from "lucide-react";
import * as api from "../api";
import Logo from "./Logo";
import { Pill as StatusPill, RuleChip, PermissionRow, ApprovalRow } from "./Pills";

function StatCard({ icon: Icon, label, value, accent, delay, bar }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -3 }}
      className="glass rounded-2xl p-4 transition-colors hover:border-line-strong"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">{label}</p>
        <div className={`grid place-items-center w-8 h-8 rounded-lg shrink-0 ${accent}`}>
          <Icon size={16} />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold text-fg tabular-nums">{value}</p>
      {bar != null && (
        <div className="mt-3 h-1.5 rounded-full bg-surface-2 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-brand-gradient"
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(0, Math.min(100, bar))}%` }}
            transition={{ duration: 0.9, delay: delay + 0.15, ease: "easeOut" }}
          />
        </div>
      )}
    </motion.div>
  );
}

function BarChart({ title, rows, series }) {
  const max = Math.max(1, ...rows.map((r) => series.reduce((sum, s) => sum + (r[s.key] || 0), 0)));
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-4 mb-4">
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        <div className="ml-auto flex gap-3">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-[11px] text-muted">
              <span className={`w-2.5 h-2.5 rounded-sm ${s.color}`} /> {s.label}
            </span>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.id ?? i} className="flex items-center gap-3 text-xs">
            <span className="w-10 font-mono text-muted">{r.id}</span>
            <div className="flex-1 h-4 flex rounded bg-surface-2 overflow-hidden">
              {series.map((s) => (
                <motion.div
                  key={s.key}
                  className={`h-full ${s.color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${((r[s.key] || 0) / max) * 100}%` }}
                  transition={{ duration: 0.8, delay: i * 0.05, ease: "easeOut" }}
                />
              ))}
            </div>
            <span className="w-16 text-right font-mono text-fg">
              {series.length === 1 && series[0].format
                ? series[0].format(r[series[0].key])
                : series.reduce((sum, s) => sum + (r[s.key] || 0), 0).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const Pill = ({ ok }) => (
  <span
    className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
      ok ? "bg-ok/10 text-ok border-ok/30" : "bg-bad/10 text-bad border-bad/30"
    }`}
  >
    {ok ? "PASS" : "FAIL"}
  </span>
);

function Chips({ items, tone = "brand" }) {
  if (!items?.length) return <span className="text-subtle">—</span>;
  const cls =
    tone === "bad"
      ? "bg-bad/10 text-bad border-bad/30"
      : tone === "muted"
      ? "bg-surface-2 text-muted border-line"
      : "bg-brand/10 text-brand border-brand/30";
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((t, i) => (
        <span key={`${t}-${i}`} className={`rounded-md border px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap ${cls}`}>
          {t}
        </span>
      ))}
    </div>
  );
}

const GROUP_FILTERS = [
  ["all", "All"],
  ["task", "Task"],
  ["privacy", "Privacy"],
  ["unsafe_action", "Unsafe action"],
  ["memory_safety", "Memory"],
];
const GROUP_LABELS = Object.fromEntries(GROUP_FILTERS);

function GroupTile({ group, delay }) {
  const pct = group.total ? (group.passed / group.total) * 100 : 0;
  const allPass = group.total > 0 && group.passed === group.total;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass rounded-2xl p-4"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">{group.label}</p>
      <p className={`mt-2 text-xl font-bold tabular-nums ${allPass ? "text-ok" : "text-warn"}`}>
        {group.passed ?? 0} / {group.total ?? 0}
      </p>
      <div className="mt-3 h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${allPass ? "bg-ok" : "bg-warn"}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, delay: delay + 0.15, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}

function ComparisonTable({ rows }) {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <h3 className="flex items-center gap-2 px-5 pt-4 pb-3 text-sm font-semibold text-fg">
        <GitCompare size={15} className="text-brand" /> Assignment 1 vs Assignment 2
      </h3>
      <div className="overflow-x-auto scroll-thin">
        <table className="w-full text-xs">
          <thead className="text-left bg-surface-2/60 text-subtle uppercase text-[11px] tracking-wide">
            <tr>
              {["Metric", "Assignment 1", "Assignment 2", "Note"].map((h) => (
                <th key={h} className="px-4 py-2.5 font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-line align-top">
                <td className="px-4 py-2.5 font-medium text-fg min-w-44">{r.metric}</td>
                <td className="px-4 py-2.5 font-mono text-muted whitespace-nowrap">{r.a1 ?? "—"}</td>
                <td className="px-4 py-2.5 font-mono text-brand whitespace-nowrap">{r.a2 ?? "—"}</td>
                <td className="px-4 py-2.5 text-muted min-w-56">{r.note || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditLine({ e }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
      <span className="font-mono text-subtle">#{e.seq}</span>
      <span className="font-mono text-fg">{e.actor}</span>
      <span className="font-mono text-muted">{e.action}</span>
      {e.target && (
        <span className={`font-mono ${e.target !== e.actor ? "text-bad font-semibold" : "text-muted"}`}>→ {e.target}</span>
      )}
      <StatusPill value={e.permission} />
      <RuleChip rule={e.rule} />
      <StatusPill value={e.approval} />
      <StatusPill value={e.result} />
    </div>
  );
}

function ScenarioEvidence({ scenarios }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass rounded-2xl p-5">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 text-left">
        <ShieldCheck size={15} className="text-brand" />
        <h3 className="text-sm font-semibold text-fg">Scenario evidence</h3>
        <span className="text-xs text-muted">{scenarios.length} scenarios</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="ml-auto text-muted">
          <ChevronDown size={16} />
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
            <div className="mt-4 space-y-4">
              {scenarios.map((sc, i) => (
                <div key={i} className="rounded-xl border border-line bg-surface-2/40 p-3 space-y-2.5">
                  <p className="text-sm font-semibold text-fg">
                    {sc.scenario}
                    {sc.case_id && <span className="ml-2 font-mono text-xs text-subtle">{sc.case_id}</span>}
                  </p>
                  {sc.permissions?.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] uppercase tracking-wide text-subtle">Permission checks</p>
                      {sc.permissions.map((p, j) => <PermissionRow key={j} p={p} />)}
                    </div>
                  )}
                  {sc.approvals?.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] uppercase tracking-wide text-subtle">Approvals</p>
                      {sc.approvals.map((a, j) => <ApprovalRow key={j} a={a} />)}
                    </div>
                  )}
                  {sc.audit?.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] uppercase tracking-wide text-subtle">Audit entries</p>
                      {sc.audit.map((e, j) => <AuditLine key={j} e={e} />)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const list = (arr) => (arr?.length ? arr.join(", ") : "—");
const secs = (ms) => (ms == null ? "—" : `${(ms / 1000).toFixed(1)}s`);

export default function EvalView({ onError }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState("all");

  function load() {
    setLoading(true);
    api
      .getEval()
      .then(setData)
      .catch((e) => onError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  if (loading)
    return (
      <div className="flex-1 grid place-items-center text-muted">
        <Loader2 className="animate-spin" />
      </div>
    );

  const summary = data?.summary;
  const rows = data?.rows || [];

  if (!summary && rows.length === 0)
    return (
      <div className="flex-1 grid place-items-center px-4">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <div className="mx-auto mb-3 grid place-items-center w-11 h-11 rounded-xl bg-brand/10 text-brand">
            <Terminal size={20} />
          </div>
          <h3 className="font-semibold text-fg">No evaluation results yet</h3>
          <p className="text-sm text-muted mt-2">
            Run <code className="font-mono bg-surface-2 border border-line text-fg rounded px-1.5 py-0.5">python evaluate.py</code> in backend, then refresh.
          </p>
          <button
            onClick={load}
            className="mt-5 inline-flex items-center gap-2 glass rounded-lg px-3 py-1.5 text-sm text-muted hover:text-fg hover:border-line-strong transition-colors"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>
    );

  const s = summary || {};
  const groups = Object.values(s.groups || {});
  const comparison = data?.comparison || [];
  const scenarios = data?.scenarios || [];
  const shown = group === "all" ? rows : rows.filter((r) => r.group === group);
  return (
    <div className="flex-1 overflow-y-auto scroll-thin px-4 md:px-8 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center gap-y-2">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <div>
              <h2 className="text-xl font-bold text-gradient leading-tight">Evaluation results</h2>
              <p className="text-xs text-muted">
                {s.total ?? rows.length} test cases · tasks, privacy, unsafe actions and memory safety
                {s.model && <span className="font-mono text-subtle"> · {s.model}</span>}
              </p>
            </div>
          </div>
          <span className="ml-3 text-sm text-muted">
            {s.passed ?? rows.filter((r) => r.passed).length} / {s.total ?? rows.length} passed
          </span>
          <button
            onClick={load}
            className="ml-auto p-2 rounded-lg glass text-muted hover:text-fg hover:border-line-strong transition-colors"
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard delay={0} icon={Target} label="Answer accuracy" value={`${s.accuracy ?? "—"}%`} accent="bg-ok/10 text-ok" bar={s.accuracy ?? null} />
          <StatCard delay={0.05} icon={Wrench} label="Tool-choice accuracy" value={`${s.tool_accuracy ?? "—"}%`} accent="bg-brand/10 text-brand" bar={s.tool_accuracy ?? null} />
          <StatCard delay={0.1} icon={Timer} label="Avg latency" value={secs(s.avg_latency_ms)} accent="bg-brand-2/10 text-brand-2" />
          <StatCard delay={0.15} icon={ArrowDownToLine} label="Avg input tokens" value={Math.round(s.avg_input_tokens ?? 0).toLocaleString()} accent="bg-accent/10 text-accent" />
          <StatCard delay={0.2} icon={ArrowUpFromLine} label="Avg output tokens" value={Math.round(s.avg_output_tokens ?? 0).toLocaleString()} accent="bg-brand/10 text-brand" />
        </div>

        {groups.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {groups.map((g, i) => (
              <GroupTile key={g.label ?? i} group={g} delay={0.1 + i * 0.05} />
            ))}
          </div>
        )}

        {comparison.length > 0 && <ComparisonTable rows={comparison} />}

        <div className="grid lg:grid-cols-2 gap-4">
          <BarChart
            title="Latency per test"
            rows={rows}
            series={[{ key: "latency_ms", label: "latency", color: "bg-brand-gradient", format: secs }]}
          />
          <BarChart
            title="Tokens per test"
            rows={rows}
            series={[
              { key: "input_tokens", label: "input", color: "bg-brand" },
              { key: "output_tokens", label: "output", color: "bg-brand-2" },
            ]}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {GROUP_FILTERS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setGroup(key)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                group === key ? "bg-brand/10 text-brand border-brand/40" : "border-line text-muted hover:text-fg hover:border-line-strong"
              }`}
            >
              {label}
              <span className="ml-1.5 text-subtle">{key === "all" ? rows.length : rows.filter((r) => r.group === key).length}</span>
            </button>
          ))}
        </div>

        <div className="glass rounded-2xl overflow-x-auto scroll-thin">
          <table className="w-full text-xs">
            <thead className="text-left bg-surface-2/60 text-subtle uppercase text-[11px] tracking-wide">
              <tr>
                {["ID", "Group", "Question", "Expected tools", "Tools used", "Result", "Latency", "Tokens", "Evidence", "Notes"].map((h) => (
                  <th key={h} className="px-3 py-3 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((r, i) => {
                const failedChecks = Object.entries(r.checks || {})
                  .filter(([, ok]) => ok === false)
                  .map(([name]) => name);
                return (
                <motion.tr
                  key={r.id ?? i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 + i * 0.03 }}
                  className="border-t border-line hover:bg-brand/5 transition-colors align-top"
                >
                  <td className="px-3 py-3 font-mono text-muted">
                    {r.id}
                    {r.student_id && <p className="text-[10px] text-subtle">{r.student_id}</p>}
                  </td>
                  <td className="px-3 py-3">
                    {r.group ? <StatusPill tone="brand">{GROUP_LABELS[r.group] || r.group}</StatusPill> : <span className="text-subtle">—</span>}
                  </td>
                  <td className="px-3 py-3 min-w-56 text-fg">{r.question}</td>
                  <td className="px-3 py-3"><Chips items={r.expected_tools} tone="muted" /></td>
                  <td className="px-3 py-3"><Chips items={r.tools_used} tone={r.tool_ok === false ? "bad" : "brand"} /></td>
                  <td className="px-3 py-3">
                    <Pill ok={r.passed} />
                    {!r.passed && failedChecks.length > 0 && (
                      <div className="mt-1.5">
                        <Chips items={failedChecks} tone="bad" />
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 font-mono text-fg">{secs(r.latency_ms)}</td>
                  <td className="px-3 py-3 font-mono text-fg whitespace-nowrap">{r.input_tokens ?? "—"} / {r.output_tokens ?? "—"}</td>
                  <td className="px-3 py-3 font-mono text-brand-2">{list(r.evidence)}</td>
                  <td className="px-3 py-3 min-w-48 text-muted">{r.notes || "—"}</td>
                </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {scenarios.length > 0 && <ScenarioEvidence scenarios={scenarios} />}
      </div>
    </div>
  );
}
