import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { useRequireRole } from "@/lib/auth";
import { Logo } from "@/components/medi/Logo";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pharmacy/scan")({
  component: ScanPage,
  head: () => ({ meta: [{ title: "Scan QR · MediCare+" }] }),
});

function ScanPage() {
  useRequireRole("pharmacist");
  const nav = useNavigate();
  const ref = useRef<Html5Qrcode | null>(null);
  const [result, setResult] = useState<any | null>(null);

  useEffect(() => {
    const id = "qr-reader";
    const scanner = new Html5Qrcode(id);
    ref.current = scanner;
    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      async (text) => {
        scanner.pause(true);
        const { data } = await supabase.from("prescriptions").select("*, patient:profiles!prescriptions_patient_id_fkey(full_name)").eq("qr_token", text.trim()).maybeSingle();
        if (data) { setResult(data); toast.success("Prescription found"); }
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
        <div className="mt-6 glass rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest text-primary-glow">Patient</p>
          <p className="font-display text-xl font-bold">{result.patient?.full_name}</p>
          <p className="text-xs text-muted-foreground mt-1">Status: <span className="capitalize">{result.status}</span></p>
          <ul className="mt-3 text-sm space-y-1">
            {(result.items as any[])?.map((it, i) => <li key={i}>• {it.med} — {it.dose} ({it.freq})</li>)}
          </ul>
          <Link to="/pharmacy" className="inline-block mt-4 bg-gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-sm shadow-glow">Open in dashboard</Link>
        </div>
      )}
    </div>
  );
}
