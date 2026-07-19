'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Search, Filter, ArrowUpDown, Sparkles, User, Users, School, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  description: string;
  college: string;
  leaderId: string;
  leaderName: string;
  members: string[];
  membersList?: { name: string; gender: string; }[];
  remainingSlots: number;
  status: 'open' | 'full';
  inviteLink: string;
  joinRequests: any[];
  createdAt: string;
}

export default function TeamsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { addToast, socket } = useSocket();

  // State lists
  const [teams, setTeams] = useState<Team[]>([]);
  const [colleges, setColleges] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState('');
  const [selectedCollege, setSelectedCollege] = useState('');
  const [slotsOnly, setSlotsOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState('alphabetical'); // alphabetical | newest

  // Request state
  const [pendingRequests, setPendingRequests] = useState<{ [teamId: string]: boolean }>({});

  // Fetch distinct colleges
  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/public/colleges');
        if (res.ok) {
          const list = await res.json();
          setColleges(list);
        }
      } catch (err) {
        console.error('Failed to fetch colleges:', err);
      }
    };
    fetchColleges();
  }, []);

  // Fetch teams with filters
  const fetchTeams = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCollege) params.append('college', selectedCollege);
      if (slotsOnly) params.append('slotsAvailable', 'true');
      params.append('sort', sortOrder);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/public/teams?${params.toString()}`);
      if (res.ok) {
        const list = await res.json();
        setTeams(list);

        // Find which teams have a pending request from current user
        if (user) {
          const pendingObj: { [teamId: string]: boolean } = {};
          list.forEach((t: Team) => {
            const hasPending = t.joinRequests.some((r: any) => r.userId === user.id && r.status === 'pending');
            if (hasPending) pendingObj[t.id] = true;
          });
          setPendingRequests(pendingObj);
        }
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [search, selectedCollege, slotsOnly, sortOrder, user]);

  // Handle Join Request
  const handleJoinRequest = async (team: Team) => {
    if (!user) {
      addToast('Authentication Required', 'Please log in to join a team.', 'warning');
      router.push('/login');
      return;
    }

    if (user.paymentStatus !== 'paid') {
      addToast('Payment Required', 'You must complete the registration payment before joining a team.', 'warning');
      router.push('/register');
      return;
    }

    if (user.teamId) {
      addToast('Action Prohibited', 'You are already in a team. Leave your current team first.', 'warning');
      return;
    }

    try {
      const savedToken = localStorage.getItem('codesprint_token');
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/teams/join-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${savedToken}`,
        },
        body: JSON.stringify({ teamId: team.id }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setPendingRequests(prev => ({ ...prev, [team.id]: true }));
        addToast('Request Dispatched', `Join request sent to ${team.leaderName}.`, 'success');

        // Emit instant socket event for real-time notification trigger
        if (socket) {
          socket.emit('new_join_request', {
            leaderId: team.leaderId,
            teamId: team.id,
            requesterName: user.name
          });
        }
      } else {
        addToast('Request Failed', data.message || 'Unable to join team.', 'warning');
      }
    } catch (err) {
      console.error(err);
      addToast('Connection Error', 'Failed to dispatch request to leader.', 'warning');
    }
  };

  return (
    <div className="flex-1 w-full bg-slate-50 text-slate-800 relative overflow-hidden bg-grid py-20 px-4 sm:px-6 lg:px-8 animate-[fadeIn_0.3s_ease-out]">
      {/* Decorative ambient glows in light mode */}
      <div className="absolute top-[-10%] left-[-15%] w-[40%] h-[40%] rounded-full bg-purple-100/50 blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[40%] h-[40%] rounded-full bg-blue-100/50 blur-[100px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm mb-3">
            <Sparkles className="h-3.5 w-3.5 text-purple-600" />
            Hackathon Matchmaking Hub
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Public Hackathon Teams</h1>
          <p className="text-xs text-slate-500 mt-2 max-w-lg mx-auto leading-relaxed">
            Browse public student groups looking for members for CodeSprint-2026. Send a request to join an open team or start your own.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 mb-10 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search by team leader or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 text-xs"
            />
          </div>

          {/* Filters Group */}
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            {/* College Filter */}
            <div className="relative flex-1 sm:flex-none">
              <select
                value={selectedCollege}
                onChange={(e) => setSelectedCollege(e.target.value)}
                className="w-full sm:w-44 py-2 px-3 pr-8 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:border-purple-500/50 text-xs appearance-none cursor-pointer"
              >
                <option value="">All Colleges</option>
                {colleges.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
                <Filter className="h-3 w-3" />
              </span>
            </div>

            {/* Sorting Dropdown */}
            <div className="relative flex-1 sm:flex-none">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full sm:w-44 py-2 px-3 pr-8 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:border-purple-500/50 text-xs appearance-none cursor-pointer"
              >
                <option value="alphabetical">Sort Alphabetical</option>
                <option value="newest">Sort Newest</option>
              </select>
              <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
                <ArrowUpDown className="h-3 w-3" />
              </span>
            </div>

            {/* Slots available toggle */}
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none pl-1">
              <input
                type="checkbox"
                checked={slotsOnly}
                onChange={(e) => setSlotsOnly(e.target.checked)}
                className="rounded border-slate-300 text-purple-650 focus:ring-purple-500 h-4 w-4 bg-white"
              />
              Slots Available Only
            </label>
          </div>
        </div>

        {/* Grid Lists */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((s) => (
              <div key={s} className="bg-white border border-slate-200/80 p-6 rounded-2xl h-60 animate-pulse flex flex-col justify-between shadow-sm">
                <div className="space-y-3">
                  <div className="h-4 bg-slate-100 rounded w-1/3"></div>
                  <div className="h-6 bg-slate-100 rounded w-2/3"></div>
                  <div className="h-10 bg-slate-100 rounded"></div>
                </div>
                <div className="h-8 bg-slate-100 rounded w-1/2 mt-4"></div>
              </div>
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800">No Public Teams Found</h3>
            <p className="text-xs text-slate-500 mt-1">Try modifying your search queries or create a team yourself.</p>
            {user?.paymentStatus === 'paid' && !user?.teamId && (
              <button
                onClick={() => router.push('/dashboard?tab=team')}
                className="mt-6 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 mx-auto cursor-pointer"
              >
                Create a Team Now
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => {
              const isFull = team.status === 'full' || team.remainingSlots <= 0;
              const hasRequested = pendingRequests[team.id];

              return (
                <div
                  key={team.id}
                  className="bg-white border border-slate-200/85 hover:border-slate-350 p-6 rounded-2xl flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-md hover:scale-[1.01] relative group"
                >
                  {/* Top line highlight on hover */}
                  <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-purple-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Header / Meta */}
                  <div>
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <div className="flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-200 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">
                        <School className="h-3.5 w-3.5 text-purple-600" />
                        {team.college}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider font-mono ${isFull ? 'text-slate-400' : 'text-emerald-600 font-extrabold animate-pulse'}`}>
                        {isFull ? 'Full' : 'Open'}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug group-hover:text-purple-600 transition-colors">
                      {team.name}
                    </h3>
                    <p className="text-xxs text-slate-500 mt-1 flex items-center gap-1">
                      <User className="h-3 w-3 text-slate-400" />
                      Leader: <strong className="text-slate-700 font-semibold">{team.leaderName}</strong>
                    </p>

                    <p className="text-xs text-slate-600 mt-3.5 leading-relaxed line-clamp-3">
                      {team.description}
                    </p>

                    {/* Members List with Name and Gender */}
                    {team.membersList && team.membersList.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100/60 space-y-2">
                        {team.membersList.map((m: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-slate-700">{m.name}</span>
                            <span 
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                m.gender?.toLowerCase() === 'female' 
                                  ? 'bg-pink-50/50 border-pink-100 text-pink-700' 
                                  : 'bg-blue-50/50 border-blue-100 text-blue-700'
                              }`}
                            >
                              {m.gender}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer / Slots & Actions */}
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                    <div className="flex flex-col text-left">
                      <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider font-mono">Remaining</span>
                      <span className="text-xs font-bold text-slate-800 font-mono mt-0.5 flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-slate-450" />
                        {team.remainingSlots} Slots
                      </span>
                    </div>

                    {user?.teamId === team.id ? (
                      <span className="text-[11px] font-bold text-slate-700 border border-slate-200 bg-slate-50 px-3.5 py-2 rounded-xl">
                        Your Team
                      </span>
                    ) : hasRequested ? (
                      <button
                        disabled
                        className="px-4 py-2 border border-slate-200 bg-slate-50 text-slate-450 rounded-xl text-xs font-semibold"
                      >
                        Request Pending
                      </button>
                    ) : isFull ? (
                      <button
                        disabled
                        className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-450 rounded-xl text-xs font-semibold"
                      >
                        Team Full
                      </button>
                    ) : (
                      <button
                        onClick={() => handleJoinRequest(team)}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1 cursor-pointer active:scale-[0.98]"
                      >
                        Join Team
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
