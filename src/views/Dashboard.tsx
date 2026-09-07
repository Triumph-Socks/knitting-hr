import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  Coffee,
  LogIn,
  LogOut,
  Moon,
  Sun,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { GlassCard, Badge, ProgressRing, Spark, LiveNumber } from "../components/ui";
import { DEPARTMENTS, NEXT_POYA } from "../lib/data";
import {
  DAILY_TARGET_PAIRS,
} from "../lib/data";
import {
  dailyPieceGross,
  formatLKR,
  formatLKRShort,
  fmtTime,
  qualifiedDozens,
  RULES,
  salariedDailyGross,
} from "../lib/payroll";
import { useKnit } from "../lib/store";
import type { MachineStatus } from "../lib/types";

const MACHINE_TONE: Record<MachineStatus, string> = {
  running: "border-emerald-500/30 bg-emerald-500/8",
  idle: "border-amber-500/30 bg-amber-500/8",
  maintenance: "border-rose-500/30 bg-rose-500/8",
};
const MACHINE_DOT: Record<MachineStatus, string> = {
  running: "bg-emerald-500",
  idle: "bg-amber-500",
  maintenance: "bg-rose-500",
};

export function Dashboard() {
  const workers = useKnit((s) => s.workers);
  const machines = useKnit((s) => s.machines);
  const events = useKnit((s) => s.events);
  const entries = useKnit((s) => s.entries);
  const hourly = useKnit((s) => s.hourly);
  const advances = useKnit((s) => s.advances);
  const simulateGate = useKnit((s) => s.simulateGate);
  const tickOutput = useKnit((s) => s.tickOutput);
  const setMachineStatus = useKnit((s) => s.setMachineStatus);

  useEffect(() => {
    const a = setInterval(simulateGate, 4200);
    const b = setInterval(tickOutput, 5200);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, [simulateGate, tickOutput]);

  const stats = useMemo(() => {
    const latestEntry = new Map<string, (typeof entries)[number]>();
    for (const e of entries) if (!latestEntry.has(e.workerId)) latestEntry.set(e.workerId, e);
    const gross = new Map<string, number>();
    let burn = 0;
    const head = { present: 0, late: 0, break: 0, absent: 0, leave: 0, off: 0 };
    for (const w of workers) {
      head[w.status] += 1;
      const g =
        w.type === "piece"
          ? dailyPieceGross(w, latestEntry.get(w.id) ?? null, w.lateMinutes)
          : salariedDailyGross(w, w.lateMinutes);
      gross.set(w.id, g);
      if (["present", "late", "break"].includes(w.status)) burn += g;
    }
    const totalPairs = hourly.reduce((s, b) => s + b.actual, 0);
    const dozens = new Map<string, number>();
    for (const e of entries)
      dozens.set(e.workerId, (dozens.get(e.workerId) ?? 0) + qualifiedDozens(e));
    const leaders = [...workers]
      .filter((w) => w.type === "piece" && latestEntry.has(w.id))
      .map((w) => ({ w, g: gross.get(w.id) ?? 0, dz: dozens.get(w.id) ?? 0 }))
      .sort((a, b) => b.g - a.g)
      .slice(0, 6);
    return { head, burn, gross, totalPairs, leaders, onFloor: head.present + head.late + head.break };
  }, [workers, entries, hourly]);

  const achievement = stats.totalPairs / DAILY_TARGET_PAIRS;
  const running = machines.filter((m) => m.status === "running").length;
  const nameOf = (id: string) => workers.find((w) => w.id === id)?.name ?? "—";
  const burnSpark = hourly.filter((b) => b.actual > 0).map((b) => b.actual);
  const pendingAdv = advances.filter((a) => !a.recovered).length;

  const timeline = [
    { t: "07:00", label: "Day shift start · gate A/B open", icon: Sun, tone: "text-emerald-500" },
    { t: "10:00", label: "Ceylon tea break · 15 min", icon: Coffee, tone: "text-amber-500" },
    { t: "15:00", label: "Second tea break", icon: Coffee, tone: "text-amber-500" },
    { t: "19:00", label: "Night crew handover", icon: Moon, tone: "text-indigo-400" },
  ];
  const nowH = new Date().getHours();

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* ---------- live headcount ---------- */}
      <GlassCard className="col-span-12 p-5 md:col-span-6 xl:col-span-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Live headcount
            </p>
            <h3 className="font-display text-sm font-semibold text-slate-700 dark:text-slate-100">
              Floor attendance
            </h3>
          </div>
          <Badge tone="emerald" dot>
            Realtime
          </Badge>
        </div>
        <div className="mt-4 flex items-center gap-5">
          <ProgressRing value={stats.onFloor / workers.length} color="#059669" size={128}>
            <LiveNumber
              value={stats.onFloor}
              format={(n) => String(Math.round(n))}
              className="font-display text-4xl font-extrabold text-slate-900 dark:text-white"
            />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              of {workers.length} on floor
            </span>
          </ProgressRing>
          <div className="grid flex-1 grid-cols-2 gap-2">
            {[
              { label: "Present", v: stats.head.present + stats.head.late, cls: "text-emerald-600 dark:text-emerald-400" },
              { label: "Tea break", v: stats.head.break, cls: "text-sky-600 dark:text-sky-400" },
              { label: "Late entry", v: stats.head.late, cls: "text-amber-600 dark:text-amber-400" },
              { label: "On leave", v: stats.head.leave, cls: "text-indigo-500 dark:text-indigo-300" },
              { label: "Absent", v: stats.head.absent, cls: "text-rose-600 dark:text-rose-400" },
              { label: "Off / night", v: stats.head.off, cls: "text-slate-500" },
            ].map((c) => (
              <div key={c.label} className="rounded-xl bg-slate-900/[0.04] px-3 py-2 dark:bg-white/[0.05]">
                <LiveNumber
                  value={c.v}
                  format={(n) => String(Math.round(n))}
                  className={`font-display text-xl font-bold ${c.cls}`}
                />
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {c.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* ---------- production vs target ---------- */}
      <GlassCard className="col-span-12 p-5 md:col-span-6 xl:col-span-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Output vs target
            </p>
            <h3 className="font-display text-sm font-semibold text-slate-700 dark:text-slate-100">
              Pairs knitted today
            </h3>
          </div>
          <div className="text-right">
            <LiveNumber
              value={stats.totalPairs}
              format={(n) => Math.round(n).toLocaleString()}
              className="font-display text-2xl font-extrabold text-emerald-600 dark:text-emerald-400"
            />
            <p className="font-mono text-[10px] text-slate-400">
              / {DAILY_TARGET_PAIRS.toLocaleString()} pairs
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4">
          <ProgressRing value={achievement} color="#059669" size={92} stroke={8}>
            <LiveNumber
              value={achievement * 100}
              format={(n) => `${Math.round(n)}%`}
              className="font-display text-lg font-extrabold text-slate-800 dark:text-white"
            />
          </ProgressRing>
          <div className="h-40 min-w-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourly} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" vertical={false} />
                <XAxis dataKey="h" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(9,14,28,0.92)",
                    border: "1px solid rgba(148,163,184,0.2)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#94a3b8" }}
                />
                <Area type="monotone" dataKey="target" stroke="#6366f1" strokeDasharray="5 4" strokeWidth={1.6} fill="none" name="Target" />
                <Area type="monotone" dataKey="actual" stroke="#059669" strokeWidth={2.2} fill="url(#gActual)" name="Actual" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Hourly cadence 07:00–19:00 · <span className="font-semibold text-indigo-500">dashed</span> = line target 430 pairs/hr
        </p>
      </GlassCard>

      {/* ---------- payroll burn ---------- */}
      <GlassCard className="col-span-12 p-5 md:col-span-6 xl:col-span-3" glow="indigo">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
            Payroll burn · today
          </p>
          <TrendingUp size={15} className="text-indigo-400" />
        </div>
        <LiveNumber
          value={stats.burn}
          format={(n) => formatLKRShort(n)}
          className="mt-3 block font-display text-3xl font-extrabold tracking-tight text-indigo-500 dark:text-indigo-300"
        />
        <p className="mt-1 text-[11px] text-slate-400">
          accrued across {stats.onFloor} active workers
        </p>
        <div className="mt-4">
          <Spark data={burnSpark.length ? burnSpark : [1, 2]} color="#6366f1" w={220} h={40} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-indigo-500/10 px-2 py-2">
            <p className="tnum font-mono text-sm font-bold text-indigo-500 dark:text-indigo-300">
              {formatLKRShort(stats.burn / Math.max(1, new Date().getHours() - 6))}
            </p>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">burn / hr</p>
          </div>
          <div className="rounded-xl bg-emerald-500/10 px-2 py-2">
            <p className="tnum font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {formatLKRShort(stats.burn / Math.max(1, stats.totalPairs) )}/pr
            </p>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">labour cost</p>
          </div>
        </div>
      </GlassCard>

      {/* ---------- biometric feed ---------- */}
      <GlassCard className="col-span-12 p-5 md:col-span-6 xl:col-span-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Turnstile sync
            </p>
            <h3 className="font-display text-sm font-semibold text-slate-700 dark:text-slate-100">
              Biometric gate feed
            </h3>
          </div>
          <Badge tone="emerald" dot>
            Gates A·B
          </Badge>
        </div>
        <div className="mt-3 space-y-1.5 overflow-hidden">
          <AnimatePresence initial={false}>
            {events.slice(0, 7).map((ev) => (
              <motion.div
                key={ev.id}
                layout
                initial={{ opacity: 0, y: -14, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="flex items-center gap-3 rounded-xl bg-slate-900/[0.04] px-3 py-2 dark:bg-white/[0.045]"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    ev.kind === "in" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-indigo-500/15 text-indigo-500 dark:text-indigo-300"
                  }`}
                >
                  {ev.kind === "in" ? <LogIn size={14} /> : <LogOut size={14} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">
                    {nameOf(ev.workerId)}
                  </p>
                  <p className="font-mono text-[10px] text-slate-400">
                    Gate {ev.gate} · {ev.method === "fingerprint" ? "fingerprint" : "RFID card"}
                    {ev.lateMinutes ? ` · +${ev.lateMinutes} min late` : ""}
                  </p>
                </div>
                <span className="tnum font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-300">
                  {fmtTime(ev.time)}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </GlassCard>

      {/* ---------- machine floor ---------- */}
      <GlassCard className="col-span-12 p-5 md:col-span-6 xl:col-span-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Machine floor
            </p>
            <h3 className="font-display text-sm font-semibold text-slate-700 dark:text-slate-100">
              Circular knitting lines
            </h3>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400">
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-emerald-500" /> {running} running</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-amber-500" /> {machines.filter((m) => m.status === "idle").length} idle</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-rose-500" /> {machines.filter((m) => m.status === "maintenance").length} down</span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {machines.map((m) => {
            const op = workers.find((w) => w.machineId === m.id);
            return (
              <motion.button
                key={m.id}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() =>
                  setMachineStatus(
                    m.id,
                    m.status === "running" ? "idle" : m.status === "idle" ? "maintenance" : "running"
                  )
                }
                className={`rounded-xl border p-2.5 text-left transition ${MACHINE_TONE[m.status]}`}
                title="Click to cycle status"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-100">{m.id}</span>
                  <span className={`relative h-2 w-2 rounded-full ${MACHINE_DOT[m.status]} ${m.status === "running" ? "pulse-dot" : ""}`} />
                </div>
                <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                  {m.brand} {m.model}
                </p>
                <div className="mt-1.5 flex items-end justify-between">
                  <span className="tnum font-mono text-[11px] font-bold text-slate-600 dark:text-slate-200">
                    {m.status === "running" ? `${m.rpm} rpm` : m.status === "idle" ? "idle" : "wrench"}
                  </span>
                  {m.status === "maintenance" && <Wrench size={11} className="text-rose-500" />}
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${m.status === "running" ? "bg-emerald-500" : m.status === "idle" ? "bg-amber-500" : "bg-rose-500"}`}
                    style={{ width: `${m.status === "running" ? m.efficiency : m.status === "idle" ? 30 : 6}%` }}
                  />
                </div>
                <p className="mt-1 truncate text-[9px] text-slate-400">
                  {op ? op.name : m.crew === "N" ? "Night crew" : "Unassigned"}
                </p>
              </motion.button>
            );
          })}
        </div>
      </GlassCard>

      {/* ---------- shift timeline + poya ---------- */}
      <div className="col-span-12 flex flex-col gap-4 md:col-span-6 xl:col-span-3">
        <GlassCard className="flex-1 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
            Shift rhythm
          </p>
          <h3 className="font-display text-sm font-semibold text-slate-700 dark:text-slate-100">
            Today on the floor
          </h3>
          <div className="mt-4 space-y-4">
            {timeline.map((t, i) => {
              const past = nowH >= parseInt(t.t);
              const active =
                (i === 0 && nowH >= 7 && nowH < 10) ||
                (i === 1 && nowH >= 10 && nowH < 15) ||
                (i === 2 && nowH >= 15 && nowH < 19) ||
                (i === 3 && (nowH >= 19 || nowH < 7));
              return (
                <div key={t.t} className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${
                      active
                        ? "bg-emerald-500/15 ring-emerald-500/40"
                        : past
                        ? "bg-slate-500/10 ring-slate-500/20 opacity-70"
                        : "bg-slate-500/5 ring-slate-500/15 opacity-45"
                    }`}
                  >
                    <t.icon size={14} className={`${t.tone} ${active ? "" : "opacity-70"}`} />
                  </span>
                  <div className="min-w-0">
                    <p className={`font-mono text-[11px] font-bold ${active ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"}`}>
                      {t.t} {active && "· now"}
                    </p>
                    <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{t.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 rounded-lg bg-amber-500/10 px-3 py-2 text-[10px] font-semibold text-amber-600 dark:text-amber-300">
            Tea breaks {RULES.teaBreaks.join(" & ")} — canteen serves plain tea + pol roti.
          </p>
        </GlassCard>

        <GlassCard className="p-5" glow="indigo">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-indigo-400">
                Upcoming Poya
              </p>
              <h3 className="font-display text-base font-extrabold text-slate-800 dark:text-white">
                {NEXT_POYA.name} <span className="text-sm font-semibold text-slate-400">{NEXT_POYA.si}</span>
              </h3>
            </div>
            <Badge tone="indigo">{NEXT_POYA.date}</Badge>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{NEXT_POYA.note}</p>
        </GlassCard>
      </div>

      {/* ---------- top earners ---------- */}
      <GlassCard className="col-span-12 p-5 md:col-span-6 xl:col-span-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Piece-rate leaders
            </p>
            <h3 className="font-display text-sm font-semibold text-slate-700 dark:text-slate-100">
              Top earners today
            </h3>
          </div>
          <Users size={16} className="text-emerald-500" />
        </div>
        <div className="mt-4 space-y-3">
          {stats.leaders.map((l, i) => {
            const max = stats.leaders[0]?.g ?? 1;
            return (
              <div key={l.w.id} className="group">
                <div className="flex items-center justify-between text-xs">
                  <p className="font-bold text-slate-700 dark:text-slate-200">
                    <span className="mr-2 font-mono text-[10px] text-slate-400">#{i + 1}</span>
                    {l.w.name}
                    <span className="ml-2 font-mono text-[10px] font-medium text-slate-400">
                      {l.dz} qual. dozens
                    </span>
                  </p>
                  <p className="tnum font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatLKR(l.g)}
                  </p>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-900/[0.06] dark:bg-white/[0.07]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(l.g / max) * 100}%` }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: i * 0.06 }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* ---------- departments + alerts ---------- */}
      <div className="col-span-12 grid gap-4 md:col-span-6 xl:col-span-6">
        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-slate-700 dark:text-slate-100">
              Headcount by section
            </h3>
            <Badge tone="slate">{workers.length} registered</Badge>
          </div>
          <div className="mt-3 space-y-2.5">
            {DEPARTMENTS.map((d) => {
              const total = workers.filter((w) => w.departmentId === d.id).length;
              const on = workers.filter(
                (w) => w.departmentId === d.id && ["present", "late", "break"].includes(w.status)
              ).length;
              return (
                <div key={d.id} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {d.name}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-900/[0.06] dark:bg-white/[0.07]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(on / Math.max(1, total)) * 100}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: d.color }}
                    />
                  </div>
                  <span className="tnum w-10 text-right font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {on}/{total}
                  </span>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-slate-700 dark:text-slate-100">
              Needs attention
            </h3>
            <AlertTriangle size={15} className="text-amber-500" />
          </div>
          <div className="mt-3 space-y-2">
            {machines
              .filter((m) => m.status !== "running")
              .map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-xl bg-rose-500/[0.07] px-3 py-2 text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    <span className="font-mono font-bold text-rose-500">{m.id}</span> · {m.status === "maintenance" ? "needle bar fault — Sunil on it" : "idle, no order queued"}
                  </span>
                  <Badge tone={m.status === "maintenance" ? "rose" : "amber"}>{m.status}</Badge>
                </div>
              ))}
            {workers
              .filter((w) => w.status === "absent")
              .map((w) => (
                <div key={w.id} className="flex items-center justify-between rounded-xl bg-rose-500/[0.07] px-3 py-2 text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    {w.name} — unexcused absence, ½ day penalty applies
                  </span>
                  <Badge tone="rose">absent</Badge>
                </div>
              ))}
            <div className="flex items-center justify-between rounded-xl bg-indigo-500/[0.07] px-3 py-2 text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {pendingAdv} micro-advances awaiting weekly recovery
              </span>
              <Badge tone="indigo">
                <ArrowUpRight size={10} /> payroll
              </Badge>
            </div>
          </div>
        </GlassCard>
      </div>

    </div>
  );
}
