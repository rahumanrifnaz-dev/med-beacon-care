import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Bell, LogOut, Settings, Menu, X, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { NotificationBell } from "./NotificationBell";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

export function DashboardShell({
  role,
  name,
  nav,
  children,
}: {
  role: string;
  name: string;
  nav: NavItem[];
  children: ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex w-64 flex-col border-r border-border/40 glass">
        <div className="p-6">
          <Logo />
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {nav.map((item, i) => {
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            const Icon = item.icon;
              return (
              <Link
                key={`${item.to}-${item.label}-${i}`}
                to={item.to}
                onClick={() => navigate({ to: item.to })}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border/40">
          <button
            onClick={async () => { await signOut(); navigate({ to: "/" }); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-10 glass border-b border-border/40 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{role}</p>
            <h1 className="font-display text-lg font-semibold">Welcome back, {name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-xl hover:bg-secondary/60 transition-colors lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <NotificationBell />
            <Link to="/settings" className="p-2 rounded-xl hover:bg-secondary/60 transition-colors">
              <Settings className="w-5 h-5" />
            </Link>
            <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-semibold ml-2">
              {name[0]}
            </div>
          </div>
        </header>
        {/* Mobile nav overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-64 bg-background/80 glass p-4 border-r border-border/40">
              <div className="flex items-center justify-between mb-4">
                <Logo />
                <button onClick={() => setMobileOpen(false)} aria-label="Close navigation" className="p-2 rounded-lg hover:bg-secondary/40">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="space-y-2">
                {nav.map((item, i) => {
                  const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={`${item.to}-${item.label}-mobile-${i}`}
                      to={item.to}
                      onClick={() => {
                        setMobileOpen(false);
                        navigate({ to: item.to });
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? "bg-gradient-primary text-primary-foreground shadow-glow"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-6">
                <button
                  onClick={async () => { await signOut(); navigate({ to: "/" }); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            </aside>
          </div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="p-6 lg:p-8 space-y-6"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  accent?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="relative overflow-hidden rounded-2xl glass shadow-card p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className="font-display text-3xl font-bold mt-2">{value}</p>
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        </div>
        <div className={`p-2.5 rounded-xl bg-gradient-primary shadow-glow ${accent ?? ""}`}>
          <Icon className="w-5 h-5 text-primary-foreground" />
        </div>
      </div>
    </motion.div>
  );
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl glass shadow-card p-6 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-lg">{title}</h3>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}