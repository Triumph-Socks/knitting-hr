export type ViewId =
  | "dashboard"
  | "workers"
  | "shifts"
  | "production"
  | "payroll"
  | "advances"
  | "blueprint";

export type WorkerType = "piece" | "salaried";

export type AttendanceStatus =
  | "present"
  | "late"
  | "break"
  | "absent"
  | "leave"
  | "off";

export type ShiftCode = "D" | "N" | "O" | "L";

export type MachineStatus = "running" | "idle" | "maintenance";

export type PunchMethod = "fingerprint" | "rfid";

export type DefectKey = "oilStain" | "needleBreak" | "sizingError" | "dropStitch";

export interface Department {
  id: string;
  name: string;
  native: string;
  color: string; // tailwind-safe hex
}

export interface Worker {
  id: string;
  name: string;
  role: string;
  departmentId: string;
  type: WorkerType;
  /** guaranteed base for piece workers (LKR/day) */
  baseDaily: number;
  /** LKR per qualified dozen (12 pairs) */
  pieceRate: number;
  /** LKR/month — salaried staff only */
  monthlySalary: number;
  machineId: string | null;
  epfNo: string;
  joinedOn: string;
  status: AttendanceStatus;
  clockIn: number | null;
  clockOut: number | null;
  lateMinutes: number;
  hue: number;
}

export interface Machine {
  id: string;
  brand: "Lonati" | "Matec";
  model: string;
  status: MachineStatus;
  rpm: number;
  efficiency: number; // 0-100
  crew: ShiftCode; // which crew runs it today
}

export interface PunchEvent {
  id: string;
  workerId: string;
  kind: "in" | "out";
  time: number;
  method: PunchMethod;
  gate: "A" | "B";
  lateMinutes?: number;
}

export interface ProductionEntry {
  id: string;
  workerId: string;
  machineId: string | null;
  dozens: number;
  defects: Record<DefectKey, number>; // dozens affected per defect type
  shift: "day" | "night";
  loggedAt: number;
}

export interface Advance {
  id: string;
  workerId: string;
  amount: number;
  date: number;
  reason: string;
  recovered: boolean;
}

export interface PayrollRecord {
  id: string;
  workerId: string;
  week: string;
  days: number;
  gross: number;
  epfEmployee: number;
  epfEmployer: number;
  etfEmployer: number;
  advanceDeducted: number;
  net: number;
  processedAt: number;
}

export interface HourBucket {
  h: string;
  target: number;
  actual: number;
}

export interface Toast {
  id: string;
  tone: "success" | "info" | "warn";
  title: string;
  body?: string;
}

export type ShiftPlan = Record<string, ShiftCode[]>;
