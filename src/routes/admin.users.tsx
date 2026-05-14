import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, Panel } from "@/components/medi/DashboardShell";
import { useAuth, useRequireRole } from "@/lib/auth";
import { getRoleNav } from "@/components/medi/RoleSidebar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
  head: () => ({ meta: [{ title: "Users · MediCare+" }] }),
});

function AdminUsers() {
  const { profile } = useAuth();
  useRequireRole("admin");
  const [users, setUsers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"all" | "patient" | "doctor" | "pharmacist" | "admin">("all");

  useEffect(() => {
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).then(({ data }) => setUsers(data ?? []));
  }, []);

  if (!profile) return null;
  const filtered = users.filter((u) => (role === "all" || u.role === role) && (!q || (u.full_name ?? "").toLowerCase().includes(q.toLowerCase())));

  return (
    <DashboardShell role={profile.role} name={profile.full_name?.split(" ")[0] ?? "Admin"} nav={getRoleNav(profile.role)}>
      <Panel title="All users" subtitle={`${filtered.length} of ${users.length}`}>
        <div className="flex flex-wrap gap-2 mb-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name…" className="flex-1 min-w-[200px] bg-input/60 border border-border/60 rounded-xl px-3 py-2 text-sm" />
          {(["all", "patient", "doctor", "pharmacist", "admin"] as const).map((r) => (
            <button key={r} onClick={() => setRole(r)} className={`px-3 py-1.5 text-xs rounded-full capitalize ${role === r ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-secondary/40"}`}>{r}</button>
          ))}
        </div>
        <div className="space-y-2">
          {filtered.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-semibold text-primary-foreground overflow-hidden">
                {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : (u.full_name ?? "?")[0]}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{u.full_name ?? "Unnamed"}</p>
                <p className="text-xs text-muted-foreground">{u.phone ?? "—"}</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-secondary/80 capitalize">{u.role}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full capitalize ${u.verification_status === "approved" ? "bg-success/20 text-success" : u.verification_status === "pending" ? "bg-warning/20 text-warning" : "bg-destructive/20 text-destructive"}`}>{u.verification_status}</span>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground">No users match.</p>}
        </div>
      </Panel>
    </DashboardShell>
  );
}