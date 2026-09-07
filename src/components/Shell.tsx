import { motion } from "framer-motion";
import {
  Banknote,
  BookOpen,
  CalendarDays,
  Factory,
  Fingerprint,
  LayoutDashboard,
  Moon,
  Plus,
  RefreshCw,
  Sun,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { currentShiftCode } from "../lib/payroll";
import { useKnit } from "../lib/store";
import type { ViewId } from "../lib/types";

const NAV: { id: ViewId; label: string; icon: typeof Users }[] = [
  { id: "dashboard", label: "Floor Live", icon: LayoutDashboard },
  { id: "workers", label: "Workers", icon: Users },
  { id: "shifts", label: "Shift Planner", icon: CalendarDays },
  { id: "production", label: "Piece-Rate Log", icon: Factory },
  { id: "payroll", label: "Payroll", icon: Wallet },
  { id: "advances", label: "Advances", icon: Banknote },
  { id: "blueprint", label: "Blueprint", icon: BookOpen },
];

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 shadow-lg shadow-emerald-600/40">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 14.5 7.5 10l4.5 4.5L16.5 10 21 14.5"
            stroke="#ecfdf5"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3 19.5 7.5 15l4.5 4.5L16.5 15 21 19.5"
            stroke="#a7f3d0"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.65"
          />
        </svg>
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-indigo-400 ring-2 ring-white dark:ring-slate-950" />
      </div>
      <div>
        <p className="font-display text-lg font-extrabold leading-none tracking-tight text-slate-900 dark:text-white">
          Knit<span className="text-emerald-600 dark:text-emerald-400">HR</span>
        </p>
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
          Ceylon Hosiery · FTZ
        </p>
      </div>
    </div>
  );
}

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const shift = currentShiftCode(now);
  return (
    <div className="flex items-center gap-3">
      <div
        className={`hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset sm:flex ${
          shift === "day"
            ? "bg-emerald-500/12 text-emerald-600 ring-emerald-500/30 dark:text-emerald-300"
            : "bg-indigo-500/12 text-indigo-600 ring-indigo-500/30 dark:text-indigo-300"
        }`}
      >
        <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-current pulse-dot" />
        {shift === "day" ? "Day Shift · 07:00–19:00" : "Night Shift · 19:00–07:00"}
      </div>
      <div className="rounded-xl border border-slate-300/60 bg-white/50 px-3 py-1.5 text-right dark:border-white/10 dark:bg-white/5">
        <p className="tnum font-mono text-sm font-bold leading-none text-slate-800 dark:text-white">
          {now.toLocaleTimeString("en-GB")}
        </p>
        <p className="mt-0.5 text-[10px] leading-none text-slate-400">
          {now.toLocaleDateString("en-LK", { weekday: "short", day: "2-digit", month: "short" })}
        </p>
      </div>
    </div>
  );
}

