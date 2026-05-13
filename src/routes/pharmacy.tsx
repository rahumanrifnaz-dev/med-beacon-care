import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardShell, Panel, StatCard } from "@/components/medi/DashboardShell";
import { Boxes, LayoutDashboard, Package, QrCode, ScanLine, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRequireRole } from "@/lib/auth";
import { toast } from "sonner";
import { PILL_COLORS } from "@/lib/medications";
import { getRoleNav } from "@/components/medi/RoleSidebar";

export const Route = createFileRoute("/pharmacy")({
  component: PharmacyDashboard,
  head: () => ({ meta: [{ title: "Pharmacy · MediCare+" }] }),
});

function PharmacyDashboard() {
  const { profile } = useAuth();
  useRequireRole("pharmacist");
  const [rxs, setRxs] = useState<any[]>([]);
  const [token, setToken] = useState("");
  const [medicines, setMedicines] = useState<any[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  const attachPatientNames = async (prescriptions: any[]) => {
    const patientIds = Array.from(new Set(prescriptions.map((rx) => rx.patient_id).filter(Boolean)));
    if (patientIds.length === 0) {
      return prescriptions;
    }

    const { data: patients } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", patientIds);

    const patientMap = new Map((patients ?? []).map((patient: any) => [patient.id, patient]));

    return prescriptions.map((rx) => ({
      ...rx,
      patient: patientMap.get(rx.patient_id) ?? null,
    }));
  };

  const load = async () => {
    const { data } = await supabase.from("prescriptions").select("*").order("created_at", { ascending: false }).limit(20);
    setRxs(await attachPatientNames(data ?? []));
  };
  useEffect(() => { load(); }, []);

  const loadMedicines = async () => {
    const { data } = await supabase.from("pharmacy_medicines").select("*").order("created_at", { ascending: false });
    setMedicines(data ?? []);
  };

  const loadAvailability = async () => {
    if (!profile) return;
    const { data } = await supabase.from("pharmacy_availability").select("*").eq("pharmacist_id", profile.id).maybeSingle();
    setAvailability((data?.medicines as string[]) ?? []);
  };

  const loadPrescription = async (qrToken: string) => {
    const { data: prescription, error } = await supabase
      .from("prescriptions")
      .select("*")
      .eq("qr_token", qrToken)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!prescription) {
      return null;
    }

    const { data: patient } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", prescription.patient_id)
      .maybeSingle();

    return {
      ...prescription,
      patient,
    };
  };

  useEffect(() => { loadMedicines(); loadAvailability(); /* eslint-disable-next-line */ }, [profile?.id]);

  const lookup = async () => {
    if (!token.trim()) return;
    const data = await loadPrescription(token.trim());
    if (!data) return toast.error("Prescription not found");
    setRxs([data, ...rxs.filter((r) => r.id !== data.id)]);
    toast.success("Prescription loaded");
  };

  const setStatus = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "dispensed") { patch.pharmacist_id = profile?.id; patch.dispensed_at = new Date().toISOString(); }
    await supabase.from("prescriptions").update(patch).eq("id", id);
    const rx = rxs.find((r) => r.id === id);
    if (rx) await supabase.from("notifications").insert({ user_id: rx.patient_id, type: "rx_status", title: `Prescription ${status}`, body: `Status updated by your pharmacist.` });
    toast.success("Updated"); load();
  };

  const addMedicine = async (payload: { name: string; dosage: string; color: string; image?: File | null }) => {
    try {
      if (!profile) return toast.error("No profile");
      let image_url: string | null = null;
      if (payload.image) {
        const file = payload.image;
        const key = `medicines/${crypto.randomUUID()}-${file.name}`;
        // Convert File to Blob for upload
        const blob = new Blob([file], { type: file.type });
        const { error: uploadErr } = await supabase.storage.from("medicine-images").upload(key, blob, { cacheControl: "3600", upsert: false });
        if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);
        const { data: pu } = supabase.storage.from("medicine-images").getPublicUrl(key);
        image_url = pu.publicUrl || null;
      }
      const { error } = await supabase.from("pharmacy_medicines").insert({ name: payload.name, dosage: payload.dosage, color: payload.color, image_url, created_by: profile.id }).select().single();
      if (error) throw error;
      toast.success("Medicine added");
      setAdding(false);
      loadMedicines();
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    }
  };

  const deleteMedicine = async (id: string) => {
    if (!confirm("Delete this medicine?")) return;
    const { error } = await supabase.from("pharmacy_medicines").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Medicine deleted");
    loadMedicines();
  };

  const toggleAvailability = async (medId: string) => {
    if (!profile) return toast.error("No profile");
    const current = new Set(availability);
    if (current.has(medId)) current.delete(medId); else current.add(medId);
    const arr = Array.from(current);
    // upsert row for pharmacist
    const { data, error } = await supabase.from("pharmacy_availability").upsert({ pharmacist_id: profile.id, medicines: arr, updated_at: new Date().toISOString() }, { onConflict: ["pharmacist_id"] }).select().single();
    if (error) return toast.error(error.message);
    setAvailability(arr);
    toast.success("Availability updated");
  };

  if (!profile) return null;
  const pending = profile.verification_status === "pending";

  return (
    <DashboardShell role={profile.role} name={profile.full_name?.split(" ")[0] ?? "Pharmacist"} nav={getRoleNav(profile.role)}>
      {pending && (
        <div className="rounded-2xl bg-warning/15 border border-warning/40 p-4 text-sm">
          Account is <strong>pending verification</strong>. You can still view prescriptions; dispensing is restricted until approved.
        </div>
      )}
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Open prescriptions" value={String(rxs.filter((r) => r.status === "issued").length)} icon={Package} />
        <StatCard label="Dispensed today" value={String(rxs.filter((r) => r.status === "dispensed" && new Date(r.dispensed_at).toDateString() === new Date().toDateString()).length)} icon={QrCode} />
        <StatCard label="Total" value={String(rxs.length)} icon={Boxes} />
      </div>

      <Panel title="Look up prescription" subtitle="Paste a QR token or use the scanner" action={<Link to="/pharmacy/scan" className="flex items-center gap-1 text-xs bg-gradient-primary text-primary-foreground px-3 py-1.5 rounded-full shadow-glow"><ScanLine className="w-3 h-3" /> Open scanner</Link>}>
        <div className="flex gap-2">
          <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="QR token" className="flex-1 bg-input/60 border border-border/60 rounded-xl px-3 py-2.5 text-sm" />
          <button onClick={lookup} className="bg-gradient-primary text-primary-foreground px-4 rounded-xl shadow-glow text-sm"><Search className="w-4 h-4" /></button>
        </div>
      </Panel>

      <Panel title="Pharmacy medicines" subtitle="Add medicines and mark availability" action={<button onClick={() => setAdding(true)} className="flex items-center gap-1 text-xs bg-gradient-primary text-primary-foreground px-3 py-1.5 rounded-full shadow-glow">Add medicine</button>}>
        {adding && <AddMedicineForm onAdd={addMedicine} onCancel={() => setAdding(false)} />}
        <div className="space-y-2">
          {medicines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No medicines in catalog.</p>
          ) : medicines.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden" style={{ backgroundColor: m.color }}>
                {m.image_url ? <img src={m.image_url} alt={m.name} className="w-full h-full object-cover" /> : <div className="text-xs text-white/60">Pill</div>}
              </div>
              <div className="flex-1">
                <p className="font-medium">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.dosage}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleAvailability(m.id)} className={`text-xs px-3 py-1.5 rounded-full ${availability.includes(m.id) ? 'bg-gradient-primary text-primary-foreground' : 'bg-secondary/60'}`}>
                  {availability.includes(m.id) ? 'Available' : 'Mark available'}
                </button>
                <button onClick={() => deleteMedicine(m.id)} className="text-xs px-3 py-1.5 rounded-full bg-red-500/20 text-red-500 hover:bg-red-500/40">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Recent prescriptions">
        <div className="space-y-2">
          {rxs.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-secondary/30">
              <div className="flex-1 min-w-0">
                <p className="font-medium">{r.patient?.full_name ?? "Patient"}</p>
                <p className="text-xs text-muted-foreground">{(r.items as any[])?.map((i) => `${i.med} ${i.dose}`).join(", ")}</p>
                <p className="text-xs text-muted-foreground mt-1">Token: <code className="text-primary-glow">{r.qr_token.slice(0, 12)}…</code></p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-secondary/80 capitalize">{r.status}</span>
              {r.status === "issued" && <button onClick={() => setStatus(r.id, "verified")} className="text-xs px-3 py-1.5 rounded-full bg-primary/20 text-primary-glow">Verify</button>}
              {r.status !== "dispensed" && <button onClick={() => setStatus(r.id, "dispensed")} disabled={pending} className="text-xs px-3 py-1.5 rounded-full bg-gradient-primary text-primary-foreground shadow-glow disabled:opacity-40">Dispense</button>}
            </div>
          ))}
          {rxs.length === 0 && <p className="text-sm text-muted-foreground">No prescriptions yet.</p>}
        </div>
      </Panel>
    </DashboardShell>
  );
}

