import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "patient" | "doctor" | "pharmacist" | "admin";

export interface Profile {
  id: string;
  full_name: string | null;
  role: AppRole;
  doctor_id: string | null;
  verification_status: "pending" | "approved" | "rejected";
  phone: string | null;
  avatar_url: string | null;
}

export function getAuthErrorMessage(error: { message?: string; code?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";

  if (error?.code === "weak_password" || message.includes("weak") || message.includes("easy to guess") || message.includes("pwned")) {
    return "Choose a stronger password. Avoid common or leaked passwords and use a unique mix of letters, numbers, and symbols.";
  }

  if (message.includes("email not confirmed")) {
    return "Your account exists, but your email still needs to be verified before you can sign in.";
  }

  if (message.includes("invalid login credentials")) {
    return "That email or password is incorrect.";
  }

  return error?.message ?? "Something went wrong";
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    setProfile((data as Profile) ?? null);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) setTimeout(() => loadProfile(s.user.id), 0);
      else setProfile(null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadProfile(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function useRequireRole(role: AppRole) {
  const { user, profile, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!user) {
      nav({ to: "/login" });
      return;
    }
    if (profile && profile.role !== role) {
      nav({ to: dashboardFor(profile.role) });
    }
  }, [user, profile, loading, role, nav]);
  return { user, profile, loading };
}

export function dashboardFor(role: AppRole | undefined): "/patient" | "/doctor" | "/pharmacy" | "/admin" {
  if (role === "admin") return "/admin";
  if (role === "doctor") return "/doctor";
  if (role === "pharmacist") return "/pharmacy";
  return "/patient";
}
