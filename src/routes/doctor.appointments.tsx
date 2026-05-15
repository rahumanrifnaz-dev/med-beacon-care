import { DashboardShell, Panel } from "@/components/medi/DashboardShell";
import { useAuth, useRequireRole } from "@/lib/auth";
import { getRoleNav } from "@/components/medi/RoleSidebar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function DoctorAppointments() {
  const { profile } = useAuth();
  useRequireRole("doctor");
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;
    void loadAppointments();
  }, [profile?.id]);

  const loadAppointments = async () => {
    const { data } = await supabase.from<any>("appointments").select("*").eq('doctor_id', profile?.id).order("scheduled_at", { ascending: true });
    setAppointments((data as any[]) ?? []);
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from<any>('appointments').update({ status }).eq('id', id);
      if (error) throw error;
      toast.success('Updated');
      await loadAppointments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    }
  };

  if (!profile) return null;

  return (
    <DashboardShell role={profile.role} name={profile.full_name?.split(' ')[0] ?? 'Doctor'} nav={getRoleNav(profile.role)}>
      <Panel title="Manage Appointments" subtitle="View and update appointments">
        <div>
          <ul className="space-y-3">
            {appointments.map(a => (
              <li key={a.id} className="p-3 rounded-lg border flex items-center justify-between">
                <div>
                  <div className="font-medium">{new Date(a.scheduled_at).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Patient: {a.patient_id}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => updateStatus(a.id, 'confirmed')} className="px-3 py-1 rounded bg-primary text-primary-foreground">Confirm</button>
                  <button onClick={() => updateStatus(a.id, 'cancelled')} className="px-3 py-1 rounded bg-destructive text-destructive-foreground">Cancel</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Panel>
    </DashboardShell>
  );
}
