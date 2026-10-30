// Small coloured pills shared by the audit log, trace panel and evaluation views.

const TONE_CLASSES = {
  ok: "bg-ok/10 text-ok border-ok/30",
  bad: "bg-bad/10 text-bad border-bad/30",
  warn: "bg-warn/10 text-warn border-warn/30",
  brand: "bg-brand/10 text-brand border-brand/30",
  subtle: "bg-surface-2 text-subtle border-line",
};

const VALUE_TONES = {
  allowed: "ok",
  denied: "bad",
  approved: "ok",
  rejected: "bad",
  pending: "warn",
  expired: "warn",
  not_required: "subtle",
  success: "ok",
  failed: "bad",
  blocked: "bad",
  waiting: "warn",
  not_executed: "subtle",
};

export const toneOf = (value) => VALUE_TONES[value] || "subtle";

export function Pill({ value, tone, children, className = "" }) {
  const label = children ?? String(value ?? "—").replace(/_/g, " ");
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
        TONE_CLASSES[tone || toneOf(value)]
      } ${className}`}
    >
      {label}
    </span>
  );
}

export function RuleChip({ rule, title }) {
  if (!rule) return null;
  return (
    <span
      title={title}
      className="inline-flex items-center rounded-md border border-brand/30 bg-brand/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-brand whitespace-nowrap"
    >
      {rule}
    </span>
  );
}

// "S1001 → S1002", target highlighted when it differs from the actor.
export function ActorTarget({ actor, target }) {
  if (!actor && !target) return <span className="text-subtle">—</span>;
  const other = target && actor && target !== actor;
  return (
    <span className="font-mono text-[11px] whitespace-nowrap">
      <span className="text-fg">{actor || "?"}</span>
      <span className="text-subtle"> → </span>
      <span className={other ? "text-bad font-semibold" : "text-muted"}>{target || "—"}</span>
    </span>
  );
}

// One permission decision: tool, ALLOWED/DENIED, rule, reason, actor → target.
export function PermissionRow({ p }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-surface-2/50 border border-line px-2.5 py-1.5 text-xs">
      <span className="font-mono font-medium text-fg">{p.tool || "?"}</span>
      <Pill tone={p.allowed ? "ok" : "bad"}>{p.allowed ? "ALLOWED" : "DENIED"}</Pill>
      {p.needs_approval && <Pill tone="warn">needs approval</Pill>}
      <RuleChip rule={p.rule} />
      {p.reason && <span className="text-muted">{p.reason}</span>}
      <span className="ml-auto">
        <ActorTarget actor={p.actor} target={p.target} />
      </span>
    </div>
  );
}

// One approval: tool, decision pill, result pill, action id.
export function ApprovalRow({ a }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-surface-2/50 border border-line px-2.5 py-1.5 text-xs">
      <span className="font-mono font-medium text-fg">{a.tool || "?"}</span>
      <Pill value={a.decision} />
      {a.result && (
        <>
          <span className="text-subtle">→</span>
          <Pill value={a.result} />
        </>
      )}
      {a.action_id && <span className="ml-auto font-mono text-[11px] text-subtle">#{a.action_id}</span>}
    </div>
  );
}
