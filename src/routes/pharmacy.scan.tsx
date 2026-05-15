import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRequireRole } from "@/lib/auth";
import { Logo } from "@/components/medi/Logo";
import { ArrowLeft, Printer, CheckCircle2, Package, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pharmacy/scan")({
  component: ScanPage,
  head: () => ({ meta: [{ title: "Scan QR · MediCare+" }] }),
});

function ScanPage() {
  useRequireRole("pharmacist");
  const { profile } = useAuth();
  const nav = useNavigate();
  const ref = useRef<Html5Qrcode | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [medicineDetails, setMedicineDetails] = useState<any[]>([]);
  const [doctor, setDoctor] = useState<any | null>(null);
  const [stockOk, setStockOk] = useState<boolean[]>([]);

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

  const loadMedicineDetails = async (prescription: any) => {
    // Load all pharmacy medicines for reference
    const { data: allMeds } = await supabase.from("pharmacy_medicines").select("*");
    const medsMap = new Map<string, any>();
    (allMeds ?? []).forEach((m: any) => {
      medsMap.set(m.name.trim().toLowerCase(), m);
      const label = [m.name, m.dosage].filter(Boolean).join(" · ").trim().toLowerCase();
      if (label) {
        medsMap.set(label, m);
      }
    });

    // Enrich prescription items with medicine details
    const enriched = (prescription.items as any[])?.map((item: any) => {
      const medKey = String(item.med ?? "").trim().toLowerCase();
      const medData = medsMap.get(medKey) ?? medsMap.get(medKey.split(" · ")[0] ?? "");
      return {
        ...item,
        color: medData?.color || "#a78bfa",
        image_url: medData?.image_url || null,
        medicine_id: medData?.id
      };
    }) ?? [];
    
    setMedicineDetails(enriched);

    // Load doctor info (with role/credentials)
    const { data: doctorData } = await supabase.from("profiles").select("full_name, role, phone").eq("id", prescription.doctor_id).maybeSingle();
    setDoctor(doctorData);

    // Stock check
    if (profile) {
      const { data: avail } = await supabase.from("pharmacy_availability").select("medicines").eq("pharmacist_id", profile.id).maybeSingle();
      const inStock = (avail?.medicines as string[]) ?? [];
      setStockOk(enriched.map((it: any) => it.medicine_id ? inStock.includes(it.medicine_id) : false));
    }
  };

  const updateStatus = async (status: "verified" | "dispensed") => {
    if (!result || !profile) return;
    const patch: any = { status };
    if (status === "verified") { patch.verified_by = profile.id; patch.verified_at = new Date().toISOString(); }
    if (status === "dispensed") { patch.pharmacist_id = profile.id; patch.dispensed_at = new Date().toISOString(); }
    const { error } = await supabase.from("prescriptions").update(patch).eq("id", result.id);
    if (error) return toast.error(error.message);
    toast.success(status === "verified" ? "Marked as verified" : "Distributed — patient & doctor notified");
    setResult({ ...result, ...patch });
  };

  useEffect(() => {
    const id = "qr-reader";
    const scanner = new Html5Qrcode(id);
    ref.current = scanner;
    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      async (text) => {
        scanner.pause(true);
        const qrToken = text.trim();
        const data = await loadPrescription(qrToken);
        if (data) {
          setResult(data);
          await loadMedicineDetails(data);
          toast.success("Prescription found"); 
        }
        else { toast.error("Not a valid MediCare+ prescription"); setTimeout(() => scanner.resume(), 1500); }
      },
      () => {}
    ).catch((e) => toast.error("Camera error: " + e.message));
    return () => { scanner.stop().catch(() => {}); scanner.clear(); };
  }, []);

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => nav({ to: "/pharmacy" })} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Back</button>
        <Logo />
      </div>
      <h1 className="font-display text-2xl font-bold">Scan prescription QR</h1>
      <p className="text-sm text-muted-foreground mt-1">Point camera at the patient's QR code.</p>
      <div id="qr-reader" className="mt-6 rounded-2xl overflow-hidden glass" />
      {result && (
        <div className="mt-6 glass rounded-2xl p-8 print:bg-white print:text-black">
          {/* Header */}
          <div className="mb-6 print:mb-4">
            <p className="text-xs uppercase tracking-widest text-primary-glow print:text-gray-600">
              Prescription from Dr. {doctor?.full_name || 'Doctor'}
              {doctor?.role && <span className="ml-2 opacity-70">· {doctor.role}</span>}
            </p>
            {doctor?.phone && <p className="text-xs text-muted-foreground mt-0.5">Contact: {doctor.phone}</p>}
            <h2 className="font-display text-2xl font-bold mt-2">Rx Prescription</h2>
          </div>

          {/* Patient Info */}
          <div className="mb-6 pb-6 border-b border-border/40 print:border-gray-300">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground print:text-gray-600">Patient Name</p>
                <p className="font-semibold">{result.patient?.full_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground print:text-gray-600">Status</p>
                <p className="font-semibold capitalize">{result.status}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground print:text-gray-600">Date</p>
                <p className="font-semibold">{new Date(result.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground print:text-gray-600">Rx Token</p>
                <p className="font-mono text-xs">{result.qr_token.slice(0, 12)}…</p>
              </div>
            </div>
          </div>

          {/* Medicines */}
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-4">Prescribed Medicines</h3>
            <div className="space-y-3">
              {medicineDetails.map((item, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl bg-secondary/20 print:border print:border-gray-300 print:bg-white">
                  <div className="w-16 h-16 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: item.color }}>
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.med} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <div className="text-white/60 text-xs font-bold">💊</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-base">{item.med}</p>
                      {stockOk[i] ? (
                        <span className="text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/20 text-success print:hidden"><CheckCircle2 className="w-3 h-3" />In stock</span>
                      ) : (
                        <span className="text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/20 text-destructive print:hidden"><XCircle className="w-3 h-3" />Out of stock</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground print:text-gray-700 mt-1">
                      <span className="font-semibold">Dosage:</span> {item.dose}
                    </p>
                    <p className="text-sm text-muted-foreground print:text-gray-700">
                      <span className="font-semibold">Frequency:</span> {item.freq}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-8 print:hidden">
            {result.status !== "dispensed" && (
              <>
                {result.status === "issued" && (
                  <button onClick={() => updateStatus("verified")} className="flex items-center gap-2 bg-secondary/60 px-4 py-2 rounded-xl text-sm font-medium hover:bg-secondary">
                    <CheckCircle2 className="w-4 h-4" /> Verify
                  </button>
                )}
                <button onClick={() => updateStatus("dispensed")} className="flex items-center gap-2 bg-gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium shadow-glow">
                  <Package className="w-4 h-4" /> Mark distributed
                </button>
              </>
            )}
            <button onClick={() => window.print()} className="flex items-center gap-2 flex-1 bg-gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium shadow-glow">
              <Printer className="w-4 h-4" /> Print / Save as PDF
            </button>
            <Link to="/pharmacy" className="flex-1 bg-secondary/60 text-foreground px-4 py-2 rounded-xl text-sm text-center">Back to pharmacy</Link>
          </div>
        </div>
      )}
    </div>
  );
}
