import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, Panel } from "@/components/medi/DashboardShell";
import { useAuth, useRequireRole } from "@/lib/auth";
import { getRoleNav } from "@/components/medi/RoleSidebar";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/doctor/messages")({
  component: DoctorMessages,
  head: () => ({ meta: [{ title: "Messages · MediCare+" }] }),
});

function DoctorMessages() {
  const { profile } = useAuth();
  useRequireRole("doctor");
  if (!profile) return null;
  return (
    <DashboardShell role={profile.role} name={profile.full_name?.split(" ")[0] ?? "Doctor"} nav={getRoleNav(profile.role)}>
      <Panel title="Messages" subtitle="Conversations with your patients">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MessageCircle className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Messaging is coming soon. You'll be able to chat with your patients here.</p>
        </div>
      </Panel>
    </DashboardShell>
  );
}