function QuickDock() {
  const setView = useKnit((s) => s.setView);
  const simulateGate = useKnit((s) => s.simulateGate);
  const toast = useKnit((s) => s.toast);
  const items = [
    {
      label: "Log dozens",
      icon: Plus,
      tone: "bg-emerald-600 shadow-emerald-600/40",
      onClick: () => setView("production"),
    },
    {
      label: "Issue advance",
      icon: Banknote,
      tone: "bg-indigo-500 shadow-indigo-500/40",
      onClick: () => setView("advances"),
    },
    {
      label: "Force gate sync",
      icon: RefreshCw,
      tone: "bg-slate-700 shadow-slate-900/40 dark:bg-slate-600",
      onClick: () => {
        simulateGate();
        toast("info", "Gate sync triggered", "Turnstile buffer flushed to KnitHR.");
      },
    },
  ];
  return (
    <div className="fixed bottom-5 right-5 z-40 hidden flex-col items-end gap-2 xl:flex">
      {items.map((it) => (
        <motion.button
          key={it.label}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.94 }}
          onClick={it.onClick}
          className={`group flex items-center gap-2 rounded-full py-2.5 pl-3 pr-4 text-sm font-semibold text-white shadow-xl ${it.tone}`}
        >
          <it.icon size={16} />
          {it.label}
        </motion.button>
      ))}
      <div className="glass-deep mt-1 flex items-center gap-2 rounded-full px-3 py-2">
        <Fingerprint size={14} className="text-emerald-500" />
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-300">
          Gates A·B online
        </span>
        <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-dot" />
      </div>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const view = useKnit((s) => s.view);
  const setView = useKnit((s) => s.setView);
  const theme = useKnit((s) => s.theme);
  const toggleTheme = useKnit((s) => s.toggleTheme);
  const pendingAdvances = useKnit(
    (s) => s.advances.filter((a) => !a.recovered).length
  );
  const current = NAV.find((n) => n.id === view)!;

  return (
    <div className="flex min-h-screen">
      {/* sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200/70 bg-white/55 p-4 backdrop-blur-xl dark:border-white/8 dark:bg-ink-900/60 lg:flex">
        <Logo />
        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map((n) => {
            const active = view === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-slate-500 hover:bg-slate-900/5 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-xl bg-emerald-500/12 ring-1 ring-inset ring-emerald-500/25"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <n.icon size={17} className="relative" />
                <span className="relative">{n.label}</span>
                {n.id === "advances" && pendingAdvances > 0 && (
                  <span className="relative ml-auto rounded-full bg-indigo-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-500 ring-1 ring-inset ring-indigo-500/30">
                    {pendingAdvances}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3">
          <div className="glass rounded-2xl p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400">
              EPF Compliance
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              8% employee · 12% + 3% ETF employer
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
              <div className="h-full w-[86%] rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
            </div>
            <p className="mt-1 text-[10px] text-slate-400">86% of floor registered</p>
          </div>
          <button
            onClick={toggleTheme}
            className="flex w-full items-center justify-between rounded-xl border border-slate-300/60 bg-white/40 px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <span className="flex items-center gap-2">
              {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
              {theme === "dark" ? "Dark mode" : "Light mode"}
            </span>
            <span
              className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${
                theme === "dark" ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              <motion.span
                layout
                className="h-4 w-4 rounded-full bg-white shadow"
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
                style={{ marginLeft: theme === "dark" ? "auto" : 0 }}
              />
            </span>
          </button>
          <div className="flex items-center gap-2.5 px-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 font-display text-xs font-bold text-white">
              RS
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">
                R. Senanayake
              </p>
              <p className="text-[10px] text-slate-400">HR Manager · Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* main */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/50 px-4 py-3 backdrop-blur-xl dark:border-white/8 dark:bg-ink-950/60 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="lg:hidden">
              <Logo />
            </div>
            <div className="hidden lg:block">
              <h1 className="font-display text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {current.label}
              </h1>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {view === "dashboard"
                  ? "Real-time floor intelligence · Katunayake Plant 02"
                  : view === "workers"
                  ? "Floor directory & biometric sync"
                  : view === "shifts"
                  ? "Crew rotation & machine allocation"
                  : view === "production"
                  ? "Dozens per operator · defect deductions"
                  : view === "payroll"
                  ? "Weekly piece-rate & salary runs"
                  : view === "advances"
                  ? "Micro-advance ledger & recovery"
                  : "System architecture & rulebook"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <LiveClock />
              <button
                onClick={toggleTheme}
                className="rounded-xl border border-slate-300/60 bg-white/40 p-2.5 text-slate-500 transition hover:text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:text-white lg:hidden"
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          </div>
          {/* mobile nav */}
          <nav className="-mx-1 mt-3 flex gap-1 overflow-x-auto pb-1 lg:hidden">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  view === n.id
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                    : "bg-slate-900/5 text-slate-500 dark:bg-white/8 dark:text-slate-300"
                }`}
              >
                <n.icon size={13} />
                {n.label}
              </button>
            ))}
          </nav>
        </header>

        <main className="flex-1 px-4 py-5 lg:px-8 lg:py-6">{children}</main>

        <footer className="px-4 pb-24 pt-2 text-center lg:px-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-600">
            KnitHR v2.4 · ශ්‍රී ලංකා · Built for the knitting floor
          </p>
        </footer>
      </div>

      <QuickDock />
    </div>
  );
}
