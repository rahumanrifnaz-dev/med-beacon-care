import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Logo } from "@/components/medi/Logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { dashboardFor } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  component: Login,
  head: () => ({ meta: [{ title: "Sign in · MediCare+" }] }),
});

function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", u.user.id).maybeSingle();
        nav({ to: dashboardFor(profile?.role as any) });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md glass rounded-3xl p-8 shadow-elegant">
        <div className="flex justify-center mb-6"><Logo /></div>
        <h1 className="font-display text-2xl font-bold text-center">Welcome back</h1>
        <p className="text-sm text-muted-foreground text-center mt-1">Sign in to your MediCare+ account</p>

        <form onSubmit={handleSubmit} className="space-y-3 mt-6">
          <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@clinic.health" required />
          <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-muted-foreground"><input type="checkbox" className="rounded" /> Remember me</label>
            <Link to="/forgot-password" className="text-primary-glow hover:underline">Forgot password?</Link>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground font-medium py-3 rounded-xl shadow-glow hover:shadow-elegant transition-all disabled:opacity-50">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-sm text-muted-foreground text-center mt-6">
          New to MediCare+? <Link to="/signup" className="text-primary-glow hover:underline">Create account</Link>
        </p>
        <p className="text-[11px] text-muted-foreground/60 text-center mt-3">
          <Link to="/login/admin" className="hover:text-primary-glow transition-colors">Admin portal →</Link>
        </p>
      </motion.div>
    </div>
  );
}

export function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        {...props}
        className="mt-1.5 w-full bg-input/60 border border-border/60 rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
      />
    </label>
  );
}
