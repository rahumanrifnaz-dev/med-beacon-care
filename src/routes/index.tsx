import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Activity, Bell, Brain, HeartPulse, QrCode, ShieldCheck, Sparkles, Stethoscope, Users } from "lucide-react";
import { Logo } from "@/components/medi/Logo";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "MediCare+ — Intelligent Medication Management" },
      { name: "description", content: "A secure platform connecting patients, doctors, and pharmacists with smart reminders, digital prescriptions, and adherence analytics." },
    ],
  }),
});

const features = [
  { icon: Bell, title: "Smart reminders", desc: "Adaptive medication alerts with adherence tracking." },
  { icon: QrCode, title: "QR prescriptions", desc: "Generate, scan, and route digital prescriptions instantly." },
  { icon: Brain, title: "AI interactions", desc: "Real-time drug interaction and overdose detection." },
  { icon: Activity, title: "Adherence analytics", desc: "Weekly and monthly graphs with refill predictions." },
  { icon: ShieldCheck, title: "Role-based security", desc: "JWT auth with patient, doctor, and pharmacist roles." },
  { icon: HeartPulse, title: "Care coordination", desc: "Seamless flow from prescription to dispensing." },
];

const roles = [
  { icon: Users, label: "Patient", to: "/patient", desc: "Track schedules, adherence, refills." },
  { icon: Stethoscope, label: "Doctor", to: "/doctor", desc: "Manage patients & e-prescriptions." },
  { icon: Sparkles, label: "Pharmacist", to: "/pharmacy", desc: "Verify, dispense, manage stock." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="px-6 lg:px-12 py-6 flex items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2">
            Sign in
          </Link>
          <Link
            to="/signup"
            className="text-sm font-medium bg-gradient-primary text-primary-foreground px-4 py-2 rounded-xl shadow-glow hover:shadow-elegant transition-all"
          >
            Get started
          </Link>
        </nav>
      </header>

      <section className="px-6 lg:px-12 pt-12 pb-24 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-muted-foreground mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            HIPAA-ready · End-to-end encrypted
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
            Intelligent medication
            <br />
            <span className="text-gradient">care, in sync.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            MediCare+ connects patients, doctors, and pharmacists in one secure platform —
            with smart reminders, digital prescriptions, and AI-driven adherence insights.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/signup"
              className="bg-gradient-primary text-primary-foreground px-6 py-3 rounded-xl font-medium shadow-glow hover:shadow-elegant transition-all"
            >
              Start free trial
            </Link>
            <Link
              to="/login"
              className="glass px-6 py-3 rounded-xl font-medium hover:bg-secondary/40 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-20 grid sm:grid-cols-3 gap-4"
        >
          {roles.map((r) => (
            <Link
              key={r.to}
              to={r.to}
              className="group glass rounded-2xl p-6 hover:shadow-elegant transition-all hover:-translate-y-1"
            >
              <div className="p-2.5 inline-flex rounded-xl bg-gradient-primary shadow-glow mb-4">
                <r.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <h3 className="font-display font-semibold text-lg">{r.label} portal</h3>
              <p className="text-sm text-muted-foreground mt-1">{r.desc}</p>
              <p className="text-xs text-primary-glow mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                Open dashboard →
              </p>
            </Link>
          ))}
        </motion.div>
      </section>

      <section className="px-6 lg:px-12 pb-24 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-widest text-primary-glow">Platform</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold mt-2">
            Built for medication adherence
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-2xl p-6 hover:shadow-card transition-all"
            >
              <f.icon className="w-6 h-6 text-primary-glow mb-3" />
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/40 px-6 lg:px-12 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
        <Logo />
        <p>© 2026 MediCare+ · Secure healthcare coordination</p>
      </footer>
    </div>
  );
}
