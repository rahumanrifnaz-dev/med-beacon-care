import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, Panel, StatCard } from "@/components/medi/DashboardShell";
import { Activity, AlertTriangle, Calendar, CheckCircle2, Clock, Heart, LayoutDashboard, MessageCircle, Pill, QrCode, TrendingUp } from "lucide-react";
import { adherenceMonth, adherenceWeek, medications } from "@/lib/mock-data";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { motion } from "framer-motion";

export const Route = createFileRoute("/patient")({
  component: PatientDashboard,
  head: () => ({ meta: [{ title: "Patient · MediSync" }] }),
});

const nav = [
  { label: "Overview", to: "/patient", icon: LayoutDashboard },
  { label: "Schedule", to: "/patient", icon: Calendar },
  { label: "Prescriptions", to: "/patient", icon: Pill },
  { label: "Scan QR", to: "/patient", icon: QrCode },
  { label: "Messages", to: "/patient", icon: MessageCircle },
];

function PatientDashboard() {
  return (
    <DashboardShell role="Patient Portal" name="Sarah" nav={nav}>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Adherence (7d)" value="92%" hint="↑ 4% vs last week" icon={TrendingUp} />
        <StatCard label="Active meds" value="4" hint="2 due today" icon={Pill} />
        <StatCard label="Next dose" value="19:00" hint="Lisinopril 10mg" icon={Clock} />
        <StatCard label="Heart rate" value="72 bpm" hint="Within range" icon={Heart} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Panel title="Today's schedule" subtitle="Tap to log a dose" className="lg:col-span-2">
          <div className="space-y-2">
            {medications.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                  <Pill className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{m.name} <span className="text-muted-foreground text-sm">· {m.dose}</span></p>
                  <p className="text-xs text-muted-foreground">Daily at {m.time}</p>
                </div>
                {m.taken ? (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-success/20 text-success flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Taken
                  </span>
                ) : (
                  <button className="text-xs px-3 py-1.5 rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
                    Log dose
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </Panel>

        <Panel title="Alerts" subtitle="Real-time">
          <div className="space-y-3">
            <AlertRow icon={AlertTriangle} tone="warning" title="Missed dose" desc="Vitamin D3 — yesterday 21:00" />
            <AlertRow icon={Activity} tone="primary" title="Refill in 5 days" desc="Atorvastatin running low" />
            <AlertRow icon={CheckCircle2} tone="success" title="New prescription" desc="From Dr. Patel · ready" />
          </div>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Weekly adherence" subtitle="Doses taken vs missed">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={adherenceWeek}>
              <CartesianGrid stroke="oklch(0.4 0.05 290 / 0.2)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" stroke="oklch(0.7 0.03 290)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="oklch(0.7 0.03 290)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "oklch(0.22 0.05 290)", border: "1px solid oklch(0.4 0.06 290)", borderRadius: 12 }} />
              <Bar dataKey="taken" fill="oklch(0.68 0.22 300)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="missed" fill="oklch(0.62 0.24 25)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="30-day adherence trend">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={adherenceMonth}>
              <defs>
                <linearGradient id="ad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.78 0.20 310)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="oklch(0.68 0.22 300)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="oklch(0.4 0.05 290 / 0.2)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" stroke="oklch(0.7 0.03 290)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="oklch(0.7 0.03 290)" fontSize={12} tickLine={false} axisLine={false} domain={[40, 100]} />
              <Tooltip contentStyle={{ background: "oklch(0.22 0.05 290)", border: "1px solid oklch(0.4 0.06 290)", borderRadius: 12 }} />
              <Area type="monotone" dataKey="adherence" stroke="oklch(0.78 0.20 310)" strokeWidth={2} fill="url(#ad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </DashboardShell>
  );
}

function AlertRow({ icon: Icon, tone, title, desc }: { icon: any; tone: "warning" | "primary" | "success"; title: string; desc: string }) {
  const toneClass = tone === "warning" ? "bg-warning/20 text-warning" : tone === "success" ? "bg-success/20 text-success" : "bg-primary/20 text-primary-glow";
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/20">
      <div className={`p-2 rounded-lg ${toneClass}`}><Icon className="w-4 h-4" /></div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}