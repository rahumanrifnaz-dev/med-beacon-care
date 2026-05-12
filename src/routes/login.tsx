import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Logo } from "@/components/medi/Logo";

export const Route = createFileRoute("/login")({
  component: Login,
  head: () => ({ meta: [{ title: "Sign in · MediSync" }] }),
});

function Login() {
  const nav = useNavigate();
  const [role, setRole] = useState<"patient" | "doctor" | "pharmacy">("patient");

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass rounded-3xl p-8 shadow-elegant"
      >
        <div className="flex justify-center mb-6">
          <Logo />
        </div>
        <h1 className="font-display text-2xl font-bold text-center">Welcome back</h1>
        <p className="text-sm text-muted-foreground text-center mt-1">
          Sign in to your MediSync account
        </p>

        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-secondary/40 mt-6">
          {(["patient", "doctor", "pharmacy"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`text-xs font-medium py-2 rounded-lg capitalize transition-all ${
                role === r ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            nav({ to: role === "patient" ? "/patient" : role === "doctor" ? "/doctor" : "/pharmacy" });
          }}
          className="space-y-3 mt-6"
        >
          <Field label="Email" type="email" placeholder="you@clinic.health" />
          <Field label="Password" type="password" placeholder="••••••••" />
          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-muted-foreground">
              <input type="checkbox" className="rounded" /> Remember me
            </label>
            <Link to="/forgot-password" className="text-primary-glow hover:underline">
              Forgot password?
            </Link>
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-primary text-primary-foreground font-medium py-3 rounded-xl shadow-glow hover:shadow-elegant transition-all"
          >
            Sign in
          </button>
        </form>

        <p className="text-sm text-muted-foreground text-center mt-6">
          New to MediSync?{" "}
          <Link to="/signup" className="text-primary-glow hover:underline">
            Create account
          </Link>
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