import type {
  Advance,
  Department,
  HourBucket,
  Machine,
  ProductionEntry,
  PunchEvent,
  ShiftPlan,
  Worker,
} from "./types";

/* --------------------------- departments -------------------------- */

export const DEPARTMENTS: Department[] = [
  { id: "knit", name: "Knitting", native: "බුනුම් අංශය", color: "#059669" },
  { id: "link", name: "Linking", native: "සම්බන්ධක", color: "#6366f1" },
  { id: "toe", name: "Toe Closing", native: "පාද මැහුම්", color: "#0891b2" },
  { id: "qc", name: "Quality Control", native: "තත්ත්ව පාලනය", color: "#f59e0b" },
  { id: "pack", name: "Packing", native: "ඇසුරුම්", color: "#e11d48" },
  { id: "maint", name: "Maintenance", native: "නඩත්තු", color: "#64748b" },
];

export const deptOf = (id: string) => DEPARTMENTS.find((d) => d.id === id)!;

/* ---------------------------- machines ---------------------------- */

const M = (
  id: string,
  brand: "Lonati" | "Matec",
  model: string,
  status: Machine["status"],
  rpm: number,
  efficiency: number,
  crew: Machine["crew"]
): Machine => ({ id, brand, model, status, rpm, efficiency, crew });

export const MACHINES: Machine[] = [
  M("LON-01", "Lonati", "GK-628", "running", 320, 94, "D"),
  M("LON-02", "Lonati", "GK-628", "running", 318, 91, "D"),
  M("LON-03", "Lonati", "GK-628", "running", 315, 88, "D"),
  M("LON-04", "Lonati", "GK-628", "idle", 0, 0, "D"),
  M("LON-05", "Lonati", "GK-628", "running", 321, 96, "D"),
  M("LON-06", "Lonati", "GK-628", "running", 310, 84, "D"),
  M("LON-07", "Lonati", "GK-628", "maintenance", 0, 0, "N"),
  M("LON-08", "Lonati", "GK-628", "running", 316, 90, "N"),
  M("MAT-01", "Matec", "415-S", "running", 300, 92, "D"),
  M("MAT-02", "Matec", "415-S", "running", 298, 89, "N"),
  M("MAT-03", "Matec", "415-S", "idle", 0, 0, "N"),
];

/* ----------------------------- workers ---------------------------- */

const todayAt = (h: number, m: number) => {
  const d = new Date();
  d.setHours(h, m, Math.floor(Math.random() * 50), 0);
  return +d;
};

let hueSeed = 152;
const nextHue = () => (hueSeed = (hueSeed + 47) % 360);

const W = (
  id: string,
  name: string,
  role: string,
  departmentId: string,
  type: Worker["type"],
  opts: Partial<Worker> = {}
): Worker => ({
  id,
  name,
  role,
  departmentId,
  type,
  baseDaily: type === "piece" ? 1450 : 0,
  pieceRate: 0,
  monthlySalary: 0,
  machineId: null,
  epfNo: `EPF-${(48210 + Number(id.slice(1)) * 37).toString()}`,
  joinedOn: "2022-03-14",
  status: "present",
  clockIn: todayAt(6, 48),
  clockOut: null,
  lateMinutes: 0,
  hue: nextHue(),
  ...opts,
});

