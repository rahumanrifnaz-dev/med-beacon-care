import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, Panel } from "@/components/medi/DashboardShell";
import { useAuth, useRequireRole } from "@/lib/auth";
import { getRoleNav } from "@/components/medi/RoleSidebar";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/pharmacy/messages")({
  component: PharmacyMessages,
  head: () => ({ meta: [{ title: "Messages · MediCare+" }] }),
});

function PharmacyMessages() {
  const { profile } = useAuth();
  useRequireRole("pharmacist");
  if (!profile) return null;
  return (
    <DashboardShell role={profile.role} name={profile.full_name?.split(" ")[0] ?? "Pharmacist"} nav={getRoleNav(profile.role)}>
      <Panel title="Messages" subtitle="Conversations with customers and doctors">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MessageCircle className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Messaging is coming soon. You'll be able to chat with customers and doctors here.</p>
        </div>
      </Panel>
    </DashboardShell>
  );
}
