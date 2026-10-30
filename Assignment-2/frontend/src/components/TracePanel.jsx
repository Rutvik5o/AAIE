import { CheckCircle2, XCircle, FileText, Brain, ShieldOff, Save, Cpu, UserCheck, ShieldCheck } from "lucide-react";
import { PermissionRow, ApprovalRow } from "./Pills";

export function JsonBlock({ data, className = "" }) {
  return (
    <pre className={`rounded-lg bg-surface-2/70 border border-line p-2.5 text-[12px] font-mono text-muted overflow-x-auto scroll-thin max-h-56 ${className}`}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function Section({ icon: Icon, title, color = "text-subtle", children }) {
  return (
    <div>
      <h4 className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide mb-2 ${color}`}>
        <Icon size={13} /> {title}
      </h4>
      {children}
    </div>
  );
}

// True when a tool result is a "Permission denied (P2): ..." error.
const isDenied = (result) => JSON.stringify(result ?? "").includes("Permission denied");

export default function TracePanel({ trace = {} }) {
  const steps = trace.steps || [];
  const retrieved = trace.retrieved || [];
  const used = trace.memory_used || [];
  const saved = trace.memory_saved || [];
  const blocked = trace.memory_blocked || [];
  const approvals = trace.approvals || [];
  const permissions = trace.permissions || [];

  return (
    <div className="mt-3 glass rounded-xl p-4 space-y-5 text-xs text-fg">
      <Section icon={Cpu} title={`Tool timeline · ${trace.llm_calls ?? "?"} LLM calls`}>
        {steps.length === 0 ? (
          <p className="text-subtle">No tools were called.</p>
        ) : (
          <ol className="relative border-l border-line-strong ml-1.5 space-y-4">
            {steps.map((s, i) => {
              const denied = isDenied(s.result);
              const ok = s.ok !== false && !denied;
              return (
                <li key={i} className="pl-4 relative">
                  <span className={`absolute -left-[7px] top-0.5 rounded-full bg-surface ${ok ? "text-ok" : "text-bad"}`}>
                    {ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                  </span>
                  <p className="font-mono font-medium text-fg">
                    {i + 1}. {s.tool || "unknown"}
                    <span className={`ml-2 text-[10px] ${ok ? "text-ok" : "text-bad"}`}>{ok ? "ok" : denied ? "permission denied" : "error"}</span>
                  </p>
                  <div className="grid md:grid-cols-2 gap-2 mt-1.5">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-subtle mb-1">args</p>
                      <JsonBlock data={s.args ?? {}} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-subtle mb-1">result</p>
                      <JsonBlock data={s.result ?? null} className={ok ? "" : "border-bad/30 bg-bad/5 text-bad"} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Section>

      {permissions.length > 0 && (
        <Section icon={ShieldCheck} title="Permission checks">
          <div className="space-y-1.5">
            {permissions.map((p, i) => (
              <PermissionRow key={i} p={p} />
            ))}
          </div>
        </Section>
      )}

      {approvals.length > 0 && (
        <Section icon={UserCheck} title="Approvals">
          <div className="space-y-1.5">
            {approvals.map((a, i) => (
              <ApprovalRow key={i} a={a} />
            ))}
          </div>
        </Section>
      )}

      {retrieved.length > 0 && (
        <Section icon={FileText} title="Retrieved policy chunks">
          <div className="space-y-2">
            {retrieved.map((c, i) => (
              <div key={i} className="rounded-lg bg-surface-2/50 border border-line border-l-2 border-l-brand-2/60 p-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-brand-2">{c.id}</span>
                  <span className="font-medium text-fg truncate">{c.title}</span>
                  {c.score != null && (
                    <span className="ml-auto rounded bg-brand-2/10 px-1.5 py-0.5 font-mono text-brand-2">{Number(c.score).toFixed(2)}</span>
                  )}
                </div>
                {c.text && <p className="mt-1 text-muted line-clamp-3">{c.text}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {(used.length > 0 || saved.length > 0 || blocked.length > 0) && (
        <div className="grid md:grid-cols-3 gap-4">
          <Section icon={Brain} title="Memory used">
            {used.map((m, i) => (
              <p key={i} className="rounded bg-brand/10 border border-brand/20 text-fg px-2 py-1 mb-1">{m.key}: {String(m.value)}</p>
            ))}
            {used.length === 0 && <p className="text-subtle">—</p>}
          </Section>
          <Section icon={Save} title="Memory saved">
            {saved.map((m, i) => (
              <p key={i} className="rounded bg-ok/10 border border-ok/30 text-ok px-2 py-1 mb-1">{m.key}: {String(m.value)}</p>
            ))}
            {saved.length === 0 && <p className="text-subtle">—</p>}
          </Section>
          <Section icon={ShieldOff} title="Memory blocked">
            {blocked.map((m, i) => (
              <div key={i} className="rounded bg-bad/10 border border-bad/30 text-bad px-2 py-1 mb-1">
                <p className="truncate">{m.text}</p>
                <p className="text-[10px] text-bad/80">{m.reason}</p>
              </div>
            ))}
            {blocked.length === 0 && <p className="text-subtle">—</p>}
          </Section>
        </div>
      )}
    </div>
  );
}
