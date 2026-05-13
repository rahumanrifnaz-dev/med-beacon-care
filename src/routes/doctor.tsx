import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, Panel, StatCard } from "@/components/medi/DashboardShell";
import { ClipboardList, LayoutDashboard, Pill, QrCode, Stethoscope, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRequireRole } from "@/lib/auth";
import { MED_CATALOG } from "@/lib/medications";
import { PillIcon } from "@/components/medi/PillIcon";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { getRoleNav } from "@/components/medi/RoleSidebar";

export const Route = createFileRoute("/doctor")({
  component: DoctorDashboard,
  head: () => ({ meta: [{ title: "Doctor · MediCare+" }] }),
});

function DoctorDashboard() {
  const { profile } = useAuth();
  useRequireRole("doctor");
  const [patients, setPatients] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [meds, setMeds] = useState<any[]>([]);
  const [rxs, setRxs] = useState<any[]>([]);
  const [newRx, setNewRx] = useState<{ med: string; dose: string; freq: string }[]>([]);
  const [pharmacyMeds, setPharmacyMeds] = useState<any[]>([]);

  const loadPatients = async () => {
    if (!profile) return;
    const { data } = await supabase.from("profiles").select("*").eq("doctor_id", profile.id);
    setPatients(data ?? []);
  };
  const loadPatient = async (p: any) => {
    setSelected(p);
    const { data: m } = await supabase.from("medications").select("*").eq("patient_id", p.id);
    setMeds(m ?? []);
    const { data: r } = await supabase.from("prescriptions").select("*").eq("patient_id", p.id).order("created_at", { ascending: false });
    setRxs(r ?? []);
  };
  useEffect(() => { loadPatients(); /* eslint-disable-next-line */ }, [profile?.id]);

  const loadCatalog = async () => {
    // Load all pharmacy medicines regardless of availability status
    const { data } = await supabase.from('pharmacy_medicines').select('*').order('created_at', { ascending: false });
    setPharmacyMeds(data ?? []);
  };
  useEffect(() => { loadCatalog(); /* eslint-disable-next-line */ }, []);

  const markTaken = async (med: any) => {
    if (!selected) return;
    await supabase.from("medication_logs").insert({
      medication_id: med.id, patient_id: selected.id,
      scheduled_at: new Date().toISOString(), status: "taken", source: "doctor",
    });
    await supabase.from("notifications").insert({
      user_id: selected.id, type: "doctor_logged", title: "Your doctor logged a dose",
      body: `${med.common_name} marked as taken by your doctor.`,
    });
    toast.success("Logged for patient");
  };

  const issueRx = async () => {
    if (!selected || newRx.length === 0 || !profile) return;
    const { data, error } = await supabase.from("prescriptions").insert({
      doctor_id: profile.id, patient_id: selected.id, items: newRx,
    }).select().single();
    if (error) return toast.error(error.message);
    await supabase.from("notifications").insert({
      user_id: selected.id, type: "new_prescription", title: "New prescription from your doctor",
      body: `${newRx.length} item(s) ready. Show QR at the pharmacy.`,
    });
    toast.success("Prescription issued");
    setNewRx([]); loadPatient(selected);
  };

  const deleteRx = async (id: string) => {
    if (!selected) return;
    // Confirm destructive action
    if (!confirm("Delete this prescription? This cannot be undone.")) return;
    const { error } = await supabase.from("prescriptions").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    // notify patient
    await supabase.from("notifications").insert({
      user_id: selected.id, type: "rx_deleted", title: "Prescription removed by your doctor",
      body: `A prescription was removed by ${profile?.full_name ?? 'your doctor'}.`,
    });
    toast.success("Prescription deleted");
    loadPatient(selected);
  };

  if (!profile) return null;
  const pending = profile.verification_status === "pending";

  return (
    <DashboardShell role={profile.role} name={profile.full_name?.split(" ")[0] ?? "Doctor"} nav={getRoleNav(profile.role)}>
      {pending && (
        <div className="rounded-2xl bg-warning/15 border border-warning/40 p-4 text-sm">
          Your account is <strong>pending verification</strong>. Patients will be able to connect once your documents are approved.
        </div>
      )}
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="My patients" value={String(patients.length)} icon={Users} />
        <StatCard label="Prescriptions" value={String(rxs.length)} icon={ClipboardList} />
        <StatCard label="Status" value={pending ? "Pending" : "Verified"} icon={Stethoscope} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Panel title="Patients">
          {patients.length === 0 ? (
            <p className="text-sm text-muted-foreground">No patients connected yet.</p>
          ) : patients.map((p) => (
            <button key={p.id} onClick={() => loadPatient(p)} className={`w-full text-left p-3 rounded-xl mb-2 transition-colors ${selected?.id === p.id ? "bg-gradient-primary text-primary-foreground" : "bg-secondary/30 hover:bg-secondary/60"}`}>
              <p className="font-medium text-sm">{p.full_name}</p>
              <p className="text-xs opacity-70">{p.phone ?? "Tap to open"}</p>
            </button>
          ))}
        </Panel>

        <Panel title={selected ? `${selected.full_name}'s medicines` : "Select a patient"} subtitle={selected ? "Mark a dose as taken on their behalf" : undefined} className="lg:col-span-2">
          {selected && meds.length === 0 && <p className="text-sm text-muted-foreground">No active medications.</p>}
          <div className="space-y-2">
            {meds.map((m) => (
              <div key={m.id} className="flex items-center gap-4 p-3 rounded-xl bg-secondary/30">
                <PillIcon color={m.color} shape={m.shape} size={40} />
                <div className="flex-1">
                  <p className="font-display font-bold">{m.common_name}</p>
                  <p className="text-xs text-muted-foreground">{m.brand_name} {m.dose && `· ${m.dose}`}</p>
                </div>
                <button onClick={() => markTaken(m)} className="text-xs px-3 py-1.5 rounded-full bg-gradient-primary text-primary-foreground shadow-glow">Mark taken</button>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {selected && (
        <Panel title="Issue prescription" subtitle="Generates a QR for the pharmacy">
          <div className="space-y-2">
            {newRx.map((it, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-secondary/30 text-sm">
                <span className="flex-1">{it.med} — {it.dose} — {it.freq}</span>
                <button onClick={() => setNewRx(newRx.filter((_, j) => j !== i))} className="text-xs text-muted-foreground hover:text-foreground">Remove</button>
              </div>
            ))}
            <RxItemForm onAdd={(it) => setNewRx([...newRx, it])} extraMeds={pharmacyMeds} />
            <button onClick={issueRx} disabled={newRx.length === 0} className="bg-gradient-primary text-primary-foreground px-4 py-2 rounded-xl shadow-glow text-sm font-medium disabled:opacity-50">Issue prescription</button>
          </div>
          {rxs.length > 0 && (
            <div className="mt-6 grid sm:grid-cols-3 gap-3">
              {rxs.slice(0, 3).map((r) => (
                <div key={r.id} className="p-3 rounded-xl bg-secondary/30 text-center">
                  <div className="bg-white p-2 rounded-lg inline-block"><QRCodeSVG value={r.qr_token} size={90} /></div>
                  <p className="text-xs mt-2 capitalize">{r.status}</p>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <button onClick={() => deleteRx(r.id)} className="text-xs px-3 py-1.5 rounded-full bg-secondary/60 hover:bg-secondary">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}
    </DashboardShell>
  );
}

function RxItemForm({ onAdd, extraMeds }: { onAdd: (it: { med: string; dose: string; freq: string }) => void; extraMeds?: any[] }) {
  const options = [
    ...MED_CATALOG.map((c) => ({ value: c.brand, label: `${c.common} (${c.brand})` })),
    ...(extraMeds ?? []).map((m: any) => ({ value: `${m.name} · ${m.dosage}`, label: `${m.name} (${m.dosage})` })),
  ];
  const [med, setMed] = useState(options[0]?.value ?? MED_CATALOG[0].brand);
  const [dose, setDose] = useState("1 tablet");
  const [freq, setFreq] = useState("Once daily");
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
      <select value={med} onChange={(e) => setMed(e.target.value)} className="bg-input/60 border border-border/60 rounded-xl px-3 py-2 text-sm sm:col-span-2">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="Dose" className="bg-input/60 border border-border/60 rounded-xl px-3 py-2 text-sm" />
      <div className="flex gap-2">
        <input value={freq} onChange={(e) => setFreq(e.target.value)} placeholder="Frequency" className="flex-1 bg-input/60 border border-border/60 rounded-xl px-3 py-2 text-sm" />
        <button onClick={() => onAdd({ med, dose, freq })} className="bg-secondary/60 px-3 rounded-xl text-sm hover:bg-secondary">+</button>
      </div>
    </div>
  );
}
