import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, ChevronDown, Clock, Coins, Wrench } from "lucide-react";
import Markdown from "./Markdown";
import TracePanel from "./TracePanel";
import ApprovalCard from "./ApprovalCard";

function Badge({ icon: Icon, children, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-[11px] text-slate-300 ${className}`}>
      {Icon && <Icon size={11} />}
      {children}
    </span>
  );
}

export default function Message({ msg, busy, onDecide }) {
  const [open, setOpen] = useState(false);
  const isUser = msg.role === "user";
  const trace = msg.trace;
  const tools = [...new Set((trace?.steps || []).map((s) => s.tool).filter(Boolean))];
  const tokens = trace?.tokens || {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className={`flex gap-3 ${isUser ? "justify-end" : ""}`}
    >
      {!isUser && (
        <div className="grid place-items-center w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500">
          <Bot size={16} />
        </div>
      )}

      <div className={`min-w-0 ${isUser ? "max-w-[80%]" : "flex-1"}`}>
        <div
          className={
            isUser
              ? "rounded-2xl rounded-tr-sm bg-gradient-to-br from-indigo-500 to-violet-600 px-4 py-2.5 text-sm shadow-lg shadow-indigo-900/40 whitespace-pre-wrap"
              : `rounded-2xl rounded-tl-sm px-4 py-3 text-sm ${msg.error ? "border border-rose-500/30 bg-rose-500/10 text-rose-200" : "glass text-slate-200"}`
          }
        >
          {isUser ? msg.content : <Markdown text={msg.content} />}
        </div>

        {msg.pending && <ApprovalCard action={msg.pending} decision={msg.decision} busy={busy} onDecide={onDecide} />}

        {trace && (
          <>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {trace.latency_ms != null && <Badge icon={Clock}>{(trace.latency_ms / 1000).toFixed(1)}s</Badge>}
              {(tokens.input != null || tokens.output != null) && (
                <Badge icon={Coins}>
                  in {(tokens.input ?? 0).toLocaleString()} / out {(tokens.output ?? 0).toLocaleString()}
                </Badge>
              )}
              {tools.map((t) => (
                <Badge key={t} icon={Wrench} className="text-indigo-200 border-indigo-400/30 bg-indigo-500/10">
                  {t}
                </Badge>
              ))}
              <button
                onClick={() => setOpen(!open)}
                className="ml-1 inline-flex items-center gap-1 text-[11px] text-indigo-300 hover:text-indigo-100"
              >
                {open ? "Hide trace" : "View trace"}
                <motion.span animate={{ rotate: open ? 180 : 0 }}>
                  <ChevronDown size={13} />
                </motion.span>
              </button>
            </div>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <TracePanel trace={trace} />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </motion.div>
  );
}
