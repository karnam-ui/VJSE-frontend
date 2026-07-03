import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { LoginGate } from "../components/LoginGate";
import { domainOptions } from "../data/network";

interface SearchPageProps {
  user: { id: number; fullName: string; email: string } | null;
  onLogin: () => void;
}

export function SearchPage({ user, onLogin }: SearchPageProps) {
  const [leads, setLeads] = useState<any[]>([]);
  const [requestedLeadIds, setRequestedLeadIds] = useState<number[]>([]);
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      fetchLeadsAndConnections();
    }
  }, [user]);

  async function fetchLeadsAndConnections() {
    setLoading(true);
    setError("");
    try {
      // Fetch approved leads
      const leadsRes = await fetch("http://localhost:3000/api/approved-leads");
      if (!leadsRes.ok) throw new Error("Failed to fetch approved leads");
      const rawLeads = await leadsRes.json();
      const mappedLeads = rawLeads.map((l: any) => ({
        id: l.id,
        name: l.name,
        role: l.skills || "Mentor",
        organisation: l.organization,
        domains: [l.domain],
        helps: l.skills ? l.skills.split(", ") : [],
        verified: l.verified
      }));
      setLeads(mappedLeads);

      // Fetch connection requests for current founder
      const connRes = await fetch(`http://localhost:3000/api/connections?userId=${user.id}`);
      if (connRes.ok) {
        const connData = await connRes.json();
        const requestedIds = connData.map((c: any) => c.leadId);
        setRequestedLeadIds(requestedIds);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to the backend server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestIntroduction(leadId: number) {
    if (!user) return;
    try {
      const res = await fetch("http://localhost:3000/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          leadId: leadId
        })
      });
      if (res.ok) {
        setRequestedLeadIds((prev) => [...prev, leadId]);
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to request connection.");
      }
    } catch (err) {
      console.error(err);
      alert("Error connecting to backend server.");
    }
  }

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      return domain ? lead.domains.includes(domain) : true;
    });
  }, [domain, leads]);

  if (!user) {
    return <LoginGate onLogin={onLogin} />;
  }

  return (
    <div className="space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-3 text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-[#3B82F6]/80">Browse the Network</p>
        <h1 className="text-4xl font-semibold sm:text-5xl">Browse the Network</h1>
      </div>

      {error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center text-sm text-[#9CA3AF] py-6">
          Loading network leads from database...
        </div>
      )}

      <Card className="rounded-[28px] border border-[#1F2937] bg-[#111111] p-6 shadow-xl shadow-black/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid w-full gap-4 sm:grid-cols-1 lg:flex-1">
            <label className="block text-sm text-[#9CA3AF]">
              <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-[#9CA3AF]">Domain ▾</span>
              <select
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                className="w-full rounded-xl border border-[#27272A] bg-[#111111] px-4 py-3 text-sm text-white outline-none focus:border-[#3B82F6]"
              >
                <option value="">All domains</option>
                {domainOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => {
                setDomain("");
              }}
              className="text-sm text-[#9CA3AF] underline-offset-4 transition hover:text-white"
            >
              Clear filters
            </button>
            <span className="text-sm text-[#9CA3AF]">Showing {filteredLeads.length} leads</span>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="rounded-[28px] border border-[#1F2937] bg-[#111111] p-14 text-center text-[#9CA3AF] shadow-sm">
          <p className="text-xl font-semibold text-white">Loading professional network...</p>
        </div>
      ) : error ? (
        <div className="rounded-[28px] border border-[#1F2937] bg-[#111111] p-14 text-center text-red-500 shadow-sm">
          <p className="text-xl font-semibold">{error}</p>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="rounded-[28px] border border-[#1F2937] bg-[#111111] p-14 text-center text-[#9CA3AF] shadow-sm">
          <p className="text-xl font-semibold text-white">No leads found for this filter</p>
          <p className="mt-3">Try a different domain.</p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {filteredLeads.map((lead) => (
            <Card key={lead.id} className="rounded-[24px] border border-[#1F2937] bg-[#111111] p-6 shadow-sm">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xl font-semibold text-white">{lead.name}</p>
                    <p className="text-sm text-[#9CA3AF]">Expertise: {lead.domains.join(", ")}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    lead.verified ? "bg-[#22C55E]/15 text-[#22C55E]" : "bg-[#F59E0B]/15 text-[#F59E0B]"
                  }`}>
                    {lead.verified ? "✓ Verified" : "Pending"}
                  </span>
                </div>
                <div className="grid gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-[#9CA3AF]">
                    <span className="font-semibold text-white">Organization:</span>
                    <span>{lead.organisation}</span>
                  </div>
                  {lead.helps.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-white">Can help with:</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {lead.helps.map((help) => (
                          <span key={help} className="rounded-full bg-[#111111] px-3 py-1 text-sm text-[#3B82F6] ring-1 ring-[#3B82F6]/20">
                            {help}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  {requestedLeadIds.includes(lead.id) ? (
                    <Button disabled className="rounded-xl bg-[#27272A] px-4 py-2 text-[#9CA3AF]">
                      Requested Connection
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => handleRequestIntroduction(lead.id)}
                      className="rounded-xl bg-[#3B82F6] px-4 py-2 text-white hover:bg-[#1D4ED8]"
                    >
                      Request Introduction →
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
