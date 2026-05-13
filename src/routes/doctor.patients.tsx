import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardShell, Panel } from "@/components/medi/DashboardShell";
import { useAuth, useRequireRole } from "@/lib/auth";
import { getRoleNav } from "@/components/medi/RoleSidebar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";

export const Route = createFileRoute("/doctor/patients")({
  component: DoctorPatients,
  head: () => ({ meta: [{ title: "My Patients · MediCare+" }] }),
});

function DoctorPatients() {
  const { profile } = useAuth();
  useRequireRole("doctor");
  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;
    supabase.from("profiles").select("*").eq("doctor_id", profile.id)
      .then(({ data }) => setPatients(data ?? []));
  }, [profile?.id]);

  if (!profile) return null;
  return (
    <DashboardShell role={profile.role} name={profile.full_name?.split(" ")[0] ?? "Doctor"} nav={getRoleNav(profile.role)}>
      <Panel title="My patients" subtitle={`${patients.length} connected`}>
        {patients.length === 0 ? (
          <p className="text-sm text-muted-foreground">No patients connected yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {patients.map((p) => (
              <Link key={p.id} to="/doctor" className="p-4 rounded-xl bg-secondary/30 hover:bg-secondary/60 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-semibold text-primary-foreground">
                  {(p.full_name ?? "?")[0]}
                </div>
                <div>
                  <p className="font-medium text-sm">{p.full_name}</p>
                  <p className="text-xs text-muted-foreground">{p.phone ?? "—"}</p>
                </div>
                <Users className="w-4 h-4 ml-auto text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </DashboardShell>
  );
}