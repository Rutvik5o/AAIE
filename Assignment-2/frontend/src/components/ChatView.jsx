import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import Logo from "./Logo";
import Message from "./Message";

const SUGGESTIONS = [
  "What is my current fee status?",
  "The payment portal failed. Can I pay on the next working day?",
  "What is my scholarship status?",
  "How do I change my course?",
  "Raise a ticket: my hostel Wi-Fi is not working",
  "Update my phone number to 9876501234",
  "Show me the fee details of S1001",
];

function Welcome({ onPick }) {
  return (
    <div className="flex flex-col items-center justify-center text-center h-full py-10">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring" }}
        className="mb-5"
      >
        <Logo size={68} animated />
      </motion.div>
      <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gradient">
        How can I help today?
      </h2>
      <p className="text-muted text-sm mt-2 max-w-md">
        Ask about fees, scholarships, courses or campus services. I can look up your own records, and raise tickets or update your contact details once you approve.
      </p>
      <div className="flex flex-wrap justify-center gap-2.5 mt-8 max-w-2xl">
        {SUGGESTIONS.map((s, i) => (
          <motion.button
            key={s}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.07 }}
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onPick(s)}
            className="glass rounded-xl px-4 py-2.5 text-sm text-fg hover:border-brand/40 hover:bg-brand/5 transition-colors"
          >
            {s}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export default function ChatView({ messages, sending, onSend, onDecide }) {
  const [text, setText] = useState("");
  const bottom = useRef(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: sending ? "auto" : "smooth", block: "end" });
  }, [messages, sending]);

  function submit() {
    if (!text.trim() || sending) return;
    onSend(text);
    setText("");
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto scroll-thin px-4 md:px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-5 h-full">
          {messages.length === 0 ? (
            <Welcome onPick={onSend} />
          ) : (
            messages.map((m, i) => (
              <Message key={i} msg={m} busy={sending} onDecide={(ok) => onDecide(i, ok)} />
            ))
          )}
          <div ref={bottom} />
        </div>
      </div>

      <div className="px-4 md:px-8 pb-5 pt-2">
        <div className="max-w-3xl mx-auto glass rounded-2xl flex items-end gap-2 p-2 focus-within:border-brand/50 focus-within:ring-4 focus-within:ring-brand/10 transition">
          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Ask Campus Assist anything…"
            className="flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-fg outline-none placeholder:text-subtle max-h-40"
          />
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            disabled={!text.trim() || sending}
            onClick={submit}
            className="grid place-items-center w-10 h-10 rounded-xl bg-brand-gradient glow text-white disabled:opacity-40 disabled:shadow-none transition-opacity"
          >
            <Send size={17} />
          </motion.button>
        </div>
      </div>
    </>
  );
}
