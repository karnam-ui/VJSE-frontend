import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { LoginGate } from "../components/LoginGate";
import { AlertCircle, RefreshCw, MessageSquare, Send } from "lucide-react";
import { UserRole } from "../data/network";

interface LeadsPageProps {
  user: { id: number; fullName: string; email: string; role: UserRole } | null;
  onLogin: () => void;
}

export function LeadsPage({ user, onLogin }: LeadsPageProps) {
  const [leads, setLeads] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [startups, setStartups] = useState<any[]>([]);
  const [leadRecord, setLeadRecord] = useState<any | null>(null);
  
  const [selectedStartupId, setSelectedStartupId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && user.role === "Mentor") {
      fetchMentorData();
    }
  }, [user]);

  async function fetchMentorData() {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch all leads to find the matching lead record
      const leadsRes = await fetch("/api/leads");
      if (!leadsRes.ok) throw new Error("Failed to fetch leads");
      const leadsData = await leadsRes.json();
      setLeads(leadsData);

      const matchingLead = leadsData.find((l: any) => l.email.toLowerCase() === user?.email.toLowerCase());
      setLeadRecord(matchingLead || null);

      if (matchingLead) {
        // 2. Fetch connections
        const connRes = await fetch("/api/connections");
        if (connRes.ok) {
          const connData = await connRes.json();
          setConnections(connData);
        }

        // 3. Fetch startups
        const startupsRes = await fetch("/api/startups");
        if (startupsRes.ok) {
          const startupsData = await startupsRes.json();
          setStartups(startupsData);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to the backend server.");
    } finally {
      setLoading(false);
    }
  }

  const mentoredStartups = useMemo(() => {
    if (!leadRecord || connections.length === 0 || startups.length === 0) return [];
    
    // Find accepted connection requests for this lead
    const acceptedConns = connections.filter(
      (c) => c.leadId === leadRecord.id && c.status === "Accepted"
    );

    // Map accepted connections to the corresponding startups
    return acceptedConns.map((c) => {
      const startup = startups.find((s) => s.userId === c.userId);
      return {
        id: startup?.id || c.userId,
        userId: c.userId, // Founder userId
        name: startup?.name || c.user?.name || "Unnamed Startup",
        stage: startup?.stage || "Unknown Stage",
        focus: startup?.focus || "General Tech",
        currentGoal: startup?.currentGoal || "No current strategic goal listed.",
      };
    });
  }, [leadRecord, connections, startups]);

  const selectedStartup = useMemo(() => {
    if (mentoredStartups.length === 0) return null;
    return mentoredStartups.find((s) => s.id === selectedStartupId) || mentoredStartups[0];
  }, [selectedStartupId, mentoredStartups]);

  // Set default active startup ID
  useEffect(() => {
    if (mentoredStartups.length > 0 && selectedStartupId === null) {
      setSelectedStartupId(mentoredStartups[0].id);
    }
  }, [mentoredStartups, selectedStartupId]);

  // Poll chats every 3 seconds for active startup
  useEffect(() => {
    if (user && leadRecord && selectedStartup) {
      fetchChats(selectedStartup.userId, leadRecord.id);
      const interval = setInterval(() => {
        fetchChats(selectedStartup.userId, leadRecord.id);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedStartup, leadRecord, user]);

  async function fetchChats(founderId: number, leadId: number) {
    try {
      const res = await fetch(`/api/chats?userId=${founderId}&leadId=${leadId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error("Error fetching chats:", err);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || !user || !leadRecord || !selectedStartup) return;

    const messageText = chatInput;
    setChatInput("");
    setSendingMessage(true);

    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedStartup.userId,
          leadId: leadRecord.id,
          sender: "Lead",
          content: messageText,
        }),
      });

      if (res.ok) {
        await fetchChats(selectedStartup.userId, leadRecord.id);
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSendingMessage(false);
    }
  }

  if (!user) {
    return <LoginGate onLogin={onLogin} />;
  }

  if (user.role !== "Mentor") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center text-red-500">
        <h2 className="text-2xl font-bold">Access Restricted</h2>
        <p className="mt-2 text-sm text-[#9CA3AF]">You do not have permission to view the Mentor dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center text-sm text-[#9CA3AF] py-12">
        Loading mentor workspace...
      </div>
    );
  }

  if (!leadRecord && !loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <Card className="rounded-[28px] border border-[#1F2937] bg-[#111111] p-8 shadow-xl">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white">Mentor Profile Not Found</h2>
          <p className="mt-4 text-sm text-[#9CA3AF] max-w-lg mx-auto leading-relaxed">
            Your login email <span className="text-white font-semibold">{user.email}</span> does not match any approved Lead record in the database. 
          </p>
          <p className="mt-2 text-sm text-[#9CA3AF] max-w-lg mx-auto leading-relaxed">
            To view mentored startups, a student must submit your profile as a lead, and it must be verified by a Startup Cell volunteer.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Button
              onClick={fetchMentorData}
              className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Check Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-3 text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-[#3B82F6]/80">Mentor Dashboard</p>
        <h1 className="text-4xl font-semibold sm:text-5xl">Your Mentored Startups</h1>
        <p className="max-w-2xl text-base leading-7 text-[#D1D5DB]">
          View startups you mentor, track progress, and message founders directly.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[24px] border border-[#1F2937] bg-[#111111] p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.28em] text-[#9CA3AF]">Connected startups</p>
          <p className="mt-4 text-3xl font-semibold text-[#3B82F6]">{mentoredStartups.length}</p>
        </Card>
        <Card className="rounded-[24px] border border-[#1F2937] bg-[#111111] p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.28em] text-[#9CA3AF]">Active chats</p>
          <p className="mt-4 text-3xl font-semibold text-[#22C55E]">{mentoredStartups.length}</p>
        </Card>
        <Card className="rounded-[24px] border border-[#1F2937] bg-[#111111] p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.28em] text-[#9CA3AF]">Platform Approved Leads</p>
          <p className="mt-4 text-3xl font-semibold text-[#F59E0B]">{leads.filter((lead) => lead.verified).length}</p>
        </Card>
      </div>

      {mentoredStartups.length === 0 ? (
        <Card className="rounded-[28px] border border-[#1F2937] bg-[#111111] p-12 text-center text-[#9CA3AF]">
          <MessageSquare className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="text-lg font-semibold text-white">No active startup connections found</p>
          <p className="text-sm mt-1">Once a founder requests introduction and connects, their startup will appear here.</p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-3">
            {mentoredStartups.map((startup) => (
              <Card 
                key={startup.id} 
                onClick={() => setSelectedStartupId(startup.id)}
                className={`cursor-pointer rounded-[24px] border p-6 shadow-sm transition duration-200 ${
                  selectedStartup?.id === startup.id 
                    ? "border-[#3B82F6] bg-[#3B82F6]/5" 
                    : "border-[#1F2937] bg-[#111111] hover:border-gray-800"
                }`}
              >
                <div className="space-y-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-[#9CA3AF]">{startup.stage} Stage</p>
                    <h2 className="mt-3 text-2xl font-semibold text-white">{startup.name}</h2>
                    <p className="mt-2 text-sm text-[#D1D5DB]">Industry: {startup.focus}</p>
                  </div>
                  <div className="space-y-2 rounded-2xl bg-[#0A0A0A] p-4 text-xs text-[#9CA3AF] border border-[#1F2937]/50">
                    <p className="font-semibold text-white">Current goal:</p>
                    <p className="mt-1 leading-relaxed">{startup.currentGoal}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {selectedStartup && (
            <Card className="rounded-[28px] border border-[#1F2937] bg-[#111111] p-6 shadow-xl">
              <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                <div className="space-y-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-4 border-b border-[#1F2937] pb-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-[#3B82F6]/80">Chat window</p>
                      <h2 className="text-2xl font-semibold text-white">{selectedStartup.name} Conversation</h2>
                    </div>
                    <span className="rounded-full bg-[#0A0A0A] border border-[#1F2937] px-4 py-2 text-sm text-[#9CA3AF]">
                      {selectedStartup.stage} Stage
                    </span>
                  </div>

                  {/* Chats */}
                  <div className="space-y-4 overflow-y-auto rounded-[24px] border border-[#27272A] bg-[#0A0A0A] p-5 text-sm text-[#D1D5DB] max-h-[350px] min-h-[250px]">
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-[#9CA3AF] py-12">
                        <MessageSquare className="h-10 w-10 text-gray-700 mb-2" />
                        <p className="text-sm font-semibold text-white">No messages yet</p>
                        <p className="text-xs mt-1">Send a message to start conversing with the founder!</p>
                      </div>
                    ) : (
                      messages.map((message) => {
                        const isLead = message.sender === "Lead";
                        return (
                          <div key={message.id} className={isLead ? "text-right" : "text-left"}>
                            <div className={`inline-block rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                              isLead 
                                ? "bg-[#3B82F6] text-white rounded-br-none" 
                                : "bg-[#111111] text-white border border-[#1F2937] rounded-bl-none"
                            }`}>
                              <p className="font-semibold text-white">{isLead ? "You (Mentor)" : "Founder"}</p>
                              <p className="mt-1 leading-relaxed">{message.content}</p>
                              <span className={`block text-[9px] mt-1.5 ${isLead ? "text-[#E0F2FE]/70" : "text-[#9CA3AF]"}`}>
                                {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Send Chat */}
                  <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-[#1F2937] pt-4">
                    <Input
                      placeholder={`Type a message to ${selectedStartup.name} founder...`}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="flex-1 bg-[#0A0A0A] border-[#1F2937] focus:border-[#3B82F6] text-white rounded-xl h-11"
                    />
                    <Button
                      type="submit"
                      disabled={sendingMessage || !chatInput.trim()}
                      className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl px-4 h-11"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>

                <div className="rounded-[24px] border border-[#27272A] bg-[#0A0A0A] p-6 space-y-6">
                  <p className="text-sm uppercase tracking-[0.3em] text-[#9CA3AF] border-b border-[#1F2937] pb-3">Startup details</p>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs uppercase text-[#9CA3AF]">Startup Name</p>
                      <p className="mt-1 text-lg font-bold text-white">{selectedStartup.name}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-[#9CA3AF]">Sector / Focus</p>
                      <p className="mt-1 text-white">{selectedStartup.focus}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-[#9CA3AF]">Development Stage</p>
                      <p className="mt-1 text-white">{selectedStartup.stage}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-[#9CA3AF]">Active Mentorship Goals</p>
                      <p className="mt-1 text-white leading-relaxed text-sm">{selectedStartup.currentGoal}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Network table of leads */}
      <div className="space-y-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-[#3B82F6]/80">All platform leads</p>
          <h2 className="text-2xl font-semibold text-white">Professional Leads Directory</h2>
        </div>
        <div className="overflow-x-auto rounded-[24px] border border-[#27272A] bg-[#0A0A0A] p-4">
          <Table>
            <TableHeader>
              <TableRow className="text-[#9CA3AF]">
                <TableHead>Mentor Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-white font-semibold">{l.name}</TableCell>
                  <TableCell>{l.email}</TableCell>
                  <TableCell>{l.organization}</TableCell>
                  <TableCell>{l.domain}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      l.verified ? "bg-[#22C55E]/15 text-[#22C55E]" : "bg-[#F59E0B]/15 text-[#F59E0B]"
                    }`}>
                      {l.verified ? "Verified" : "Pending"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
