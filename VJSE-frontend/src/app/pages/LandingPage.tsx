import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Search, Sparkles } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardTitle } from "../components/ui/card";

export function LandingPage() {
  const [stats, setStats] = useState({ totalLeads: 0, verifiedLeads: 0, totalStartups: 0 });
  const [startups, setStartups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const statsRes = await fetch("http://localhost:3000/api/stats");
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
        
        const startupsRes = await fetch("http://localhost:3000/api/startups");
        if (startupsRes.ok) {
          const startupsData = await startupsRes.json();
          setStartups(startupsData);
        }
      } catch (err) {
        console.error("Error fetching landing page data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const featureList = [
    {
      title: "Submit Leads",
      description: "Refer professionals from your network with their consent.",
      icon: ShieldCheck,
    },
    {
      title: "Search by Domain",
      description: "Find the right contact for your startup's industry.",
      icon: Search,
    },
    {
      title: "Request Intro",
      description: "Get a warm introduction brokered by the Startup Cell.",
      icon: Sparkles,
    },
  ];

  return (
    <div className="space-y-12">
      <section className="rounded-[28px] border border-[#1F2937] bg-[#111111] p-8 shadow-xl sm:p-12">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <p className="text-sm uppercase tracking-[0.3em] text-[#3B82F6]/80">VJ Network</p>
            <h1 className="max-w-3xl text-4xl font-extrabold text-white sm:text-5xl">
              Your College's Professional Network
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[#D1D5DB]">
              Connect with industry leaders referred by fellow students. Built for VNRVJIET startup founders.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="text-base text-[#D1D5DB] sm:max-w-xl">
                Explore the network, read about active startups, and sign in to access role-based workflows for students, mentors, volunteers, and admins.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="rounded-[20px] border border-[#1F2937] bg-[#141414] p-6 text-white shadow-sm">
              <CardTitle className="text-4xl font-semibold">{loading ? "..." : stats.totalLeads}</CardTitle>
              <CardDescription className="text-sm text-[#9CA3AF]">Leads</CardDescription>
            </Card>
            <Card className="rounded-[20px] border border-[#1F2937] bg-[#141414] p-6 text-white shadow-sm">
              <CardTitle className="text-4xl font-semibold text-[#3B82F6]">{loading ? "..." : stats.verifiedLeads}</CardTitle>
              <CardDescription className="text-sm text-[#9CA3AF]">Verified</CardDescription>
            </Card>
            <Card className="rounded-[20px] border border-[#1F2937] bg-[#141414] p-6 text-white shadow-sm">
              <CardTitle className="text-4xl font-semibold">{loading ? "..." : stats.totalStartups}</CardTitle>
              <CardDescription className="text-sm text-[#9CA3AF]">Active Startups</CardDescription>
            </Card>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {featureList.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title} className="rounded-[20px] border border-[#1F2937] bg-[#111111] p-6 shadow-sm">
              <CardTitle className="flex items-center gap-3 text-xl font-semibold text-white">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#111111] text-[#3B82F6] shadow-sm">
                  <Icon className="size-5" />
                </span>
                {feature.title}
              </CardTitle>
              <CardDescription className="mt-3 text-[#9CA3AF]">{feature.description}</CardDescription>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-10 rounded-[28px] border border-[#1F2937] bg-[#111111] p-8 shadow-xl sm:p-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-[#3B82F6]/80">Trusted by founders</p>
            <h2 className="text-2xl font-semibold text-white">Build meaningful introductions for your startup.</h2>
          </div>
          <Badge variant="default">Student-first platform</Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl bg-[#141414] p-6 text-white">
            <p className="font-semibold">Trusted referrals with consent</p>
            <p className="mt-2 text-sm text-[#9CA3AF]">All leads are submitted by VJ students and verified through the Startup Cell process.</p>
          </div>
          <div className="rounded-3xl bg-[#141414] p-6 text-white">
            <p className="font-semibold">Focused discovery</p>
            <p className="mt-2 text-sm text-[#9CA3AF]">Search by domain, location, and organisation type to find the most relevant professional connections.</p>
          </div>
        </div>
      </section>

      <section className="space-y-6 rounded-[28px] border border-[#1F2937] bg-[#111111] p-8 shadow-xl sm:p-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-[#3B82F6]/80">Startup Showcase</p>
            <h2 className="text-2xl font-semibold text-white">Explore active startups</h2>
          </div>
          <p className="max-w-2xl text-sm text-[#9CA3AF]">
            Scroll through startups building across domains, with a quick summary of what they are doing and why they matter.
          </p>
        </div>

        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4">
          {loading ? (
            <div className="text-sm text-[#9CA3AF] py-6 w-full text-center">Loading startups from database...</div>
          ) : startups.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[#1F2937] bg-[#141414] p-8 text-center text-[#9CA3AF] w-full">
              No active startups registered on the platform yet.
            </div>
          ) : (
            startups.map((startup) => (
              <div
                key={startup.id}
                className="min-w-[280px] snap-start rounded-[24px] border border-[#1F2937] bg-[#141414] p-6 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-xl font-semibold text-white">{startup.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#D1D5DB] min-h-[48px] line-clamp-3">
                    {startup.currentGoal}
                  </p>
                </div>
                <div className="mt-5 rounded-2xl bg-[#0F172A] p-4 text-xs text-[#9CA3AF] flex flex-col gap-1 border border-[#1F2937]/50">
                  <p>Domain: <span className="text-[#3B82F6] font-semibold">{startup.focus}</span></p>
                  <p>Maturity / Stage: <span className="text-white font-medium">{startup.stage}</span></p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
