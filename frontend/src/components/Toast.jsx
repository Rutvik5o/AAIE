import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

export default function Toast({ message, onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [message]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          className="glass fixed bottom-6 right-6 z-50 max-w-sm flex items-start gap-3 overflow-hidden rounded-xl pl-5 pr-4 py-3"
        >
          <span className="absolute inset-y-0 left-0 w-1 bg-bad" />
          <span className="grid place-items-center w-7 h-7 shrink-0 rounded-lg bg-bad/10 text-bad">
            <AlertTriangle size={16} />
          </span>
          <p className="text-sm text-fg pt-0.5">{message}</p>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-muted hover:text-bad hover:bg-bad/10 transition-colors"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