export const WORKERS: Worker[] = [
  W("w1", "Nimal Perera", "Circular Knitting Operator", "knit", "piece", { pieceRate: 85, machineId: "LON-01", clockIn: todayAt(6, 44) }),
  W("w2", "Kasun Fernando", "Circular Knitting Operator", "knit", "piece", { pieceRate: 85, machineId: "LON-02", clockIn: todayAt(6, 51) }),
  W("w3", "Ishara Bandara", "Circular Knitting Operator", "knit", "piece", { pieceRate: 82, machineId: "LON-03", clockIn: todayAt(6, 58) }),
  W("w4", "Dinesh Wickramasinghe", "Circular Knitting Operator", "knit", "piece", { pieceRate: 85, machineId: "LON-04", status: "off", clockIn: null }),
  W("w5", "Sanduni Jayasinghe", "Circular Knitting Operator", "knit", "piece", { pieceRate: 80, machineId: "LON-05", status: "break", clockIn: todayAt(7, 2) }),
  W("w6", "Tharindu Silva", "Circular Knitting Operator", "knit", "piece", { pieceRate: 82, machineId: "LON-06", clockIn: todayAt(6, 47) }),
  W("w7", "Rukshan Weerasinghe", "Circular Knitting Operator", "knit", "piece", { pieceRate: 85, machineId: "LON-07", status: "off", clockIn: null }),
  W("w8", "Pasindu Rathnayake", "Circular Knitting Operator", "knit", "piece", { pieceRate: 80, machineId: "LON-08", status: "off", clockIn: null }),
  W("w9", "Asela Karunaratne", "Turner / Rover", "knit", "piece", { pieceRate: 50, status: "late", clockIn: todayAt(7, 26), lateMinutes: 16 }),
  W("w10", "Priya Rajendran", "Linker", "link", "piece", { pieceRate: 62, clockIn: todayAt(6, 55) }),
  W("w11", "Suresh Kumar", "Linker", "link", "piece", { pieceRate: 62, status: "break", clockIn: todayAt(6, 50) }),
  W("w12", "Selvi Arulpragasam", "Linker", "link", "piece", { pieceRate: 60, status: "late", clockIn: todayAt(7, 34), lateMinutes: 24 }),
  W("w13", "Anusha Kumari", "Toe Closing Operator", "toe", "piece", { pieceRate: 55, clockIn: todayAt(7, 5) }),
  W("w14", "Lakshan Gunawardena", "Toe Closing Operator", "toe", "piece", { pieceRate: 55, status: "absent", clockIn: null }),
  W("w15", "Mohamed Fairooz", "Packer", "pack", "piece", { pieceRate: 42, clockIn: todayAt(7, 0) }),
  W("w16", "Chamari Dilrukshi", "Packer", "pack", "piece", { pieceRate: 42, clockIn: todayAt(6, 57) }),
  W("w17", "Fathima Rishfa", "Packer", "pack", "piece", { pieceRate: 42, status: "leave", clockIn: null }),
  W("w18", "K. Mahendran", "Quality Checker – Line", "qc", "piece", { pieceRate: 48, status: "present", clockIn: todayAt(7, 4) }),
  W("w19", "Nimasha Herath", "QC Inspector", "qc", "salaried", { monthlySalary: 68000, clockIn: todayAt(7, 12) }),
  W("w20", "Dilini Samarasinghe", "QC Inspector", "qc", "salaried", { monthlySalary: 62000, status: "break", clockIn: todayAt(7, 8) }),
  W("w21", "Sunil Jayawardena", "Maintenance Engineer", "maint", "salaried", { monthlySalary: 95000, clockIn: todayAt(6, 40) }),
  W("w22", "Ruwanthi Fonseka", "Floor Supervisor", "knit", "salaried", { monthlySalary: 85000, clockIn: todayAt(6, 35) }),
];

/* ------------------------------ plan ------------------------------ */

export const PLAN: ShiftPlan = Object.fromEntries(
  WORKERS.map((w) => {
    if (w.id === "w17") return [w.id, ["L", "L", "L", "L", "L", "O", "O"] as const];
    if (["w7", "w8", "w12"].includes(w.id))
      return [w.id, ["N", "N", "N", "N", "N", "O", "O"]];
    if (w.type === "salaried") return [w.id, ["D", "D", "D", "D", "D", "D", "O"]];
    return [w.id, ["D", "D", "D", "D", "D", "O", "O"]];
  })
);

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* ------------------------------ events ----------------------------- */

let evId = 0;
const EV = (
  workerId: string,
  kind: "in" | "out",
  h: number,
  m: number,
  method: PunchEvent["method"],
  gate: "A" | "B",
  lateMinutes?: number
): PunchEvent => ({
  id: `ev-${++evId}`,
  workerId,
  kind,
  time: todayAt(h, m),
  method,
  gate,
  lateMinutes,
});

export const EVENTS: PunchEvent[] = [
  EV("w22", "in", 6, 35, "fingerprint", "A"),
  EV("w1", "in", 6, 44, "rfid", "B"),
  EV("w21", "in", 6, 40, "fingerprint", "A"),
  EV("w2", "in", 6, 51, "rfid", "B"),
  EV("w10", "in", 6, 55, "fingerprint", "A"),
  EV("w13", "in", 7, 5, "fingerprint", "A"),
  EV("w9", "in", 7, 26, "rfid", "B", 16),
  EV("w12", "in", 7, 34, "fingerprint", "A", 24),
  EV("w5", "out", 10, 1, "rfid", "B"),
  EV("w11", "out", 10, 2, "fingerprint", "A"),
].sort((a, b) => b.time - a.time);

/* --------------------------- production ---------------------------- */

