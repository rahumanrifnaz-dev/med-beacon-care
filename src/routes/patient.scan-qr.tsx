import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, Panel } from "@/components/medi/DashboardShell";
import { useAuth, useRequireRole } from "@/lib/auth";
import { getRoleNav } from "@/components/medi/RoleSidebar";
import { QrCode } from "lucide-react";

export const Route = createFileRoute("/patient/scan-qr")({
  component: PatientScanQR,
  head: () => ({ meta: [{ title: "Scan QR · MediCare+" }] }),
});

function PatientScanQR() {
  const { profile } = useAuth();
  useRequireRole("patient");
  if (!profile) return null;
  return (
    <DashboardShell role={profile.role} name={profile.full_name?.split(" ")[0] ?? "there"} nav={getRoleNav(profile.role)}>
      <Panel title="Scan QR" subtitle="Scan prescription QR codes at pharmacies">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <QrCode className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">QR scanning will be available in the pharmacy flow.</p>
        </div>
      </Panel>
    </DashboardShell>
  );
}
