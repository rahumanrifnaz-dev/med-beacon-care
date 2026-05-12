import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Logo } from "@/components/medi/Logo";
import { Field } from "@/routes/login";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/login_/admin")({
  component: AdminAuth,
  head: () => ({ meta: [{ title: "Admin · MediCare+" }] }),
});

// Invite code required to create an admin account.
// Share this only with trusted operators; change it in source to rotate.
const ADMIN_INVITE_CODE = "MEDICARE-ADMIN-2026";

function AdminAuth() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const { data: u } = await supabase.auth.getUser();
        const { data: profile } = await supabase
          .from("profiles").select("role").eq("id", u.user!.id).maybeSingle();
        if (profile?.role !== "admin") {
          await supabase.auth.signOut();
          throw new Error("This account is not an administrator.");
        }
        nav({ to: "/admin" });
      } else {
        if (code !== ADMIN_INVITE_CODE) throw new Error("Invalid admin invite code.");
        if (password.length < 8) throw new Error("Password must be at least 8 characters.");
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/admin`,
            data: { full_name: fullName, role: "admin" },
          },
        });
        if (signUpError) {
          // If account already exists, try to sign in and promote to admin.
          const msg = signUpError.message?.toLowerCase() ?? "";
          const alreadyExists = msg.includes("already") || (signUpError as any).code === "user_already_exists";
          if (!alreadyExists) throw signUpError;

          const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
          if (signInErr) throw new Error("This email is already registered. Enter the correct password to promote it to admin.");

          const { data: u } = await supabase.auth.getUser();
          const uid = u.user!.id;
          const { error: pErr } = await supabase
            .from("profiles")
            .update({ role: "admin", verification_status: "approved", full_name: fullName || undefined })
            .eq("id", uid);
          if (pErr) throw pErr;
          // Insert admin role (ignore duplicate-key)
          await supabase.from("user_roles").insert({ user_id: uid, role: "admin" });
          toast.success("Account promoted to admin ✓");
          nav({ to: "/admin" });
          return;
        }
        toast.success("Admin account created. You can sign in now.");
        setMode("signin");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
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
        </form>

        <p className="text-sm text-muted-foreground text-center mt-6">
          Not an admin? <Link to="/login" className="text-primary-glow hover:underline">Standard sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}