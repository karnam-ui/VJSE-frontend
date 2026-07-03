import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Switch } from "../components/ui/switch";
import { LoginGate } from "../components/LoginGate";
import { domainOptions } from "../data/network";

interface AdminPageProps {
  user: { id: number; fullName: string; email: string; role: string } | null;
  onLogin: () => void;
}

export function AdminPage({ user, onLogin }: AdminPageProps) {
  const [leads, setLeads] = useState<any[]>([]);
  const [introRequests, setIntroRequests] = useState<any[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [filterDomain, setFilterDomain] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && user.role === "Admin") {
      fetchAdminData();
    }
  }, [user]);

  async function fetchAdminData() {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch leads
      const leadsRes = await fetch("http://localhost:3000/api/leads");
      if (!leadsRes.ok) throw new Error("Failed to fetch leads");
      const leadsData = await leadsRes.json();
      setLeads(leadsData);

      // 2. Fetch connection requests
      const connRes = await fetch("http://localhost:3000/api/connections");
      if (!connRes.ok) throw new Error("Failed to fetch connection requests");
      const connData = await connRes.json();
      
      // Map connection requests to match the rendering logic
      const mappedRequests = connData.map((c: any) => ({
        id: c.id,
        founder: c.user?.name || `Founder (ID: ${c.userId})`,
        email: c.user?.email || "",
        leadName: c.lead?.name || `Lead (ID: ${c.leadId})`,
        leadRole: c.lead?.skills || "Mentor",
        leadOrg: c.lead?.organization || "",
        timestamp: new Date(c.createdAt).toLocaleDateString(),
        status: c.status,
        handled: c.status !== "Pending"
      }));
      setIntroRequests(mappedRequests);
    } catch (err) {
      console.error(err);
      setError("Failed to retrieve admin data from backend.");
    } finally {
      setLoading(false);
    }
  }

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const domainMatch = filterDomain ? lead.domain === filterDomain : true;
      const statusMatch =
        filterStatus === "All"
          ? true
          : filterStatus === "Verified"
            ? lead.verified
            : !lead.verified;
      return domainMatch && statusMatch;
    });
  }, [filterDomain, filterStatus, leads]);

  const activeRequests = introRequests.filter((request) => !request.handled);

  const csvData = [
    ["Name", "Email", "Organisation", "Domain", "Skills", "Status", "Invited", "Created At"],
    ...leads.map((lead) => [
      lead.name,
      lead.email,
      lead.organization,
      lead.domain,
      lead.skills,
      lead.status,
      lead.invited ? "Invited" : "No",
      new Date(lead.createdAt).toLocaleDateString(),
    ]),
  ]
    .map((row) => row.map((cell) => `"${cell || ""}"`).join(","))
    .join("\n");

  function downloadCsv() {
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vj-network-leads.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleVerifyToggle(leadId: number, currentVerified: boolean) {
    try {
      const res = await fetch(`http://localhost:3000/api/leads/${leadId}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verified: !currentVerified
        })
      });
      if (res.ok) {
        await fetchAdminData();
      } else {
        setError("Failed to toggle verification status.");
      }
    } catch (err) {
      console.error(err);
      setError("Error calling verification API.");
    }
  }

  async function confirmDelete() {
    if (!selectedLeadId) return;
    try {
      const res = await fetch(`http://localhost:3000/api/leads/${selectedLeadId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        await fetchAdminData();
      } else {
        setError("Failed to delete lead.");
      }
    } catch (err) {
      console.error(err);
      setError("Error calling delete API.");
    } finally {
      setSelectedLeadId(null);
    }
  }

  async function markHandled(connectionId: number) {
    try {
      const res = await fetch(`http://localhost:3000/api/connections/${connectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Accepted"
        })
      });
      if (res.ok) {
        await fetchAdminData();
      } else {
        setError("Failed to update connection request status.");
      }
    } catch (err) {
      console.error(err);
      setError("Error updating connection status.");
    }
  }

  if (!user) {
    return <LoginGate onLogin={onLogin} />;
  }

  if (user.role !== "Admin") {
    return (
      <div className="text-center text-red-500 py-12">
        <h2 className="text-2xl font-bold">Access Restricted</h2>
        <p className="mt-2 text-sm text-[#9CA3AF]">You do not have permission to view the Admin panel.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-3 text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-[#3B82F6]/80">Admin Control Panel</p>
        <h1 className="text-4xl font-semibold sm:text-5xl">Admin Control Panel</h1>
      </div>

      {error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center text-sm text-[#9CA3AF] py-6">
          Loading admin database...
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-[24px] border border-[#1F2937] bg-[#111111] p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.28em] text-[#9CA3AF]">Total Leads</p>
          <p className="mt-4 text-3xl font-semibold text-[#3B82F6]">{leads.length}</p>
        </Card>
        <Card className="rounded-[24px] border border-[#1F2937] bg-[#111111] p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.28em] text-[#9CA3AF]">Verified</p>
          <p className="mt-4 text-3xl font-semibold text-[#22C55E]">{leads.filter((lead) => lead.verified).length}</p>
        </Card>
        <Card className="rounded-[24px] border border-[#1F2937] bg-[#111111] p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.28em] text-[#9CA3AF]">Pending</p>
          <p className="mt-4 text-3xl font-semibold text-[#F59E0B]">{leads.filter((lead) => !lead.verified).length}</p>
        </Card>
        <Card className="rounded-[24px] border border-[#1F2937] bg-[#111111] p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.28em] text-[#9CA3AF]">Introduction Requests</p>
          <p className="mt-4 text-3xl font-semibold text-[#3B82F6]">{activeRequests.length}</p>
        </Card>
      </div>

      <Card className="rounded-[28px] border border-[#1F2937] bg-[#111111] p-6 shadow-xl">
        <Tabs defaultValue="all">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="all">All Leads</TabsTrigger>
              <TabsTrigger value="requests">Introduction Requests</TabsTrigger>
              <TabsTrigger value="access" disabled>
                Manage Access
              </TabsTrigger>
            </TabsList>
            <div className="flex flex-wrap gap-3">
              <select
                value={filterDomain}
                onChange={(event) => setFilterDomain(event.target.value)}
                className="rounded-xl border border-[#27272A] bg-[#111111] px-4 py-3 text-sm text-white outline-none focus:border-[#3B82F6]"
              >
                <option value="">Filter domain</option>
                {domainOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value)}
                className="rounded-xl border border-[#27272A] bg-[#111111] px-4 py-3 text-sm text-white outline-none focus:border-[#3B82F6]"
              >
                <option value="All">All Statuses</option>
                <option value="Verified">Verified</option>
                <option value="Unverified">Unverified</option>
              </select>
              <Button variant="outline" onClick={downloadCsv} className="border-[#3B82F6] text-[#3B82F6] hover:bg-[#1D4ED8]/10">
                ⬇ Download CSV
              </Button>
            </div>
          </div>

          <TabsContent value="all">
            <Table>
              <TableHeader>
                <TableRow className="text-[#9CA3AF]">
                  <TableHead>Lead Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Org</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-[#9CA3AF]">
                      Loading leads from database...
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-red-500">
                      {error}
                    </TableCell>
                  </TableRow>
                ) : filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-[#9CA3AF]">
                      No leads found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="text-white font-semibold">{lead.name}</TableCell>
                      <TableCell>{lead.email}</TableCell>
                      <TableCell>{lead.organization}</TableCell>
                      <TableCell>{lead.domain}</TableCell>
                      <TableCell>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          lead.verified ? "bg-[#22C55E]/15 text-[#22C55E]" : "bg-[#F59E0B]/15 text-[#F59E0B]"
                        }`}>
                          {lead.verified ? "Verified" : "Pending"}
                        </span>
                      </TableCell>
                      <TableCell>{lead.invited ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-4">
                          <Switch
                            checked={lead.verified}
                            onCheckedChange={() => handleVerifyToggle(lead.id, lead.verified)}
                          />
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="border-[#EF4444] text-white"
                                onClick={() => setSelectedLeadId(lead.id)}
                              >
                                Delete
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-[32px] bg-[#111111] border border-[#1F2937] p-6 text-white">
                              <DialogHeader>
                                <DialogTitle>Delete this lead?</DialogTitle>
                                <DialogDescription className="text-[#9CA3AF]">
                                  This action will remove the lead from the list. It cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                  <Button variant="outline" className="border-[#3B82F6] text-[#3B82F6]">
                                    Cancel
                                  </Button>
                                </DialogClose>
                                <DialogClose asChild>
                                  <Button variant="destructive" onClick={confirmDelete}>
                                    Delete
                                  </Button>
                                </DialogClose>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  )))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="requests">
            <div className="grid gap-4 xl:grid-cols-3">
              {activeRequests.map((request) => (
                <Card key={request.id} className="rounded-[24px] border border-[#1F2937] bg-[#111111] p-6 shadow-sm">
                  <div className="space-y-4 text-white">
                    <div className="space-y-1">
                      <p className="text-sm uppercase tracking-[0.24em] text-[#9CA3AF]">Requesting founder</p>
                      <p className="text-lg font-semibold">{request.founder}</p>
                      <p className="text-sm text-[#9CA3AF]">{request.email}</p>
                    </div>
                    <div className="rounded-3xl bg-[#121212] p-4 border border-[#1F2937]/50">
                      <p className="text-sm text-[#9CA3AF]">Lead Profile</p>
                      <p className="mt-2 font-semibold text-white">{request.leadName}</p>
                      <p className="text-sm text-[#9CA3AF]">{request.leadRole} • {request.leadOrg}</p>
                    </div>
                    <div className="flex items-center justify-between text-sm text-[#9CA3AF]">
                      <span>{request.timestamp}</span>
                      <Button variant="outline" size="sm" onClick={() => markHandled(request.id)} className="border-[#3B82F6] text-[#3B82F6] hover:bg-[#1D4ED8]/10">
                        Mark Handled
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {activeRequests.length === 0 && (
                <p className="text-sm text-[#9CA3AF] py-6 w-full text-center">No introduction requests pending right now.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="access">
            <div className="rounded-[24px] border border-[#1F2937] bg-[#111111] p-10 text-center text-[#9CA3AF]">
              <p className="font-semibold text-white">Manage Access coming soon</p>
              <p className="mt-2">This feature is planned for Phase 2.</p>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
