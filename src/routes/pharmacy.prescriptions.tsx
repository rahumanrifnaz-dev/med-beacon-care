import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, Panel } from "@/components/medi/DashboardShell";
import { useAuth, useRequireRole } from "@/lib/auth";
import { getRoleNav } from "@/components/medi/RoleSidebar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/pharmacy/prescriptions")({
  component: PharmacyPrescriptions,
  head: () => ({ meta: [{ title: "Prescriptions · MediCare+" }] }),
});

function PharmacyPrescriptions() {
  const { profile } = useAuth();
  useRequireRole("pharmacist");
  const [rxs, setRxs] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "issued" | "dispensed">("all");

  const load = async () => {
    const { data } = await supabase.from("prescriptions").select("*").order("created_at", { ascending: false });
    const ids = Array.from(new Set((data ?? []).map((r) => r.patient_id)));
    const { data: pts } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] as any[] };
    const m = new Map((pts ?? []).map((p: any) => [p.id, p]));
    setRxs((data ?? []).map((r: any) => ({ ...r, patient: m.get(r.patient_id) })));
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "dispensed") { patch.pharmacist_id = profile?.id; patch.dispensed_at = new Date().toISOString(); }
    const { error } = await supabase.from("prescriptions").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated"); load();
  };

  if (!profile) return null;
  const filtered = filter === "all" ? rxs : rxs.filter((r) => r.status === filter);

  return (
    <DashboardShell role={profile.role} name={profile.full_name?.split(" ")[0] ?? "Pharmacist"} nav={getRoleNav(profile.role)}>
      <Panel title="All prescriptions" subtitle={`${filtered.length} shown`}>
        <div className="flex gap-2 mb-4">
          {(["all", "issued", "dispensed"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs rounded-full capitalize ${filter === f ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-secondary/40"}`}>{f}</button>
          ))}
        </div>
        <div className="space-y-2">
          {filtered.length === 0 && <p className="text-sm text-muted-foreground">No prescriptions.</p>}
          {filtered.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-secondary/30">
              <div className="flex-1 min-w-0">
                <p className="font-medium">{r.patient?.full_name ?? "Patient"}</p>
                <p className="text-xs text-muted-foreground">{(r.items as any[])?.map((i) => `${i.med} ${i.dose ?? ""}`).join(", ")}</p>
                <p className="text-xs text-muted-foreground mt-1">Token: <code className="text-primary-glow">{r.qr_token.slice(0, 12)}…</code></p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-secondary/80 capitalize">{r.status}</span>
              {r.status !== "dispensed" && <button onClick={() => setStatus(r.id, "dispensed")} className="text-xs px-3 py-1.5 rounded-full bg-gradient-primary text-primary-foreground shadow-glow">Dispense</button>}
            </div>
          ))}
        </div>
      </Panel>
    </DashboardShell>
  );
}