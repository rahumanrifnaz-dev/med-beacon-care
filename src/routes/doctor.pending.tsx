import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, Panel } from "@/components/medi/DashboardShell";
import { useAuth, useRequireRole } from "@/lib/auth";
import { getRoleNav } from "@/components/medi/RoleSidebar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/doctor/pending")({
  component: DoctorPending,
  head: () => ({ meta: [{ title: "Pending Review · MediCare+" }] }),
});

function DoctorPending() {
  const { profile } = useAuth();
  useRequireRole("doctor");
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;
    supabase.from("prescriptions").select("*").eq("doctor_id", profile.id).eq("status", "issued").order("created_at", { ascending: false })
      .then(({ data }) => setItems(data ?? []));
  }, [profile?.id]);

  if (!profile) return null;
  return (
    <DashboardShell role={profile.role} name={profile.full_name?.split(" ")[0] ?? "Doctor"} nav={getRoleNav(profile.role)}>
      <Panel title="Pending review" subtitle="Prescriptions not yet dispensed">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing waiting. All caught up.</p>
        ) : (
          <div className="space-y-2">
            {items.map((r) => (
              <div key={r.id} className="p-3 rounded-xl bg-secondary/30 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{(r.items as any[])?.length ?? 0} item(s)</p>
                  <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-warning/20 text-warning">Awaiting pharmacy</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </DashboardShell>
  );
}