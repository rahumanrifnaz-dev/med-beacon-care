import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardShell, Panel, StatCard } from "@/components/medi/DashboardShell";
import { CheckCircle2, Clock, Heart, LayoutDashboard, MessageCircle, Pill, Plus, QrCode, Stethoscope, TrendingUp, UserCheck } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRequireRole } from "@/lib/auth";
import { MED_CATALOG } from "@/lib/medications";
import { PillIcon } from "@/components/medi/PillIcon";
import { DoseReminder } from "@/components/medi/DoseReminder";
import { DailyHealthTip } from "@/components/medi/DailyHealthTip";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { getRoleNav } from "@/components/medi/RoleSidebar";

export const Route = createFileRoute("/patient")({
  component: PatientDashboard,
  head: () => ({ meta: [{ title: "Patient · MediCare+" }] }),
});

interface Med {
  id: string;
  common_name: string;
  brand_name: string | null;
  color: string;
  shape: string;
  dose: string | null;
  schedule_times: string[];
}
interface Rx { id: string; qr_token: string; items: any; status: string; created_at: string }

interface EnrichedRx extends Rx {
  patient?: { full_name?: string | null } | null;
  medicineDetails?: Array<{
    med: string;
    dose: string;
    freq: string;
    color: string;
    image_url: string | null;
    available: boolean;
    pharmacist_name: string | null;
  }>;
}

