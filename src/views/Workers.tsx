import { motion } from "framer-motion";
import { Fingerprint, LogIn, LogOut, Plus, Search, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Btn,
  GlassCard,
  Modal,
  SelectField,
  StatusBadge,
  TextField,
} from "../components/ui";
import { DEPARTMENTS, deptOf } from "../lib/data";
import { dailyPieceGross, fmtTime, formatLKR, salariedDailyGross } from "../lib/payroll";
import { useKnit } from "../lib/store";
import type { WorkerType } from "../lib/types";

const emptyForm = {
  name: "",
  role: "",
  departmentId: "knit",
  type: "piece" as WorkerType,
  baseDaily: 1450,
  pieceRate: 60,
  monthlySalary: 55000,
};

export function Workers() {
  const workers = useKnit((s) => s.workers);
  const entries = useKnit((s) => s.entries);
  const addWorker = useKnit((s) => s.addWorker);
  const recordPunch = useKnit((s) => s.recordPunch);
  const toast = useKnit((s) => s.toast);

  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");
  const [type, setType] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const latestEntry = useMemo(() => {
    const m = new Map<string, (typeof entries)[number]>();
    for (const e of entries) if (!m.has(e.workerId)) m.set(e.workerId, e);
    return m;
  }, [entries]);

  const grossOf = (w: (typeof workers)[number]) =>
    w.type === "piece"
      ? dailyPieceGross(w, latestEntry.get(w.id) ?? null, w.lateMinutes)
      : salariedDailyGross(w, w.lateMinutes);

  const filtered = workers.filter(
    (w) =>
      (dept === "all" || w.departmentId === dept) &&
      (type === "all" || w.type === type) &&
      (q === "" ||
        w.name.toLowerCase().includes(q.toLowerCase()) ||
        w.role.toLowerCase().includes(q.toLowerCase()) ||
        w.epfNo.toLowerCase().includes(q.toLowerCase()))
  );

  const chips = [
    { label: "Registered", v: workers.length, cls: "text-slate-700 dark:text-white" },
    { label: "On floor now", v: workers.filter((w) => ["present", "late", "break"].includes(w.status)).length, cls: "text-emerald-600 dark:text-emerald-400" },
    { label: "Piece-rate", v: workers.filter((w) => w.type === "piece").length, cls: "text-indigo-500 dark:text-indigo-300" },
    { label: "Salaried staff", v: workers.filter((w) => w.type === "salaried").length, cls: "text-amber-600 dark:text-amber-400" },
  ];

  const submit = () => {
    if (!form.name.trim() || !form.role.trim()) {
      toast("warn", "Missing details", "Name and role are required to register a worker.");
      return;
    }
    addWorker(form);
    setOpen(false);
    setForm(emptyForm);
  };

  return (
    <div className="space-y-4">
      {/* stat chips */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {chips.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <GlassCard className="p-4">
              <p className={`font-display text-2xl font-extrabold ${c.cls}`}>{c.v}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{c.label}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <GlassCard>
        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200/70 p-4 dark:border-white/8">
          <div className="relative min-w-52 flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, role or EPF no…"
              className="w-full rounded-xl border border-slate-300/70 bg-white/60 py-2 pl-9 pr-3 text-sm font-medium outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-100"
            />
          </div>
          <select
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            className="rounded-xl border border-slate-300/70 bg-white/60 px-3 py-2 text-sm font-medium dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-100"
          >
            <option value="all">All sections</option>
            {DEPARTMENTS.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-xl border border-slate-300/70 bg-white/60 px-3 py-2 text-sm font-medium dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-100"
          >
            <option value="all">Piece + salaried</option>
            <option value="piece">Piece-rate only</option>
            <option value="salaried">Salaried only</option>
          </select>
          <Btn onClick={() => setOpen(true)}>
            <UserPlus size={15} /> Register worker
          </Btn>
        </div>

        {/* table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/70 text-[10px] font-mono uppercase tracking-[0.14em] text-slate-400 dark:border-white/8">
                <th className="px-4 py-3">Worker</th>
                <th className="px-3 py-3">Section</th>
                <th className="px-3 py-3">Pay basis</th>
                <th className="px-3 py-3">Machine</th>
                <th className="px-3 py-3">Gate in</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Est. gross today</th>
                <th className="px-4 py-3 text-right">Punch</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w, i) => (
                <motion.tr
                  key={w.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.4) }}
                  className="group border-b border-slate-200/50 transition-colors hover:bg-emerald-500/[0.04] dark:border-white/5 dark:hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={w.name} hue={w.hue} size={34} />
                      <div>
                        <p className="font-bold text-slate-700 dark:text-slate-100">{w.name}</p>
                        <p className="font-mono text-[10px] text-slate-400">{w.epfNo} · {w.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset"
                      style={{
                        color: deptOf(w.departmentId).color,
                        background: `${deptOf(w.departmentId).color}18`,
                        borderColor: `${deptOf(w.departmentId).color}40`,
                      }}
                    >
                      {deptOf(w.departmentId).name}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {w.type === "piece" ? (
                      <div>
                        <Badge tone="indigo">Piece-rate</Badge>
                        <p className="mt-1 font-mono text-[10px] text-slate-400">
                          {formatLKR(w.baseDaily)} base + {formatLKR(w.pieceRate)}/dz
                        </p>
                      </div>
                    ) : (
                      <div>
                        <Badge tone="amber">Salaried</Badge>
                        <p className="mt-1 font-mono text-[10px] text-slate-400">
                          {formatLKR(w.monthlySalary)}/month
                        </p>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs font-semibold text-slate-500 dark:text-slate-300">
                    {w.machineId ?? "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    {w.clockIn ? (
                      <span className="tnum font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {fmtTime(w.clockIn)}
                        {w.lateMinutes > 0 && (
                          <span className="ml-1 text-amber-500">+{w.lateMinutes}m</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">no punch</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5"><StatusBadge status={w.status} /></td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="tnum font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {["present", "late", "break"].includes(w.status) ? formatLKR(grossOf(w)) : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {["absent", "leave", "off"].includes(w.status) || !w.clockIn ? (
                        <button
                          onClick={() => { recordPunch(w.id, "in"); toast("info", "Manual punch", `${w.name} punched in at the HR desk.`); }}
                          className="flex items-center gap-1 rounded-lg bg-emerald-500/12 px-2 py-1 text-[11px] font-bold text-emerald-600 transition hover:bg-emerald-500/25 dark:text-emerald-400"
                        >
                          <LogIn size={12} /> In
                        </button>
                      ) : (
                        <button
                          onClick={() => { recordPunch(w.id, "out"); toast("info", "Manual punch", `${w.name} punched out (break/exit).`); }}
                          className="flex items-center gap-1 rounded-lg bg-indigo-500/12 px-2 py-1 text-[11px] font-bold text-indigo-500 transition hover:bg-indigo-500/25 dark:text-indigo-300"
                        >
                          <LogOut size={12} /> Out
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">
                    No workers match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2 border-t border-slate-200/70 px-4 py-3 text-[11px] text-slate-400 dark:border-white/8">
          <Fingerprint size={13} className="text-emerald-500" />
          Biometric sync: gate buffers flush every 90 s · last sync 41 s ago · 0 rejected reads
        </div>
      </GlassCard>

      {/* register modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="Register floor worker">
        <div className="space-y-3">
          <TextField
            label="Full name"
            placeholder="e.g. Sandaru Wickrama"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextField
            label="Role"
            placeholder="e.g. Linker / Circular Knitting Operator"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Section"
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
            >
              {DEPARTMENTS.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </SelectField>
            <SelectField
              label="Pay basis"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as WorkerType })}
            >
              <option value="piece">Piece-rate</option>
              <option value="salaried">Salaried</option>
            </SelectField>
          </div>
          {form.type === "piece" ? (
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Base daily (Rs.)"
                type="number"
                value={form.baseDaily}
                onChange={(e) => setForm({ ...form, baseDaily: +e.target.value })}
              />
              <TextField
                label="Piece rate / dozen (Rs.)"
                type="number"
                value={form.pieceRate}
                onChange={(e) => setForm({ ...form, pieceRate: +e.target.value })}
              />
            </div>
          ) : (
            <TextField
              label="Monthly salary (Rs.)"
              type="number"
              value={form.monthlySalary}
              onChange={(e) => setForm({ ...form, monthlySalary: +e.target.value })}
            />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
            <Btn onClick={submit}>
              <Plus size={15} /> Register & issue EPF no
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
