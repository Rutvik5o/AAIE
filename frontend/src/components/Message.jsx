import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, ChevronDown, Clock, Coins, Search, Sparkles, Wrench, Zap } from "lucide-react";
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

function TypingDots() {
  return (
    <span className="flex gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full bg-indigo-300"
          animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

// Live "what the agent is doing" line shown while a reply streams
function StatusLine({ status }) {
  const Icon = status?.tool ? Wrench : status?.text?.startsWith("Searching") ? Search : Sparkles;
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status?.text}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 8 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-2 mb-2 text-xs text-indigo-200"
      >
        <motion.span animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
          <Icon size={13} />
        </motion.span>
        <span className="shimmer-text">{status?.text}…</span>
      </motion.div>
    </AnimatePresence>
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
        {msg.streaming && <StatusLine status={msg.status} />}
        <div
          className={
            isUser
              ? "rounded-2xl rounded-tr-sm bg-gradient-to-br from-indigo-500 to-violet-600 px-4 py-2.5 text-sm shadow-lg shadow-indigo-900/40 whitespace-pre-wrap"
              : `rounded-2xl rounded-tl-sm px-4 py-3 text-sm ${msg.error ? "border border-rose-500/30 bg-rose-500/10 text-rose-200" : "glass text-slate-200"}`
          }
        >
          {isUser ? (
            msg.content
          ) : msg.streaming && !msg.content ? (
            <TypingDots />
          ) : (
            <>
              <Markdown text={msg.content} />
              {msg.streaming && <span className="stream-cursor" />}
            </>
          )}
        </div>

        {msg.pending && <ApprovalCard action={msg.pending} decision={msg.decision} busy={busy} onDecide={onDecide} />}

        {trace && (
          <>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {trace.latency_ms != null && <Badge icon={Clock}>{(trace.latency_ms / 1000).toFixed(1)}s</Badge>}
              {trace.first_token_ms != null && (
                <Badge icon={Zap}>first token {(trace.first_token_ms / 1000).toFixed(1)}s</Badge>
              )}
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
