import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { PillIcon } from "./PillIcon";
import { Bell, Check, X, Clock } from "lucide-react";
import { toast } from "sonner";

interface DueDose {
  id: string;
  medication_id: string;
  common_name: string;
  brand_name: string | null;
  dose: string | null;
  color: string;
  shape: string;
  scheduled_at: string;
}

export function DoseReminder({ patientId }: { patientId: string }) {
  const [due, setDue] = useState<DueDose | null>(null);

  const loadDue = async () => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    // Get all active meds for patient
    const { data: meds } = await supabase
      .from("medications")
      .select("*")
      .eq("patient_id", patientId)
      .eq("active", true);
    if (!meds?.length) return;

    // Get today's logs
    const startOfDay = new Date(today + "T00:00:00").toISOString();
    const { data: logs } = await supabase
      .from("medication_logs")
      .select("medication_id, scheduled_at, status, snooze_until")
      .eq("patient_id", patientId)
      .gte("scheduled_at", startOfDay);

    // Find next due time
    for (const m of meds) {
      for (const time of (m.schedule_times as string[]) ?? []) {
        const [h, mn] = time.split(":").map(Number);
        const sched = new Date();
        sched.setHours(h, mn, 0, 0);
        if (sched > now) continue;
        const log = logs?.find(
          (l) => l.medication_id === m.id && new Date(l.scheduled_at).getHours() === h
        );
        if (log && log.status !== "snoozed") continue;
        if (log?.snooze_until && new Date(log.snooze_until) > now) continue;
        setDue({
          id: `${m.id}-${time}`,
          medication_id: m.id,
          common_name: m.common_name,
          brand_name: m.brand_name,
          dose: m.dose,
          color: m.color,
          shape: m.shape,
          scheduled_at: sched.toISOString(),
        });
        return;
      }
    }
    setDue(null);
  };

  useEffect(() => {
    loadDue();
    const i = setInterval(loadDue, 60_000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const act = async (status: "taken" | "skipped" | "snoozed") => {
    if (!due) return;
    const payload: any = {
      medication_id: due.medication_id,
      patient_id: patientId,
      scheduled_at: due.scheduled_at,
      status,
      source: "patient",
    };
    if (status === "snoozed") {
      payload.snooze_until = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    }
    await supabase.from("medication_logs").insert(payload);
    toast.success(
      status === "taken" ? "Marked as taken. Great job!" :
      status === "skipped" ? "Dose skipped" : "Reminder snoozed for 1 hour"
    );
    setDue(null);
    setTimeout(loadDue, 500);
  };

  return (
    <AnimatePresence>
      {due && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 left-4 sm:left-auto sm:max-w-md z-50 glass rounded-2xl shadow-elegant p-5 border border-primary/40"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-primary/20"><Bell className="w-5 h-5 text-primary-glow" /></div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-widest text-primary-glow">Time for your medicine</p>
              <div className="flex items-center gap-3 mt-2">
                <PillIcon color={due.color} shape={due.shape} size={40} />
                <div>
                  <p className="font-display font-bold text-lg leading-tight">{due.common_name}</p>
                  <p className="text-xs text-muted-foreground">{due.brand_name} {due.dose && `· ${due.dose}`}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                <button onClick={() => act("taken")} className="flex flex-col items-center gap-1 py-2 rounded-xl bg-gradient-primary text-primary-foreground shadow-glow text-xs font-medium">
                  <Check className="w-4 h-4" /> OK, taken
                </button>
                <button onClick={() => act("skipped")} className="flex flex-col items-center gap-1 py-2 rounded-xl bg-secondary/60 hover:bg-secondary text-xs font-medium">
                  <X className="w-4 h-4" /> Skip
                </button>
                <button onClick={() => act("snoozed")} className="flex flex-col items-center gap-1 py-2 rounded-xl bg-secondary/60 hover:bg-secondary text-xs font-medium">
                  <Clock className="w-4 h-4" /> Later (1h)
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
