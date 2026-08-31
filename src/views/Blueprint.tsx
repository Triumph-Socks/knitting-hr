import { Database, GitBranch, Layers, Server, ShieldCheck, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { Badge, GlassCard } from "../components/ui";
import { RULES } from "../lib/payroll";

const SCHEMA = `// schema.prisma — KnitHR core domain
generator client { provider = "prisma-client-js" }
datasource db    { provider = "postgresql"  url = env("DATABASE_URL") }

model Department {
  id        String   @id @default(cuid())
  name      String   // Knitting, Linking, Toe Closing, QC, Packing
  nameSi    String   // Sinhala label
  nameTa    String?  // Tamil label
  workers   Worker[]
}

model Worker {
  id            String        @id @default(cuid())
  epfNo         String        @unique        // EPF Act registration
  name          String
  role          String        // machine operator, linker, packer...
  type          PayBasis      @default(PIECE_RATE)
  baseDaily     Decimal       @db.Decimal(10,2) @default(1450)
  pieceRateDozen Decimal      @db.Decimal(10,2) // per qualified dozen
  monthlySalary Decimal?      @db.Decimal(12,2) // salaried staff
  biometricRef  String?       @unique          // fingerprint template id
  department    Department    @relation(fields: [departmentId], references: [id])
  departmentId  String
  machine       MachineAssignment?
  attendance    AttendanceLog[]
  production    PieceRateProduction[]
  advances      Advance[]
  payroll       PayrollRecord[]
}

enum PayBasis { PIECE_RATE SALARIED }
enum ShiftType { DAY NIGHT }

model Shift {
  id        String    @id @default(cuid())
  type      ShiftType
  startsAt  DateTime  // 07:00 day / 19:00 night
  endsAt    DateTime
  workers   MachineAssignment[]
}

model Machine {
  id        String   @id       // LON-01 ... MAT-03
  brand     String             // Lonati GK-628 / Matec 415-S
  status    String   @default("running")
  assignments MachineAssignment[]
}

model MachineAssignment {
  id        String   @id @default(cuid())
  worker    Worker   @relation(fields: [workerId], references: [id])
  workerId  String   @unique
  machine   Machine  @relation(fields: [machineId], references: [id])
  machineId String
  shift     Shift    @relation(fields: [shiftId], references: [id])
  shiftId   String
  day       DateTime @db.Date
  @@index([machineId, day])
}

model AttendanceLog {
  id           String   @id @default(cuid())   // time-series append-only
  worker       Worker   @relation(fields: [workerId], references: [id])
  workerId     String
  punchedAt    DateTime
  direction    String   // IN | OUT
  gate         String   // A | B turnstile
  method       String   // fingerprint | rfid
  lateMinutes  Int      @default(0)
  @@index([workerId, punchedAt])
}

model PieceRateProduction {
  id            String  @id @default(cuid())
  worker        Worker  @relation(fields: [workerId], references: [id])
  workerId      String
  day           DateTime @db.Date
  dozens        Int
  defectOil     Int     @default(0)
  defectNeedle  Int     @default(0)
  defectSizing  Int     @default(0)
  defectDrop    Int     @default(0)
  shift         ShiftType
  grossEarned   Decimal @db.Decimal(10,2)  // computed, immutable
  @@index([workerId, day])
}

model Advance {
  id         String   @id @default(cuid())
  worker     Worker   @relation(fields: [workerId], references: [id])
  workerId   String
  amount     Decimal  @db.Decimal(10,2)
  reason     String
  issuedAt   DateTime
  recoveredAt DateTime?
  payroll    PayrollRecord?
}

model PayrollRecord {   // immutable once written
  id            String   @id @default(cuid())
  worker        Worker   @relation(fields: [workerId], references: [id])
  workerId      String
  week          String
  gross         Decimal  @db.Decimal(12,2)
  epfEmployee8  Decimal  @db.Decimal(10,2)
  epfEmployer12 Decimal  @db.Decimal(10,2)
  etf3          Decimal  @db.Decimal(10,2)
  advanceRec    Advance? @relation(fields: [advanceId], references: [id])
  advanceId     String?  @unique
  net           Decimal  @db.Decimal(12,2)
  processedAt   DateTime @default(now())
  @@unique([workerId, week])
}`;

function CodeLine({ line }: { line: string }) {
  const commentIdx = line.indexOf("//");
  const code = commentIdx >= 0 ? line.slice(0, commentIdx) : line;
  const comment = commentIdx >= 0 ? line.slice(commentIdx) : "";
  const parts = code.split(/(\b(?:model|enum|generator|datasource|provider|url|env|relation|fields|references|default|unique|index|id|db|cuid|now|Decimal|String|Int|Boolean|DateTime|Date|PayBasis|ShiftType|PIECE_RATE|SALARIED|DAY|NIGHT)\b|@@?\w+|"[^"]*")/g);
  return (
    <div className="whitespace-pre">
      {parts.map((p, i) => {
        if (!p) return null;
        const isKw = ["model", "enum", "generator", "datasource"].includes(p);
        const isType = ["Decimal", "String", "Int", "Boolean", "DateTime", "PayBasis", "ShiftType"].includes(p);
        const isAttr = p.startsWith("@");
        const isEnumV = ["PIECE_RATE", "SALARIED", "DAY", "NIGHT"].includes(p);
        const isStr = p.startsWith('"');
        return (
          <span
            key={i}
            className={
              isKw
                ? "text-indigo-400"
                : isType
                ? "text-sky-400"
                : isAttr
                ? "text-amber-400"
                : isEnumV
                ? "text-rose-400"
                : isStr
                ? "text-emerald-400"
                : "text-slate-300"
            }
          >
            {p}
          </span>
        );
      })}
      {comment && <span className="text-slate-500 italic">{comment}</span>}
    </div>
  );
}

function Block({
  title,
  kicker,
  icon,
  children,
  className = "",
}: {
  title: string;
  kicker: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <GlassCard className={className}>
      <div className="flex items-center justify-between border-b border-slate-200/70 p-4 dark:border-white/8">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">{kicker}</p>
          <h3 className="font-display text-sm font-semibold text-slate-700 dark:text-slate-100">{title}</h3>
        </div>
        <span className="rounded-lg bg-indigo-500/12 p-2 text-indigo-400 ring-1 ring-inset ring-indigo-500/25">{icon}</span>
      </div>
      {children}
    </GlassCard>
  );
}

const STACK = [
  "Next.js 15 App Router",
  "React 19 + TS",
  "Tailwind CSS v4",
  "shadcn/ui",
  "Framer Motion",
  "Recharts",
  "TanStack Table",
  "Zustand + Server Actions",
  "PostgreSQL + Prisma",
];

const MODULES = [
  {
    name: "Biometric sync worker",
    action: "syncGateBuffer()",
    desc: "Cron every 90 s pulls turnstile buffer via gate REST API, dedupes by (biometricRef, punchedAt), computes lateMinutes against shift start + grace.",
  },
  {
    name: "Shift & machine planner",
    action: "assignMachineLine()",
    desc: "Server action validates one operator per machine per shift, writes MachineAssignment rows, blocks overlapping D/N across midnight boundary.",
  },
  {
    name: "Piece-rate engine",
    action: "commitProduction()",
    desc: "Pure service (this app's payroll.ts) — computes qualified dozens, defect penalties and daily gross; stores result immutably on the row.",
  },
  {
    name: "Advance desk",
    action: "issueAdvance()",
    desc: "Guards draws against net-available projected earnings; auto-links to the next PayrollRecord via unique advanceId.",
  },
  {
    name: "Weekly payroll run",
    action: "processPayrollRun()",
    desc: "Transactional: aggregates 7 days, applies EPF 8/12 + ETF 3, recovers advances, writes append-only PayrollRecords in one $transaction.",
  },
];

export function Blueprint() {
  return (
    <div className="space-y-4">
      {/* header */}
      <GlassCard className="relative overflow-hidden p-6" glow="indigo">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-indigo-400">
            Architecture blueprint · v2.4
          </p>
          <h2 className="mt-2 max-w-2xl font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            One codebase for the whole factory — from turnstile punch to EPF remittance.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            This running prototype executes the same rulebook the production service layer uses.
            The Prisma schema below maps 1:1 to the live store in your browser: workers, punches,
            dozens, advances and immutable payroll records.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {STACK.map((s) => (
              <span key={s} className="rounded-full bg-slate-900/[0.05] px-3 py-1 font-mono text-[11px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-500/20 dark:bg-white/[0.06] dark:text-slate-300 dark:ring-white/10">
                {s}
              </span>
            ))}
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-12 gap-4">
        {/* prisma schema */}
        <Block
          title="schema.prisma — full domain model"
          kicker="PostgreSQL · Prisma ORM"
          icon={<Database size={15} />}
          className="col-span-12 xl:col-span-7"
        >
          <div className="max-h-[560px] overflow-auto bg-slate-950/95 p-4 font-mono text-[11px] leading-relaxed">
            {SCHEMA.split("\n").map((l, i) => (
              <CodeLine key={i} line={l} />
            ))}
          </div>
        </Block>

        {/* right column */}
        <div className="col-span-12 flex flex-col gap-4 xl:col-span-5">
          <Block title="Live rulebook (executing now)" kicker="payroll.ts constants" icon={<ShieldCheck size={15} />}>
            <div className="grid grid-cols-2 gap-2 p-4">
              {[
                { l: "Day shift", v: `${RULES.dayShift.start}–${RULES.dayShift.end}` },
                { l: "Night shift", v: `${RULES.nightShift.start}–${RULES.nightShift.end}` },
                { l: "Gate grace", v: `${RULES.graceMinutes} min` },
                { l: "Late penalty", v: `Rs ${RULES.latePenaltyPerHalfHour}/½hr` },
                { l: "Night allowance", v: `Rs ${RULES.nightAllowance}` },
                { l: "OT multiplier", v: `${RULES.otMultiplier}×` },
                { l: "EPF employee", v: `${RULES.epfEmployee * 100}%` },
                { l: "EPF employer", v: `${RULES.epfEmployer * 100}%` },
                { l: "ETF employer", v: `${RULES.etfEmployer * 100}%` },
                { l: "Pairs per dozen", v: `${RULES.pairsPerDozen}` },
                { l: "Oil stain / dz", v: `− Rs ${RULES.defectPenaltyPerDozen.oilStain}` },
                { l: "Needle break / dz", v: `− Rs ${RULES.defectPenaltyPerDozen.needleBreak}` },
                { l: "Sizing error / dz", v: `− Rs ${RULES.defectPenaltyPerDozen.sizingError}` },
                { l: "Drop stitch / dz", v: `− Rs ${RULES.defectPenaltyPerDozen.dropStitch}` },
              ].map((r) => (
                <div key={r.l} className="rounded-xl bg-slate-900/[0.04] px-3 py-2 dark:bg-white/[0.05]">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{r.l}</p>
                  <p className="tnum font-mono text-xs font-bold text-slate-700 dark:text-slate-100">{r.v}</p>
                </div>
              ))}
            </div>
          </Block>

          <Block title="Gross earning formula" kicker="Piece-rate core" icon={<Zap size={15} />}>
            <div className="p-4">
              <code className="block rounded-xl bg-emerald-500/[0.07] p-3 font-mono text-[11px] font-semibold leading-relaxed text-emerald-700 ring-1 ring-inset ring-emerald-500/25 dark:text-emerald-300">
                gross = baseDaily
                <br />
                &nbsp;&nbsp;+ max(0, dozens − ΣdefectDozens) × pieceRate
                <br />
                &nbsp;&nbsp;+ (shift === NIGHT ? 350 : 0)
                <br />
                &nbsp;&nbsp;− ceil(max(0, lateMin − 10) / 30) × 120
                <br />
                &nbsp;&nbsp;− Σ(defectDozens × penaltyPerDozen)
              </code>
            </div>
          </Block>
        </div>

        {/* modules */}
        <Block
          title="Module map · server actions & workers"
          kicker="Next.js App Router"
          icon={<Server size={15} />}
          className="col-span-12"
        >
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
            {MODULES.map((m) => (
              <div key={m.name} className="group rounded-2xl border border-slate-200/70 bg-white/40 p-4 transition hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5 dark:border-white/8 dark:bg-white/[0.03]">
                <p className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <GitBranch size={11} /> {m.action}
                </p>
                <p className="mt-1.5 font-display text-[13px] font-bold text-slate-800 dark:text-slate-100">{m.name}</p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{m.desc}</p>
              </div>
            ))}
          </div>
        </Block>

        {/* data flow */}
        <Block title="Data flow · punch to payslip" kicker="Event pipeline" icon={<Layers size={15} />} className="col-span-12">
          <div className="flex flex-wrap items-center gap-2 p-5">
            {[
              { t: "Turnstile gate A/B", b: "fingerprint · RFID", tone: "emerald" as const },
              { t: "Gate buffer sync", b: "cron 90 s", tone: "slate" as const },
              { t: "AttendanceLog", b: "append-only", tone: "indigo" as const },
              { t: "Piece-rate engine", b: "gross compute", tone: "emerald" as const },
              { t: "Advance ledger", b: "auto-link", tone: "amber" as const },
              { t: "PayrollRecord", b: "EPF 8/12 · ETF 3", tone: "indigo" as const },
              { t: "Payslip + bank file", b: "print / SEPA-like CSV", tone: "emerald" as const },
            ].map((s, i, arr) => (
              <div key={s.t} className="flex items-center gap-2">
                <div className={`rounded-xl px-3 py-2 ring-1 ring-inset ${
                  s.tone === "emerald" ? "bg-emerald-500/10 ring-emerald-500/30" :
                  s.tone === "indigo" ? "bg-indigo-500/10 ring-indigo-500/30" :
                  s.tone === "amber" ? "bg-amber-500/10 ring-amber-500/30" :
                  "bg-slate-500/10 ring-slate-500/25"
                }`}>
                  <p className="text-[11px] font-bold text-slate-700 dark:text-slate-100">{s.t}</p>
                  <p className="font-mono text-[9px] text-slate-400">{s.b}</p>
                </div>
                {i < arr.length - 1 && <span className="font-mono text-slate-300 dark:text-slate-600">→</span>}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 px-5 pb-4">
            <Badge tone="emerald" dot>Live in this demo</Badge>
            <span className="text-[11px] text-slate-400">— every number on the Floor Live tab is computed by the same functions listed above.</span>
          </div>
        </Block>
      </div>
    </div>
  );
}
