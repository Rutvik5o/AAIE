import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Target, Timer, ArrowDownToLine, ArrowUpFromLine, Wrench, Loader2, Terminal, RefreshCw } from "lucide-react";
import * as api from "../api";

function StatCard({ icon: Icon, label, value, accent, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -3 }}
      className="glass rounded-2xl p-4"
    >
      <div className={`inline-grid place-items-center w-8 h-8 rounded-lg mb-3 ${accent}`}>
        <Icon size={16} />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </motion.div>
  );
}

function BarChart({ title, rows, series }) {
  const max = Math.max(1, ...rows.map((r) => series.reduce((sum, s) => sum + (r[s.key] || 0), 0)));
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-4 mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="ml-auto flex gap-3">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className={`w-2.5 h-2.5 rounded-sm ${s.color}`} /> {s.label}
            </span>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.id ?? i} className="flex items-center gap-3 text-xs">
            <span className="w-10 font-mono text-slate-400">{r.id}</span>
            <div className="flex-1 h-4 flex rounded bg-white/5 overflow-hidden">
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
            <span className="w-16 text-right font-mono text-slate-300">
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
  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ok ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
    {ok ? "PASS" : "FAIL"}
  </span>
);

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
      <div className="flex-1 grid place-items-center text-slate-400">
        <Loader2 className="animate-spin" />
      </div>
    );

  const summary = data?.summary;
  const rows = data?.rows || [];

  if (!summary && rows.length === 0)
    return (
      <div className="flex-1 grid place-items-center px-4">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <Terminal className="mx-auto text-indigo-300 mb-3" />
          <h3 className="font-semibold">No evaluation results yet</h3>
          <p className="text-sm text-slate-400 mt-2">
            Run <code className="font-mono bg-white/10 rounded px-1.5 py-0.5">python evaluate.py</code> in backend, then refresh.
          </p>
          <button onClick={load} className="mt-5 inline-flex items-center gap-2 text-sm text-indigo-300 hover:text-white">
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
          <h2 className="text-xl font-bold">Evaluation results</h2>
          <span className="ml-3 text-sm text-slate-400">
            {s.passed ?? rows.filter((r) => r.passed).length} / {s.total ?? rows.length} passed
          </span>
          <button onClick={load} className="ml-auto p-2 rounded-lg glass hover:bg-white/10" title="Refresh">
            <RefreshCw size={15} />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard delay={0} icon={Target} label="Answer accuracy" value={`${s.accuracy ?? "—"}%`} accent="bg-emerald-500/20 text-emerald-300" />
          <StatCard delay={0.05} icon={Wrench} label="Tool-choice accuracy" value={`${s.tool_accuracy ?? "—"}%`} accent="bg-indigo-500/20 text-indigo-300" />
          <StatCard delay={0.1} icon={Timer} label="Avg latency" value={secs(s.avg_latency_ms)} accent="bg-sky-500/20 text-sky-300" />
          <StatCard delay={0.15} icon={ArrowDownToLine} label="Avg input tokens" value={Math.round(s.avg_input_tokens ?? 0).toLocaleString()} accent="bg-violet-500/20 text-violet-300" />
          <StatCard delay={0.2} icon={ArrowUpFromLine} label="Avg output tokens" value={Math.round(s.avg_output_tokens ?? 0).toLocaleString()} accent="bg-fuchsia-500/20 text-fuchsia-300" />
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <BarChart
            title="Latency per test"
            rows={rows}
            series={[{ key: "latency_ms", label: "latency", color: "bg-gradient-to-r from-sky-500 to-indigo-500", format: secs }]}
          />
          <BarChart
            title="Tokens per test"
            rows={rows}
            series={[
              { key: "input_tokens", label: "input", color: "bg-violet-500" },
              { key: "output_tokens", label: "output", color: "bg-fuchsia-400" },
            ]}
          />
        </div>

        <div className="glass rounded-2xl overflow-x-auto scroll-thin">
          <table className="w-full text-xs">
            <thead className="text-left text-slate-400 border-b border-white/10">
              <tr>
                {["ID", "Question", "Expected tools", "Tools used", "Result", "Latency", "Tokens", "Evidence", "Notes"].map((h) => (
                  <th key={h} className="px-3 py-3 font-medium whitespace-nowrap">{h}</th>
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
                  className="border-b border-white/5 hover:bg-white/5 align-top"
                >
                  <td className="px-3 py-3 font-mono text-slate-400">{r.id}</td>
                  <td className="px-3 py-3 min-w-56 text-slate-200">{r.question}</td>
                  <td className="px-3 py-3 font-mono text-slate-400">{list(r.expected_tools)}</td>
                  <td className={`px-3 py-3 font-mono ${r.tool_ok === false ? "text-rose-300" : "text-indigo-200"}`}>{list(r.tools_used)}</td>
                  <td className="px-3 py-3"><Pill ok={r.passed} /></td>
                  <td className="px-3 py-3 font-mono">{secs(r.latency_ms)}</td>
                  <td className="px-3 py-3 font-mono whitespace-nowrap">{r.input_tokens ?? "—"} / {r.output_tokens ?? "—"}</td>
                  <td className="px-3 py-3 font-mono text-sky-300">{list(r.evidence)}</td>
                  <td className="px-3 py-3 min-w-48 text-slate-400">{r.notes || "—"}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
