import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { domainOptions, cityOptions, organisationTypes } from "../data/network";

const mentorStartups = [
  {
    id: "startup-01",
    name: "FarmChain",
    stage: "Growth",
    focus: "AgriTech supply chain",
    currentGoal: "Scale partnerships with retailers",
  },
  {
    id: "startup-02",
    name: "BrightBridge Labs",
    stage: "Early",
    focus: "HealthTech data analytics",
    currentGoal: "Secure first pilots",
  },
  {
    id: "startup-03",
    name: "EventHive",
    stage: "Seed",
    focus: "Event discovery platform",
    currentGoal: "Expand student user base",
  },
];

export function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("");
  const [city, setCity] = useState("");
  const [organisationType, setOrganisationType] = useState("");
  const [selectedStartupId, setSelectedStartupId] = useState("startup-01");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:3000/api/approved-leads");
      if (res.ok) {
        const raw = await res.json();
        const mapped = raw.map((l: any) => ({
          id: String(l.id),
          name: l.name,
          role: l.skills || "Mentor",
          organisationType: "Corporate",
          organisation: l.organization,
          city: "Hyderabad",
          domains: [l.domain],
          helps: l.skills ? l.skills.split(", ") : [],
          referredBy: "Platform",
          verified: l.verified
        }));
        setLeads(mapped);
      } else {
        setError("Failed to fetch leads");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to backend");
    } finally {
      setLoading(false);
    }
  }

  const chatThreads: Record<string, Array<{ author: string; content: string; time: string }>> = {
    "startup-01": [
      { author: "Mentor", content: "Hi team, how is the pilot plan going?", time: "10:04 AM" },
      { author: "FarmChain", content: "We have 3 new retail partners lined up this week.", time: "10:07 AM" },
      { author: "Mentor", content: "Great, let's prioritize the logistics integration.", time: "10:12 AM" },
    ],
    "startup-02": [
      { author: "Mentor", content: "Do we have updates from the clinic trials?", time: "09:35 AM" },
      { author: "BrightBridge Labs", content: "Yes, we received positive feedback on the analytics dashboard.", time: "09:42 AM" },
      { author: "Mentor", content: "Let's get the next pilot scheduled.", time: "09:50 AM" },
    ],
    "startup-03": [
      { author: "Mentor", content: "How are engagement numbers on campus?", time: "11:20 AM" },
      { author: "EventHive", content: "We launched 4 new event promotions and doubled signups.", time: "11:28 AM" },
      { author: "Mentor", content: "Nice work, keep the momentum going.", time: "11:35 AM" },
    ],
  };

  const selectedStartup = mentorStartups.find((startup) => startup.id === selectedStartupId) ?? mentorStartups[0];

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const searchMatch = query
        ? [lead.name, lead.role, lead.organisation, lead.city, lead.referredBy]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase())
        : true;
      const cityMatch = city ? lead.city === city : true;
      const orgMatch = organisationType ? lead.organisationType === organisationType : true;
      const domainMatch = domain ? lead.domains.includes(domain) : true;
      return searchMatch && cityMatch && orgMatch && domainMatch;
    });
  }, [city, domain, organisationType, query, leads]);

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

      {loading && (
        <div className="text-center text-sm text-[#9CA3AF] py-6">
          Loading mentor leads from database...
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[24px] border border-[#1F2937] bg-[#111111] p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.28em] text-[#9CA3AF]">Connected startups</p>
          <p className="mt-4 text-3xl font-semibold text-[#3B82F6]">{mentorStartups.length}</p>
        </Card>
        <Card className="rounded-[24px] border border-[#1F2937] bg-[#111111] p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.28em] text-[#9CA3AF]">Active chats</p>
          <p className="mt-4 text-3xl font-semibold text-[#22C55E]">{mentorStartups.length}</p>
        </Card>
        <Card className="rounded-[24px] border border-[#1F2937] bg-[#111111] p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.28em] text-[#9CA3AF]">Verified leads</p>
          <p className="mt-4 text-3xl font-semibold text-[#F59E0B]">{filteredLeads.filter((lead) => lead.verified).length}</p>
        </Card>
      </div>

      <Card className="rounded-[28px] border border-[#1F2937] bg-[#111111] p-6 shadow-xl">
        <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr] xl:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search startups, roles, or locations..."
              className="bg-[#111111] text-white"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <select
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              className="rounded-xl border border-[#27272A] bg-[#111111] px-4 py-3 text-sm text-white outline-none focus:border-[#3B82F6]"
            >
              <option value="">Domain</option>
              {domainOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="rounded-xl border border-[#27272A] bg-[#111111] px-4 py-3 text-sm text-white outline-none focus:border-[#3B82F6]"
            >
              <option value="">City</option>
              {cityOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <select
              value={organisationType}
              onChange={(event) => setOrganisationType(event.target.value)}
              className="rounded-xl border border-[#27272A] bg-[#111111] px-4 py-3 text-sm text-white outline-none focus:border-[#3B82F6]"
            >
              <option value="">Org Type</option>
              {organisationTypes.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        {mentorStartups.map((startup) => (
          <Card key={startup.id} className="rounded-[24px] border border-[#1F2937] bg-[#111111] p-6 shadow-sm">
            <div className="space-y-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-[#9CA3AF]">{startup.stage}</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">{startup.name}</h2>
                <p className="mt-2 text-sm text-[#D1D5DB]">{startup.focus}</p>
              </div>
              <div className="space-y-2 rounded-3xl bg-[#141414] p-4 text-sm text-[#9CA3AF]">
                <p>Current goal: {startup.currentGoal}</p>
              </div>
              <Button
                variant="outline"
                className="border-[#3B82F6] text-[#3B82F6] hover:bg-[#1D4ED8]/10"
                onClick={() => setSelectedStartupId(startup.id)}
              >
                View chat
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="rounded-[28px] border border-[#1F2937] bg-[#111111] p-6 shadow-xl">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-[#3B82F6]/80">Chat window</p>
                <h2 className="text-2xl font-semibold text-white">{selectedStartup.name} conversation</h2>
              </div>
              <span className="rounded-full bg-[#111111] px-4 py-2 text-sm text-[#9CA3AF]">
                {selectedStartup.stage}
              </span>
            </div>
            <div className="space-y-4 overflow-y-auto rounded-[24px] border border-[#27272A] bg-[#0F172A] p-5 text-sm text-[#D1D5DB] max-h-[420px]">
              {chatThreads[selectedStartup.id].map((message, index) => (
                <div key={index} className={message.author === "Mentor" ? "text-right" : "text-left"}>
                  <div className="inline-block rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm shadow-black/20">
                    <p className="font-semibold text-white">{message.author}</p>
                    <p className="mt-1">{message.content}</p>
                    <p className="mt-2 text-xs text-[#9CA3AF]">{message.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[24px] border border-[#27272A] bg-[#141414] p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-[#9CA3AF]">Startup details</p>
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-sm text-[#9CA3AF]">Startup</p>
                <p className="mt-2 text-lg font-semibold text-white">{selectedStartup.name}</p>
              </div>
              <div>
                <p className="text-sm text-[#9CA3AF]">Focus</p>
                <p className="mt-2 text-white">{selectedStartup.focus}</p>
              </div>
              <div>
                <p className="text-sm text-[#9CA3AF]">Goal</p>
                <p className="mt-2 text-white">{selectedStartup.currentGoal}</p>
              </div>
              <div>
                <p className="text-sm text-[#9CA3AF]">Related leads</p>
                <p className="mt-2 text-white">{filteredLeads.slice(0, 3).map((lead) => lead.name).join(", ")}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-[#3B82F6]/80">All mentor leads</p>
            <h2 className="text-2xl font-semibold text-white">Startups and conversations</h2>
          </div>
        </div>
        <div className="overflow-x-auto rounded-[24px] border border-[#27272A] bg-[#0F172A]/70 p-4">
          <Table>
            <TableHeader>
              <TableRow className="text-[#9CA3AF]">
                <TableHead>Startup</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Org</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-[#9CA3AF]">
                    Loading leads from database...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-red-500">
                    {error}
                  </TableCell>
                </TableRow>
              ) : filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-[#9CA3AF]">
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
                    <TableCell>{lead.verified ? "Verified" : "Pending"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
