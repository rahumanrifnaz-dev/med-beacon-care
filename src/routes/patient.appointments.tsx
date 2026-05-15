import { DashboardShell, Panel } from "@/components/medi/DashboardShell";
import { useAuth, useRequireRole } from "@/lib/auth";
import { getRoleNav } from "@/components/medi/RoleSidebar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DayPicker } from "react-day-picker";
import { toast } from "sonner";

export default function PatientAppointments() {
  const { profile } = useAuth();
  useRequireRole("patient");
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;
    void loadAppointments();
  }, [profile?.id]);

  const loadAppointments = async () => {
    const { data } = await supabase.from<any>("appointments").select("*").or(`patient_id.eq.${profile?.id},doctor_id.eq.${profile?.id}`).order("scheduled_at", { ascending: true });
    setAppointments((data as any[]) ?? []);
  };

  const book = async () => {
    if (!selected || !profile) return;
    try {
      setLoading(true);
      // For simplicity pick any doctor (first approved) — in real app choose properly
      const { data: docs } = await supabase.from<any>('profiles').select('id').eq('role','doctor').eq('verification_status','approved').limit(1);
      if (!docs || docs.length === 0) return toast.error('No doctors available');
      const doctorId = docs[0].id;
      const { error } = await supabase.from<any>('appointments').insert({ patient_id: profile.id, doctor_id: doctorId, scheduled_at: selected.toISOString(), created_by: profile.id });
      if (error) throw error;
      toast.success('Appointment booked');
      await loadAppointments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <DashboardShell role={profile.role} name={profile.full_name?.split(' ')[0] ?? 'Patient'} nav={getRoleNav(profile.role)}>
      <Panel title="Appointments" subtitle="Book and view your appointments">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <DayPicker mode="single" selected={selected} onSelect={(d: Date | undefined) => setSelected(d ?? undefined)} />
            <button onClick={book} disabled={loading} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg">{loading ? 'Booking...' : 'Book Appointment'}</button>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Upcoming</h4>
            <ul className="space-y-2">
              {appointments.map((a) => (
                <li key={a.id} className="p-3 rounded-lg border">{new Date(a.scheduled_at).toLocaleString()}</li>
              ))}
            </ul>
          </div>
        </div>
      </Panel>
    </DashboardShell>
  );
}
