import type {
  Advance,
  DefectKey,
  ProductionEntry,
  ShiftPlan,
  Worker,
} from "./types";

/* ------------------------------------------------------------------ */
/*  KnitHR statutory + factory rulebook (Sri Lanka)                    */
/*  EPF/ETF per EPF Act No.15 (1958) / ETF Act No.46 (1980)            */
/* ------------------------------------------------------------------ */
export const RULES = {
  dayShift: { start: "07:00", end: "19:00" },
  nightShift: { start: "19:00", end: "07:00" },
  graceMinutes: 10,
  latePenaltyPerHalfHour: 120, // LKR, unexcused late beyond grace
  earlyExitPenaltyPerHour: 250, // LKR
  nightAllowance: 350, // LKR per night shift
  otMultiplier: 1.5, // Shop & Office Employees / industrial OT
  standardShiftHours: 12,
  epfEmployee: 0.08,
  epfEmployer: 0.12,
  etfEmployer: 0.03,
  salariedDaysBase: 26, // working days used to derive daily rate
  pairsPerDozen: 12,
  teaBreaks: ["10:00 – 10:15", "15:00 – 15:15"],
  defectPenaltyPerDozen: {
    oilStain: 40,
    needleBreak: 150,
    sizingError: 60,
    dropStitch: 45,
  } as Record<DefectKey, number>,
};

export const DEFECT_META: Record<
  DefectKey,
  { label: string; si: string; penalty: number }
> = {
  oilStain: { label: "Oil stain", si: "තෙල් ලප", penalty: 40 },
  needleBreak: { label: "Needle break", si: "ඉඳිකටු කැඩීම", penalty: 150 },
  sizingError: { label: "Sizing error", si: "ප්‍රමාණ දෝෂ", penalty: 60 },
  dropStitch: { label: "Drop stitch", si: "මැහුම් දෝෂ", penalty: 45 },
};

/* ------------------------------ format ---------------------------- */

