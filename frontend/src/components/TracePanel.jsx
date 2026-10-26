import { CheckCircle2, XCircle, FileText, Brain, ShieldOff, Save, Cpu, UserCheck } from "lucide-react";

export function JsonBlock({ data, className = "" }) {
  return (
    <pre className={`rounded-lg bg-black/40 border border-white/5 p-2.5 text-[11px] font-mono text-slate-300 overflow-x-auto scroll-thin max-h-56 ${className}`}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function Section({ icon: Icon, title, color = "text-slate-300", children }) {
  return (
    <div>
      <h4 className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider mb-2 ${color}`}>
        <Icon size={13} /> {title}
      </h4>
      {children}
    </div>
  );
}

const DECISION_COLORS = {
  approved: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-rose-500/15 text-rose-300",
  pending: "bg-amber-500/15 text-amber-300",
};

export default function TracePanel({ trace = {} }) {
  const steps = trace.steps || [];
  const retrieved = trace.retrieved || [];
  const used = trace.memory_used || [];
  const saved = trace.memory_saved || [];
  const blocked = trace.memory_blocked || [];
  const approvals = trace.approvals || [];

  return (
    <div className="mt-3 glass rounded-xl p-4 space-y-5 text-xs">
      <Section icon={Cpu} title={`Tool timeline · ${trace.llm_calls ?? "?"} LLM calls`}>
        {steps.length === 0 ? (
          <p className="text-slate-500">No tools were called.</p>
        ) : (
          <ol className="relative border-l border-white/10 ml-1.5 space-y-4">
            {steps.map((s, i) => {
              const ok = s.ok !== false;
              return (
                <li key={i} className="pl-4 relative">
                  <span className={`absolute -left-[7px] top-0.5 rounded-full bg-[#0b1030] ${ok ? "text-emerald-400" : "text-rose-400"}`}>
                    {ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                  </span>
                  <p className="font-mono font-medium text-slate-100">
                    {i + 1}. {s.tool || "unknown"}
                    <span className={`ml-2 text-[10px] ${ok ? "text-emerald-400" : "text-rose-400"}`}>{ok ? "ok" : "error"}</span>
                  </p>
                  <div className="grid md:grid-cols-2 gap-2 mt-1.5">
                    <div>
                      <p className="text-[10px] text-slate-500 mb-1">args</p>
                      <JsonBlock data={s.args ?? {}} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 mb-1">result</p>
                      <JsonBlock data={s.result ?? null} className={ok ? "" : "border-rose-500/30 text-rose-200"} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Section>

      {approvals.length > 0 && (
        <Section icon={UserCheck} title="Approvals" color="text-amber-300">
          <div className="flex flex-wrap gap-2">
            {approvals.map((a, i) => (
              <span key={i} className={`rounded-md px-2 py-1 font-mono ${DECISION_COLORS[a.decision] || "bg-white/5"}`}>
                {a.tool} · {a.decision} {a.action_id && <span className="opacity-60">#{a.action_id}</span>}
              </span>
            ))}
          </div>
        </Section>
      )}

      {retrieved.length > 0 && (
        <Section icon={FileText} title="Retrieved policy chunks" color="text-sky-300">
          <div className="space-y-2">
            {retrieved.map((c, i) => (
              <div key={i} className="rounded-lg bg-white/5 p-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sky-300">{c.id}</span>
                  <span className="font-medium text-slate-200 truncate">{c.title}</span>
                  {c.score != null && (
                    <span className="ml-auto font-mono text-slate-400">{Number(c.score).toFixed(2)}</span>
                  )}
                </div>
                {c.text && <p className="mt-1 text-slate-400 line-clamp-3">{c.text}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {(used.length > 0 || saved.length > 0 || blocked.length > 0) && (
        <div className="grid md:grid-cols-3 gap-4">
          <Section icon={Brain} title="Memory used" color="text-fuchsia-300">
            {used.map((m, i) => (
              <p key={i} className="rounded bg-fuchsia-500/10 px-2 py-1 mb-1">{m.key}: {String(m.value)}</p>
            ))}
            {used.length === 0 && <p className="text-slate-500">—</p>}
          </Section>
          <Section icon={Save} title="Memory saved" color="text-emerald-300">
            {saved.map((m, i) => (
              <p key={i} className="rounded bg-emerald-500/10 text-emerald-200 px-2 py-1 mb-1">{m.key}: {String(m.value)}</p>
            ))}
            {saved.length === 0 && <p className="text-slate-500">—</p>}
          </Section>
          <Section icon={ShieldOff} title="Memory blocked" color="text-rose-300">
            {blocked.map((m, i) => (
              <div key={i} className="rounded bg-rose-500/10 text-rose-200 px-2 py-1 mb-1">
                <p className="truncate">{m.text}</p>
                <p className="text-[10px] text-rose-400">{m.reason}</p>
              </div>
            ))}
            {blocked.length === 0 && <p className="text-slate-500">—</p>}
          </Section>
        </div>
      )}
    </div>
  );
}
