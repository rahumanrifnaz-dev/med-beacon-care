import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Logo } from "@/components/medi/Logo";
import { Field } from "@/routes/login";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPassword,
  head: () => ({ meta: [{ title: "Reset password · MediCare+" }] }),
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    setSent(true);
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md glass rounded-3xl p-8 shadow-elegant">
        <div className="flex justify-center mb-6"><Logo /></div>
        <h1 className="font-display text-2xl font-bold text-center">Reset your password</h1>
        {sent ? (
          <p className="text-sm text-muted-foreground text-center mt-4">Check your email for the reset link.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 mt-6">
            <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <button type="submit" className="w-full bg-gradient-primary text-primary-foreground font-medium py-3 rounded-xl shadow-glow">Send reset link</button>
          </form>
        )}
        <p className="text-sm text-muted-foreground text-center mt-6">
          <Link to="/login" className="text-primary-glow hover:underline">Back to sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