let entryId = 0;
const PE = (
  workerId: string,
  machineId: string | null,
  dozens: number,
  defects: ProductionEntry["defects"],
  h: number,
  m: number
): ProductionEntry => ({
  id: `pe-${++entryId}`,
  workerId,
  machineId,
  dozens,
  defects,
  shift: "day",
  loggedAt: todayAt(h, m),
});

export const ENTRIES: ProductionEntry[] = [
  PE("w1", "LON-01", 13, { oilStain: 0, needleBreak: 0, sizingError: 0, dropStitch: 1 }, 9, 42),
  PE("w2", "LON-02", 12, { oilStain: 1, needleBreak: 0, sizingError: 0, dropStitch: 0 }, 9, 50),
  PE("w3", "LON-03", 11, { oilStain: 0, needleBreak: 0, sizingError: 1, dropStitch: 0 }, 10, 5),
  PE("w5", "LON-05", 14, { oilStain: 0, needleBreak: 0, sizingError: 0, dropStitch: 0 }, 10, 12),
  PE("w6", "LON-06", 10, { oilStain: 0, needleBreak: 1, sizingError: 0, dropStitch: 0 }, 10, 20),
  PE("w10", null, 16, { oilStain: 0, needleBreak: 0, sizingError: 0, dropStitch: 2 }, 10, 25),
  PE("w11", null, 15, { oilStain: 1, needleBreak: 0, sizingError: 0, dropStitch: 0 }, 10, 31),
  PE("w12", null, 9, { oilStain: 0, needleBreak: 0, sizingError: 1, dropStitch: 0 }, 10, 40),
  PE("w13", null, 12, { oilStain: 0, needleBreak: 0, sizingError: 0, dropStitch: 0 }, 10, 44),
  PE("w15", null, 18, { oilStain: 0, needleBreak: 0, sizingError: 0, dropStitch: 0 }, 10, 52),
  PE("w16", null, 17, { oilStain: 0, needleBreak: 0, sizingError: 0, dropStitch: 1 }, 11, 3),
  PE("w18", null, 13, { oilStain: 0, needleBreak: 0, sizingError: 0, dropStitch: 0 }, 11, 10),
  PE("w9", null, 7, { oilStain: 0, needleBreak: 0, sizingError: 0, dropStitch: 0 }, 11, 15),
  PE("w1", "LON-01", 12, { oilStain: 0, needleBreak: 0, sizingError: 0, dropStitch: 0 }, 13, 20),
  PE("w5", "LON-05", 13, { oilStain: 0, needleBreak: 0, sizingError: 0, dropStitch: 0 }, 13, 35),
  PE("w10", null, 14, { oilStain: 0, needleBreak: 0, sizingError: 1, dropStitch: 0 }, 13, 50),
];

/* ----------------------------- advances ---------------------------- */

let advId = 0;
const ADV = (
  workerId: string,
  amount: number,
  daysAgo: number,
  reason: string,
  recovered: boolean
): Advance => ({
  id: `adv-${++advId}`,
  workerId,
  amount,
  date: +new Date(Date.now() - daysAgo * 86400000),
  reason,
  recovered,
});

export const ADVANCES: Advance[] = [
  ADV("w2", 2500, 2, "School fees – term 2", false),
  ADV("w6", 1500, 3, "Bus pass reload", true),
  ADV("w13", 3000, 1, "Clinic – child medical", false),
  ADV("w15", 2000, 5, "Poya travel – Kandy", true),
  ADV("w12", 1000, 1, "Emergency cash", false),
  ADV("w9", 4000, 6, "Rent advance", false),
];

/* ------------------------- hourly production ----------------------- */

export const DAILY_TARGET_PAIRS = 5200;

export function seedHourly(): HourBucket[] {
  const nowH = new Date().getHours();
  const buckets: HourBucket[] = [];
  const curve = [360, 410, 440, 300, 450, 460, 455, 280, 445, 450, 430, 240, 0];
  for (let i = 0; i < 13; i++) {
    const h = 7 + i;
    const jitter = ((i * 37) % 60) - 30;
    const actual =
      h < nowH
        ? Math.max(120, curve[i] + jitter)
        : h === nowH
        ? Math.round((curve[i] + jitter) * (new Date().getMinutes() / 60))
        : 0;
    buckets.push({ h: String(h).padStart(2, "0"), target: 430, actual });
  }
  return buckets;
}

/* ---------------------------- holidays ----------------------------- */

export const NEXT_POYA = {
  name: "Duruthu Poya",
  si: "දුරුතු පොහොය",
  date: "Fri · 02 Jan",
  note: "Factory holiday — night crew exempt with 1.5× OT per EPF shop-floor circular.",
};
