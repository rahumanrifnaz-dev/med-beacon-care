import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardShell, Panel, StatCard } from "@/components/medi/DashboardShell";
import { CheckCircle2, Clock, Heart, LayoutDashboard, MessageCircle, Pill, Plus, QrCode, Stethoscope, TrendingUp, UserCheck } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRequireRole } from "@/lib/auth";
import { MED_CATALOG, PILL_COLORS } from "@/lib/medications";
import { PillIcon } from "@/components/medi/PillIcon";
import { DoseReminder } from "@/components/medi/DoseReminder";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

export const Route = createFileRoute("/patient")({
  component: PatientDashboard,
  head: () => ({ meta: [{ title: "Patient · MediCare+" }] }),
});

const nav = [
  { label: "Overview", to: "/patient", icon: LayoutDashboard },
  { label: "Find doctor", to: "/patient", icon: Stethoscope },
  { label: "Prescriptions", to: "/patient", icon: Pill },
  { label: "Scan QR", to: "/patient", icon: QrCode },
  { label: "Messages", to: "/patient", icon: MessageCircle },
];

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

function PatientDashboard() {
  const { profile, refreshProfile } = useAuth();
  useRequireRole("patient");
  const [meds, setMeds] = useState<Med[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [rxs, setRxs] = useState<Rx[]>([]);
  const [adding, setAdding] = useState(false);

  const load = async () => {
    if (!profile) return;
    const { data: m } = await supabase.from("medications").select("*").eq("patient_id", profile.id).eq("active", true);
    setMeds((m as any) ?? []);
    const today = new Date().toISOString().slice(0, 10);
    const { data: l } = await supabase.from("medication_logs").select("*").eq("patient_id", profile.id).gte("scheduled_at", today + "T00:00:00");
    setLogs(l ?? []);
    const { data: d } = await supabase.from("profiles").select("id, full_name").eq("role", "doctor").eq("verification_status", "approved");
    setDoctors(d ?? []);
    const { data: r } = await supabase.from("prescriptions").select("*").eq("patient_id", profile.id).order("created_at", { ascending: false });
    setRxs((r as any) ?? []);
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
      <DashboardShell role="Patient Portal" name={profile.full_name?.split(" ")[0] ?? "there"} nav={nav}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Today's adherence" value={`${adherence}%`} hint={`${takenCount} of ${totalToday} taken`} icon={TrendingUp} />
          <StatCard label="Active meds" value={String(meds.length)} hint="Tap to log" icon={Pill} />
          <StatCard label="My doctor" value={profile.doctor_id ? "Linked" : "None"} hint={profile.doctor_id ? "View profile" : "Pick below"} icon={UserCheck} />
          <StatCard label="Heart rate" value="72 bpm" hint="Within range" icon={Heart} />
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <Panel title="Today's medicine" subtitle="Big names + colors so it's easy to see" action={<button onClick={() => setAdding(true)} className="flex items-center gap-1 text-xs bg-gradient-primary text-primary-foreground px-3 py-1.5 rounded-full shadow-glow"><Plus className="w-3 h-3" /> Add</button>} className="lg:col-span-2">
            {adding && <AddMedForm patientId={profile.id} onClose={() => { setAdding(false); load(); }} />}
            {meds.length === 0 && !adding && (
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
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rxs.map((r) => (
                <div key={r.id} className="p-4 rounded-xl bg-secondary/30 flex flex-col items-center text-center">
                  <div className="bg-white p-3 rounded-xl"><QRCodeSVG value={r.qr_token} size={120} /></div>
                  <p className="text-xs text-muted-foreground mt-3">Status</p>
                  <p className="font-semibold capitalize">{r.status}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </DashboardShell>
    </>
  );
}

function AddMedForm({ patientId, onClose }: { patientId: string; onClose: () => void }) {
  const [preset, setPreset] = useState(MED_CATALOG[0]);
  const [color, setColor] = useState(preset.color);
  const [time, setTime] = useState("08:00");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("medications").insert({
      patient_id: patientId, common_name: preset.common, brand_name: preset.brand,
      color, shape: preset.shape, dose: preset.brand, schedule_times: [time],
    });
    if (error) toast.error(error.message); else { toast.success("Added"); onClose(); }
  };
  return (
    <form onSubmit={submit} className="p-4 rounded-xl bg-primary/5 border border-primary/30 space-y-3 mb-3">
      <div>
        <label className="text-xs uppercase tracking-widest text-muted-foreground">Pick medicine</label>
        <select value={preset.brand} onChange={(e) => { const p = MED_CATALOG.find(c => c.brand === e.target.value)!; setPreset(p); setColor(p.color); }}
          className="mt-1 w-full bg-input/60 border border-border/60 rounded-xl px-3 py-2.5 text-sm">
          {MED_CATALOG.map((c) => <option key={c.brand} value={c.brand}>{c.common} ({c.brand})</option>)}
        </select>
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Time</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 w-full bg-input/60 border border-border/60 rounded-xl px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Color</label>
          <div className="mt-1 flex gap-1.5">
            {PILL_COLORS.map((c) => (
              <button key={c.value} type="button" onClick={() => setColor(c.value)}
                style={{ background: c.value }}
                className={`w-7 h-7 rounded-full ring-2 ${color === c.value ? "ring-primary" : "ring-white/20"}`} title={c.label} />
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="flex-1 bg-gradient-primary text-primary-foreground py-2 rounded-xl text-sm font-medium shadow-glow">Add medicine</button>
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-secondary/60 text-sm">Cancel</button>
      </div>
    </form>
  );
}
