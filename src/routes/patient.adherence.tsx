import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, Panel } from "@/components/medi/DashboardShell";
import { useAuth, useRequireRole } from "@/lib/auth";
import { getRoleNav } from "@/components/medi/RoleSidebar";
import { BarChart3, CheckCircle2, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/patient/adherence")({
  component: PatientAdherence,
  head: () => ({ meta: [{ title: "Adherence · MediCare+" }] }),
});

interface Med {
  id: string;
  common_name: string;
  brand_name: string | null;
  color: string;
  shape: string;
  dose: string | null;
  schedule_times: string[];
}

function PatientAdherence() {
  const { profile } = useAuth();
  useRequireRole("patient");
  const [meds, setMeds] = useState<Med[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  const load = async () => {
    if (!profile) return;
    const { data: m } = await supabase.from("medications").select("*").eq("patient_id", profile.id).eq("active", true);
    setMeds((m as any) ?? []);
    const today = new Date().toISOString().slice(0, 10);
    const { data: l } = await supabase.from("medication_logs").select("*").eq("patient_id", profile.id).gte("scheduled_at", today + "T00:00:00");
    setLogs(l ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.id]);

  if (!profile) return null;

  const takenCount = logs.filter((l) => l.status === "taken").length;
  const totalToday = meds.reduce((s, m) => s + (m.schedule_times?.length ?? 0), 0);
  const adherence = totalToday ? Math.round((takenCount / totalToday) * 100) : 100;

  return (
    <DashboardShell role={profile.role} name={profile.full_name?.split(" ")[0] ?? "there"} nav={getRoleNav(profile.role)}>
      <Panel title="Adherence" subtitle="Your medication adherence metrics">
        {meds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No medications to track.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
                <p className="text-xs text-muted-foreground mb-1">Today's Adherence</p>
                <p className="text-3xl font-bold text-success">{adherence}%</p>
                <p className="text-xs text-muted-foreground mt-2">{takenCount} of {totalToday} taken</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Active Medicines</p>
                <p className="text-3xl font-bold text-primary">{meds.length}</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                <p className="text-xs text-muted-foreground mb-1">Total Doses Taken</p>
                <p className="text-3xl font-bold text-blue-500">{takenCount}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-3">Today's Status</p>
              <div className="space-y-2">
                {meds.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No medicines to display.</p>
                ) : (
                  meds.map((med) => {
                    const medLogs = logs.filter((l) => l.medication_id === med.id);
                    const taken = medLogs.filter((l) => l.status === "taken").length;
                    const totalDoses = med.schedule_times?.length ?? 0;
                    const medAdherence = totalDoses ? Math.round((taken / totalDoses) * 100) : 0;
                    return (
                      <div key={med.id} className="p-3 rounded-lg bg-secondary/30 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{med.common_name}</p>
                          <p className="text-xs text-muted-foreground">{med.schedule_times?.join(", ") ?? "N/A"}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{taken}/{totalDoses}</p>
                          <p className="text-xs text-muted-foreground">{medAdherence}%</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-3">Logs History</p>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No logs yet.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {logs.map((log) => (
                    <div key={log.id} className="p-3 rounded-lg bg-secondary/20 flex items-center gap-3">
                      {log.status === "taken" ? (
                        <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                      ) : (
                        <Clock className="w-5 h-5 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm capitalize">{log.status}</p>
                        <p className="text-xs text-muted-foreground">{new Date(log.scheduled_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Panel>
    </DashboardShell>
  );
}
