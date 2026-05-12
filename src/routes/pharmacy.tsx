import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardShell, Panel, StatCard } from "@/components/medi/DashboardShell";
import { Boxes, LayoutDashboard, Package, QrCode, ScanLine, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRequireRole } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/pharmacy")({
  component: PharmacyDashboard,
  head: () => ({ meta: [{ title: "Pharmacy · MediCare+" }] }),
});

const nav = [
  { label: "Overview", to: "/pharmacy", icon: LayoutDashboard },
  { label: "Scan QR", to: "/pharmacy/scan", icon: ScanLine },
  { label: "Prescriptions", to: "/pharmacy", icon: Package },
  { label: "Inventory", to: "/pharmacy", icon: Boxes },
];

function PharmacyDashboard() {
  const { profile } = useAuth();
  useRequireRole("pharmacist");
  const [rxs, setRxs] = useState<any[]>([]);
  const [token, setToken] = useState("");

  const load = async () => {
    const { data } = await supabase.from("prescriptions").select("*, patient:profiles!prescriptions_patient_id_fkey(full_name)").order("created_at", { ascending: false }).limit(20);
    setRxs(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const lookup = async () => {
    if (!token.trim()) return;
    const { data } = await supabase.from("prescriptions").select("*, patient:profiles!prescriptions_patient_id_fkey(full_name)").eq("qr_token", token.trim()).maybeSingle();
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

  if (!profile) return null;
  const pending = profile.verification_status === "pending";

  return (
    <DashboardShell role="Pharmacy Portal" name={profile.full_name?.split(" ")[0] ?? "Pharmacist"} nav={nav}>
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
