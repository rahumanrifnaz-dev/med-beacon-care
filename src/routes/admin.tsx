import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, ClipboardList, Users, FileCheck2, FileX2, Eye, Loader2 } from "lucide-react";
import { DashboardShell, Panel, StatCard } from "@/components/medi/DashboardShell";
import { useRequireRole } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
  head: () => ({ meta: [{ title: "Admin · MediCare+" }] }),
});

const nav = [
  { label: "Overview", to: "/admin", icon: ShieldCheck },
  { label: "Pending verifications", to: "/admin", icon: ClipboardList },
  { label: "All users", to: "/admin", icon: Users },
];

interface PendingRow {
  id: string;
  full_name: string | null;
  role: "doctor" | "pharmacist";
  created_at: string;
  docs: { id: string; kind: string; file_path: string; status: string }[];
}

function AdminDashboard() {
  const { profile, loading } = useRequireRole("admin");
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });

  const load = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, role, verification_status, created_at")
      .in("role", ["doctor", "pharmacist"])
      .order("created_at", { ascending: false });

    const { data: docs } = await supabase
      .from("verification_documents")
      .select("id, user_id, kind, file_path, status, created_at");

    const docsByUser = new Map<string, any[]>();
    (docs ?? []).forEach((d) => {
      const arr = docsByUser.get(d.user_id) ?? [];
      arr.push(d);
      docsByUser.set(d.user_id, arr);
    });

    const pendingRows: PendingRow[] = (profiles ?? [])
      .filter((p) => p.verification_status === "pending")
      .map((p) => ({
        id: p.id,
        full_name: p.full_name,
        role: p.role as "doctor" | "pharmacist",
        created_at: p.created_at,
        docs: docsByUser.get(p.id) ?? [],
      }));

    setPending(pendingRows);
    setAllUsers(profiles ?? []);
    setStats({
      pending: pendingRows.length,
      approved: (profiles ?? []).filter((p) => p.verification_status === "approved").length,
      rejected: (profiles ?? []).filter((p) => p.verification_status === "rejected").length,
      total: profiles?.length ?? 0,
    });
  };

  useEffect(() => {
    if (profile?.role === "admin") load();
  }, [profile]);

  const decide = async (userId: string, decision: "approved" | "rejected") => {
    setBusy(userId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ verification_status: decision })
        .eq("id", userId);
      if (error) throw error;
      await supabase
        .from("verification_documents")
        .update({ status: decision, reviewed_at: new Date().toISOString() })
        .eq("user_id", userId);
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "verification",
        title: decision === "approved" ? "You're verified ✅" : "Verification rejected",
        body:
          decision === "approved"
            ? "Welcome aboard — full access is now enabled."
            : "Please re-upload a valid licence or job confirmation.",
      });
      toast.success(`Marked as ${decision}`);
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const viewDoc = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("verification-docs")
      .createSignedUrl(path, 60 * 5);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary-glow" />
      </div>
    );
  }

  return (
    <DashboardShell role="Super Admin" name={profile.full_name ?? "Admin"} nav={nav}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending" value={String(stats.pending)} icon={ClipboardList} hint="Awaiting review" />
        <StatCard label="Approved" value={String(stats.approved)} icon={FileCheck2} hint="Verified pros" />
        <StatCard label="Rejected" value={String(stats.rejected)} icon={FileX2} />
        <StatCard label="Total pros" value={String(stats.total)} icon={Users} />
      </div>

      <div className="flex gap-2">
        {(["pending", "all"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t
                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                : "bg-secondary/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "pending" ? `Pending verifications (${stats.pending})` : "All professionals"}
          </button>
        ))}
      </div>

      {tab === "pending" ? (
        <Panel title="Verification queue" subtitle="Approve doctors and pharmacists after reviewing their licence documents">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No pending requests right now. 🎉</p>
          ) : (
            <div className="space-y-3">
              {pending.map((p) => (
                <div key={p.id} className="rounded-xl border border-border/40 bg-secondary/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{p.full_name ?? "Unnamed"}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary-glow capitalize">{p.role}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Submitted {new Date(p.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        disabled={busy === p.id}
                        onClick={() => decide(p.id, "approved")}
                        className="text-xs font-medium px-3 py-2 rounded-lg bg-gradient-primary text-primary-foreground shadow-glow disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        disabled={busy === p.id}
                        onClick={() => decide(p.id, "rejected")}
                        className="text-xs font-medium px-3 py-2 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                  {p.docs.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {p.docs.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => viewDoc(d.file_path)}
                          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-background/40 border border-border/40 hover:border-primary/40 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> {d.kind}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>
      ) : (
        <Panel title="All professionals" subtitle="Doctors and pharmacists on MediCare+">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-widest text-muted-foreground">
                <tr><th className="text-left py-2">Name</th><th className="text-left">Role</th><th className="text-left">Status</th><th className="text-left">Joined</th></tr>
              </thead>
              <tbody>
                {allUsers.map((u) => (
                  <tr key={u.id} className="border-t border-border/30">
                    <td className="py-2.5">{u.full_name ?? "—"}</td>
                    <td className="capitalize">{u.role}</td>
                    <td>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        u.verification_status === "approved" ? "bg-emerald-500/15 text-emerald-300"
                        : u.verification_status === "rejected" ? "bg-destructive/15 text-destructive"
                        : "bg-amber-500/15 text-amber-300"
                      }`}>{u.verification_status}</span>
                    </td>
                    <td className="text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </DashboardShell>
  );
}