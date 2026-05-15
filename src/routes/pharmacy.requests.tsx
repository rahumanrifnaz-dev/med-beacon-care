import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, Panel } from "@/components/medi/DashboardShell";
import { useAuth, useRequireRole } from "@/lib/auth";
import { getRoleNav } from "@/components/medi/RoleSidebar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/pharmacy/requests")({
  component: PharmacyRequests,
  head: () => ({ meta: [{ title: "Medicine Requests · MediCare+" }] }),
});

function PharmacyRequests() {
  const { profile } = useAuth();
  useRequireRole("pharmacist");
  const [reqs, setReqs] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<Record<string, string>>({});

  const load = async () => {
    const { data } = await supabase.from("medicine_requests").select("*").order("created_at", { ascending: false });
    setReqs(data ?? []);
    const ids = Array.from(new Set((data ?? []).map((r: any) => r.doctor_id)));
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const m: Record<string, string> = {};
      (ps ?? []).forEach((p: any) => { m[p.id] = p.full_name; });
      setDoctors(m);
    }
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("medicine_requests-pharm")
      .on("postgres_changes", { event: "*", schema: "public", table: "medicine_requests" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fulfill = async (id: string) => {
    if (!profile) return;
    const { error } = await supabase.from("medicine_requests").update({
      status: "fulfilled", fulfilled_by: profile.id, fulfilled_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Marked as fulfilled");
    load();
  };

  if (!profile) return null;
  return (
    <DashboardShell role={profile.role} name={profile.full_name?.split(" ")[0] ?? "Pharmacist"} nav={getRoleNav(profile.role)}>
      <Panel title="Doctor medicine requests" subtitle="Items doctors have requested to be sourced or stocked">
        {reqs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No requests yet.</p>
        ) : (
          <div className="space-y-2">
            {reqs.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-secondary/30">
                <AlertCircle className={`w-5 h-5 ${r.status === "open" ? "text-warning" : "text-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{r.medicine_name} {r.dosage && <span className="text-xs text-muted-foreground">· {r.dosage}</span>}</p>
                  <p className="text-xs text-muted-foreground">From Dr. {doctors[r.doctor_id] ?? "Doctor"} · {new Date(r.created_at).toLocaleString()}</p>
                  {r.notes && <p className="text-xs mt-1">{r.notes}</p>}
                </div>
                {r.status === "open" ? (
                  <button onClick={() => fulfill(r.id)} className="text-xs px-3 py-1.5 rounded-full bg-gradient-primary text-primary-foreground shadow-glow flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Mark fulfilled
                  </button>
                ) : (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-success/20 text-success">Fulfilled</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </DashboardShell>
  );
}
