import { motion } from "framer-motion";
import { CalendarDays, Moon, Sun } from "lucide-react";
import { Fragment, useState } from "react";
import { Badge, GlassCard } from "../components/ui";
import { DAY_LABELS, DEPARTMENTS, deptOf } from "../lib/data";
import { RULES } from "../lib/payroll";
import { useKnit } from "../lib/store";
import type { ShiftCode } from "../lib/types";

const CODE_STYLE: Record<ShiftCode, string> = {
  D: "bg-emerald-500/15 text-emerald-600 ring-emerald-500/35 dark:text-emerald-300",
  N: "bg-indigo-500/15 text-indigo-500 ring-indigo-500/35 dark:text-indigo-300",
  O: "bg-slate-500/10 text-slate-400 ring-slate-500/20",
  L: "bg-amber-500/15 text-amber-600 ring-amber-500/35 dark:text-amber-300",
};

const CODE_LABEL: Record<ShiftCode, string> = {
  D: "Day 07–19",
  N: "Night 19–07",
  O: "Off",
  L: "Leave",
};

export function Shifts() {
  const workers = useKnit((s) => s.workers);
  const machines = useKnit((s) => s.machines);
  const plan = useKnit((s) => s.plan);
  const cyclePlan = useKnit((s) => s.cyclePlan);
  const toast = useKnit((s) => s.toast);

  const todayIdx = (new Date().getDay() + 6) % 7;
  const [selDay, setSelDay] = useState(todayIdx);

  const weekDates = (() => {
    const monday = new Date();
    monday.setDate(monday.getDate() - todayIdx);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.getDate();
    });
  })();

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* planner grid */}
      <GlassCard className="col-span-12 xl:col-span-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 p-4 dark:border-white/8">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Weekly rotation
            </p>
            <h3 className="font-display text-sm font-semibold text-slate-700 dark:text-slate-100">
              Crew planner — click any cell to rotate D → N → Off → Leave
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CODE_LABEL) as ShiftCode[]).map((c) => (
              <span key={c} className={`rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset ${CODE_STYLE[c]}`}>
                {c} · {CODE_LABEL[c]}
              </span>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto p-4">
          <table className="w-full min-w-[720px] border-separate border-spacing-y-1">
            <thead>
              <tr>
                <th className="w-52 px-2 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
                  Worker
                </th>
                {DAY_LABELS.map((d, i) => (
                  <th
                    key={d}
                    className={`cursor-pointer px-1 text-center transition ${i === selDay ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 hover:text-slate-600"}`}
                    onClick={() => setSelDay(i)}
                  >
                    <span className="block font-mono text-[10px] uppercase tracking-widest">{d}</span>
                    <span className={`block text-[10px] ${i === todayIdx ? "font-bold text-emerald-600 dark:text-emerald-400" : ""}`}>
                      {weekDates[i]}{i === todayIdx ? " ●" : ""}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DEPARTMENTS.map((dept) => {
                const rows = workers.filter((w) => w.departmentId === dept.id);
                if (rows.length === 0) return null;
                return (
                  <Fragment key={dept.id}>
                    <tr>
                      <td colSpan={8} className="px-2 pt-3">
                        <span className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: dept.color }}>
                          <i className="h-1.5 w-1.5 rounded-full" style={{ background: dept.color }} />
                          {dept.name} · {dept.native}
                        </span>
                      </td>
                    </tr>
                    {rows.map((w) => {
                      const row = plan[w.id] ?? [];
                      return (
                        <tr key={w.id} className="group">
                          <td className="rounded-l-lg bg-slate-900/[0.03] px-2 py-1.5 dark:bg-white/[0.03]">
                            <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">{w.name}</p>
                            <p className="font-mono text-[9px] text-slate-400">
                              {w.machineId ? `${w.machineId} · ` : ""}{w.role}
                            </p>
                          </td>
                          {row.map((c, i) => (
                            <td key={i} className="px-0.5">
                              <motion.button
                                whileTap={{ scale: 0.85 }}
                                onClick={() => {
                                  cyclePlan(w.id, i);
                                }}
                                className={`h-9 w-full min-w-10 rounded-lg text-[11px] font-extrabold ring-1 ring-inset transition-all hover:scale-105 ${CODE_STYLE[c]} ${i === selDay ? "outline outline-2 outline-emerald-500/50" : ""}`}
                              >
                                {c}
                              </motion.button>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* right column */}
      <div className="col-span-12 flex flex-col gap-4 xl:col-span-4">
        {/* machine coverage */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Machine coverage
              </p>
              <h3 className="font-display text-sm font-semibold text-slate-700 dark:text-slate-100">
                {DAY_LABELS[selDay]} {weekDates[selDay]} — operator allocation
              </h3>
            </div>
            <CalendarDays size={16} className="text-indigo-400" />
          </div>
          <div className="mt-4 space-y-2">
            {machines.map((m) => {
              const ops = workers.filter(
                (w) => w.machineId === m.id && ["D", "N"].includes((plan[w.id] ?? [])[selDay] ?? "O")
              );
              const crew = (plan[ops[0]?.id ?? ""] ?? [])[selDay];
              const staffed = ops.length > 0;
              return (
                <div
                  key={m.id}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${staffed ? "border-emerald-500/25 bg-emerald-500/[0.05]" : "border-rose-500/25 bg-rose-500/[0.05]"}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200">{m.id}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{m.brand}</span>
                    {crew === "N" ? (
                      <Moon size={12} className="text-indigo-400" />
                    ) : (
                      <Sun size={12} className="text-amber-500" />
                    )}
                  </div>
                  {staffed ? (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{ops[0].name}</span>
                  ) : (
                    <button
                      onClick={() => toast("warn", `${m.id} uncovered`, "Assign an operator in the planner for this day.")}
                      className="text-[11px] font-bold text-rose-500 underline decoration-dotted underline-offset-2"
                    >
                      uncovered
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* rotation rules */}
        <GlassCard className="p-5" glow="indigo">
          <h3 className="font-display text-sm font-semibold text-slate-700 dark:text-slate-100">
            Night rotation rules
          </h3>
          <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            <li className="flex gap-2">
              <Badge tone="indigo">N</Badge>
              Night allowance {`Rs. ${RULES.nightAllowance}`} per shift + OT beyond {RULES.standardShiftHours} h at {RULES.otMultiplier}× per Sri Lanka Wages Board ruling.
            </li>
            <li className="flex gap-2">
              <Badge tone="emerald">D</Badge>
              Day crew {RULES.dayShift.start}–{RULES.dayShift.end}; biometric grace {RULES.graceMinutes} min, then Rs. {RULES.latePenaltyPerHalfHour} per started ½ hr.
            </li>
            <li className="flex gap-2">
              <Badge tone="amber">L</Badge>
              Leave must be approved by the floor supervisor before 18:00 the prior day; unapproved = absent with ½-day deduction.
            </li>
          </ul>
        </GlassCard>
      </div>
    </div>
  );
}
