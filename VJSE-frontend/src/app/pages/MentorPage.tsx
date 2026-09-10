import { useState, useEffect } from 'react';
import { Home, User, Search, Users, Bell, Edit3, Briefcase, ExternalLink, ShieldCheck } from 'lucide-react';
import { api } from '../data/api';
import { Toast } from '../components/Toast';

export default function MentorPage({ user, onLogout }: { user: any, onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'home' | 'profile' | 'browse' | 'connections'>('home');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");

  // Search/Filter state for Startups
  const [searchQuery, setSearchQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState("");

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    designation: "",
    experience: "",
    linkedIn: "",
    bio: ""
  });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await api.get('/api/mentor/dashboard');
        setData(res.data);
        setProfileForm({
          designation: user.designation || "",
          experience: user.experience || "",
          linkedIn: user.linkedIn || "",
          bio: user.bio || ""
        });
        setLoading(false);
      } catch (err) {
        console.error("Failed to load mentor dashboard data", err);
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.post('/api/mentor/profile', profileForm);
      setToastMessage("Profile updated successfully!");
      setTimeout(() => setToastMessage(""), 3000);
    } catch (err) {
      console.error("Failed to save profile", err);
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading || !data) {
    return <div className="flex h-screen items-center justify-center text-white">Loading dashboard...</div>;
  }

  const { myLead, startups, notifications, connections } = data;

  // Stats
  const totalRequests = connections.length;
  const connectedStartups = connections.filter((c: any) => c.status === 'Connected').length;

  const filteredStartups = startups.filter((s: any) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (s.user?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDomain = !domainFilter || s.focus === domainFilter;
    return matchesSearch && matchesDomain;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending': return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">Pending</span>;
      case 'Sourcer Accepted': return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">Sourcer Accepted</span>;
      case 'Intro Made': return <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20">Intro Made</span>;
      case 'Connected': return <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Connected</span>;
      case 'Declined': return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-500/10 text-red-500 border border-red-500/20">Declined</span>;
      default: return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/20">{status}</span>;
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#0A0A0A]">
      {/* Sidebar */}
      <div className="w-64 bg-[#111111] border-r border-[#1F2937] flex flex-col justify-between flex-shrink-0">
        <div className="p-4 space-y-2">
          <button onClick={() => setActiveTab('home')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'home' ? 'bg-[#1D9E75]/10 text-[#1D9E75] font-medium' : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'}`}>
            <Home size={18} /> Home
          </button>
          <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'profile' ? 'bg-[#1D9E75]/10 text-[#1D9E75] font-medium' : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'}`}>
            <User size={18} /> My Profile
          </button>
          <button onClick={() => setActiveTab('browse')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'browse' ? 'bg-[#1D9E75]/10 text-[#1D9E75] font-medium' : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'}`}>
            <Search size={18} /> Browse Startups
          </button>
          <button onClick={() => setActiveTab('connections')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'connections' ? 'bg-[#1D9E75]/10 text-[#1D9E75] font-medium' : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'}`}>
            <Users size={18} /> My Connections
          </button>
        </div>
        
        <div className="p-4 border-t border-[#1F2937]">
          <div className="flex items-center gap-3 px-2">
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#1D9E75] to-[#157A5C] flex items-center justify-center font-bold text-white shadow-lg">
              {user.fullName.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user.fullName}</p>
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#1D9E75] font-bold bg-[#1D9E75]/10 px-2 py-0.5 rounded-full mt-1">
                <ShieldCheck size={10} /> Mentor
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 relative">
        {toastMessage && <Toast message={toastMessage} />}
        
        {/* Header Area common to some tabs */}
        {(activeTab === 'home' || activeTab === 'browse' || activeTab === 'connections') && (
          <div className="absolute top-8 right-8 text-[#9CA3AF] hover:text-white transition cursor-pointer">
            <Bell size={24} />
          </div>
        )}

        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
            <div className="bg-gradient-to-br from-[#1D9E75]/20 to-transparent border border-[#1D9E75]/30 rounded-3xl p-8 relative overflow-hidden">
              <div className="relative z-10">
                <h1 className="text-3xl font-bold text-white mb-2">Welcome, {user.fullName}</h1>
                <p className="text-[#9CA3AF] text-lg">You are part of the VJ Startups ecosystem</p>
              </div>
              <div className="absolute right-0 top-0 h-full opacity-20 pointer-events-none">
                 <svg width="300" height="100%" viewBox="0 0 200 200">
                    <path fill="#1D9E75" d="M45.7,-76.4C58.9,-69.1,69.1,-55.4,78.2,-41.2C87.3,-27,95.3,-12.3,95.2,2.4C95,17,86.6,31.6,76.5,44.4C66.4,57.2,54.6,68.2,40.9,74.6C27.2,81,11.6,82.8,-3.8,88.2C-19.1,93.6,-38.3,102.5,-52.1,95.9C-65.8,89.3,-74.1,67,-81.4,50.1C-88.7,33.2,-95.1,21.6,-96.2,9.7C-97.3,-2.2,-93.1,-14.4,-86.1,-25.1C-79.1,-35.8,-69.3,-45,-58,-52.3C-46.7,-59.6,-33.9,-65,-21.2,-68.8C-8.5,-72.6,4.1,-74.8,17.2,-74.4C30.3,-73.9,43.5,-70.8,45.7,-76.4Z" transform="translate(100 100) scale(1.1)" />
                 </svg>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Stats */}
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-white">Overview</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#111111] border border-[#1F2937] rounded-2xl p-6">
                    <p className="text-[#9CA3AF] text-sm font-medium mb-2">Requests Received</p>
                    <p className="text-4xl font-bold text-white">{totalRequests}</p>
                  </div>
                  <div className="bg-[#111111] border border-[#1F2937] rounded-2xl p-6">
                    <p className="text-[#9CA3AF] text-sm font-medium mb-2">Connected</p>
                    <p className="text-4xl font-bold text-[#1D9E75]">{connectedStartups}</p>
                  </div>
                </div>

                {/* Notifications */}
                <h2 className="text-xl font-bold text-white mt-8 mb-4">Notifications</h2>
                <div className="space-y-4">
                  {notifications.map((n: any) => (
                    <div key={n.id} className="bg-[#111111] border border-[#1D9E75]/30 rounded-xl p-4 flex gap-4">
                      <div className="mt-1 text-[#1D9E75]"><Bell size={20} /></div>
                      <div>
                        <p className="text-white text-sm leading-relaxed">{n.message}</p>
                        <p className="text-xs text-[#6B7280] mt-2 font-mono">
                          {new Date(n.createdAt).toLocaleString()} • via {n.sourcerName}
                        </p>
                      </div>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <p className="text-[#6B7280] text-sm italic">No new notifications.</p>
                  )}
                </div>
              </div>

              {/* Recent Requests */}
              <div className="bg-[#111111] border border-[#1F2937] rounded-2xl p-6 flex flex-col h-[500px]">
                <h2 className="text-xl font-bold text-white mb-6">Recent Connection Requests</h2>
                <div className="overflow-y-auto flex-1 pr-2 space-y-4">
                  {connections.slice(0, 5).map((conn: any) => (
                    <div key={conn.id} className="p-4 rounded-xl border border-[#1F2937] bg-[#0A0A0A] hover:border-[#374151] transition">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-white">{conn.user?.name || "Unknown Founder"}</h3>
                        {getStatusBadge(conn.status)}
                      </div>
                      <p className="text-sm text-[#1D9E75] font-medium mb-2">Startup in {conn.domain || "Unknown Domain"}</p>
                      <p className="text-xs text-[#6B7280]">{new Date(conn.createdAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                  {connections.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-[#6B7280]">
                      <Users size={48} className="mb-4 opacity-20" />
                      <p>No connection requests yet.</p>
                      <p className="text-xs mt-2">When a founder reaches out, it will appear here.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
              <p className="text-[#9CA3AF]">Manage how founders see you on the platform.</p>
            </div>

            <form onSubmit={handleProfileSave} className="bg-[#111111] border border-[#1F2937] rounded-2xl p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#9CA3AF]">Designation</label>
                  <input
                    type="text"
                    value={profileForm.designation}
                    onChange={e => setProfileForm({...profileForm, designation: e.target.value})}
                    className="w-full bg-[#0A0A0A] border border-[#374151] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#1D9E75] transition"
                    placeholder="e.g. Senior Software Engineer"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#9CA3AF]">Years of Experience</label>
                  <input
                    type="text"
                    value={profileForm.experience}
                    onChange={e => setProfileForm({...profileForm, experience: e.target.value})}
                    className="w-full bg-[#0A0A0A] border border-[#374151] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#1D9E75] transition"
                    placeholder="e.g. 5+ Years"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#9CA3AF]">LinkedIn URL</label>
                <input
                  type="url"
                  value={profileForm.linkedIn}
                  onChange={e => setProfileForm({...profileForm, linkedIn: e.target.value})}
                  className="w-full bg-[#0A0A0A] border border-[#374151] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#1D9E75] transition"
                  placeholder="https://linkedin.com/in/..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#9CA3AF]">Bio</label>
                <textarea
                  value={profileForm.bio}
                  onChange={e => setProfileForm({...profileForm, bio: e.target.value})}
                  rows={4}
                  className="w-full bg-[#0A0A0A] border border-[#374151] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#1D9E75] transition resize-none"
                  placeholder="Tell founders a bit about your background and how you can help..."
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-[#1F2937]">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="bg-[#1D9E75] hover:bg-[#157A5C] text-white px-6 py-2.5 rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-70"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>

            <div className="bg-[#111111]/50 border border-[#1F2937]/50 rounded-2xl p-8">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#1D9E75]" /> Platform Verified Details
              </h3>
              <p className="text-sm text-[#6B7280] mb-6">These details were verified by the platform based on your initial introduction and cannot be changed here.</p>
              
              {myLead ? (
                <div className="grid grid-cols-2 gap-y-6 gap-x-12">
                  <div>
                    <p className="text-[#6B7280] text-xs uppercase tracking-wider font-bold mb-1">Domain</p>
                    <p className="text-white">{myLead.domain}</p>
                  </div>
                  <div>
                    <p className="text-[#6B7280] text-xs uppercase tracking-wider font-bold mb-1">Organization</p>
                    <p className="text-white">{myLead.organization}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[#6B7280] text-xs uppercase tracking-wider font-bold mb-1">Skills Verified</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {myLead.skills?.split(',').map((s: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-[#1F2937] text-white text-sm rounded-full">{s.trim()}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[#6B7280]">No verified record found.</p>
              )}
            </div>
          </div>
        )}

        {/* BROWSE STARTUPS TAB */}
        {activeTab === 'browse' && (
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Startups</h1>
                <p className="text-[#9CA3AF]">Browse student startups from the VJ College ecosystem.</p>
              </div>
              <div className="flex gap-4">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                  <input
                    type="text"
                    placeholder="Search startups..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 bg-[#111111] border border-[#1F2937] rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#1D9E75] transition"
                  />
                </div>
                <select
                  value={domainFilter}
                  onChange={(e) => setDomainFilter(e.target.value)}
                  className="bg-[#111111] border border-[#1F2937] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#1D9E75] transition"
                >
                  <option value="">All Domains</option>
                  <option value="AI/ML">AI/ML</option>
                  <option value="SaaS">SaaS</option>
                  <option value="Hardware">Hardware</option>
                  <option value="EdTech">EdTech</option>
                  <option value="FinTech">FinTech</option>
                  <option value="Healthcare">Healthcare</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStartups.map((startup: any) => (
                <div key={startup.id} className="bg-[#111111] border border-[#1F2937] rounded-2xl p-6 hover:border-[#1D9E75]/50 hover:shadow-[0_0_30px_rgba(29,158,117,0.1)] transition-all flex flex-col h-full group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{startup.name}</h3>
                      <p className="text-[#9CA3AF] text-sm mt-1">by {startup.user?.name || "Unknown Founder"}</p>
                    </div>
                    <span className="bg-[#1F2937] text-xs font-bold px-2 py-1 rounded text-white">{startup.stage}</span>
                  </div>
                  
                  {startup.tagline && <p className="text-[#1D9E75] text-sm font-medium mb-4 italic">"{startup.tagline}"</p>}
                  
                  <div className="flex-1">
                    <p className="text-xs uppercase text-[#6B7280] font-bold tracking-wider mb-1">Problem Space</p>
                    <p className="text-sm text-white line-clamp-2 mb-4 leading-relaxed">{startup.problemStatement || startup.focus}</p>
                    
                    <p className="text-xs uppercase text-[#6B7280] font-bold tracking-wider mb-1">Help Needed</p>
                    <p className="text-sm text-white line-clamp-2 leading-relaxed">{startup.helpNeeded || "Open to general guidance"}</p>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-[#1F2937] flex flex-wrap gap-4 text-xs text-[#9CA3AF]">
                    <div className="flex items-center gap-1"><Briefcase size={14} /> {startup.focus}</div>
                    <div className="flex items-center gap-1"><Users size={14} /> Team of {startup.teamSize || 1}</div>
                    {startup.trlLevel && <div className="font-mono bg-white/5 px-1.5 rounded text-white">TRL {startup.trlLevel}</div>}
                  </div>
                </div>
              ))}
              
              {filteredStartups.length === 0 && (
                <div className="col-span-full py-20 text-center text-[#6B7280]">
                  <Search size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="text-lg">No startups found matching your filters.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CONNECTIONS TAB */}
        {activeTab === 'connections' && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">My Connections</h1>
              <p className="text-[#9CA3AF]">Track intro requests from founders.</p>
            </div>

            <div className="bg-[#111111] border border-[#1F2937] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0A0A0A] text-[#9CA3AF] text-sm uppercase tracking-wider">
                      <th className="p-4 font-bold border-b border-[#1F2937]">Founder & Startup</th>
                      <th className="p-4 font-bold border-b border-[#1F2937]">Domain</th>
                      <th className="p-4 font-bold border-b border-[#1F2937]">Date Requested</th>
                      <th className="p-4 font-bold border-b border-[#1F2937]">Sourcer Status</th>
                      <th className="p-4 font-bold border-b border-[#1F2937]">Overall Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {connections.map((conn: any) => (
                      <tr key={conn.id} className="border-b border-[#1F2937]/50 hover:bg-white/[0.02] transition">
                        <td className="p-4">
                          <p className="text-white font-bold">{conn.user?.name || "Unknown Founder"}</p>
                          <p className="text-[#9CA3AF] text-sm mt-0.5">Startup Name N/A</p> {/* Need startup name linked in conn? */}
                        </td>
                        <td className="p-4 text-sm text-white">{conn.domain || myLead?.domain || "N/A"}</td>
                        <td className="p-4 text-sm text-[#9CA3AF] font-mono">{new Date(conn.createdAt).toLocaleDateString()}</td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${conn.sourcerResponse === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : conn.sourcerResponse === 'declined' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'}`}>
                            {conn.sourcerResponse || 'pending'}
                          </span>
                        </td>
                        <td className="p-4">
                          {getStatusBadge(conn.status)}
                        </td>
                      </tr>
                    ))}
                    {connections.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-[#6B7280]">
                          No connection requests found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
