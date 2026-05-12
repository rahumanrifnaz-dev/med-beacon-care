import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Logo } from "@/components/medi/Logo";
import { Field } from "@/routes/login";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { getAuthErrorMessage } from "@/lib/auth";

export const Route = createFileRoute("/login_/admin")({
  component: AdminAuth,
  head: () => ({ meta: [{ title: "Admin · MediCare+" }] }),
});

// Invite code required to create an admin account.
// Share this only with trusted operators; change it in source to rotate.
const ADMIN_INVITE_CODE = "MEDICARE-ADMIN-2026";

async function ensureAdminRecords(userId: string, fullName: string) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) throw profileError;

  if (!profile) {
    const { error: insertProfileError } = await supabase.from("profiles").insert({
      id: userId,
      full_name: fullName,
      role: "admin",
      verification_status: "approved",
    });

    if (insertProfileError) throw insertProfileError;
  }

  const { data: adminRole, error: roleError } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError) throw roleError;

  if (!adminRole) {
    const { error: insertRoleError } = await supabase.from("user_roles").insert({
      user_id: userId,
      role: "admin",
    });

    if (insertRoleError) throw insertRoleError;
  }
}

function AdminAuth() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const { data: u } = await supabase.auth.getUser();
        const signedInUser = u.user!;
        if (signedInUser.user_metadata?.role === "admin") {
          await ensureAdminRecords(signedInUser.id, signedInUser.user_metadata?.full_name ?? fullName ?? email.split("@")[0]);
        }
        const { data: profile } = await supabase
          .from("profiles").select("role").eq("id", signedInUser.id).maybeSingle();
        if (profile?.role !== "admin") {
          await supabase.auth.signOut();
          throw new Error("This account is not an administrator.");
        }
        setFormMessage({ type: "success", text: "Signed in successfully." });
        nav({ to: "/admin" });
      } else {
        if (code !== ADMIN_INVITE_CODE) throw new Error("Invalid admin invite code.");
        if (password.length < 8) throw new Error("Password must be at least 8 characters.");
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/admin`,
            data: { full_name: fullName, role: "admin" },
          },
        });
        if (signUpError) {
          const msg = signUpError.message?.toLowerCase() ?? "";
          const alreadyExists = msg.includes("already") || (signUpError as any).code === "user_already_exists";
          if (alreadyExists) {
            throw new Error("This email is already registered. Sign in with that account instead of creating it again.");
          }

          throw signUpError;
        }

        if (signUpData.session) {
          await ensureAdminRecords(signUpData.session.user.id, fullName || email.split("@")[0]);
          setFormMessage({ type: "success", text: "Admin account created successfully." });
          toast.success("Admin account created ✓");
          nav({ to: "/admin" });
          return;
        }

        setFormMessage({ type: "success", text: "Admin account created. Please verify your email, then sign in." });
        toast.success("Admin account created. Please verify your email, then sign in.");
        setMode("signin");
      }
    } catch (err: any) {
      const message = getAuthErrorMessage(err);
      setFormMessage({ type: "error", text: message });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass rounded-3xl p-8 shadow-elegant"
      >
        <div className="flex justify-center mb-6"><Logo /></div>
        <div className="flex items-center justify-center gap-2 mb-1">
          <ShieldAlert className="w-4 h-4 text-primary-glow" />
          <span className="text-xs uppercase tracking-widest text-primary-glow">Restricted area</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-center">Admin portal</h1>
        <p className="text-sm text-muted-foreground text-center mt-1">
          {mode === "signin" ? "Sign in to manage verifications" : "Create a super-admin account"}
        </p>

        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-secondary/40 mt-6">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`text-xs font-medium py-2 rounded-lg capitalize transition-all ${
                mode === m ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground"
              }`}
            >
              {m === "signin" ? "Sign in" : "Create admin"}
            </button>
          ))}
        </div>

        <form onSubmit={handle} className="space-y-3 mt-6">
          {mode === "signup" && (
            <Field label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          )}
          <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "signup" ? 8 : undefined} />
          {mode === "signup" && (
            <Field label="Admin invite code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Provided by ops" required />
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-primary text-primary-foreground font-medium py-3 rounded-xl shadow-glow hover:shadow-elegant transition-all disabled:opacity-50"
          >
            {loading ? "Please wait…" : mode === "signin" ? "Sign in as admin" : "Create admin account"}
          </button>
          {formMessage && (
            <p className={`rounded-xl border px-4 py-3 text-sm ${
              formMessage.type === "error"
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-primary/30 bg-primary/10 text-primary-glow"
            }`}>
              {formMessage.text}
            </p>
          )}
        </form>

        <p className="text-sm text-muted-foreground text-center mt-6">
          Not an admin? <Link to="/login" className="text-primary-glow hover:underline">Standard sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}