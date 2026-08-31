import { AnimatePresence, motion } from "framer-motion";
import { Shell } from "./components/Shell";
import { Toasts } from "./components/ui";
import { useKnit } from "./lib/store";
import { Advances } from "./views/Advances";
import { Blueprint } from "./views/Blueprint";
import { Dashboard } from "./views/Dashboard";
import { Payroll } from "./views/Payroll";
import { Production } from "./views/Production";
import { Shifts } from "./views/Shifts";
import { Workers } from "./views/Workers";

export default function App() {
  const view = useKnit((s) => s.view);

  return (
    <>
      <div className="knit-ambient" aria-hidden />
      <div className="knit-pattern" aria-hidden />
      <Shell>
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {view === "dashboard" && <Dashboard />}
            {view === "workers" && <Workers />}
            {view === "shifts" && <Shifts />}
            {view === "production" && <Production />}
            {view === "payroll" && <Payroll />}
            {view === "advances" && <Advances />}
            {view === "blueprint" && <Blueprint />}
          </motion.div>
        </AnimatePresence>
      </Shell>
      <Toasts />
    </>
  );
}
