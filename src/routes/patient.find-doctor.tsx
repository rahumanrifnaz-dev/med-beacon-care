import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, Panel } from "@/components/medi/DashboardShell";
import { useAuth, useRequireRole } from "@/lib/auth";
import { getRoleNav } from "@/components/medi/RoleSidebar";
import { Stethoscope, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/patient/find-doctor")({
  component: FindDoctor,
  head: () => ({ meta: [{ title: "Find Doctor · MediCare+" }] }),
});

function FindDoctor() {
  const { profile, refreshProfile } = useAuth();
  useRequireRole("patient");
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDoctors = async () => {
    setLoading(true);
    const { data: d } = await supabase.from("profiles").select("id, full_name").eq("role", "doctor").eq("verification_status", "approved");
    setDoctors(d ?? []);
    setLoading(false);
  };

  useEffect(() => { loadDoctors(); }, []);

  if (!profile) return null;

  const linkDoctor = async (doctorId: string | null) => {
    if (!profile) return;
    await supabase.from("profiles").update({ doctor_id: doctorId }).eq("id", profile.id);
    await refreshProfile();
    toast.success(doctorId ? "Doctor connected" : "Doctor unlinked");
    await loadDoctors();
  };

  const currentDoctorName = profile.doctor_id 
    ? doctors.find((d) => d.id === profile.doctor_id)?.full_name ?? "Your doctor"
    : null;

  return (
    <DashboardShell role={profile.role} name={profile.full_name?.split(" ")[0] ?? "there"} nav={getRoleNav(profile.role)}>
      <Panel title="Find a doctor" subtitle="Search verified doctors">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Loading doctors...</p>
          </div>
        ) : doctors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Stethoscope className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No verified doctors available yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {profile.doctor_id && (
              <div className="p-4 rounded-xl bg-success/10 border border-success/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-success" />
                    <div>
                      <p className="text-xs text-muted-foreground">Currently Connected</p>
                      <p className="font-semibold text-sm">{currentDoctorName}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => linkDoctor(null)} 
                    className="text-xs px-3 py-1.5 rounded-full bg-secondary/60 hover:bg-secondary"
                  >
                    Unlink
                  </button>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs text-muted-foreground mb-2">Available Doctors</p>
              <div className="space-y-2">
                {doctors.filter((d) => d.id !== profile.doctor_id).map((d) => (
                  <button 
                    key={d.id} 
                    onClick={() => linkDoctor(d.id)} 
                    className="w-full text-left p-4 rounded-xl bg-secondary/30 hover:bg-secondary/60 transition-colors"
                  >
                    <p className="font-medium text-sm">{d.full_name}</p>
                    <p className="text-xs text-muted-foreground">Tap to connect</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Panel>
    </DashboardShell>
  );
}
