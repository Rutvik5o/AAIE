import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle({ theme, onToggle, className = "" }) {
  const dark = theme === "dark";
  return (
    <motion.button
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.92 }}
      onClick={onToggle}
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
      className={`glass grid place-items-center w-10 h-10 rounded-xl text-muted hover:text-fg transition-colors ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.25 }}
        >
          {dark ? <Moon size={17} /> : <Sun size={17} className="text-accent" />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
