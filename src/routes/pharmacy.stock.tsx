import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, Panel, StatCard } from "@/components/medi/DashboardShell";
import { useAuth, useRequireRole } from "@/lib/auth";
import { getRoleNav } from "@/components/medi/RoleSidebar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Boxes, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/pharmacy/stock")({
  component: PharmacyStock,
  head: () => ({ meta: [{ title: "Stock · MediCare+" }] }),
});

function PharmacyStock() {
  const { profile } = useAuth();
  useRequireRole("pharmacist");
  const [medicines, setMedicines] = useState<any[]>([]);
  const [available, setAvailable] = useState<string[]>([]);

  const load = async () => {
    if (!profile) return;
    const [{ data: meds }, { data: avail }] = await Promise.all([
      supabase.from("pharmacy_medicines").select("*").order("name"),
      supabase.from("pharmacy_availability").select("*").eq("pharmacist_id", profile.id).maybeSingle(),
    ]);
    setMedicines(meds ?? []);
    setAvailable((avail?.medicines as string[]) ?? []);
  };
  useEffect(() => { load(); }, [profile?.id]);

  const toggle = async (id: string) => {
    if (!profile) return;
    const set = new Set(available);
    set.has(id) ? set.delete(id) : set.add(id);
    const arr = Array.from(set);
    const { error } = await supabase.from("pharmacy_availability").upsert({ pharmacist_id: profile.id, medicines: arr, updated_at: new Date().toISOString() }, { onConflict: "pharmacist_id" });
    if (error) return toast.error(error.message);
    setAvailable(arr);
  };

  if (!profile) return null;
  return (
    <DashboardShell role={profile.role} name={profile.full_name?.split(" ")[0] ?? "Pharmacist"} nav={getRoleNav(profile.role)}>
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Total medicines" value={String(medicines.length)} icon={Boxes} />
        <StatCard label="In stock" value={String(available.length)} icon={CheckCircle2} />
        <StatCard label="Out of stock" value={String(medicines.length - available.length)} icon={XCircle} />
      </div>
      <Panel title="Stock availability" subtitle="Toggle items you have available">
        {medicines.length === 0 ? <p className="text-sm text-muted-foreground">No medicines in catalog. Add some from Manage Medicines.</p> : (
          <div className="space-y-2">
            {medicines.map((m) => {
              const on = available.includes(m.id);
              return (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary/60 flex items-center justify-center">
                    {m.image_url ? <img src={m.image_url} className="w-full h-full object-cover" /> : <span className="text-xs">Pill</span>}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.dosage}</p>
                  </div>
                  <button onClick={() => toggle(m.id)} className={`text-xs px-3 py-1.5 rounded-full ${on ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-secondary/60"}`}>
                    {on ? "In stock" : "Out of stock"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </DashboardShell>
  );
}