import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, Panel } from "@/components/medi/DashboardShell";
import { useAuth, useRequireRole } from "@/lib/auth";
import { getRoleNav } from "@/components/medi/RoleSidebar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/pharmacy/medicines")({
  component: PharmacyMedicines,
  head: () => ({ meta: [{ title: "Manage Medicines · MediCare+" }] }),
});

function PharmacyMedicines() {
  const { profile } = useAuth();
  useRequireRole("pharmacist");
  const [medicines, setMedicines] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("pharmacy_medicines").select("*").order("created_at", { ascending: false });
    setMedicines(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !name.trim()) return;
    setBusy(true);
    try {
      let image_url: string | null = null;
      if (file) {
        const key = `medicines/${crypto.randomUUID()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("medicine-images").upload(key, file, { cacheControl: "3600" });
        if (upErr) throw upErr;
        image_url = supabase.storage.from("medicine-images").getPublicUrl(key).data.publicUrl;
      }
      const { error } = await supabase.from("pharmacy_medicines").insert({ name, dosage, image_url, created_by: profile.id });
      if (error) throw error;
      toast.success("Medicine added");
      setName(""); setDosage(""); setFile(null);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this medicine?")) return;
    const { error } = await supabase.from("pharmacy_medicines").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  if (!profile) return null;
  return (
    <DashboardShell role={profile.role} name={profile.full_name?.split(" ")[0] ?? "Pharmacist"} nav={getRoleNav(profile.role)}>
      <Panel title="Add new medicine">
        <form onSubmit={add} className="grid sm:grid-cols-2 gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Medicine name" className="bg-input/60 border border-border/60 rounded-xl px-3 py-2.5 text-sm" required />
          <input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="Dosage (e.g. 500mg)" className="bg-input/60 border border-border/60 rounded-xl px-3 py-2.5 text-sm" />
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm sm:col-span-2" />
          <button disabled={busy} className="sm:col-span-2 bg-gradient-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium shadow-glow disabled:opacity-50">{busy ? "Adding..." : "Add medicine"}</button>
        </form>
      </Panel>
      <Panel title="All medicines" subtitle={`${medicines.length} in catalog`}>
        {medicines.length === 0 ? <p className="text-sm text-muted-foreground">No medicines yet.</p> : (
          <div className="grid sm:grid-cols-2 gap-3">
            {medicines.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
                <div className="w-12 h-12 rounded-lg bg-secondary/60 overflow-hidden flex items-center justify-center">
                  {m.image_url ? <img src={m.image_url} className="w-full h-full object-cover" /> : <span className="text-xs text-muted-foreground">Pill</span>}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.dosage}</p>
                </div>
                <button onClick={() => remove(m.id)} className="text-xs px-3 py-1.5 rounded-full bg-destructive/20 text-destructive hover:bg-destructive/40">Delete</button>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </DashboardShell>
  );
}