import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, Panel } from "@/components/medi/DashboardShell";
import { useAuth, useRequireRole } from "@/lib/auth";
import { getRoleNav } from "@/components/medi/RoleSidebar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { Clock, CheckCircle2, Package, FileText } from "lucide-react";

export const Route = createFileRoute("/doctor/prescriptions")({
  component: DoctorRx,
  head: () => ({ meta: [{ title: "E-Prescriptions · MediCare+" }] }),
});

const STATUS_STYLE: Record<string, { color: string; icon: any; label: string }> = {
  issued: { color: "bg-warning/20 text-warning", icon: Clock, label: "Pending" },
  verified: { color: "bg-primary/20 text-primary-glow", icon: CheckCircle2, label: "Verified" },
  dispensed: { color: "bg-success/20 text-success", icon: Package, label: "Distributed" },
};

function DoctorRx() {
  const { profile } = useAuth();
  useRequireRole("doctor");
  const [rxs, setRxs] = useState<any[]>([]);
  const [people, setPeople] = useState<Record<string, string>>({});

  const load = async () => {
    if (!profile) return;
    const { data } = await supabase.from("prescriptions").select("*").eq("doctor_id", profile.id).order("created_at", { ascending: false });
    setRxs(data ?? []);
    const ids = Array.from(new Set((data ?? []).flatMap((r: any) => [r.patient_id, r.pharmacist_id]).filter(Boolean)));
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, full_name").in("id", ids as string[]);
      const map: Record<string, string> = {};
      (ps ?? []).forEach((p: any) => { map[p.id] = p.full_name; });
      setPeople(map);
    }
  };

  useEffect(() => {
    load();
    if (!profile) return;
    const ch = supabase.channel("rx-doctor-" + profile.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "prescriptions", filter: `doctor_id=eq.${profile.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile?.id]);

  if (!profile) return null;
  return (
    <DashboardShell role={profile.role} name={profile.full_name?.split(" ")[0] ?? "Doctor"} nav={getRoleNav(profile.role)}>
      <Panel title="Prescription ledger" subtitle={`${rxs.length} issued · live updates`}>
        {rxs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No prescriptions yet. Issue one from the dashboard.</p>
        ) : (
          <div className="space-y-3">
            {rxs.map((r) => {
              const st = STATUS_STYLE[r.status] ?? STATUS_STYLE.issued;
              const Icon = st.icon;
              return (
                <div key={r.id} className="flex flex-wrap items-start gap-4 p-4 rounded-xl bg-secondary/30">
                  <div className="bg-white p-2 rounded-lg shrink-0"><QRCodeSVG value={r.qr_token} size={70} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{people[r.patient_id] ?? "Patient"}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${st.color}`}>
                        <Icon className="w-3 h-3" /> {st.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Issued {new Date(r.created_at).toLocaleString()}
                    </p>
                    {r.verified_at && (
                      <p className="text-xs text-muted-foreground">Verified by {people[r.verified_by] ?? "pharmacist"} · {new Date(r.verified_at).toLocaleString()}</p>
                    )}
                    {r.dispensed_at && (
                      <p className="text-xs text-success">Collected at {people[r.pharmacist_id] ?? "pharmacy"} · {new Date(r.dispensed_at).toLocaleString()}</p>
                    )}
                    <div className="mt-2 text-xs text-muted-foreground">
                      {(r.items as any[])?.map((i, j) => <span key={j} className="inline-block mr-2">• {i.med} {i.dose && `(${i.dose})`}</span>)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </DashboardShell>
  );
}