export function formatLKR(n: number, decimals = 0): string {
  const v = Math.round(n * 10 ** decimals) / 10 ** decimals;
  return (
    "Rs. " +
    v.toLocaleString("en-LK", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );
}

export function formatLKRShort(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `Rs. ${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `Rs. ${(n / 1_000).toFixed(1)}K`;
  return formatLKR(n);
}

export function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-LK", {
    day: "2-digit",
    month: "short",
  });
}

export function weekLabel(offsetWeeks = 0): string {
  const now = new Date();
  const day = now.getDay(); // 0 Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7) + offsetWeeks * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const wk = Math.ceil(
    ((+monday - +new Date(monday.getFullYear(), 0, 1)) / 86400000 + 1) / 7
  );
  return `WK-${String(wk).padStart(2, "0")} · ${fmtDate(+monday)} – ${fmtDate(+sunday)}`;
}

/* --------------------------- attendance --------------------------- */

export function minutesLate(clockIn: number): number {
  const d = new Date(clockIn);
  const start = new Date(d);
  start.setHours(7, 0, 0, 0);
  const over = Math.round((clockIn - +start) / 60000);
  return Math.max(0, over - RULES.graceMinutes);
}

export function latePenalty(mins: number): number {
  if (mins <= 0) return 0;
  return Math.ceil(mins / 30) * RULES.latePenaltyPerHalfHour;
}

export function otHours(workedHours: number): number {
  return Math.max(0, workedHours - RULES.standardShiftHours);
}

/* --------------------------- piece-rate --------------------------- */

export function totalDefectDozens(defects: Record<DefectKey, number>): number {
  return (
    defects.oilStain + defects.needleBreak + defects.sizingError + defects.dropStitch
  );
}

export function qualifiedDozens(entry: ProductionEntry): number {
  return Math.max(0, entry.dozens - totalDefectDozens(entry.defects));
}

export function defectCost(defects: Record<DefectKey, number>): number {
  return (Object.keys(defects) as DefectKey[]).reduce(
    (sum, k) => sum + defects[k] * RULES.defectPenaltyPerDozen[k],
    0
  );
}

/** Base Daily Pay + (Qualified Dozens × Piece Rate) + Night Allowance − Late Penalty − Defect Penalty */
export function dailyPieceGross(
  worker: Worker,
  entry: ProductionEntry | null,
  lateMins: number
): number {
  if (!entry) return Math.max(0, worker.baseDaily - latePenalty(lateMins));
  const piece = qualifiedDozens(entry) * worker.pieceRate;
  const night = entry.shift === "night" ? RULES.nightAllowance : 0;
  const gross =
    worker.baseDaily + piece + night - latePenalty(lateMins) - defectCost(entry.defects);
  return Math.max(0, Math.round(gross));
}

export function salariedDailyGross(worker: Worker, lateMins: number): number {
  const daily = worker.monthlySalary / RULES.salariedDaysBase;
  return Math.max(0, Math.round(daily - latePenalty(lateMins)));
}

/* ---------------------------- payroll ----------------------------- */

export interface PayrollLine {
  worker: Worker;
  days: number;
  dailyGross: number;
  gross: number;
  epfEmployee: number;
  epfEmployer: number;
  etfEmployer: number;
  advanceDeducted: number;
  net: number;
}

export function scheduledDays(plan: ShiftPlan, workerId: string): number {
  const row = plan[workerId] ?? [];
  return row.filter((c) => c === "D" || c === "N").length;
}

export function buildWeeklyPayroll(
  workers: Worker[],
  entries: ProductionEntry[],
  advances: Advance[],
  plan: ShiftPlan
): { lines: PayrollLine[]; totals: Record<string, number> } {
  const lines: PayrollLine[] = workers.map((w) => {
    const days = Math.max(1, scheduledDays(plan, w.id));
    const entry =
      entries.filter((e) => e.workerId === w.id).sort((a, b) => b.loggedAt - a.loggedAt)[0] ??
      null;
    const dailyGross =
      w.type === "piece"
        ? dailyPieceGross(w, entry, w.lateMinutes)
        : salariedDailyGross(w, w.lateMinutes);
    const gross = Math.round(dailyGross * days);
    const epfEmployee = Math.round(gross * RULES.epfEmployee);
    const epfEmployer = Math.round(gross * RULES.epfEmployer);
    const etfEmployer = Math.round(gross * RULES.etfEmployer);
    const advanceDeducted = advances
      .filter((a) => a.workerId === w.id && !a.recovered)
      .reduce((s, a) => s + a.amount, 0);
    const net = Math.max(0, gross - epfEmployee - advanceDeducted);
    return {
      worker: w,
      days,
      dailyGross,
      gross,
      epfEmployee,
      epfEmployer,
      etfEmployer,
      advanceDeducted,
      net,
    };
  });

  const totals = {
    gross: lines.reduce((s, l) => s + l.gross, 0),
    epfEmployee: lines.reduce((s, l) => s + l.epfEmployee, 0),
    epfEmployer: lines.reduce((s, l) => s + l.epfEmployer, 0),
    etfEmployer: lines.reduce((s, l) => s + l.etfEmployer, 0),
    advances: lines.reduce((s, l) => s + l.advanceDeducted, 0),
    net: lines.reduce((s, l) => s + l.net, 0),
  };
  return { lines, totals };
}

/** Available earnings a worker can draw an advance against (this week, projected). */
export function availableForAdvance(
  line: PayrollLine | undefined,
  advances: Advance[]
): number {
  if (!line) return 0;
  const outstanding = advances
    .filter((a) => a.workerId === line.worker.id && !a.recovered)
    .reduce((s, a) => s + a.amount, 0);
  return Math.max(0, line.gross - line.epfEmployee - outstanding);
}

/* -------------------------- shift helpers ------------------------- */

export function currentShiftCode(now: Date): "day" | "night" {
  const h = now.getHours();
  return h >= 7 && h < 19 ? "day" : "night";
}
