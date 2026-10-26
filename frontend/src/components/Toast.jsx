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
          className="fixed bottom-6 right-6 z-50 max-w-sm flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-950/80 backdrop-blur-lg px-4 py-3 shadow-2xl"
        >
          <AlertTriangle size={18} className="text-rose-400 mt-0.5 shrink-0" />
          <p className="text-sm text-rose-100">{message}</p>
          <button onClick={onClose} className="text-rose-300 hover:text-white">
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