function AddMedicineForm({ onAdd, onCancel }: { onAdd: (p: { name: string; dosage: string; color: string; image?: File | null }) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [color, setColor] = useState("#a78bfa");
  const [file, setFile] = useState<File | null>(null);
  return (
    <form onSubmit={async (e) => { e.preventDefault(); await onAdd({ name, dosage, color, image: file }); }} className="p-4 rounded-xl bg-primary/5 border border-primary/30 space-y-3 mb-3">
      <div>
        <label className="text-xs uppercase tracking-widest text-muted-foreground">Medicine name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full bg-input/60 border border-border/60 rounded-xl px-3 py-2.5 text-sm" />
      </div>
      <div>
        <label className="text-xs uppercase tracking-widest text-muted-foreground">Dosage</label>
        <input value={dosage} onChange={(e) => setDosage(e.target.value)} className="mt-1 w-full bg-input/60 border border-border/60 rounded-xl px-3 py-2.5 text-sm" />
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
      <div>
        <label className="text-xs uppercase tracking-widest text-muted-foreground">Picture (optional)</label>
        <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0] ?? null; setFile(f); }} className="mt-1 w-full text-sm" />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="flex-1 bg-gradient-primary text-primary-foreground py-2 rounded-xl text-sm font-medium shadow-glow">Add medicine</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl bg-secondary/60 text-sm">Cancel</button>
      </div>
    </form>
  );
}
