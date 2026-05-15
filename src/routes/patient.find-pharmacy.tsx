import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, Panel } from "@/components/medi/DashboardShell";
import { useAuth, useRequireRole } from "@/lib/auth";
import { getRoleNav } from "@/components/medi/RoleSidebar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Pill, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/patient/find-pharmacy")({
  component: FindPharmacy,
  head: () => ({ meta: [{ title: "Find Pharmacy · MediCare+" }] }),
});

function FindPharmacy() {
  const { profile } = useAuth();
  useRequireRole("patient");
  const [items, setItems] = useState<{ name: string; pharmacies: { id: string; name: string }[] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoading(true);
      const { data: rxs } = await supabase.from("prescriptions").select("items").eq("patient_id", profile.id).neq("status", "dispensed");
      const names = Array.from(new Set((rxs ?? []).flatMap((r: any) => (r.items as any[])?.map((i) => String(i.med ?? "").trim()) ?? []))).filter(Boolean);
      if (!names.length) { setItems([]); setLoading(false); return; }

      const { data: meds } = await supabase.from("pharmacy_medicines").select("id, name");
      const { data: avails } = await supabase.from("pharmacy_availability").select("pharmacist_id, medicines");
      const { data: pharms } = await supabase.from("profiles").select("id, full_name").eq("role", "pharmacist");
      const pharmMap = new Map((pharms ?? []).map((p: any) => [p.id, p.full_name]));

      const result = names.map((n) => {
        const lower = n.toLowerCase();
        const matchingMedIds = (meds ?? []).filter((m: any) => lower.includes(m.name.toLowerCase()) || m.name.toLowerCase().includes(lower.split(" · ")[0])).map((m: any) => m.id);
        const havingPharms = (avails ?? [])
          .filter((a: any) => (a.medicines as string[])?.some((mid) => matchingMedIds.includes(mid)))
          .map((a: any) => ({ id: a.pharmacist_id, name: pharmMap.get(a.pharmacist_id) ?? "Pharmacy" }));
        return { name: n, pharmacies: havingPharms };
      });
      setItems(result);
      setLoading(false);
    })();
  }, [profile?.id]);

  if (!profile) return null;
  return (
    <DashboardShell role={profile.role} name={profile.full_name?.split(" ")[0] ?? "Patient"} nav={getRoleNav(profile.role)}>
      <Panel title="Pharmacies with your medicines in stock" subtitle="Based on active prescriptions you haven't picked up yet">
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
          items.length === 0 ? <p className="text-sm text-muted-foreground">No active prescriptions to check.</p> :
          <div className="space-y-4">
            {items.map((it, i) => (
              <div key={i} className="p-4 rounded-xl bg-secondary/30">
                <div className="flex items-center gap-2 mb-3">
                  <Pill className="w-4 h-4 text-primary-glow" />
                  <p className="font-semibold">{it.name}</p>
                </div>
                {it.pharmacies.length === 0 ? (
                  <p className="text-xs text-muted-foreground ml-6">No pharmacy currently has this in stock.</p>
                ) : (
                  <div className="ml-6 space-y-1.5">
                    {it.pharmacies.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 text-sm">
                        <MapPin className="w-3.5 h-3.5 text-success" />
                        <span>{p.name}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-success ml-auto" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        }
      </Panel>
    </DashboardShell>
  );
}
