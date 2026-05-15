import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, Panel } from "@/components/medi/DashboardShell";
import { useAuth, useRequireRole } from "@/lib/auth";
import { getRoleNav } from "@/components/medi/RoleSidebar";
import { Send, MessageCircle, ChevronRight, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/doctor/messages")({
  component: DoctorMessages,
  head: () => ({ meta: [{ title: "Messages · MediCare+" }] }),
});

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

interface PatientChat {
  patient_id: string;
  patient_name: string;
  last_message: string;
  last_message_time: string;
  unread: boolean;
}

function DoctorMessages() {
  const { profile, user } = useAuth();
  useRequireRole("doctor");
  const [patients, setPatients] = useState<PatientChat[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadPatients = async () => {
    if (!user) return;

    try {
      // Get all unique patients this doctor has messaged with
      const { data: messageData, error: messageError } = await supabase
        .from("messages")
        .select("sender_id, receiver_id, content, created_at")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (messageError) throw messageError;

      // Group by patient and get latest message
      const patientMap = new Map<string, PatientChat>();
      const patientIds = new Set<string>();

      messageData?.forEach((msg: any) => {
        const patientId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!patientMap.has(patientId)) {
          patientIds.add(patientId);
          patientMap.set(patientId, {
            patient_id: patientId,
            patient_name: "Loading...",
            last_message: msg.content,
            last_message_time: msg.created_at,
            unread: false,
          });
        }
      });

      // Fetch patient profiles
      if (patientIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", Array.from(patientIds));

        profiles?.forEach((profile: any) => {
          const chat = patientMap.get(profile.id);
          if (chat) {
            chat.patient_name = profile.full_name || "Unknown Patient";
          }
        });
      }

      setPatients(Array.from(patientMap.values()));
      setLoading(false);
    } catch (err) {
      console.error("Failed to load patients:", err);
      toast.error("Failed to load patients");
      setLoading(false);
    }
  };

  const loadMessages = async (patientId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${patientId}),and(sender_id.eq.${patientId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data as Message[]);
    } catch (err) {
      console.error("Failed to load messages:", err);
      toast.error("Failed to load messages");
    }
  };

  const deleteMessage = async (messageId: string) => {
    setDeleting(messageId);
    try {
      const msg = messages.find((m) => m.id === messageId);
      if (!msg) {
        toast.error("Message not found");
        return;
      }
      if (msg.sender_id !== user?.id) {
        toast.error("You can only delete your own messages");
        return;
      }

      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;
      setMessages(messages.filter(m => m.id !== messageId));
      toast.success("Message deleted");
    } catch (err) {
      console.error("Failed to delete message:", err);
      toast.error("Failed to delete message");
    } finally {
      setDeleting(null);
    }
  };

  useEffect(() => {
    loadPatients();

    if (!user) return;

    const channel = supabase
      .channel(`doctor-messages:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        void loadPatients();
        if (selectedPatientId) {
          void loadMessages(selectedPatientId);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (selectedPatientId) {
      void loadMessages(selectedPatientId);
    }
  }, [selectedPatientId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !selectedPatientId) return;

    const content = newMessage.trim().slice(0, 2000);

    try {
      // Rate-limit: allow max 5 messages per 30 seconds per sender
      const since = new Date(Date.now() - 30 * 1000).toISOString();
      const { count, error: countErr } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("sender_id", user.id)
        .gt("created_at", since);

      if (countErr) {
        console.error("Failed to check message rate:", countErr);
      } else if ((count ?? 0) >= 5) {
        toast.error("You're sending messages too quickly. Please wait a moment.");
        return;
      }

      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: selectedPatientId,
        content,
      });

      if (error) throw error;
      setNewMessage("");
      await loadMessages(selectedPatientId);
      toast.success("Message sent");
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error("Failed to send message");
    }
  };

  if (!profile) return null;

  return (
    <DashboardShell role={profile.role} name={profile.full_name?.split(" ")[0] ?? "Doctor"} nav={getRoleNav(profile.role)}>
      <div className="grid lg:grid-cols-4 gap-4 h-full min-h-96">
        {/* Patients List */}
        <div className="lg:col-span-1 border border-border rounded-xl overflow-hidden flex flex-col bg-background">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-sm">Patients</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
            ) : patients.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No conversations yet</div>
            ) : (
              patients.map((patient) => (
                <button
                  key={patient.patient_id}
                  onClick={() => setSelectedPatientId(patient.patient_id)}
                  className={`w-full text-left p-3 border-b border-border/50 hover:bg-secondary/50 transition-colors ${
                    selectedPatientId === patient.patient_id ? "bg-secondary" : ""
                  }`}
                >
                  <p className="font-medium text-sm">{patient.patient_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{patient.last_message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(patient.last_message_time).toLocaleDateString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-3 border border-border rounded-xl overflow-hidden flex flex-col bg-background">
          {selectedPatientId ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold">
                  {patients.find((p) => p.patient_id === selectedPatientId)?.patient_name}
                </h3>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-muted-foreground">No messages yet. Start a conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"} group`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg relative ${
                          msg.sender_id === user?.id
                            ? "bg-gradient-primary text-primary-foreground"
                            : "bg-secondary text-foreground"
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                        {msg.sender_id === user?.id && (
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            disabled={deleting === msg.id}
                            className="opacity-0 group-hover:opacity-100 absolute -right-8 top-1/2 -translate-y-1/2 p-1 hover:text-destructive transition-all disabled:opacity-50"
                            title="Delete message"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <div className="border-t border-border p-4 flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      sendMessage();
                    }
                  }}
                  placeholder="Type your message..."
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 rounded-lg bg-gradient-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-glow transition-shadow flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Select a patient to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}