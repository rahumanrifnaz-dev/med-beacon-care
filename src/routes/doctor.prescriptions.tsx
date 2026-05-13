import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, Panel } from "@/components/medi/DashboardShell";
import { useAuth, useRequireRole } from "@/lib/auth";
import { getRoleNav } from "@/components/medi/RoleSidebar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";

export const Route = createFileRoute("/doctor/prescriptions")({
  component: DoctorRx,
  head: () => ({ meta: [{ title: "E-Prescriptions · MediCare+" }] }),
});

function DoctorRx() {
  const { profile } = useAuth();
  useRequireRole("doctor");
  const [rxs, setRxs] = useState<any[]>([]);
  const [patients, setPatients] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase.from("prescriptions").select("*").eq("doctor_id", profile.id).order("created_at", { ascending: false });
      setRxs(data ?? []);
      const ids = Array.from(new Set((data ?? []).map((r: any) => r.patient_id)));
      if (ids.length) {
        const { data: ps } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        const map: Record<string, string> = {};
        (ps ?? []).forEach((p: any) => { map[p.id] = p.full_name; });
        setPatients(map);
      }
    })();
  }, [profile?.id]);

  if (!profile) return null;
  return (
    <DashboardShell role={profile.role} name={profile.full_name?.split(" ")[0] ?? "Doctor"} nav={getRoleNav(profile.role)}>
      <Panel title="All prescriptions" subtitle={`${rxs.length} issued`}>
        {rxs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No prescriptions yet. Issue one from the dashboard.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rxs.map((r) => (
              <div key={r.id} className="p-4 rounded-xl bg-secondary/30">
                <div className="bg-white p-2 rounded-lg inline-block"><QRCodeSVG value={r.qr_token} size={90} /></div>
                <p className="font-medium text-sm mt-2">{patients[r.patient_id] ?? "Patient"}</p>
                <p className="text-xs text-muted-foreground capitalize">{r.status} · {(r.items as any[])?.length ?? 0} items</p>
                <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </DashboardShell>
  );
}