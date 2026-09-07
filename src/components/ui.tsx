import { AnimatePresence, motion } from "framer-motion";
import { X, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type SelectHTMLAttributes,
  type InputHTMLAttributes,
} from "react";
import { useKnit } from "../lib/store";

/* ------------------------------ card ------------------------------ */

export function GlassCard({
  children,
  className = "",
  glow,
}: {
  children: ReactNode;
  className?: string;
  glow?: "emerald" | "indigo";
}) {
  return (
    <div
      className={`glass rounded-[18px] ${
        glow === "emerald" ? "glow-emerald" : glow === "indigo" ? "glow-indigo" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHead({
  title,
  kicker,
  right,
}: {
  title: string;
  kicker?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-4">
      <div>
        {kicker && (
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            {kicker}
          </p>
        )}
        <h3 className="font-display text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-100">
          {title}
        </h3>
      </div>
      {right}
    </div>
  );
}

/* ------------------------------ badge ----------------------------- */

export type Tone = "emerald" | "indigo" | "amber" | "rose" | "sky" | "slate";

const toneMap: Record<Tone, string> = {
  emerald:
    "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30",
  indigo: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 ring-indigo-500/30",
  amber: "bg-amber-500/14 text-amber-700 dark:text-amber-300 ring-amber-500/35",
  rose: "bg-rose-500/12 text-rose-700 dark:text-rose-300 ring-rose-500/30",
  sky: "bg-sky-500/12 text-sky-700 dark:text-sky-300 ring-sky-500/30",
  slate:
    "bg-slate-500/12 text-slate-600 dark:text-slate-300 ring-slate-500/25",
};

export function Badge({
  tone = "slate",
  children,
  dot,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${toneMap[tone]}`}
    >
      {dot && <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ----------------------------- avatar ----------------------------- */

export function Avatar({
  name,
  hue,
  size = 36,
}: {
  name: string;
  hue: number;
  size?: number;
}) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-display font-bold text-white ring-2 ring-white/60 dark:ring-white/10"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: `linear-gradient(135deg, hsl(${hue} 55% 45%), hsl(${(hue + 40) % 360} 60% 32%))`,
      }}
    >
      {initials}
    </div>
  );
}

/* --------------------------- count-up ----------------------------- */

export function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const from = prev.current;
    prev.current = target;
    if (from === target) {
      setValue(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setValue(from + (target - from) * e);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

export function LiveNumber({
  value,
  format,
  className = "",
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const v = useCountUp(value);
  return <span className={`tnum ${className}`}>{format(v)}</span>;
}

/* -------------------------- progress ring ------------------------- */

export function ProgressRing({
  value,
  size = 116,
  stroke = 9,
  color = "#059669",
  children,
}: {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-slate-200/80 dark:stroke-white/8"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          style={{
            transition: "stroke-dashoffset 900ms cubic-bezier(.22,1,.36,1)",
            filter: `drop-shadow(0 0 7px ${color}66)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/* ---------------------------- sparkline --------------------------- */

export function Spark({
  data,
  color = "#059669",
  w = 120,
  h = 36,
}: {
  data: number[];
  color?: string;
  w?: number;
  h?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`)
    .join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 4px ${color}55)` }}
      />
    </svg>
  );
}

/* ------------------------------ modal ----------------------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={`glass-deep relative w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-[20px] p-6`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold tracking-tight text-slate-800 dark:text-white">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-500/10 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------ forms ----------------------------- */

export function SelectField({
  label,
  className = "",
  children,
  ...rest
}: { label: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <select
        className={`w-full rounded-xl border border-slate-300/70 bg-white/70 px-3 py-2 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100 ${className}`}
        {...rest}
      >
        {children}
      </select>
    </label>
  );
}

export function TextField({
  label,
  className = "",
  ...rest
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <input
        className={`w-full rounded-xl border border-slate-300/70 bg-white/70 px-3 py-2 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100 ${className}`}
        {...rest}
      />
    </label>
  );
}

export function Stepper({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-300/60 bg-white/50 px-3 py-2 dark:border-white/10 dark:bg-slate-900/40">
      <div>
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</p>
        {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="h-6 w-6 rounded-md bg-slate-200/80 text-sm font-bold text-slate-600 transition hover:bg-rose-500/20 hover:text-rose-600 dark:bg-white/10 dark:text-slate-300 dark:hover:text-rose-400"
        >
          −
        </button>
        <span className="tnum w-8 text-center font-mono text-sm font-semibold text-slate-800 dark:text-white">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="h-6 w-6 rounded-md bg-slate-200/80 text-sm font-bold text-slate-600 transition hover:bg-emerald-500/20 hover:text-emerald-600 dark:bg-white/10 dark:text-slate-300 dark:hover:text-emerald-400"
        >
          +
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ button ---------------------------- */

export function Btn({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "indigo" | "ghost" | "danger";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const styles = {
    primary:
      "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-500 active:scale-[0.98]",
    indigo:
      "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400 active:scale-[0.98]",
    ghost:
      "border border-slate-300/70 bg-white/40 text-slate-600 hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10",
    danger: "bg-rose-600 text-white hover:bg-rose-500 active:scale-[0.98]",
  }[variant];
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

/* ------------------------------ toasts ---------------------------- */

export function Toasts() {
  const toasts = useKnit((s) => s.toasts);
  const dismiss = useKnit((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-80 flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            layout
            initial={{ opacity: 0, x: 40, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 30, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={() => dismiss(t.id)}
            className="glass-deep pointer-events-auto flex items-start gap-3 rounded-2xl p-3.5 text-left"
          >
            <span className="mt-0.5">
              {t.tone === "success" ? (
                <CheckCircle2 size={18} className="text-emerald-500" />
              ) : t.tone === "warn" ? (
                <AlertTriangle size={18} className="text-amber-500" />
              ) : (
                <Info size={18} className="text-indigo-400" />
              )}
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-800 dark:text-white">
                {t.title}
              </span>
              {t.body && (
                <span className="block text-xs text-slate-500 dark:text-slate-400">{t.body}</span>
              )}
            </span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* --------------------------- status badge ------------------------- */

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: Tone; label: string }> = {
    present: { tone: "emerald", label: "On floor" },
    late: { tone: "amber", label: "Late" },
    break: { tone: "sky", label: "Tea break" },
    absent: { tone: "rose", label: "Absent" },
    leave: { tone: "indigo", label: "On leave" },
    off: { tone: "slate", label: "Off" },
  };
  const m = map[status] ?? map.off;
  return (
    <Badge tone={m.tone} dot>
      {m.label}
    </Badge>
  );
}
