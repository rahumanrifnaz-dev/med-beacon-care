import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Logo } from "@/components/medi/Logo";
import { Field } from "@/routes/login";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
  head: () => ({ meta: [{ title: "Set new password · MediCare+" }] }),
});

function ResetPassword() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    nav({ to: "/login" });
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md glass rounded-3xl p-8 shadow-elegant">
        <div className="flex justify-center mb-6"><Logo /></div>
        <h1 className="font-display text-2xl font-bold text-center">Set a new password</h1>
        <form onSubmit={handleSubmit} className="space-y-3 mt-6">
          <Field label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          <button type="submit" className="w-full bg-gradient-primary text-primary-foreground font-medium py-3 rounded-xl shadow-glow">Update password</button>
        </form>
      </motion.div>
    </div>
  );
}
