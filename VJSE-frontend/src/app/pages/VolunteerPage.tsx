import React, { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { 
  CheckCircle, 
  XCircle, 
  Mail, 
  Clock, 
  AlertCircle, 
  Send, 
  RefreshCw, 
  ShieldCheck, 
  UserMinus,
  MessageSquare
} from "lucide-react";
import { UserRole } from "../data/network";
import { LoginGate } from "../components/LoginGate";

interface VolunteerPageProps {
  user: { id: number; fullName: string; email: string; role: UserRole } | null;
  onLogin: () => void;
}

interface Lead {
  id: number;
  name: string;
  email: string;
  domain: string;
  organization: string;
  skills: string;
  verified: boolean;
  status: string; // "Pending" | "Approved" | "Rejected"
  rejectionReason: string;
  invited: boolean;
  createdAt: string;
}

export function VolunteerPage({ user, onLogin }: VolunteerPageProps) {
  if (!user) {
    return <LoginGate onLogin={onLogin} />;
  }

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"Pending" | "Approved" | "Rejected">("Pending");
  
  // Rejection Dialog State
  const [rejectingLeadId, setRejectingLeadId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    setLoading(true);
    setActionError("");
    try {
      const res = await fetch("/api/leads");
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      } else {
        setActionError("Failed to retrieve leads from API.");
      }
    } catch (err) {
      console.error(err);
      setActionError("Failed to connect to the backend server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(leadId: number) {
    try {
      const res = await fetch(`/api/leads/${leadId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        // Refresh local leads list
        await fetchLeads();
      } else {
        setActionError("Failed to approve the lead.");
      }
    } catch (err) {
      console.error(err);
      setActionError("Failed to connect to server for approval.");
    }
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectingLeadId || !rejectionReason.trim()) return;

    try {
      const res = await fetch(`/api/leads/${rejectingLeadId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectionReason })
      });
      if (res.ok) {
        setRejectingLeadId(null);
        setRejectionReason("");
        await fetchLeads();
      } else {
        setActionError("Failed to submit rejection.");
      }
    } catch (err) {
      console.error(err);
      setActionError("Failed to connect to server for rejection.");
    }
  }

  async function handleInvite(leadId: number) {
    try {
      const res = await fetch(`/api/leads/${leadId}/invite`, {
        method: "POST"
      });
      if (res.ok) {
        await fetchLeads();
      } else {
        setActionError("Failed to dispatch invitation.");
      }
    } catch (err) {
      console.error(err);
      setActionError("Failed to connect to server for invitation.");
    }
  }

  // Filter leads based on selected tab
  const filteredLeads = leads.filter(l => {
    // If the database has leads created before the status field addition, default them to Pending
    const status = l.status || "Pending";
    return status === activeTab;
  });

  const stats = {
    pending: leads.filter(l => (l.status || "Pending") === "Pending").length,
    approved: leads.filter(l => l.status === "Approved").length,
    rejected: leads.filter(l => l.status === "Rejected").length,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Title Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-[#1F2937] pb-6">
        <div className="space-y-2 text-white">
          <p className="text-sm uppercase tracking-[0.3em] text-[#3B82F6]/80">Volunteer Workspace</p>
          <h1 className="text-4xl font-semibold sm:text-5xl">Volunteer Review Panel</h1>
          <p className="max-w-2xl text-base leading-7 text-[#9CA3AF]">
            Review startup lead submissions from students. Verify credibility, reject submissions with written reasons, and invite approved mentors.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-[#1F2937] bg-[#111111] text-white hover:bg-[#1C1C1C]"
            onClick={fetchLeads}
          >
            <RefreshCw className="mr-2 h-4 w-4 text-[#3B82F6]" />
            Refresh Leads
          </Button>
        </div>
      </div>

      {actionError && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-400 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div 
          onClick={() => setActiveTab("Pending")}
          className={`cursor-pointer rounded-[24px] border p-6 text-white shadow-sm transition duration-200 ${
            activeTab === "Pending" ? "border-yellow-500/50 bg-yellow-950/10" : "border-[#1F2937] bg-[#111111] hover:border-gray-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.28em] text-[#9CA3AF] font-bold">Pending Review</p>
            <Clock className="h-5 w-5 text-yellow-500" />
          </div>
          <p className="mt-4 text-4xl font-bold text-yellow-500">{stats.pending}</p>
        </div>

        <div 
          onClick={() => setActiveTab("Approved")}
          className={`cursor-pointer rounded-[24px] border p-6 text-white shadow-sm transition duration-200 ${
            activeTab === "Approved" ? "border-green-500/50 bg-green-950/10" : "border-[#1F2937] bg-[#111111] hover:border-gray-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.28em] text-[#9CA3AF] font-bold">Approved Leads</p>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <p className="mt-4 text-4xl font-bold text-green-500">{stats.approved}</p>
        </div>

        <div 
          onClick={() => setActiveTab("Rejected")}
          className={`cursor-pointer rounded-[24px] border p-6 text-white shadow-sm transition duration-200 ${
            activeTab === "Rejected" ? "border-red-500/50 bg-red-950/10" : "border-[#1F2937] bg-[#111111] hover:border-gray-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.28em] text-[#9CA3AF] font-bold">Rejected Leads</p>
            <XCircle className="h-5 w-5 text-red-500" />
          </div>
          <p className="mt-4 text-4xl font-bold text-red-500">{stats.rejected}</p>
        </div>
      </div>

      {/* Tabs list view */}
      {loading ? (
        <div className="py-12 text-center text-sm text-[#9CA3AF]">Loading leads database...</div>
      ) : filteredLeads.length === 0 ? (
        <Card className="rounded-[28px] border border-[#1F2937] bg-[#111111] p-12 text-center text-[#9CA3AF]">
          <ShieldCheck className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="text-lg font-semibold text-white">No leads in "{activeTab}" status</p>
          <p className="text-sm mt-1">Everything looks caught up in this tab!</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredLeads.map((lead) => (
            <Card key={lead.id} className="rounded-[24px] border border-[#1F2937] bg-[#111111] p-6 shadow-xl space-y-4 hover:border-gray-800 transition duration-200">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase font-bold text-[#3B82F6] bg-[#3B82F6]/10 px-2.5 py-0.5 rounded-full">
                      {lead.domain}
                    </span>
                    {lead.invited && (
                      <span className="text-[10px] uppercase font-bold text-green-400 bg-green-500/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        Invited
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-white">{lead.name}</h3>
                  <p className="text-sm text-[#9CA3AF]">
                    Organization: <span className="text-white font-medium">{lead.organization}</span> • Contact: <span className="text-white font-medium">{lead.email}</span>
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  {/* Actions depending on Status */}
                  {(lead.status || "Pending") === "Pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(lead.id)}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 h-9 font-semibold text-xs"
                      >
                        <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                        Approve Lead
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRejectingLeadId(lead.id)}
                        className="border-red-600 text-red-500 hover:bg-red-950/20 rounded-lg px-4 h-9 font-semibold text-xs"
                      >
                        <XCircle className="mr-1.5 h-3.5 w-3.5" />
                        Reject Lead
                      </Button>
                    </>
                  )}

                  {lead.status === "Approved" && !lead.invited && (
                    <Button
                      size="sm"
                      onClick={() => handleInvite(lead.id)}
                      className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg px-4 h-9 font-semibold text-xs"
                    >
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      Send Join Invite
                    </Button>
                  )}

                  {lead.status === "Approved" && lead.invited && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-3 py-1.5 text-xs text-green-400 font-semibold">
                      <Mail className="h-3.5 w-3.5" />
                      Invitation Sent
                    </span>
                  )}
                </div>
              </div>

              {/* Skills Area */}
              {lead.skills && (
                <div className="border-t border-[#1F2937] pt-4 space-y-1.5">
                  <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Expertise / Skills Provided:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {lead.skills.split(",").map((s) => (
                      <span key={s.trim()} className="rounded-md bg-[#0A0A0A] px-2 py-1 text-xs text-[#3B82F6] border border-[#1F2937]">
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Rejection reason details */}
              {lead.status === "Rejected" && lead.rejectionReason && (
                <div className="border-t border-red-900/40 bg-red-950/10 p-4 rounded-xl space-y-1">
                  <p className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                    <UserMinus className="h-3.5 w-3.5" />
                    Written Rejection Reason:
                  </p>
                  <p className="text-sm text-red-200 italic">"{lead.rejectionReason}"</p>
                </div>
              )}

              {/* Date submitted */}
              <div className="text-[10px] text-gray-500 text-right pt-1">
                Submitted on: {new Date(lead.createdAt).toLocaleDateString()} {new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Rejection Modal Dialog */}
      {rejectingLeadId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md rounded-[24px] border border-[#1F2937] bg-[#111111] p-6 shadow-2xl space-y-5">
            <CardHeader className="p-0 pb-1">
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                Reject Lead Submission
              </CardTitle>
              <CardDescription className="text-sm text-[#9CA3AF]">
                Provide a detailed written explanation for rejecting this lead. This will be logged on the platform.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleReject} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider font-semibold text-[#9CA3AF]">Rejection Explanation</label>
                <Textarea
                  placeholder="e.g. Lead works in a domain that is currently outside our network focus, or email credentials could not be validated."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="border-[#1F2937] bg-[#0A0A0A] text-white focus:border-red-500 rounded-xl min-h-[100px] resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRejectingLeadId(null);
                    setRejectionReason("");
                  }}
                  className="border-[#1F2937] bg-[#111111] hover:bg-[#1C1C1C] text-white rounded-lg text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold"
                >
                  Submit Rejection
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
