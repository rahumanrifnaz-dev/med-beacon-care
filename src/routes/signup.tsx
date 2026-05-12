import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Logo } from "@/components/medi/Logo";
import { Field } from "@/routes/login";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, ShieldCheck } from "lucide-react";
import { dashboardFor } from "@/lib/auth";

export const Route = createFileRoute("/signup")({
  component: Signup,
  head: () => ({ meta: [{ title: "Create account · MediCare+" }] }),
});

type Role = "patient" | "doctor" | "pharmacist";

function Signup() {
  const nav = useNavigate();
  const [role, setRole] = useState<Role>("patient");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [doc, setDoc] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if ((role === "doctor" || role === "pharmacist") && !doc)
      return toast.error("Please upload your job confirmation or licence document to verify you are a real " + role + ".");
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: fullName, role },
        },
      });
      if (error) throw error;
      const uid = data.user?.id;
      if (uid && doc && (role === "doctor" || role === "pharmacist")) {
        const path = `${uid}/${Date.now()}-${doc.name}`;
        const { error: upErr } = await supabase.storage.from("verification-docs").upload(path, doc);
        if (upErr) throw upErr;
        await supabase.from("verification_documents").insert({
          user_id: uid,
          kind: role === "doctor" ? "medical_licence" : "pharmacist_licence",
          file_path: path,
        });
      }
      toast.success(
        role === "patient"
          ? "Account created — welcome to MediCare+"
          : "Account created — your documents are pending review. You can still explore the portal."
      );
      nav({ to: dashboardFor(role) });
    } catch (err: any) {
      toast.error(err.message ?? "Sign-up failed");
    } finally {
      setLoading(false);
    }
  };

  const needsDoc = role !== "patient";

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md glass rounded-3xl p-8 shadow-elegant">
        <div className="flex justify-center mb-6"><Logo /></div>
        <h1 className="font-display text-2xl font-bold text-center">Create your account</h1>
        <p className="text-sm text-muted-foreground text-center mt-1">Join MediCare+ as a patient, doctor, or pharmacist</p>

        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-secondary/40 mt-6">
          {(["patient", "doctor", "pharmacist"] as Role[]).map((r) => (
            <button key={r} type="button" onClick={() => setRole(r)}
              className={`text-xs font-medium py-2 rounded-lg capitalize transition-all ${role === r ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground"}`}>
              {r}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 mt-6">
          <Field label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" required />
          <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@clinic.health" required />
          <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" required minLength={8} />

          {needsDoc && (
            <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <ShieldCheck className="w-4 h-4 text-primary-glow" /> Identity verification required
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Upload your {role === "doctor" ? "medical licence or job confirmation letter" : "pharmacist licence or job confirmation letter"}. We review every document before granting full access.
              </p>
              <label className="flex items-center gap-2 cursor-pointer text-sm bg-secondary/40 hover:bg-secondary/60 px-3 py-2.5 rounded-xl transition-colors">
                <Upload className="w-4 h-4" />
                <span className="flex-1 truncate">{doc?.name ?? "Choose file (PDF, JPG, PNG)"}</span>
                <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => setDoc(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground font-medium py-3 rounded-xl shadow-glow hover:shadow-elegant transition-all disabled:opacity-50">
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="text-sm text-muted-foreground text-center mt-6">
          Already have an account? <Link to="/login" className="text-primary-glow hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
