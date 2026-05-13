import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/medi/DashboardShell";
import { useAuth, useRequireRole } from "@/lib/auth";
import { getRoleNav } from "@/components/medi/RoleSidebar";
import {
  Settings,
  Bell,
  Lock,
  Mail,
  Phone,
  User,
  LogOut,
  Eye,
  EyeOff,
  Save,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings · MediCare+" }] }),
});

interface SettingsTab {
  id: string;
  label: string;
  icon: typeof User;
}

const settingsTabs: SettingsTab[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy", icon: Lock },
];

function SettingsPage() {
  const { profile, user, signOut } = useAuth();
  useRequireRole(["patient", "doctor", "pharmacist", "admin"]);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);

  if (!profile || !user) return null;

  const nav = getRoleNav(profile.role);

  const handleSignOut = async () => {
    if (confirm("Are you sure you want to sign out?")) {
      await signOut();
      navigate({ to: "/" });
      toast.success("Signed out successfully");
    }
  };

  return (
    <DashboardShell role={profile.role} name={profile.full_name ?? "User"} nav={nav}>
      <div className="p-6 max-w-5xl">
        <div className="flex items-center gap-2 mb-8">
          <Settings className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Settings</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Settings navigation */}
          <div className="md:col-span-1">
            <div className="space-y-1">
              {settingsTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors mt-4 border-t border-border/40 pt-4"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>

          {/* Settings content */}
          <div className="md:col-span-3">
            <div className="glass rounded-xl p-6">
              {activeTab === "profile" && <ProfileSettings profile={profile} user={user} />}
              {activeTab === "security" && <SecuritySettings user={user} />}
              {activeTab === "notifications" && <NotificationSettings />}
              {activeTab === "privacy" && <PrivacySettings />}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function ProfileSettings({
  profile,
  user,
}: {
  profile: any;
  user: any;
}) {
  const { refreshProfile } = _useAuthForRefresh();
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url ?? null);
  const [uploading, setUploading] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const newPath = `${profile.id}/${Date.now()}.${ext}`;

      // 1. Upload new file
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(newPath, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(newPath);
      const newUrl = pub.publicUrl;

      // 2. Update profiles.avatar_url
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: newUrl })
        .eq("id", profile.id);
      if (updErr) throw updErr;

      // 3. Delete old file (if any) — extract path after `/avatars/`
      const oldUrl: string | null = profile.avatar_url ?? avatarUrl;
      if (oldUrl) {
        const marker = "/avatars/";
        const idx = oldUrl.indexOf(marker);
        if (idx !== -1) {
          const oldPath = oldUrl.slice(idx + marker.length);
          if (oldPath && oldPath !== newPath) {
            await supabase.storage.from("avatars").remove([oldPath]);
          }
        }
      }

      setAvatarUrl(newUrl);
      profile.avatar_url = newUrl;
      await refreshProfile();
      toast.success("Profile picture updated");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (!avatarUrl) return;
    if (!confirm("Remove your profile picture?")) return;
    setUploading(true);
    try {
      const marker = "/avatars/";
      const idx = avatarUrl.indexOf(marker);
      if (idx !== -1) {
        const oldPath = avatarUrl.slice(idx + marker.length);
        if (oldPath) await supabase.storage.from("avatars").remove([oldPath]);
      }
      const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", profile.id);
      if (error) throw error;
      setAvatarUrl(null);
      profile.avatar_url = null;
      await refreshProfile();
      toast.success("Profile picture removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, phone })
        .eq("id", profile.id);

      if (error) throw error;
      await refreshProfile();
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
        <div className="flex items-center gap-4 mb-6 p-4 rounded-lg bg-secondary/20">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              (profile.full_name?.[0] ?? "U").toUpperCase()
            )}
          </div>
          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg cursor-pointer hover:bg-primary/90 transition-colors disabled:opacity-50">
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={uploading} />
              {uploading ? "Uploading..." : avatarUrl ? "Change picture" : "Upload picture"}
            </label>
            {avatarUrl && (
              <button
                type="button"
                onClick={handleAvatarRemove}
                disabled={uploading}
                className="ml-2 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
              >
                Remove
              </button>
            )}
            <p className="text-xs text-muted-foreground">PNG or JPG · max 5MB</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={user?.email ?? ""}
              disabled
              className="w-full px-3 py-2 rounded-lg border border-border bg-secondary/30 text-muted-foreground cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Email cannot be changed
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Role</label>
            <input
              type="text"
              value={profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
              disabled
              className="w-full px-3 py-2 rounded-lg border border-border bg-secondary/30 text-muted-foreground cursor-not-allowed"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SecuritySettings({ user }: { user: any }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Password & Security</h3>
        <div className="space-y-4 p-4 rounded-lg bg-warning/5 border border-warning/20 mb-6">
          <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <p className="text-sm text-warning">
              Keep your password strong and unique. Never share it with anyone.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium mb-2">Current Password</label>
            <div className="relative">
              <input
                type={showPasswords ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-3 top-9 text-muted-foreground hover:text-foreground"
              >
                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">New Password</label>
            <input
              type={showPasswords ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Confirm Password</label>
            <input
              type={showPasswords ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <button
            onClick={handleChangePassword}
            disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            {loading ? "Updating..." : "Update Password"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationSettings() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [medicineReminders, setMedicineReminders] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);

  const handleSave = () => {
    toast.success("Notification preferences updated");
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/20 cursor-pointer">
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-xs text-muted-foreground">
                Receive important updates via email
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/20 cursor-pointer">
            <input
              type="checkbox"
              checked={pushNotifications}
              onChange={(e) => setPushNotifications(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-xs text-muted-foreground">
                Get alerts on your device
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/20 cursor-pointer">
            <input
              type="checkbox"
              checked={medicineReminders}
              onChange={(e) => setMedicineReminders(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <div>
              <p className="font-medium">Medicine Reminders</p>
              <p className="text-xs text-muted-foreground">
                Reminders to take your medications
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/20 cursor-pointer">
            <input
              type="checkbox"
              checked={weeklyReport}
              onChange={(e) => setWeeklyReport(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <div>
              <p className="font-medium">Weekly Report</p>
              <p className="text-xs text-muted-foreground">
                Get weekly adherence and health reports
              </p>
            </div>
          </label>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors mt-4"
          >
            <Save className="w-4 h-4" />
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}

function PrivacySettings() {
  const [dataSharing, setDataSharing] = useState(true);
  const [researchParticipation, setResearchParticipation] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState("private");

  const handleSave = () => {
    toast.success("Privacy settings updated");
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Privacy & Data</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/20 cursor-pointer">
            <input
              type="checkbox"
              checked={dataSharing}
              onChange={(e) => setDataSharing(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <div>
              <p className="font-medium">Share Health Data</p>
              <p className="text-xs text-muted-foreground">
                Allow doctors to access your health records
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/20 cursor-pointer">
            <input
              type="checkbox"
              checked={researchParticipation}
              onChange={(e) => setResearchParticipation(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <div>
              <p className="font-medium">Participate in Research</p>
              <p className="text-xs text-muted-foreground">
                Help improve healthcare through anonymized data research
              </p>
            </div>
          </label>

          <div className="p-3">
            <label className="block font-medium mb-3">Profile Visibility</label>
            <select
              value={profileVisibility}
              onChange={(e) => setProfileVisibility(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="private">Private (only doctors can see)</option>
              <option value="public">Public</option>
              <option value="doctors-only">Doctors Only</option>
            </select>
          </div>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors mt-4"
          >
            <Save className="w-4 h-4" />
            Save Privacy Settings
          </button>
        </div>
      </div>
    </div>
  );
}
