import { AnimatePresence, motion } from "framer-motion";
import { Calculator, CheckCircle2, Factory, PackageCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, Btn, GlassCard, SelectField, Stepper } from "../components/ui";
import { deptOf } from "../lib/data";
import {
  DEFECT_META,
  dailyPieceGross,
  defectCost,
  formatLKR,
  fmtTime,
  latePenalty,
  qualifiedDozens as calcQualified,
  RULES,
  totalDefectDozens,
} from "../lib/payroll";
import { useKnit } from "../lib/store";
import type { DefectKey, ProductionEntry } from "../lib/types";

const DEFECT_KEYS: DefectKey[] = ["oilStain", "needleBreak", "sizingError", "dropStitch"];
const emptyDefects: Record<DefectKey, number> = {
  oilStain: 0,
  needleBreak: 0,
  sizingError: 0,
  dropStitch: 0,
};

export function Production() {
  const workers = useKnit((s) => s.workers);
  const entries = useKnit((s) => s.entries);
  const addEntry = useKnit((s) => s.addEntry);
  const toast = useKnit((s) => s.toast);

  const pieceWorkers = workers.filter((w) => w.type === "piece");
  const [workerId, setWorkerId] = useState(pieceWorkers[0]?.id ?? "");
  const [dozens, setDozens] = useState(12);
  const [defects, setDefects] = useState<Record<DefectKey, number>>(emptyDefects);
  const [shift, setShift] = useState<"day" | "night">("day");

  const worker = workers.find((w) => w.id === workerId);

  const preview = useMemo(() => {
    if (!worker) return null;
    const qualified = Math.max(0, dozens - totalDefectDozens(defects));
    const base = worker.baseDaily;
    const piece = qualified * worker.pieceRate;
    const night = shift === "night" ? RULES.nightAllowance : 0;
    const late = latePenalty(worker.lateMinutes);
    const penalty = defectCost(defects);
    const gross = Math.max(0, base + piece + night - late - penalty);
    return { qualified, base, piece, night, late, penalty, gross };
  }, [worker, dozens, defects, shift]);

  const todayEntries = useMemo(
    () => entries.filter((e) => new Date(e.loggedAt).toDateString() === new Date().toDateString()),
    [entries]
  );

  const totals = useMemo(() => {
    let dozensSum = 0;
    let qualifiedSum = 0;
    let penaltySum = 0;
    let grossSum = 0;
    for (const e of todayEntries) {
      const w = workers.find((x) => x.id === e.workerId);
      if (!w) continue;
      dozensSum += e.dozens;
      qualifiedSum += calcQualified(e);
      penaltySum += defectCost(e.defects);
      grossSum += dailyPieceGross(w, e, w.lateMinutes);
    }
    return { dozensSum, qualifiedSum, penaltySum, grossSum };
  }, [todayEntries, workers]);

  const submit = () => {
    if (!worker || dozens <= 0) {
      toast("warn", "Nothing to log", "Enter at least one completed dozen bundle.");
      return;
    }
    const entry: Omit<ProductionEntry, "id" | "loggedAt"> = {
      workerId: worker.id,
      machineId: worker.machineId,
      dozens,
      defects,
      shift,
    };
    addEntry(entry);
    toast(
      "success",
      `${dozens} dozen logged for ${worker.name}`,
      preview ? `Daily gross now ${formatLKR(preview.gross)}.` : undefined
    );
    setDefects(emptyDefects);
  };

  const nameOf = (id: string) => workers.find((w) => w.id === id);

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* entry form */}
      <div className="col-span-12 flex flex-col gap-4 xl:col-span-4">
        <GlassCard className="p-5" glow="emerald">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Daily production entry
              </p>
              <h3 className="font-display text-sm font-semibold text-slate-700 dark:text-slate-100">
                Log dozens per operator
              </h3>
            </div>
            <PackageCheck size={18} className="text-emerald-500" />
          </div>

          <div className="mt-4 space-y-3">
            <SelectField label="Operator" value={workerId} onChange={(e) => setWorkerId(e.target.value)}>
              {pieceWorkers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} — {w.role}
                </option>
              ))}
            </SelectField>

            <div className="flex items-center justify-between rounded-xl bg-slate-900/[0.04] px-3 py-2.5 dark:bg-white/[0.05]">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Line / rate</p>
                <p className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200">
                  {worker?.machineId ?? "Hand section"} · {formatLKR(worker?.pieceRate ?? 0)}/dozen
                </p>
              </div>
              <Badge tone="slate">{worker ? deptOf(worker.departmentId).name : "—"}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Dozens completed
                </span>
                <input
                  type="number"
                  min={0}
                  value={dozens}
                  onChange={(e) => setDozens(Math.max(0, +e.target.value))}
                  className="tnum w-full rounded-xl border border-slate-300/70 bg-white/70 px-3 py-2 font-mono text-lg font-bold text-emerald-600 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 dark:border-white/10 dark:bg-slate-900/60 dark:text-emerald-400"
                />
              </label>
              <div>
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Shift
                </span>
                <div className="flex rounded-xl border border-slate-300/70 p-1 dark:border-white/10">
                  {(["day", "night"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setShift(s)}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-bold capitalize transition ${
                        shift === s
                          ? s === "day"
                            ? "bg-emerald-600 text-white shadow"
                            : "bg-indigo-500 text-white shadow"
                          : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Defective dozens (deducted)
              </p>
              {DEFECT_KEYS.map((k) => (
                <Stepper
                  key={k}
                  label={`${DEFECT_META[k].label} · ${DEFECT_META[k].si}`}
                  hint={`−${formatLKR(DEFECT_META[k].penalty)} per dozen`}
                  value={defects[k]}
                  onChange={(v) => setDefects({ ...defects, [k]: v })}
                />
              ))}
            </div>

            <Btn onClick={submit} className="w-full">
              <CheckCircle2 size={16} /> Commit to ledger
            </Btn>
          </div>
        </GlassCard>

        {/* live formula preview */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2">
            <Calculator size={15} className="text-indigo-400" />
            <h3 className="font-display text-sm font-semibold text-slate-700 dark:text-slate-100">
              Earnings preview
            </h3>
          </div>
          {preview && worker && (
            <div className="mt-3 space-y-1.5 font-mono text-xs">
              {[
                { l: `Base daily pay`, v: `+ ${formatLKR(preview.base)}`, c: "text-slate-600 dark:text-slate-300" },
                { l: `Qualified ${preview.qualified} dz × ${formatLKR(worker.pieceRate)}`, v: `+ ${formatLKR(preview.piece)}`, c: "text-emerald-600 dark:text-emerald-400" },
                { l: `Night allowance`, v: preview.night ? `+ ${formatLKR(preview.night)}` : "—", c: "text-indigo-500 dark:text-indigo-300" },
                { l: `Late penalty (${worker.lateMinutes} min)`, v: preview.late ? `− ${formatLKR(preview.late)}` : "—", c: "text-amber-600 dark:text-amber-400" },
                { l: `Defect penalty`, v: preview.penalty ? `− ${formatLKR(preview.penalty)}` : "—", c: "text-rose-500" },
              ].map((r) => (
                <div key={r.l} className="flex items-center justify-between rounded-lg bg-slate-900/[0.04] px-3 py-1.5 dark:bg-white/[0.04]">
                  <span className="text-slate-400">{r.l}</span>
                  <span className={`font-bold ${r.c}`}>{r.v}</span>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-lg bg-emerald-500/12 px-3 py-2 ring-1 ring-inset ring-emerald-500/30">
                <span className="font-bold text-emerald-700 dark:text-emerald-300">Daily gross</span>
                <motion.span
                  key={preview.gross}
                  initial={{ scale: 1.12 }}
                  animate={{ scale: 1 }}
                  className="tnum text-sm font-extrabold text-emerald-600 dark:text-emerald-400"
                >
                  {formatLKR(preview.gross)}
                </motion.span>
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      {/* ledger */}
      <div className="col-span-12 xl:col-span-8">
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { l: "Dozens logged", v: totals.dozensSum.toString(), cls: "text-slate-800 dark:text-white" },
            { l: "Qualified dozens", v: totals.qualifiedSum.toString(), cls: "text-emerald-600 dark:text-emerald-400" },
            { l: "Defect deductions", v: formatLKR(totals.penaltySum), cls: "text-rose-500" },
            { l: "Piece earnings", v: formatLKR(totals.grossSum), cls: "text-indigo-500 dark:text-indigo-300" },
          ].map((c) => (
            <GlassCard key={c.l} className="p-4">
              <p className={`tnum font-mono text-lg font-extrabold ${c.cls}`}>{c.v}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{c.l}</p>
            </GlassCard>
          ))}
        </div>

        <GlassCard>
          <div className="flex items-center justify-between border-b border-slate-200/70 p-4 dark:border-white/8">
            <div className="flex items-center gap-2">
              <Factory size={15} className="text-emerald-500" />
              <h3 className="font-display text-sm font-semibold text-slate-700 dark:text-slate-100">
                Today's production ledger
              </h3>
            </div>
            <Badge tone="emerald" dot>{todayEntries.length} entries</Badge>
          </div>
          <div className="max-h-[640px] overflow-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="sticky top-0 z-10 backdrop-blur">
                <tr className="bg-white/70 text-[10px] font-mono uppercase tracking-[0.14em] text-slate-400 dark:bg-ink-900/80">
                  <th className="px-4 py-2.5">Time</th>
                  <th className="px-3 py-2.5">Operator</th>
                  <th className="px-3 py-2.5">Line</th>
                  <th className="px-3 py-2.5 text-right">Dozens</th>
                  <th className="px-3 py-2.5">Defects</th>
                  <th className="px-3 py-2.5 text-right">Qualified</th>
                  <th className="px-4 py-2.5 text-right">Gross</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {todayEntries.map((e) => {
                    const w = nameOf(e.workerId);
                    if (!w) return null;
                    const defectsList = DEFECT_KEYS.filter((k) => e.defects[k] > 0);
                    return (
                      <motion.tr
                        key={e.id}
                        layout
                        initial={{ opacity: 0, backgroundColor: "rgba(5,150,105,0.14)" }}
                        animate={{ opacity: 1, backgroundColor: "rgba(5,150,105,0)" }}
                        transition={{ duration: 1.1 }}
                        className="border-b border-slate-200/50 dark:border-white/5"
                      >
                        <td className="tnum px-4 py-2.5 font-mono text-xs text-slate-500">{fmtTime(e.loggedAt)}</td>
                        <td className="px-3 py-2.5">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{w.name}</p>
                          <p className="font-mono text-[9px] uppercase tracking-wider text-slate-400">{w.role}</p>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs font-semibold text-slate-500 dark:text-slate-300">
                          {e.machineId ?? "hand"}
                        </td>
                        <td className="tnum px-3 py-2.5 text-right font-mono text-xs font-bold text-slate-700 dark:text-slate-100">
                          {e.dozens}
                        </td>
                        <td className="px-3 py-2.5">
                          {defectsList.length === 0 ? (
                            <span className="text-[10px] font-semibold text-emerald-500">clean ✓</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {defectsList.map((k) => (
                                <span key={k} className="rounded-md bg-rose-500/12 px-1.5 py-0.5 font-mono text-[9px] font-bold text-rose-500 ring-1 ring-inset ring-rose-500/25">
                                  {e.defects[k]}× {k === "oilStain" ? "oil" : k === "needleBreak" ? "needle" : k === "sizingError" ? "size" : "drop"}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="tnum px-3 py-2.5 text-right font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {calcQualified(e)}
                        </td>
                        <td className="tnum px-4 py-2.5 text-right font-mono text-xs font-bold text-slate-800 dark:text-white">
                          {formatLKR(dailyPieceGross(w, e, w.lateMinutes))}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
              <tfoot>
                <tr className="bg-emerald-500/[0.06] font-mono text-xs font-bold text-slate-700 dark:text-slate-100">
                  <td className="px-4 py-3" colSpan={3}>TOTALS</td>
                  <td className="tnum px-3 py-3 text-right">{totals.dozensSum}</td>
                  <td className="px-3 py-3 text-rose-500">− {formatLKR(totals.penaltySum)}</td>
                  <td className="tnum px-3 py-3 text-right text-emerald-600 dark:text-emerald-400">{totals.qualifiedSum}</td>
                  <td className="tnum px-4 py-3 text-right">{formatLKR(totals.grossSum)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