function PatientDashboard() {
  const { profile, refreshProfile } = useAuth();
  useRequireRole("patient");
  const [meds, setMeds] = useState<Med[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [rxs, setRxs] = useState<EnrichedRx[]>([]);
  const [pharmacyMeds, setPharmacyMeds] = useState<any[]>([]);

  const loadPharmacyCatalog = async () => {
    const { data } = await supabase.from("pharmacy_medicines").select("*");
    setPharmacyMeds(data ?? []);
    return data ?? [];
  };

  const loadPharmacyAvailability = async () => {
    const { data } = await supabase.from("pharmacy_availability").select("pharmacist_id, medicines");
    return data ?? [];
  };

  const loadPharmacists = async (pharmacistIds: string[]) => {
    if (pharmacistIds.length === 0) return [];
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", pharmacistIds);
    return data ?? [];
  };

  const enrichPrescriptions = async (prescriptions: any[], catalog: any[], availabilityRows: any[], pharmacists: any[]) => {
    const medsMap = new Map<string, any>();
    catalog.forEach((m: any) => {
      medsMap.set(m.name.trim().toLowerCase(), m);
      const label = [m.name, m.dosage].filter(Boolean).join(" · ").trim().toLowerCase();
      if (label) medsMap.set(label, m);
    });

    const pharmacistMap = new Map(pharmacists.map((p: any) => [p.id, p.full_name ?? "Pharmacist"]));
    const availabilityMap = new Map<string, string[]>();

    availabilityRows.forEach((row: any) => {
      const pharmacistName = pharmacistMap.get(row.pharmacist_id) ?? "Pharmacist";
      (row.medicines as string[] | undefined ?? []).forEach((medicineId) => {
        const list = availabilityMap.get(medicineId) ?? [];
        list.push(pharmacistName);
        availabilityMap.set(medicineId, list);
      });
    });

    return prescriptions.map((rx) => ({
      ...rx,
      medicineDetails: (rx.items as any[] ?? []).map((item: any) => {
        const medKey = String(item.med ?? "").trim().toLowerCase();
        const match = medsMap.get(medKey) ?? medsMap.get(medKey.split(" · ")[0] ?? "");
        const pharmacistsAvailable = match?.id ? Array.from(new Set(availabilityMap.get(match.id) ?? [])) : [];
        return {
          med: item.med,
          dose: item.dose,
          freq: item.freq,
          color: match?.color ?? "#a78bfa",
          image_url: match?.image_url ?? null,
          available: pharmacistsAvailable.length > 0,
          pharmacist_name: pharmacistsAvailable.length > 0 ? pharmacistsAvailable.join(", ") : null,
        };
      }),
    }));
  };

  const load = async () => {
    if (!profile) return;
    const [catalog, availabilityRows] = await Promise.all([
      loadPharmacyCatalog(),
      loadPharmacyAvailability(),
    ]);
    const pharmacistIds = Array.from(new Set(availabilityRows.map((row: any) => row.pharmacist_id).filter(Boolean)));
    const pharmacists = await loadPharmacists(pharmacistIds);
    const { data: m } = await supabase.from("medications").select("*").eq("patient_id", profile.id).eq("active", true);
    setMeds((m as any) ?? []);
    const today = new Date().toISOString().slice(0, 10);
    const { data: l } = await supabase.from("medication_logs").select("*").eq("patient_id", profile.id).gte("scheduled_at", today + "T00:00:00");
    setLogs(l ?? []);
    const { data: d } = await supabase.from("profiles").select("id, full_name").eq("role", "doctor").eq("verification_status", "approved");
    setDoctors(d ?? []);
    const { data: r } = await supabase.from("prescriptions").select("*").eq("patient_id", profile.id).order("created_at", { ascending: false });
    setRxs(await enrichPrescriptions((r as any) ?? [], catalog, availabilityRows, pharmacists));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.id]);

  const linkDoctor = async (doctorId: string | null) => {
    if (!profile) return;
    await supabase.from("profiles").update({ doctor_id: doctorId }).eq("id", profile.id);
    await refreshProfile();
    toast.success(doctorId ? "Doctor connected" : "Doctor unlinked");
  };

  const takenCount = logs.filter((l) => l.status === "taken").length;
  const totalToday = meds.reduce((s, m) => s + (m.schedule_times?.length ?? 0), 0);
  const adherence = totalToday ? Math.round((takenCount / totalToday) * 100) : 100;

  if (!profile) return null;

  return (
    <>
      <DoseReminder patientId={profile.id} />
      <DashboardShell role={profile.role} name={profile.full_name?.split(" ")[0] ?? "there"} nav={getRoleNav(profile.role)}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Today's adherence" value={`${adherence}%`} hint={`${takenCount} of ${totalToday} taken`} icon={TrendingUp} />
          <StatCard label="Active meds" value={String(meds.length)} hint="Tap to log" icon={Pill} />
          <StatCard label="My doctor" value={profile.doctor_id ? "Linked" : "None"} hint={profile.doctor_id ? "View profile" : "Pick below"} icon={UserCheck} />
          <StatCard label="Heart rate" value="72 bpm" hint="Within range" icon={Heart} />
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-3">
            <DailyHealthTip />
          </div>
          <Panel title="Today's medicine" subtitle="Big names + colors so it's easy to see" className="lg:col-span-2">
            {meds.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">No medicines yet — tap Add to start.</p>
            )}
            <div className="space-y-2 mt-2">
              {meds.map((m, i) => {
                const taken = logs.find((l) => l.medication_id === m.id && l.status === "taken");
                return (
                  <motion.div key={m.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <PillIcon color={m.color} shape={m.shape} size={44} />
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-lg leading-tight">{m.common_name}</p>
                      <p className="text-xs text-muted-foreground">{m.brand_name} {m.dose && `· ${m.dose}`} · {m.schedule_times.join(", ")}</p>
                    </div>
                    {taken ? (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-success/20 text-success flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Taken</span>
                    ) : (
                      <button onClick={async () => {
                        await supabase.from("medication_logs").insert({ medication_id: m.id, patient_id: profile.id, scheduled_at: new Date().toISOString(), status: "taken", source: "patient" });
                        toast.success("Logged!"); load();
                      }} className="text-xs px-3 py-1.5 rounded-full bg-gradient-primary text-primary-foreground shadow-glow">Log dose</button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </Panel>

          <Panel title="My doctor" subtitle="You can connect to one doctor at a time">
            {profile.doctor_id ? (
              <div>
                <p className="text-sm">Connected to <span className="font-semibold">{doctors.find((d) => d.id === profile.doctor_id)?.full_name ?? "your doctor"}</span></p>
                <button onClick={() => linkDoctor(null)} className="mt-3 text-xs px-3 py-1.5 rounded-full bg-secondary/60 hover:bg-secondary">Unlink</button>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {doctors.map((d) => (
                  <button key={d.id} onClick={() => linkDoctor(d.id)} className="w-full text-left p-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 transition-colors">
                    <p className="font-medium text-sm">{d.full_name}</p>
                    <p className="text-xs text-muted-foreground">Tap to connect</p>
                  </button>
                ))}
                {doctors.length === 0 && <p className="text-sm text-muted-foreground">No verified doctors yet.</p>}
              </div>
            )}
          </Panel>
        </div>

        <Panel title="My prescriptions" subtitle="Show this QR at the pharmacy">
          {rxs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No prescriptions yet.</p>
          ) : (
            <div className="space-y-4">
              {rxs.map((r) => (
                <div key={r.id} className="p-4 rounded-xl bg-secondary/30">
                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="bg-white p-3 rounded-xl self-start"><QRCodeSVG value={r.qr_token} size={120} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Status</p>
                          <p className="font-semibold capitalize">{r.status}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="mt-4 space-y-2">
                        {(r.medicineDetails ?? []).map((item, index) => (
                          <div key={`${r.id}-${index}`} className="flex items-center gap-3 p-3 rounded-xl bg-background/60 border border-border/60">
                            <div className="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center overflow-hidden" style={{ backgroundColor: item.color }}>
                              {item.image_url ? <img src={item.image_url} alt={item.med} className="w-full h-full object-cover" /> : <span className="text-white/70 text-xs font-bold">💊</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{item.med}</p>
                              <p className="text-xs text-muted-foreground">{item.dose} · {item.freq}</p>
                            </div>
                            <span className={`text-xs px-2.5 py-1 rounded-full ${item.available ? "bg-success/20 text-success" : "bg-secondary/80 text-muted-foreground"}`}>
                              {item.available ? `Available: ${item.pharmacist_name}` : "Not available anywhere"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </DashboardShell>
    </>
  );
}
