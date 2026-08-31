import { create } from "zustand";
import {
  ADVANCES,
  ENTRIES,
  EVENTS,
  MACHINES,
  PLAN,
  WORKERS,
  seedHourly,
} from "./data";
import { buildWeeklyPayroll, weekLabel } from "./payroll";
import type {
  Advance,
  HourBucket,
  Machine,
  PayrollRecord,
  ProductionEntry,
  PunchEvent,
  PunchMethod,
  ShiftCode,
  ShiftPlan,
  Toast,
  ViewId,
  Worker,
} from "./types";

const readTheme = (): "dark" | "light" => {
  try {
    return localStorage.getItem("knithr-theme") === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
};

let uid = 100;
const nid = (p: string) => `${p}-${Date.now().toString(36)}-${++uid}`;

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

interface KnitState {
  theme: "dark" | "light";
  view: ViewId;
  workers: Worker[];
  machines: Machine[];
  events: PunchEvent[];
  entries: ProductionEntry[];
  advances: Advance[];
  payroll: PayrollRecord[];
  processedWeek: string | null;
  plan: ShiftPlan;
  hourly: HourBucket[];
  toasts: Toast[];

  setTheme: (t: "dark" | "light") => void;
  toggleTheme: () => void;
  setView: (v: ViewId) => void;
  toast: (tone: Toast["tone"], title: string, body?: string) => void;
  dismissToast: (id: string) => void;

  recordPunch: (workerId: string, kind: "in" | "out") => void;
  simulateGate: () => void;
  tickOutput: () => void;
  addEntry: (e: Omit<ProductionEntry, "id" | "loggedAt">) => void;
  addWorker: (w: Pick<Worker, "name" | "role" | "departmentId" | "type" | "baseDaily" | "pieceRate" | "monthlySalary">) => void;
  addAdvance: (workerId: string, amount: number, reason: string) => void;
  markRecovered: (id: string) => void;
  cyclePlan: (workerId: string, day: number) => void;
  setMachineStatus: (id: string, status: Machine["status"]) => void;
  processPayroll: () => void;
}

export const useKnit = create<KnitState>()((set, get) => ({
  theme: readTheme(),
  view: "dashboard",
  workers: WORKERS,
  machines: MACHINES,
  events: EVENTS,
  entries: ENTRIES,
  advances: ADVANCES,
  payroll: [],
  processedWeek: null,
  plan: PLAN,
  hourly: seedHourly(),
  toasts: [],

  setTheme: (t) => {
    try {
      localStorage.setItem("knithr-theme", t);
    } catch {
      /* noop */
    }
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.classList.toggle("light", t === "light");
    set({ theme: t });
  },
  toggleTheme: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),
  setView: (v) => set({ view: v }),

  toast: (tone, title, body) => {
    const id = nid("t");
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, tone, title, body }] }));
    setTimeout(() => get().dismissToast(id), 4200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  recordPunch: (workerId, kind) => {
    const now = Date.now();
    const method: PunchMethod = Math.random() > 0.5 ? "fingerprint" : "rfid";
    const gate: "A" | "B" = Math.random() > 0.5 ? "A" : "B";
    set((s) => ({
      events: [
        { id: nid("ev"), workerId, kind, time: now, method, gate },
        ...s.events,
      ].slice(0, 18),
      workers: s.workers.map((w) =>
        w.id === workerId
          ? {
              ...w,
              status: kind === "in" ? "present" : "break",
              clockIn: kind === "in" ? now : w.clockIn,
              clockOut: kind === "out" ? now : w.clockOut,
            }
          : w
      ),
    }));
  },

  simulateGate: () => {
    const s = get();
    const candidates = s.workers.filter((w) =>
      ["present", "break", "absent", "late"].includes(w.status)
    );
    if (candidates.length === 0) return;
    const w = pick(candidates);
    let kind: "in" | "out" = "in";
    if (w.status === "present" || w.status === "late") kind = Math.random() > 0.45 ? "out" : "in";
    if (w.status === "break") kind = "in";
    if (w.status === "absent") kind = "in";
    get().recordPunch(w.id, kind);
  },

  tickOutput: () => {
    set((s) => {
      const h = String(new Date().getHours()).padStart(2, "0");
      const hourly = s.hourly.map((b) =>
        b.h === h ? { ...b, actual: b.actual + 2 + Math.floor(Math.random() * 7) } : b
      );
      const machines = s.machines.map((m) =>
        m.status === "running" && Math.random() > 0.7
          ? { ...m, efficiency: Math.min(99, m.efficiency + (Math.random() > 0.5 ? 1 : -1)) }
          : m
      );
      return { hourly, machines };
    });
  },

  addEntry: (e) => {
    set((s) => ({
      entries: [{ ...e, id: nid("pe"), loggedAt: Date.now() }, ...s.entries],
    }));
  },

  addWorker: (w) => {
    const id = nid("w");
    set((s) => ({
      workers: [
        ...s.workers,
        {
          ...w,
          id,
          machineId: null,
          epfNo: `EPF-${49000 + s.workers.length * 37}`,
          joinedOn: new Date().toISOString().slice(0, 10),
          status: "absent",
          clockIn: null,
          clockOut: null,
          lateMinutes: 0,
          hue: Math.floor(Math.random() * 360),
        },
      ],
      plan: { ...s.plan, [id]: ["D", "D", "D", "D", "D", "O", "O"] as ShiftCode[] },
    }));
    get().toast("success", "Worker registered", `${w.name} added to the floor directory.`);
  },

  addAdvance: (workerId, amount, reason) => {
    set((s) => ({
      advances: [
        { id: nid("adv"), workerId, amount, reason, date: Date.now(), recovered: false },
        ...s.advances,
      ],
    }));
  },

  markRecovered: (id) =>
    set((s) => ({
      advances: s.advances.map((a) => (a.id === id ? { ...a, recovered: true } : a)),
    })),

  cyclePlan: (workerId, day) => {
    const order: ShiftCode[] = ["D", "N", "O", "L"];
    set((s) => {
      const row = [...(s.plan[workerId] ?? order.map(() => "O" as ShiftCode))];
      row[day] = order[(order.indexOf(row[day]) + 1) % order.length];
      return { plan: { ...s.plan, [workerId]: row } };
    });
  },

  setMachineStatus: (id, status) =>
    set((s) => ({
      machines: s.machines.map((m) =>
        m.id === id
          ? {
              ...m,
              status,
              rpm: status === "running" ? 295 + Math.floor(Math.random() * 30) : 0,
              efficiency: status === "running" ? 85 : 0,
            }
          : m
      ),
    })),

  processPayroll: () => {
    const s = get();
    const week = weekLabel();
    const { lines } = buildWeeklyPayroll(s.workers, s.entries, s.advances, s.plan);
    const records: PayrollRecord[] = lines.map((l) => ({
      id: nid("pr"),
      workerId: l.worker.id,
      week,
      days: l.days,
      gross: l.gross,
      epfEmployee: l.epfEmployee,
      epfEmployer: l.epfEmployer,
      etfEmployer: l.etfEmployer,
      advanceDeducted: l.advanceDeducted,
      net: l.net,
      processedAt: Date.now(),
    }));
    set((st) => ({
      payroll: records,
      processedWeek: week,
      advances: st.advances.map((a) => ({ ...a, recovered: true })),
    }));
    get().toast(
      "success",
      "Payroll run processed",
      `${records.length} immutable records written for ${week}.`
    );
  },
}));
