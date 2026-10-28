import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Target, Timer, ArrowDownToLine, ArrowUpFromLine, Wrench, Loader2, Terminal, RefreshCw } from "lucide-react";
import * as api from "../api";
import Logo from "./Logo";

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

const list = (arr) => (arr?.length ? arr.join(", ") : "—");
const secs = (ms) => (ms == null ? "—" : `${(ms / 1000).toFixed(1)}s`);

export default function EvalView({ onError }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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
  return (
    <div className="flex-1 overflow-y-auto scroll-thin px-4 md:px-8 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <div>
              <h2 className="text-xl font-bold text-gradient leading-tight">Evaluation results</h2>
              <p className="text-xs text-muted">13 test cases · accuracy, tools, latency and tokens</p>
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

        <div className="glass rounded-2xl overflow-x-auto scroll-thin">
          <table className="w-full text-xs">
            <thead className="text-left bg-surface-2/60 text-subtle uppercase text-[11px] tracking-wide">
              <tr>
                {["ID", "Question", "Expected tools", "Tools used", "Result", "Latency", "Tokens", "Evidence", "Notes"].map((h) => (
                  <th key={h} className="px-3 py-3 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <motion.tr
                  key={r.id ?? i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 + i * 0.03 }}
                  className="border-t border-line hover:bg-brand/5 transition-colors align-top"
                >
                  <td className="px-3 py-3 font-mono text-muted">{r.id}</td>
                  <td className="px-3 py-3 min-w-56 text-fg">{r.question}</td>
                  <td className="px-3 py-3"><Chips items={r.expected_tools} tone="muted" /></td>
                  <td className="px-3 py-3"><Chips items={r.tools_used} tone={r.tool_ok === false ? "bad" : "brand"} /></td>
                  <td className="px-3 py-3"><Pill ok={r.passed} /></td>
                  <td className="px-3 py-3 font-mono text-fg">{secs(r.latency_ms)}</td>
                  <td className="px-3 py-3 font-mono text-fg whitespace-nowrap">{r.input_tokens ?? "—"} / {r.output_tokens ?? "—"}</td>
                  <td className="px-3 py-3 font-mono text-brand-2">{list(r.evidence)}</td>
                  <td className="px-3 py-3 min-w-48 text-muted">{r.notes || "—"}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
