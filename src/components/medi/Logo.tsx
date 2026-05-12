import { Pill } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2 group">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-primary blur-md opacity-60 group-hover:opacity-100 transition-opacity rounded-xl" />
        <div className="relative bg-gradient-primary p-2 rounded-xl shadow-glow">
          <Pill className="w-5 h-5 text-primary-foreground" />
        </div>
      </div>
      <span className="font-display font-bold text-xl tracking-tight">
        Medi<span className="text-gradient">Sync</span>
      </span>
    </Link>
  );
}