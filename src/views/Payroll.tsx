import { motion } from "framer-motion";
import { BadgeCheck, FileText, Landmark, Printer, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, Btn, GlassCard, Modal } from "../components/ui";
import { formatLKR, buildWeeklyPayroll, RULES, weekLabel, type PayrollLine } from "../lib/payroll";
import { useKnit } from "../lib/store";

export function Payroll() {
  const workers = useKnit((s) => s.workers);
  const entries = useKnit((s) => s.entries);
  const advances = useKnit((s) => s.advances);
  const plan = useKnit((s) => s.plan);
  const processedWeek = useKnit((s) => s.processedWeek);
  const processPayroll = useKnit((s) => s.processPayroll);

  const week = weekLabel();
  const { lines, totals } = useMemo(
    () => buildWeeklyPayroll(workers, entries, advances, plan),
    [workers, entries, advances, plan]
  );

  const [slip, setSlip] = useState<PayrollLine | null>(null);
  const processed = processedWeek === week;

  return (
    <div className="space-y-4">
      {/* summary */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { l: "Gross payroll", v: totals.gross, cls: "text-slate-800 dark:text-white", icon: Wallet, ring: "ring-slate-500/20" },
          { l: "Employer EPF 12% + ETF 3%", v: totals.epfEmployer + totals.etfEmployer, cls: "text-indigo-500 dark:text-indigo-300", icon: Landmark, ring: "ring-indigo-500/30" },
          { l: "Advances recovered", v: totals.advances, cls: "text-amber-600 dark:text-amber-400", icon: BadgeCheck, ring: "ring-amber-500/30" },
          { l: "Net payable", v: totals.net, cls: "text-emerald-600 dark:text-emerald-400", icon: FileText, ring: "ring-emerald-500/30" },
        ].map((c, i) => (
          <motion.div
            key={c.l}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <GlassCard className="relative overflow-hidden p-4">
              <span className={`absolute right-3 top-3 rounded-lg p-1.5 ring-1 ring-inset ${c.ring}`}>
                <c.icon size={14} className="text-slate-400" />
              </span>
              <p className="tnum font-mono text-xl font-extrabold tracking-tight sm:text-2xl">
                <span className={c.cls}>{formatLKR(c.v)}</span>
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{c.l}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 p-4 dark:border-white/8">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">Weekly run</p>
            <h3 className="font-display text-sm font-semibold text-slate-700 dark:text-slate-100">
              {week} · projected from today's ledger × scheduled days
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {processed && (
              <motion.span
                initial={{ rotate: -8, scale: 0.8, opacity: 0 }}
                animate={{ rotate: -4, scale: 1, opacity: 1 }}
                className="rounded-lg border-2 border-emerald-500 px-3 py-1 font-mono text-[11px] font-extrabold uppercase tracking-widest text-emerald-500"
              >
                Processed ✓
              </motion.span>
            )}
            <Btn onClick={processPayroll} variant={processed ? "ghost" : "primary"}>
              <BadgeCheck size={15} /> {processed ? "Re-run payroll" : "Process payroll run"}
            </Btn>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/70 text-[10px] font-mono uppercase tracking-[0.14em] text-slate-400 dark:border-white/8">
                <th className="px-4 py-3">Worker</th>
                <th className="px-3 py-3">Basis</th>
                <th className="px-3 py-3 text-right">Days</th>
                <th className="px-3 py-3 text-right">Daily gross</th>
                <th className="px-3 py-3 text-right">Weekly gross</th>
                <th className="px-3 py-3 text-right">EPF 8%</th>
                <th className="px-3 py-3 text-right">Advance</th>
                <th className="px-3 py-3 text-right">Net pay</th>
                <th className="px-4 py-3 text-right">Payslip</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <motion.tr
                  key={l.worker.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.5) }}
                  className="border-b border-slate-200/50 transition-colors hover:bg-indigo-500/[0.04] dark:border-white/5 dark:hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-2.5">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-100">{l.worker.name}</p>
                    <p className="font-mono text-[10px] text-slate-400">{l.worker.epfNo}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge tone={l.worker.type === "piece" ? "indigo" : "amber"}>
                      {l.worker.type === "piece" ? "Piece" : "Salary"}
                    </Badge>
                  </td>
                  <td className="tnum px-3 py-2.5 text-right font-mono text-xs font-semibold text-slate-500">{l.days}</td>
                  <td className="tnum px-3 py-2.5 text-right font-mono text-xs text-slate-500">{formatLKR(l.dailyGross)}</td>
                  <td className="tnum px-3 py-2.5 text-right font-mono text-xs font-bold text-slate-700 dark:text-slate-100">{formatLKR(l.gross)}</td>
                  <td className="tnum px-3 py-2.5 text-right font-mono text-xs text-rose-500">− {formatLKR(l.epfEmployee)}</td>
                  <td className="tnum px-3 py-2.5 text-right font-mono text-xs text-amber-600 dark:text-amber-400">
                    {l.advanceDeducted ? `− ${formatLKR(l.advanceDeducted)}` : "—"}
                  </td>
                  <td className="tnum px-3 py-2.5 text-right font-mono text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                    {formatLKR(l.net)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => setSlip(l)}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-500/12 px-2.5 py-1 text-[11px] font-bold text-indigo-500 transition hover:bg-indigo-500/25 dark:text-indigo-300"
                    >
                      <Printer size={12} /> Slip
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-indigo-500/[0.06] font-mono text-xs font-bold text-slate-700 dark:text-slate-100">
                <td className="px-4 py-3" colSpan={4}>TOTALS · {lines.length} workers</td>
                <td className="tnum px-3 py-3 text-right">{formatLKR(totals.gross)}</td>
                <td className="tnum px-3 py-3 text-right text-rose-500">− {formatLKR(totals.epfEmployee)}</td>
                <td className="tnum px-3 py-3 text-right text-amber-600 dark:text-amber-400">− {formatLKR(totals.advances)}</td>
                <td className="tnum px-3 py-3 text-right text-emerald-600 dark:text-emerald-400">{formatLKR(totals.net)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="px-4 py-3 text-[11px] text-slate-400">
          Statutory: employee EPF {RULES.epfEmployee * 100}% · employer EPF {RULES.epfEmployer * 100}% + ETF {RULES.etfEmployer * 100}% remitted to the Employees' Provident Fund Board, Colombo. Records are append-only once processed.
        </p>
      </GlassCard>

      {/* payslip modal */}
      <Modal open={!!slip} onClose={() => setSlip(null)} title="Payslip · receipt print">
        {slip && (
          <div className="print-area receipt-edge rounded-xl bg-white p-5 font-mono text-[11px] leading-relaxed text-slate-800 ring-1 ring-slate-200">
            <div className="text-center">
              <p className="text-sm font-bold tracking-wide">CEYLON HOSIERY MILLS (PVT) LTD</p>
              <p>Plot 42, Phase 2, Katunayake Investment Promotion Zone</p>
              <p className="text-slate-500">EPF Reg. 0042-8817 · {week}</p>
            </div>
            <div className="my-3 border-t border-dashed border-slate-300" />
            <div className="flex justify-between"><span>Employee</span><span className="font-bold">{slip.worker.name}</span></div>
            <div className="flex justify-between"><span>EPF No</span><span>{slip.worker.epfNo}</span></div>
            <div className="flex justify-between"><span>Role</span><span>{slip.worker.role}</span></div>
            <div className="flex justify-between"><span>Days paid</span><span>{slip.days}</span></div>
            <div className="my-3 border-t border-dashed border-slate-300" />
            <div className="flex justify-between"><span>Gross ({slip.worker.type === "piece" ? "piece-rate" : "salary"})</span><span>{formatLKR(slip.gross, 2)}</span></div>
            <div className="flex justify-between"><span>EPF employee 8%</span><span>− {formatLKR(slip.epfEmployee, 2)}</span></div>
            <div className="flex justify-between"><span>Advance recovery</span><span>− {formatLKR(slip.advanceDeducted, 2)}</span></div>
            <div className="my-3 border-t border-dashed border-slate-300" />
            <div className="flex justify-between text-sm font-bold"><span>NET PAY</span><span>{formatLKR(slip.net, 2)}</span></div>
            <div className="my-3 border-t border-dashed border-slate-300" />
            <div className="flex justify-between text-slate-500"><span>Employer EPF 12%</span><span>{formatLKR(slip.epfEmployer, 2)}</span></div>
            <div className="flex justify-between text-slate-500"><span>Employer ETF 3%</span><span>{formatLKR(slip.etfEmployer, 2)}</span></div>
            <div className="mt-4 flex justify-between text-slate-400">
              <span>____________ HR Officer</span>
              <span>____________ Worker</span>
            </div>
            <p className="mt-3 text-center text-[9px] text-slate-400">
              Generated by KnitHR · immutable ledger ref KH-{slip.worker.epfNo.slice(4)}-{week.replace(/\W/g, "").slice(0, 6)}
            </p>
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2 print:hidden">
          <Btn variant="ghost" onClick={() => setSlip(null)}>Close</Btn>
          <Btn variant="indigo" onClick={() => window.print()}>
            <Printer size={15} /> Print receipt
          </Btn>
        </div>
      </Modal>
    </div>
  );
}
