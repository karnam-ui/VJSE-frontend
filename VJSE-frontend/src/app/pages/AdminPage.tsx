import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Switch } from "../components/ui/switch";
import { LoginGate } from "../components/LoginGate";
import { organisationTypes, cityOptions, domainOptions } from "../data/network";

interface AdminPageProps {
  user: { id: number; fullName: string; email: string; role: string } | null;
  onLogin: () => void;
}

export function AdminPage({ user, onLogin }: AdminPageProps) {
  const [dbLeads, setDbLeads] = useState<any[]>([]);
  const [dbConnections, setDbConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [filterCity, setFilterCity] = useState("");
  const [filterDomain, setFilterDomain] = useState("");
  const [filterOrg, setFilterOrg] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const [leadsRes, connectionsRes] = await Promise.all([
        fetch("http://localhost:3000/api/leads"),
        fetch("http://localhost:3000/api/connections")
      ]);

      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        setDbLeads(leadsData);
      } else {
        setError("Failed to fetch leads.");
      }

      if (connectionsRes.ok) {
        const connectionsData = await connectionsRes.json();
        setDbConnections(connectionsData);
      } else {
        setError("Failed to fetch connection requests.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to backend server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user && user.role === "Admin") {
      fetchData();
    }
  }, [user]);

  if (!user) {
    return <LoginGate onLogin={onLogin} />;
  }

  if (user.role !== "Admin") {
    return (
      <div className="mx-auto max-w-md text-center py-20 space-y-4">
        <h2 className="text-2xl font-bold text-white">Access Denied</h2>
        <p className="text-[#9CA3AF]">You must be logged in as an Admin to view this page.</p>
      </div>
    );
  }

  const leads = useMemo(() => {
    return dbLeads.map((l: any) => ({
      id: String(l.id),
      name: l.name,
      role: "Professional",
      organisationType: "Corporate",
      organisation: l.organization,
      city: "Hyderabad",
      domains: [l.domain],
      helps: l.skills ? l.skills.split(",").map((s: string) => s.trim()) : [],
      referredBy: "Student Referral",
      verified: l.verified,
      submittedOn: l.createdAt ? l.createdAt.split("T")[0] : new Date().toISOString().split("T")[0],
    }));
  }, [dbLeads]);

  const introRequests = useMemo(() => {
    return dbConnections.map((c: any) => ({
      id: String(c.id),
      founder: c.user?.name || "Unknown Founder",
      email: c.user?.email || "unknown@domain.com",
      leadName: c.lead?.name || "Unknown Lead",
      leadRole: "Professional",
      leadOrg: c.lead?.organization || "Unknown Org",
      timestamp: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "Just now",
      handled: c.status === "Accepted" || c.status === "Rejected"
    }));
  }, [dbConnections]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const cityMatch = filterCity ? lead.city === filterCity : true;
      const orgMatch = filterOrg ? lead.organisationType === filterOrg : true;
      const domainMatch = filterDomain ? lead.domains.includes(filterDomain) : true;
      const statusMatch =
        filterStatus === "All"
          ? true
          : filterStatus === "Verified"
          ? lead.verified
          : !lead.verified;
      return cityMatch && orgMatch && domainMatch && statusMatch;
    });
  }, [filterCity, filterDomain, filterOrg, filterStatus, leads]);

  const activeRequests = introRequests.filter((request) => !request.handled);
  const csvData = [
    ["Name", "Role", "Organisation", "Domain", "City", "Referred By", "Verified"],
    ...leads.map((lead) => [
      lead.name,
      lead.role,
      lead.organisation,
      lead.domains.join(" | "),
      lead.city,
      lead.referredBy,
      lead.verified ? "Verified" : "Unverified",
    ]),
  ]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
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

  async function handleVerifyToggle(id: string) {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;

    try {
      const res = await fetch(`http://localhost:3000/api/leads/${id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: !lead.verified })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Failed to toggle verification status:", err);
    }
  }

  async function confirmDelete() {
    if (!selectedLeadId) return;
    try {
      const res = await fetch(`http://localhost:3000/api/leads/${selectedLeadId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setSelectedLeadId(null);
        fetchData();
      }
    } catch (err) {
      console.error("Failed to delete lead:", err);
    }
  }

  async function markHandled(id: string) {
    try {
      const res = await fetch(`http://localhost:3000/api/connections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Accepted" })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Failed to mark request as handled:", err);
    }
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
                value={filterCity}
                onChange={(event) => setFilterCity(event.target.value)}
                className="rounded-xl border border-[#27272A] bg-[#111111] px-4 py-3 text-sm text-white outline-none focus:border-[#3B82F6]"
              >
                <option value="">Filter city</option>
                {cityOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <select
                value={filterOrg}
                onChange={(event) => setFilterOrg(event.target.value)}
                className="rounded-xl border border-[#27272A] bg-[#111111] px-4 py-3 text-sm text-white outline-none focus:border-[#3B82F6]"
              >
                <option value="">Filter org type</option>
                {organisationTypes.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value)}
                className="rounded-xl border border-[#27272A] bg-[#111111] px-4 py-3 text-sm text-white outline-none focus:border-[#3B82F6]"
              >
                <option value="All">All</option>
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
                  <TableHead>Role</TableHead>
                  <TableHead>Org</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Referred By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-[#9CA3AF]">
                      Loading leads from database...
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-red-500">
                      {error}
                    </TableCell>
                  </TableRow>
                ) : filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-[#9CA3AF]">
                      No leads found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="text-white">{lead.name}</TableCell>
                      <TableCell>{lead.role}</TableCell>
                      <TableCell>{lead.organisation}</TableCell>
                      <TableCell>{lead.domains.join(", ")}</TableCell>
                      <TableCell>{lead.city}</TableCell>
                      <TableCell>{lead.referredBy}</TableCell>
                      <TableCell>{lead.verified ? "Verified" : "Unverified"}</TableCell>
                    <TableCell className="flex flex-wrap gap-2">
                      <Switch
                        checked={lead.verified}
                        onCheckedChange={() => handleVerifyToggle(lead.id)}
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
                      <DialogContent className="rounded-[32px] bg-[#111111] border border-[#1F2937] p-6">
                        <DialogHeader>
                          <DialogTitle>Delete this lead?</DialogTitle>
                          <DialogDescription className="text-[#9CA3AF]">
                            This action will remove the lead from the list. It cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" className="border-[#3B82F6] text-[#3B82F6]">
                            Cancel
                          </Button>
                          <DialogClose asChild>
                            <Button variant="destructive" onClick={confirmDelete}>
                              Delete
                            </Button>
                          </DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
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
                    <div className="rounded-3xl bg-[#121212] p-4">
                      <p className="text-sm text-[#9CA3AF]">Lead</p>
                      <p className="mt-2 font-semibold text-white">{request.leadName}</p>
                      <p className="text-sm text-[#9CA3AF]">{request.leadRole} • {request.leadOrg}</p>
                    </div>
                    <div className="flex items-center justify-between text-sm text-[#9CA3AF]">
                      <span>{request.timestamp}</span>
                      <Button variant="outline" size="sm" onClick={() => markHandled(request.id)}>
                        Mark Handled
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {activeRequests.length === 0 && (
                <p className="text-sm text-[#9CA3AF]">No introduction requests pending right now.</p>
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
