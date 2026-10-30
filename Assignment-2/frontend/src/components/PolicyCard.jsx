import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Shield, ChevronDown } from "lucide-react";
import * as api from "../api";
import { RuleChip } from "./Pills";

// Collapsible list of the privacy / approval rules the backend enforces.
export default function PolicyCard() {
  const [policy, setPolicy] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.getPolicy().then(setPolicy).catch(() => setPolicy(null));
  }, []);

  const rules = Object.entries(policy?.rules || {});
  if (rules.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-4">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 text-left">
        <span className="grid place-items-center w-7 h-7 rounded-lg bg-brand/10 text-brand">
          <Shield size={15} />
        </span>
        <h2 className="text-sm font-semibold text-fg">Privacy & approval rules</h2>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="ml-auto text-muted">
          <ChevronDown size={16} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <ul className="mt-3 space-y-2">
              {rules.map(([id, text]) => (
                <li key={id} className="flex gap-2 text-xs leading-relaxed">
                  <span className="shrink-0 pt-0.5">
                    <RuleChip rule={id} />
                  </span>
                  <span className="text-muted">{text}</span>
                </li>
              ))}
            </ul>
            {policy?.editable_fields?.length > 0 && (
              <p className="mt-3 text-[11px] text-subtle">
                Editable with approval: <span className="text-muted">{policy.editable_fields.join(", ").replace(/_/g, " ")}</span>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
