import React, { useState, useEffect, useMemo } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { LoginGate } from "../components/LoginGate";
import { 
  Building, 
  Search, 
  MessageSquare, 
  Send, 
  CheckCircle, 
  Clock, 
  UserPlus, 
  AlertCircle, 
  RefreshCw, 
  Users, 
  ArrowRight,
  UserCheck
} from "lucide-react";
import { UserRole } from "../data/network";

interface FounderPageProps {
  user: { id: number; fullName: string; email: string; role: UserRole } | null;
  onLogin: () => void;
}

interface StartupProfile {
  id: number;
  name: string;
  stage: string;
  focus: string;
  currentGoal: string;
}

interface Lead {
  id: number;
  name: string;
  email: string;
  domain: string;
  organization: string;
  skills: string;
  verified: boolean;
}

interface ConnectionRequest {
  id: number;
  userId: number;
  leadId: number;
  status: string;
  lead: Lead;
}

interface ChatMessage {
  id: number;
  userId: number;
  leadId: number;
  sender: string;
  content: string;
  createdAt: string;
}

export function FounderPage({ user, onLogin }: FounderPageProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "browse" | "chats">("profile");
  
  // Profile State
  const [startup, setStartup] = useState<StartupProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [startupName, setStartupName] = useState("");
  const [startupStage, setStartupStage] = useState("Ideation");
  const [startupFocus, setStartupFocus] = useState("");
  const [startupGoal, setStartupGoal] = useState("");
  const [profileMsg, setProfileMsg] = useState("");

  // Browse Leads State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [filterDomain, setFilterDomain] = useState("");
  const [filterOrg, setFilterOrg] = useState("");
  const [filterSkills, setFilterSkills] = useState("");

  // Connections State
  const [connections, setConnections] = useState<ConnectionRequest[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);

  // Chat State
  const [activeLeadId, setActiveLeadId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // Auto-refresh chat timer
  useEffect(() => {
    if (activeTab === "chats" && activeLeadId && user) {
      fetchChats(user.id, activeLeadId);
      const interval = setInterval(() => {
        fetchChats(user.id, activeLeadId);
      }, 3000); // Poll chats every 3 seconds for simulated real-time feeling
      return () => clearInterval(interval);
    }
  }, [activeTab, activeLeadId, user]);

  useEffect(() => {
    if (user) {
      fetchStartupProfile(user.id);
      fetchConnections(user.id);
      fetchLeads();
    }
  }, [user]);

  if (!user) {
    return <LoginGate onLogin={onLogin} />;
  }

  // --- API CALLS ---

  async function fetchStartupProfile(userId: number) {
    try {
      setLoadingProfile(true);
      const res = await fetch(`http://localhost:3000/api/startup?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setStartup(data);
        if (data) {
          setStartupName(data.name);
          setStartupStage(data.stage);
          setStartupFocus(data.focus);
          setStartupGoal(data.currentGoal);
        }
      }
    } catch (err) {
      console.error("Error fetching startup profile:", err);
    } finally {
      setLoadingProfile(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!startupName || !startupFocus || !startupGoal) {
      setProfileMsg("Please fill out all fields.");
      return;
    }

    setSavingProfile(true);
    setProfileMsg("");
    try {
      const res = await fetch("http://localhost:3000/api/startup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          name: startupName,
          stage: startupStage,
          focus: startupFocus,
          currentGoal: startupGoal,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setStartup(data);
        setProfileMsg("Startup profile saved successfully!");
        setTimeout(() => setProfileMsg(""), 4000);
      } else {
        const errData = await res.json();
        setProfileMsg(`Error: ${errData.error || "Failed to save"}`);
      }
    } catch (err) {
      setProfileMsg("Network error. Failed to save startup profile.");
      console.error(err);
    } finally {
      setSavingProfile(false);
    }
  }

  async function fetchLeads() {
    setLoadingLeads(true);
    try {
      const queryParams = new URLSearchParams();
      if (filterDomain) queryParams.append("domain", filterDomain);
      if (filterOrg) queryParams.append("organization", filterOrg);
      if (filterSkills) queryParams.append("skills", filterSkills);

      const res = await fetch(`http://localhost:3000/api/approved-leads?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (err) {
      console.error("Error fetching leads:", err);
    } finally {
      setLoadingLeads(false);
    }
  }

  async function fetchConnections(userId: number) {
    setLoadingConnections(true);
    try {
      const res = await fetch(`http://localhost:3000/api/connections?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setConnections(data);
      }
    } catch (err) {
      console.error("Error fetching connections:", err);
    } finally {
      setLoadingConnections(false);
    }
  }

  async function handleSendRequest(leadId: number) {
    if (!user) return;
    try {
      const res = await fetch("http://localhost:3000/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          leadId,
        }),
      });

      if (res.ok) {
        // Refresh connection requests
        await fetchConnections(user.id);
      }
    } catch (err) {
      console.error("Error sending connection request:", err);
    }
  }

  async function handleMockAcceptRequest(connectionId: number) {
    if (!user) return;
    try {
      const res = await fetch(`http://localhost:3000/api/connections/${connectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Accepted",
        }),
      });

      if (res.ok) {
        await fetchConnections(user.id);
      }
    } catch (err) {
      console.error("Error accepting connection request:", err);
    }
  }

  async function fetchChats(userId: number, leadId: number) {
    try {
      const res = await fetch(`http://localhost:3000/api/chats?userId=${userId}&leadId=${leadId}`);
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
    if (!chatInput.trim() || !user || !activeLeadId) return;

    const messageText = chatInput;
    setChatInput("");
    setSendingMessage(true);

    try {
      const res = await fetch("http://localhost:3000/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          leadId: activeLeadId,
          sender: "Founder",
          content: messageText,
        }),
      });

      if (res.ok) {
        await fetchChats(user.id, activeLeadId);
        // Set a timeout to refresh the chats in 1.8s to capture the mock response
        setTimeout(() => {
          if (user && activeLeadId) {
            fetchChats(user.id, activeLeadId);
          }
        }, 1800);
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSendingMessage(false);
    }
  }

  // Helpers
  const getConnectionStatus = (leadId: number) => {
    const conn = connections.find(c => c.leadId === leadId);
    return conn ? { status: conn.status, id: conn.id } : null;
  };

  const activeConnectionLead = useMemo(() => {
    if (!activeLeadId) return null;
    const conn = connections.find(c => c.leadId === activeLeadId);
    return conn ? conn.lead : null;
  }, [activeLeadId, connections]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Title Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-[#1F2937] pb-6">
        <div className="space-y-2 text-white">
          <p className="text-sm uppercase tracking-[0.3em] text-[#3B82F6]/80">Founder Hub</p>
          <h1 className="text-4xl font-semibold sm:text-5xl">Founder Dashboard</h1>
          <p className="max-w-2xl text-base leading-7 text-[#9CA3AF]">
            Welcome, <span className="text-white font-semibold">{user.fullName}</span>. Manage your startup profile, discover approved leads, and connect in real-time.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-[#1F2937] bg-[#111111] text-white hover:bg-[#1C1C1C]"
            onClick={() => {
              fetchStartupProfile(user.id);
              fetchConnections(user.id);
              fetchLeads();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4 text-[#3B82F6]" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex flex-wrap gap-2 border-b border-[#1F2937]/50 pb-2">
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === "profile"
              ? "bg-[#3B82F6] text-white shadow-md"
              : "text-[#9CA3AF] hover:bg-[#111111] hover:text-white"
          }`}
        >
          <Building className="h-4 w-4" />
          My Startup Profile
        </button>
        <button
          onClick={() => setActiveTab("browse")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === "browse"
              ? "bg-[#3B82F6] text-white shadow-md"
              : "text-[#9CA3AF] hover:bg-[#111111] hover:text-white"
          }`}
        >
          <Search className="h-4 w-4" />
          Browse Approved Leads
        </button>
        <button
          onClick={() => setActiveTab("chats")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === "chats"
              ? "bg-[#3B82F6] text-white shadow-md"
              : "text-[#9CA3AF] hover:bg-[#111111] hover:text-white"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Chats & Connections
          {connections.filter(c => c.status === "Pending").length > 0 && (
            <span className="ml-1 rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-500">
              {connections.filter(c => c.status === "Pending").length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: Startup Profile */}
      {activeTab === "profile" && (
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Card className="rounded-[24px] border border-[#1F2937] bg-[#111111] p-6 shadow-xl">
              <CardHeader className="p-0 pb-6">
                <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                  <Building className="h-5 w-5 text-[#3B82F6]" />
                  Startup Profile Information
                </CardTitle>
                <CardDescription className="text-[#9CA3AF]">
                  Create and manage your startup profile. Other network members can view this when you connect.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <form onSubmit={handleSaveProfile} className="space-y-5">
                  {profileMsg && (
                    <div className={`rounded-xl p-4 text-sm ${
                      profileMsg.includes("successfully") 
                        ? "border border-green-900/50 bg-green-950/30 text-green-400" 
                        : "border border-red-900/50 bg-red-950/30 text-red-400"
                    }`}>
                      {profileMsg}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="startupName" className="text-sm font-semibold text-white">Startup Name</Label>
                    <Input
                      id="startupName"
                      placeholder="e.g. Acme Tech Labs"
                      value={startupName}
                      onChange={(e) => setStartupName(e.target.value)}
                      className="border-[#1F2937] bg-[#0A0A0A] text-white focus:border-[#3B82F6] rounded-xl h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startupStage" className="text-sm font-semibold text-white">Development Stage</Label>
                    <select
                      id="startupStage"
                      value={startupStage}
                      onChange={(e) => setStartupStage(e.target.value)}
                      className="w-full rounded-xl border border-[#1F2937] bg-[#0A0A0A] px-4 py-3 text-sm text-white outline-none focus:border-[#3B82F6]"
                    >
                      <option value="Ideation">Ideation</option>
                      <option value="MVP">MVP / Prototype</option>
                      <option value="Early">Early Traction</option>
                      <option value="Growth">Growth Scale</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startupFocus" className="text-sm font-semibold text-white">Industry Focus / Sector</Label>
                    <Input
                      id="startupFocus"
                      placeholder="e.g. EdTech, HealthTech, AI, SaaS"
                      value={startupFocus}
                      onChange={(e) => setStartupFocus(e.target.value)}
                      className="border-[#1F2937] bg-[#0A0A0A] text-white focus:border-[#3B82F6] rounded-xl h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startupGoal" className="text-sm font-semibold text-white">Current Strategic Goal</Label>
                    <Textarea
                      id="startupGoal"
                      placeholder="What is your startup trying to achieve right now? e.g. We are looking for pilot clinics to test our health metrics dashboard."
                      value={startupGoal}
                      onChange={(e) => setStartupGoal(e.target.value)}
                      className="border-[#1F2937] bg-[#0A0A0A] text-white focus:border-[#3B82F6] rounded-xl min-h-[100px] resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={savingProfile}
                    className="w-full h-11 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold rounded-xl transition"
                  >
                    {savingProfile ? "Saving Profile..." : "Save Startup Profile"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Current Profile Preview Card */}
          <div className="lg:col-span-5">
            <Card className="rounded-[24px] border border-[#1F2937] bg-[#111111]/60 p-6 shadow-sm backdrop-blur-sm">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <Building className="h-5 w-5 text-green-500" />
                  Live Startup Preview
                </CardTitle>
                <CardDescription className="text-sm text-[#9CA3AF]">
                  How your startup appears to prospective leads:
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                {loadingProfile ? (
                  <div className="py-6 text-center text-sm text-[#9CA3AF]">Loading profile preview...</div>
                ) : startup ? (
                  <div className="rounded-xl border border-[#27272A] bg-[#0A0A0A] p-5 space-y-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-[#3B82F6]">{startup.stage} Stage</p>
                      <h3 className="text-2xl font-bold text-white mt-1">{startup.name}</h3>
                    </div>
                    
                    <div className="border-t border-[#1F2937] pt-3">
                      <span className="text-xs uppercase text-[#9CA3AF] block">Industry Focus</span>
                      <span className="inline-block rounded-full bg-[#1e293b] px-3 py-1 text-sm text-[#3B82F6] font-medium mt-1">
                        {startup.focus}
                      </span>
                    </div>

                    <div className="border-t border-[#1F2937] pt-3">
                      <span className="text-xs uppercase text-[#9CA3AF] block">Strategic Goal</span>
                      <p className="text-sm text-white mt-1 leading-relaxed">{startup.currentGoal}</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-[#27272A] bg-[#0A0A0A]/40 p-8 text-center text-sm text-[#9CA3AF]">
                    <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                    <p className="font-semibold text-white">No startup profile created yet</p>
                    <p className="mt-1">Fill out the form on the left to set up your profile.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: Browse Approved Leads */}
      {activeTab === "browse" && (
        <div className="space-y-6">
          {/* Search Filters Card */}
          <Card className="rounded-[24px] border border-[#1F2937] bg-[#111111] p-6 shadow-xl">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="filterDomain" className="text-xs uppercase tracking-wider font-semibold text-[#9CA3AF]">Filter by Industry/Domain</Label>
                <select
                  id="filterDomain"
                  value={filterDomain}
                  onChange={(e) => { setFilterDomain(e.target.value); }}
                  className="w-full rounded-xl border border-[#1F2937] bg-[#0A0A0A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#3B82F6]"
                >
                  <option value="">All Industries</option>
                  <option value="EdTech">EdTech</option>
                  <option value="HealthTech">HealthTech</option>
                  <option value="FinTech">FinTech</option>
                  <option value="AgriTech">AgriTech</option>
                  <option value="AI">Artificial Intelligence</option>
                  <option value="Logistics">Logistics</option>
                  <option value="Events">Events</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filterOrg" className="text-xs uppercase tracking-wider font-semibold text-[#9CA3AF]">Filter by Organization</Label>
                <Input
                  id="filterOrg"
                  placeholder="e.g. Google, Apollo"
                  value={filterOrg}
                  onChange={(e) => setFilterOrg(e.target.value)}
                  className="border-[#1F2937] bg-[#0A0A0A] text-white focus:border-[#3B82F6] rounded-xl h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="filterSkills" className="text-xs uppercase tracking-wider font-semibold text-[#9CA3AF]">Filter by Skills / Help Offered</Label>
                <Input
                  id="filterSkills"
                  placeholder="e.g. Advisory, Pilot, Feedback"
                  value={filterSkills}
                  onChange={(e) => setFilterSkills(e.target.value)}
                  className="border-[#1F2937] bg-[#0A0A0A] text-white focus:border-[#3B82F6] rounded-xl h-10"
                />
              </div>
            </div>
            
            <div className="flex justify-end mt-4 gap-3">
              <button
                type="button"
                onClick={() => {
                  setFilterDomain("");
                  setFilterOrg("");
                  setFilterSkills("");
                }}
                className="text-xs text-[#9CA3AF] underline-offset-4 hover:underline transition hover:text-white"
              >
                Clear filters
              </button>
              <Button
                onClick={fetchLeads}
                className="bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs px-4 py-2 rounded-lg"
              >
                Apply Filters
              </Button>
            </div>
          </Card>

          {/* Leads list */}
          {loadingLeads ? (
            <div className="py-12 text-center text-sm text-[#9CA3AF]">Fetching leads from encrypted database...</div>
          ) : leads.length === 0 ? (
            <div className="rounded-[24px] border border-[#1F2937] bg-[#111111] p-12 text-center text-[#9CA3AF]">
              <AlertCircle className="h-8 w-8 text-gray-500 mx-auto mb-2" />
              <p className="text-lg font-semibold text-white">No approved leads found matching criteria</p>
              <p className="mt-1">Try broadening your search or clear your filters.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {leads.map((lead) => {
                const conn = getConnectionStatus(lead.id);
                return (
                  <Card key={lead.id} className="rounded-[24px] border border-[#1F2937] bg-[#111111] p-5 shadow-sm space-y-4 hover:border-gray-800 transition duration-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#3B82F6]">{lead.domain}</span>
                        <h3 className="text-xl font-bold text-white mt-0.5">{lead.name}</h3>
                        <p className="text-xs text-[#9CA3AF] mt-0.5">{lead.organization}</p>
                      </div>
                      <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-400">
                        Approved
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-[#9CA3AF]">Skills / Help Areas:</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {lead.skills.split(",").map((skill) => (
                          <span key={skill.trim()} className="rounded-md bg-[#0A0A0A] px-2 py-1 text-xs text-[#3B82F6] border border-[#1F2937]">
                            {skill.trim()}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-[#1F2937] pt-4 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-[#9CA3AF]">Contact: {lead.email}</span>
                      
                      {/* Connection request actions */}
                      {!conn ? (
                        <Button
                          size="sm"
                          onClick={() => handleSendRequest(lead.id)}
                          className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg text-xs"
                        >
                          <UserPlus className="mr-1 h-3.5 w-3.5" />
                          Connect
                        </Button>
                      ) : conn.status === "Pending" ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2.5 py-1 text-xs text-yellow-400">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                          <button
                            onClick={() => handleMockAcceptRequest(conn.id)}
                            title="Mock lead accepting this connection request"
                            className="bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] px-2 py-1 font-semibold transition"
                          >
                            Mock Accept
                          </button>
                        </div>
                      ) : conn.status === "Accepted" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-1 text-xs text-green-400">
                          <UserCheck className="h-3 w-3" />
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-xs text-red-400">
                          Declined
                        </span>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Connections & Real-time Chats */}
      {activeTab === "chats" && (
        <Card className="rounded-[28px] border border-[#1F2937] bg-[#111111] p-0 overflow-hidden shadow-2xl">
          <div className="grid md:grid-cols-12 min-h-[500px]">
            {/* Connections Pane */}
            <div className="md:col-span-4 border-r border-[#1F2937] p-5 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-[#3B82F6]" />
                Your Connections
              </h3>
              
              <div className="space-y-2 overflow-y-auto max-h-[420px]">
                {loadingConnections ? (
                  <div className="py-6 text-center text-xs text-[#9CA3AF]">Loading connections...</div>
                ) : connections.filter(c => c.status === "Accepted").length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#9CA3AF] border border-dashed border-[#1F2937] rounded-xl p-4">
                    <p className="font-semibold text-white">No active connections</p>
                    <p className="mt-1">Go to "Browse Approved Leads" to send a connection request. Once accepted (or mock-accepted), you can chat here.</p>
                  </div>
                ) : (
                  connections.filter(c => c.status === "Accepted").map((conn) => (
                    <div
                      key={conn.id}
                      onClick={() => {
                        setActiveLeadId(conn.leadId);
                        fetchChats(user.id, conn.leadId);
                      }}
                      className={`group flex items-center justify-between cursor-pointer rounded-xl p-3 border transition ${
                        activeLeadId === conn.leadId
                          ? "bg-[#3B82F6]/10 border-[#3B82F6]"
                          : "border-[#1F2937] bg-[#0A0A0A]/50 hover:bg-[#0A0A0A] hover:border-gray-800"
                      }`}
                    >
                      <div>
                        <h4 className="text-sm font-semibold text-white group-hover:text-[#3B82F6] transition">{conn.lead.name}</h4>
                        <p className="text-[11px] text-[#9CA3AF] mt-0.5">{conn.lead.organization}</p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-gray-600 group-hover:text-[#3B82F6] group-hover:translate-x-1 transition" />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Chat Pane */}
            <div className="md:col-span-8 flex flex-col justify-between bg-[#0A0A0A]/35">
              {activeLeadId && activeConnectionLead ? (
                <>
                  {/* Chat Header */}
                  <div className="border-b border-[#1F2937] p-4 flex items-center justify-between bg-[#111111]/80">
                    <div>
                      <h4 className="font-bold text-white">{activeConnectionLead.name}</h4>
                      <p className="text-[11px] text-[#9CA3AF]">{activeConnectionLead.role} • {activeConnectionLead.organization}</p>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-[#3B82F6] bg-[#3B82F6]/10 px-2 py-0.5 rounded-full">
                      {activeConnectionLead.domain}
                    </span>
                  </div>

                  {/* Message History */}
                  <div className="flex-1 p-5 overflow-y-auto max-h-[380px] min-h-[300px] space-y-4">
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-[#9CA3AF] py-12">
                        <MessageSquare className="h-10 w-10 text-gray-700 mb-2" />
                        <p className="text-sm font-semibold text-white">No messages yet</p>
                        <p className="text-xs mt-1">Send a message to introduce yourself and your startup!</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isFounder = msg.sender === "Founder";
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isFounder ? "justify-end" : "justify-start"}`}
                          >
                            <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                              isFounder 
                                ? "bg-[#3B82F6] text-white rounded-br-none" 
                                : "bg-[#111111] text-white border border-[#1F2937] rounded-bl-none"
                            }`}>
                              <p className="leading-relaxed">{msg.content}</p>
                              <span className={`block text-[9px] mt-1.5 text-right ${isFounder ? "text-[#E0F2FE]/70" : "text-[#9CA3AF]"}`}>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Send Input Area */}
                  <form onSubmit={handleSendMessage} className="border-t border-[#1F2937] p-4 bg-[#111111]/80 flex gap-2">
                    <Input
                      placeholder={`Type a message to ${activeConnectionLead.name}...`}
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
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-[#9CA3AF]">
                  <MessageSquare className="h-12 w-12 text-gray-700 mb-2 animate-pulse" />
                  <p className="text-lg font-semibold text-white">Select a connection to start chatting</p>
                  <p className="text-sm mt-1 max-w-sm text-center">Your conversations are stored securely using SQLCipher db-level encryption.</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
