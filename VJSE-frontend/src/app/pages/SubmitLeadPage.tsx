import { FormEvent, useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { LoginGate } from "../components/LoginGate";
import {
  cityOptions,
  domainOptions,
  helpOptions,
  organisationTypes,
  relationshipOptions,
} from "../data/network";

interface SubmitLeadPageProps {
  user: { fullName: string; email: string } | null;
  onLogin: () => void;
  onSubmit: () => void;
}

export function SubmitLeadPage({ user, onLogin, onSubmit }: SubmitLeadPageProps) {
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [relationship, setRelationship] = useState(relationshipOptions[0]);
  const [role, setRole] = useState("");
  const [organisationType, setOrganisationType] = useState(organisationTypes[0]);
  const [organisationName, setOrganisationName] = useState("");
  const [city, setCity] = useState(cityOptions[0]);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [selectedHelps, setSelectedHelps] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);

  if (!user) {
    return <LoginGate onLogin={onLogin} />;
  }

  const toggleDomain = (domain: string) => {
    setSelectedDomains((current) =>
      current.includes(domain) ? current.filter((item) => item !== domain) : [...current, domain],
    );
  };

  const toggleHelp = (help: string) => {
    setSelectedHelps((current) =>
      current.includes(help) ? current.filter((item) => item !== help) : [...current, help],
    );
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent) {
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: leadName,
          email: leadEmail,
          domain: selectedDomains[0] || "Other",
          organization: organisationName,
          skills: selectedHelps.join(", ")
        })
      });

      if (res.ok) {
        onSubmit();
        setLeadName("");
        setLeadEmail("");
        setRole("");
        setOrganisationName("");
        setSelectedDomains([]);
        setSelectedHelps([]);
        setConsent(false);
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to submit lead to database.");
      }
    } catch (err) {
      console.error(err);
      alert("Error connecting to backend server.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-3 text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-[#3B82F6]/80">Submit a Professional Lead</p>
        <h1 className="text-4xl font-semibold sm:text-5xl">Submit a Professional Lead</h1>
        <p className="max-w-2xl text-base leading-7 text-[#D1D5DB]">
          Know someone who can help a startup? Refer them here.
        </p>
      </div>

      <Card className="mx-auto w-full rounded-[28px] border border-[#1F2937] bg-[#111111] shadow-xl shadow-black/20">
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm text-[#E5E7EB]">Your Name</Label>
                <div className="relative">
                  <Input disabled value={user.fullName} className="pr-10 bg-[#111111] text-white" />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
                    <Lock className="size-4" />
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-[#E5E7EB]">Your Email</Label>
                <div className="relative">
                  <Input disabled value={user.email} className="pr-10 bg-[#111111] text-white" />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
                    <Lock className="size-4" />
                  </span>
                </div>
              </div>
            </div>

            <div className="h-px bg-[#1F2937]" />

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="leadName" className="text-sm text-[#E5E7EB]">Lead's Full Name</Label>
                <Input
                  id="leadName"
                  value={leadName}
                  onChange={(event) => setLeadName(event.target.value)}
                  placeholder="Enter full name"
                  className="bg-[#111111] text-white"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="leadEmail" className="text-sm text-[#E5E7EB]">Lead's Email</Label>
                <Input
                  id="leadEmail"
                  type="email"
                  value={leadEmail}
                  onChange={(event) => setLeadEmail(event.target.value)}
                  placeholder="Enter email address"
                  className="bg-[#111111] text-white"
                  required
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="relationship" className="text-sm text-[#E5E7EB]">Your Relationship</Label>
                  <select
                    id="relationship"
                    value={relationship}
                    onChange={(event) => setRelationship(event.target.value)}
                    className="w-full rounded-md border border-[#27272A] bg-[#111111] px-3 py-2 text-white outline-none focus:border-[#3B82F6]"
                  >
                    {relationshipOptions.map((option) => (
                      <option key={option} value={option} className="bg-[#111111] text-white">
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role" className="text-sm text-[#E5E7EB]">Their Profession / Role</Label>
                  <Input
                    id="role"
                    value={role}
                    onChange={(event) => setRole(event.target.value)}
                    placeholder="Product Manager, Advisor, etc."
                    className="bg-[#111111] text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="organisationType" className="text-sm text-[#E5E7EB]">Organisation Type</Label>
                  <select
                    id="organisationType"
                    value={organisationType}
                    onChange={(event) => setOrganisationType(event.target.value)}
                    className="w-full rounded-md border border-[#27272A] bg-[#111111] px-3 py-2 text-white outline-none focus:border-[#3B82F6]"
                  >
                    {organisationTypes.map((option) => (
                      <option key={option} value={option} className="bg-[#111111] text-white">
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="organisationName" className="text-sm text-[#E5E7EB]">Organisation Name</Label>
                  <Input
                    id="organisationName"
                    value={organisationName}
                    onChange={(event) => setOrganisationName(event.target.value)}
                    placeholder="Organisation name"
                    className="bg-[#111111] text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="city" className="text-sm text-[#E5E7EB]">City / Location</Label>
                  <select
                    id="city"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    className="w-full rounded-md border border-[#27272A] bg-[#111111] px-3 py-2 text-white outline-none focus:border-[#3B82F6]"
                  >
                    {cityOptions.map((option) => (
                      <option key={option} value={option} className="bg-[#111111] text-white">
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-sm text-[#E5E7EB]">Domain</Label>
                <div className="flex flex-wrap gap-2">
                  {domainOptions.map((domain) => {
                    const active = selectedDomains.includes(domain);
                    return (
                      <button
                        type="button"
                        key={domain}
                        onClick={() => toggleDomain(domain)}
                        className={`rounded-full border px-3 py-2 text-sm transition ${
                          active
                            ? "border-[#3B82F6] bg-[#1D4ED8] text-white"
                            : "border-[#27272A] bg-[#111111] text-[#D1D5DB] hover:border-[#3B82F6]"
                        }`}
                      >
                        {domain}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-sm text-[#E5E7EB]">How can they help?</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {helpOptions.map((help) => {
                    const active = selectedHelps.includes(help);
                    return (
                      <button
                        type="button"
                        key={help}
                        onClick={() => toggleHelp(help)}
                        className={`rounded-full border px-3 py-2 text-sm text-left transition ${
                          active
                            ? "border-[#3B82F6] bg-[#1D4ED8] text-white"
                            : "border-[#27272A] bg-[#111111] text-[#D1D5DB] hover:border-[#3B82F6]"
                        }`}
                      >
                        {help}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-[#1F2937] bg-[#111111] p-4">
                <div className="mt-1 h-4 w-4 rounded-sm border border-[#3B82F6] bg-[#111111]" />
                <div className="space-y-2 text-sm text-[#D1D5DB]">
                  <p>
                    <span className="text-[#EF4444]">*</span> I confirm this person is aware and willing to be contacted.
                  </p>
                  <label className="inline-flex cursor-pointer items-center gap-3 text-[#E5E7EB]">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(event) => setConsent(event.target.checked)}
                      className="h-4 w-4 rounded border border-[#27272A] bg-[#111111] text-[#3B82F6] focus:ring-[#3B82F6]"
                    />
                    <span>I agree</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  type="submit"
                  className="w-full rounded-xl bg-[#3B82F6] px-6 py-3 text-white hover:bg-[#1D4ED8]"
                >
                  Submit Lead →
                </Button>
                <p className="text-center text-sm text-[#9CA3AF]">
                  No personal contact details (phone/email) are collected or stored.
                </p>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
