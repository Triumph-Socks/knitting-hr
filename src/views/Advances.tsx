import { motion } from "framer-motion";
import { Banknote, Coins, Printer, Receipt } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, Btn, GlassCard, Modal, SelectField, TextField } from "../components/ui";
import {
  availableForAdvance,
  buildWeeklyPayroll,
  formatLKR,
  fmtDate,
  fmtTime,
} from "../lib/payroll";
import { useKnit } from "../lib/store";
import type { Advance } from "../lib/types";

export function Advances() {
  const workers = useKnit((s) => s.workers);
  const entries = useKnit((s) => s.entries);
  const advances = useKnit((s) => s.advances);
  const plan = useKnit((s) => s.plan);
  const addAdvance = useKnit((s) => s.addAdvance);
  const markRecovered = useKnit((s) => s.markRecovered);
  const toast = useKnit((s) => s.toast);

  const [workerId, setWorkerId] = useState(workers[0]?.id ?? "");
  const [amount, setAmount] = useState(1500);
  const [reason, setReason] = useState("");
  const [receipt, setReceipt] = useState<Advance | null>(null);

  const { lines } = useMemo(
    () => buildWeeklyPayroll(workers, entries, advances, plan),
    [workers, entries, advances, plan]
  );
  const line = lines.find((l) => l.worker.id === workerId);
  const available = availableForAdvance(line, advances);
  const outstanding = advances.filter((a) => !a.recovered);

  const issue = () => {
    const w = workers.find((x) => x.id === workerId);
    if (!w) return;
    if (amount <= 0 || !reason.trim()) {
      toast("warn", "Incomplete advance", "Enter an amount and a reason before issuing.");
      return;
    }
    if (amount > available) {
      toast("warn", "Exceeds available earnings", `${w.name} can draw up to ${formatLKR(available)} this week.`);
      return;
    }
    addAdvance(workerId, amount, reason.trim());
    toast("success", "Advance issued", `${formatLKR(amount)} to ${w.name} — auto-deducts at payroll run.`);
    setReceipt({ id: `adv-new-${Date.now()}`, workerId, amount, date: Date.now(), reason: reason.trim(), recovered: false });
    setReason("");
  };

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* issue form */}
      <div className="col-span-12 xl:col-span-4">
        <GlassCard className="p-5" glow="indigo">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Cash payout desk
              </p>
              <h3 className="font-display text-sm font-semibold text-slate-700 dark:text-slate-100">
                Issue micro-advance
              </h3>
            </div>
            <Coins size={18} className="text-indigo-400" />
          </div>

          <div className="mt-4 space-y-3">
            <SelectField label="Worker" value={workerId} onChange={(e) => setWorkerId(e.target.value)}>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>{w.name} — {w.role}</option>
              ))}
            </SelectField>
            <TextField
              label="Amount (Rs.)"
              type="number"
              min={100}
              step={100}
              value={amount}
              onChange={(e) => setAmount(+e.target.value)}
            />
            <TextField
              label="Reason"
              placeholder="e.g. Medical, school fees, poya travel"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            {/* availability meter */}
            <div className="rounded-xl bg-slate-900/[0.04] p-3 dark:bg-white/[0.05]">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className="text-slate-400">Available this week (after EPF + dues)</span>
                <span className="tnum font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {formatLKR(available)}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
                <motion.div
                  animate={{
                    width: `${Math.min(100, (amount / Math.max(1, available)) * 100)}%`,
                  }}
                  transition={{ type: "spring", stiffness: 220, damping: 26 }}
                  className={`h-full rounded-full ${
                    amount > available ? "bg-rose-500" : amount / Math.max(1, available) > 0.7 ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                />
              </div>
              <p className="mt-1.5 text-[10px] text-slate-400">
                {amount > available
                  ? "Over limit — will be rejected at the payout desk."
                  : "Advances are auto-deducted in the next payroll run and marked recovered."}
              </p>
            </div>

            <Btn variant="indigo" onClick={issue} className="w-full">
              <Banknote size={15} /> Issue & print receipt
            </Btn>
          </div>
        </GlassCard>

        <GlassCard className="mt-4 p-5">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl bg-indigo-500/10 p-3">
              <p className="tnum font-mono text-lg font-extrabold text-indigo-500 dark:text-indigo-300">
                {formatLKR(outstanding.reduce((s, a) => s + a.amount, 0))}
              </p>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Outstanding</p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 p-3">
              <p className="tnum font-mono text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                {advances.filter((a) => a.recovered).length}
              </p>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Recovered</p>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
            Floor practice: weekly advances up to ~40% of projected earnings keep retention high on the linking section. KnitHR caps draws at net-available automatically.
          </p>
        </GlassCard>
      </div>

      {/* ledger */}
      <GlassCard className="col-span-12 xl:col-span-8">
        <div className="flex items-center justify-between border-b border-slate-200/70 p-4 dark:border-white/8">
          <div className="flex items-center gap-2">
            <Receipt size={15} className="text-indigo-400" />
            <h3 className="font-display text-sm font-semibold text-slate-700 dark:text-slate-100">
              Advance ledger
            </h3>
          </div>
          <Badge tone={outstanding.length ? "amber" : "emerald"} dot>
            {outstanding.length} pending recovery
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/70 text-[10px] font-mono uppercase tracking-[0.14em] text-slate-400 dark:border-white/8">
                <th className="px-4 py-3">Issued</th>
                <th className="px-3 py-3">Worker</th>
                <th className="px-3 py-3">Reason</th>
                <th className="px-3 py-3 text-right">Amount</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {advances.map((a, i) => {
                const w = workers.find((x) => x.id === a.workerId);
                return (
                  <motion.tr
                    key={a.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.4) }}
                    className="border-b border-slate-200/50 transition-colors hover:bg-indigo-500/[0.04] dark:border-white/5 dark:hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                      {fmtDate(a.date)} <span className="text-slate-400">{fmtTime(a.date)}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-100">{w?.name ?? "—"}</p>
                      <p className="font-mono text-[10px] text-slate-400">{w?.epfNo}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-300">{a.reason}</td>
                    <td className="tnum px-3 py-2.5 text-right font-mono text-xs font-bold text-slate-800 dark:text-white">
                      {formatLKR(a.amount)}
                    </td>
                    <td className="px-3 py-2.5">
                      {a.recovered ? (
                        <Badge tone="emerald" dot>Recovered</Badge>
                      ) : (
                        <Badge tone="amber" dot>Due at payroll</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {!a.recovered ? (
                        <button
                          onClick={() => {
                            markRecovered(a.id);
                            toast("success", "Marked recovered", `${formatLKR(a.amount)} settled outside payroll run.`);
                          }}
                          className="rounded-lg bg-emerald-500/12 px-2.5 py-1 text-[11px] font-bold text-emerald-600 transition hover:bg-emerald-500/25 dark:text-emerald-400"
                        >
                          Settle cash
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">closed</span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* receipt modal */}
      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Advance receipt">
        {receipt && (
          <div className="print-area receipt-edge rounded-xl bg-white p-5 font-mono text-[11px] leading-relaxed text-slate-800 ring-1 ring-slate-200">
            <p className="text-center text-sm font-bold">CEYLON HOSIERY MILLS (PVT) LTD</p>
            <p className="text-center text-slate-500">SALARY ADVANCE RECEIPT · {fmtDate(receipt.date)}</p>
            <div className="my-3 border-t border-dashed border-slate-300" />
            <div className="flex justify-between"><span>Worker</span><span className="font-bold">{workers.find((w) => w.id === receipt.workerId)?.name}</span></div>
            <div className="flex justify-between"><span>Reason</span><span>{receipt.reason}</span></div>
            <div className="my-3 border-t border-dashed border-slate-300" />
            <div className="flex justify-between text-sm font-bold"><span>AMOUNT PAID</span><span>{formatLKR(receipt.amount, 2)}</span></div>
            <p className="mt-3 text-[9px] text-slate-400">
              Deductible from the next weekly payroll run per worker consent on file. KnitHR ref {receipt.id.slice(-8).toUpperCase()}.
            </p>
            <div className="mt-4 flex justify-between text-slate-400">
              <span>____________ Cashier</span>
              <span>____________ Worker</span>
            </div>
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2 print:hidden">
          <Btn variant="ghost" onClick={() => setReceipt(null)}>Close</Btn>
          <Btn variant="indigo" onClick={() => window.print()}>
            <Printer size={15} /> Print
          </Btn>
        </div>
      </Modal>
    </div>
  );
}
