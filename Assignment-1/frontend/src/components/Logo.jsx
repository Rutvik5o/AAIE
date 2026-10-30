import { useId } from "react";
import { motion } from "framer-motion";

// Campus Assist mark: a graduation cap resting on a chat bubble, on the brand gradient
export default function Logo({ size = 40, animated = false, className = "" }) {
  const id = "logo" + useId().replace(/:/g, "");
  const dots = [15.5, 21.5, 27.5];

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={`shrink-0 glow rounded-[28%] ${className}`}
      animate={animated ? { y: [0, -4, 0] } : undefined}
      transition={animated ? { duration: 4, repeat: Infinity, ease: "easeInOut" } : undefined}
      aria-label="Campus Assist logo"
      role="img"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "var(--brand)" }} />
          <stop offset="1" style={{ stopColor: "var(--brand-2)" }} />
        </linearGradient>
        <linearGradient id={id + "s"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="48" height="48" rx="13" fill={`url(#${id})`} />
      <rect width="48" height="48" rx="13" fill={`url(#${id}s)`} />

      {/* chat bubble */}
      <path d="M16 17h13a7 7 0 0 1 7 7v4a7 7 0 0 1-7 7h-8l-6 5v-5.4A7 7 0 0 1 9 28v-4a7 7 0 0 1 7-7z" fill="#fff" />
      {dots.map((cx, i) => (
        <motion.circle
          key={cx}
          cx={cx}
          cy="26.5"
          r="2.1"
          fill={`url(#${id})`}
          animate={animated ? { opacity: [0.35, 1, 0.35] } : undefined}
          transition={animated ? { duration: 1.4, repeat: Infinity, delay: i * 0.2 } : undefined}
        />
      ))}

      {/* graduation cap */}
      <path d="M17 15.5v3.2c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-3.2" fill="#fff" stroke={`url(#${id})`} strokeWidth="1.6" />
      <path d="M24 7.5 38 13l-14 5.5L10 13z" fill="#fff" stroke={`url(#${id})`} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M37 13.2v6.3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="37" cy="20.6" r="1.7" fill="#fff" />
    </motion.svg>
  );
}

// Logo + wordmark, used in the sidebar and the mobile header
export function Brand({ size = 40, subtitle = "AI Student Support Agent" }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <Logo size={size} />
      <div className="min-w-0">
        <p className="font-extrabold text-lg leading-tight tracking-tight text-fg">
          Campus <span className="text-gradient">Assist</span>
        </p>
        {subtitle && <p className="text-xs text-muted truncate">{subtitle}</p>}
      </div>
    </div>
  );
}
