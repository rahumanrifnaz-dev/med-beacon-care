import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, Panel } from "@/components/medi/DashboardShell";
import { useAuth, useRequireRole } from "@/lib/auth";
import { getRoleNav } from "@/components/medi/RoleSidebar";
import { Pill } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";

export const Route = createFileRoute("/patient/prescriptions")({
  component: PatientPrescriptions,
  head: () => ({ meta: [{ title: "Prescriptions · MediCare+" }] }),
});

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

function PatientPrescriptions() {
  const { profile } = useAuth();
  useRequireRole("patient");
  const [rxs, setRxs] = useState<EnrichedRx[]>([]);

  const loadPharmacyCatalog = async () => {
    const { data } = await supabase.from("pharmacy_medicines").select("*");
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
    const { data: r } = await supabase.from("prescriptions").select("*").eq("patient_id", profile.id).order("created_at", { ascending: false });
    setRxs(await enrichPrescriptions((r as any) ?? [], catalog, availabilityRows, pharmacists));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.id]);

  if (!profile) return null;

  return (
    <DashboardShell role={profile.role} name={profile.full_name?.split(" ")[0] ?? "there"} nav={getRoleNav(profile.role)}>
      <Panel title="My Prescriptions" subtitle="Show QR codes for pharmacy pickup">
        {rxs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Pill className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No prescriptions yet.</p>
          </div>
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
  );
}
