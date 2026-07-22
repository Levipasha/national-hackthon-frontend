'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, User, Users, School, GraduationCap, Crown, Shield, UserCheck, X, Sparkles } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  college: string;
  year: string;
  branch: string;
  gender: string;
  role: 'admin' | 'team-leader' | 'participant';
  teamId: string;
  teamRole: 'leader' | 'member';
  teamName: string;
}

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [colleges, setColleges] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalParticipants, setTotalParticipants] = useState<number | null>(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [selectedCollege, setSelectedCollege] = useState('');

  const isFiltered = Boolean(search.trim() || selectedCollege);
  const displayTotal = totalParticipants !== null ? totalParticipants : (loading ? 0 : participants.length);

  // Fetch distinct colleges
  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const res = await fetch(`${apiUrl}/api/public/colleges`);
        if (res.ok) {
          const list = await res.json();
          const cleanList = (list as string[]).filter(
            (c) => c && c.trim() !== '' && c.toLowerCase() !== 'codesprint core' && c.toLowerCase() !== 'n/a'
          );
          setColleges(cleanList);
        }
      } catch (err) {
        console.error('Failed to fetch colleges:', err);
      }
    };
    fetchColleges();
  }, []);

  // Filter out admin placeholder entries (e.g. CODESPRINT Core) from colleges list
  const participatingColleges = React.useMemo(() => {
    const set = new Set<string>();
    colleges.forEach((c) => {
      if (c && c.toLowerCase() !== 'codesprint core' && c.toLowerCase() !== 'n/a') {
        set.add(c.trim());
      }
    });
    participants.forEach((p) => {
      if (p.college && p.college.toLowerCase() !== 'codesprint core' && p.college !== 'N/A') {
        set.add(p.college.trim());
      }
    });
    return Array.from(set).sort();
  }, [colleges, participants]);

  // Fetch initial total participants count on mount
  useEffect(() => {
    const fetchTotalCount = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const res = await fetch(`${apiUrl}/api/public/participants`);
        if (res.ok) {
          const list = await res.json();
          setTotalParticipants(list.length);
        }
      } catch (err) {
        console.error('Failed to fetch total count:', err);
      }
    };
    fetchTotalCount();
  }, []);

  // Fetch participants with filters
  const fetchParticipants = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCollege) params.append('college', selectedCollege);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/public/participants?${params.toString()}`);
      if (res.ok) {
        const list = await res.json();
        setParticipants(list);
        if (!search && !selectedCollege) {
          setTotalParticipants(list.length);
        }
      }
    } catch (err) {
      console.error('Error fetching participants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, [search, selectedCollege]);

  // Clear filters
  const clearFilters = () => {
    setSearch('');
    setSelectedCollege('');
  };

  // Group participants by teamName
  const groupedTeams = React.useMemo(() => {
    const groups: { [teamName: string]: Participant[] } = {};
    participants.forEach((p) => {
      const groupKey = p.teamName || 'Individual Participants';
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(p);
    });

    // Ensure leaders are at top of each team array
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => {
        if (a.teamRole === 'leader' && b.teamRole !== 'leader') return -1;
        if (b.teamRole === 'leader' && a.teamRole !== 'leader') return 1;
        return a.name.localeCompare(b.name);
      });
    });

    return groups;
  }, [participants]);

  return (
    <div className="flex-1 w-full bg-slate-50 text-slate-800 relative overflow-hidden bg-grid pt-8 pb-20 px-4 sm:px-6 lg:px-8 animate-[fadeIn_0.3s_ease-out]">
      {/* Decorative ambient glows */}
      <div className="absolute top-[-10%] left-[-15%] w-[40%] h-[40%] rounded-full bg-purple-100/50 blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[40%] h-[40%] rounded-full bg-blue-100/50 blur-[100px] pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">CodeSprint Participants</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-lg mx-auto leading-relaxed">
            Browse all confirmed hackathon participants for CodeSprint-2026, grouped by team.
          </p>
        </div>

        {/* Counts Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          {/* Total Students Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex items-center gap-3.5">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Students</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  {loading && totalParticipants === null ? '...' : displayTotal}
                </span>
                <span className="text-xs text-slate-500 font-medium">total</span>
              </div>
            </div>
          </div>

          {/* Filtered Students Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex items-center gap-3.5">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-purple-200">
              <UserCheck className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {isFiltered ? 'Filtered Students' : 'Showing Students'}
              </p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black text-purple-700">
                  {loading ? '...' : participants.length}
                </span>
                {isFiltered && (
                  <span className="text-xs text-slate-500 font-medium">of {displayTotal}</span>
                )}
              </div>
            </div>
          </div>

          {/* Colleges Card */}
          <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex items-center gap-3.5">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
              <School className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Colleges</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  {participatingColleges.length}
                </span>
                <span className="text-xs text-slate-500 font-medium">institutions</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
          {/* Search Box */}
          <div className="relative w-full md:w-96">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search by participant name, college, branch, or team..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 text-xs"
            />
          </div>

          {/* Filters Group */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            {/* College Filter */}
            <div className="relative flex-1 sm:flex-none">
              <select
                value={selectedCollege}
                onChange={(e) => setSelectedCollege(e.target.value)}
                className="w-full sm:w-56 py-2 px-3 pr-8 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:border-purple-500/50 text-xs appearance-none cursor-pointer"
              >
                <option value="">All Colleges</option>
                {participatingColleges.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
                <Filter className="h-3 w-3" />
              </span>
            </div>

            {/* Clear Filters Button (shown when filter active) */}
            {isFiltered && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-purple-700 bg-slate-100 hover:bg-purple-50 border border-slate-200 hover:border-purple-200 rounded-xl transition-colors cursor-pointer"
                title="Clear filters"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            )}

            {/* Count Badge inside toolbar */}
            <div className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-100 text-purple-700 font-bold text-xs flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-purple-600" />
              <span>
                {loading
                  ? 'Loading...'
                  : isFiltered
                  ? `${participants.length} / ${displayTotal} Students`
                  : `${displayTotal} Total Students`}
              </span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="bg-white border border-slate-200/80 p-5 rounded-2xl h-24 animate-pulse flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4 w-full">
                  <div className="h-11 w-11 rounded-2xl bg-slate-100 flex-shrink-0"></div>
                  <div className="space-y-2 w-1/2">
                    <div className="h-4 bg-slate-100 rounded w-1/3"></div>
                    <div className="h-3 bg-slate-100 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : Object.keys(groupedTeams).length === 0 ? (
          <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800">No Participants Found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Try modifying your search query or college filter.
            </p>
            {isFiltered && (
              <button
                onClick={clearFilters}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                Reset Filters ({displayTotal} total available)
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {participants.map((member) => {
              const isLeader = member.teamRole === 'leader' || member.role === 'team-leader';

              return (
                <div
                  key={member.id}
                  className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between gap-4 group"
                >
                  {/* Participant Main Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Avatar Icon */}
                    <div className={`h-11 w-11 rounded-2xl flex items-center justify-center text-xs font-extrabold flex-shrink-0 transition-transform group-hover:scale-105 ${
                      isLeader
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {isLeader ? (
                        <Crown className="h-5 w-5 text-amber-300 fill-amber-300" />
                      ) : (
                        member.name.substring(0, 2).toUpperCase()
                      )}
                    </div>

                    {/* Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight group-hover:text-purple-600 transition-colors">
                          {member.name}
                        </h3>

                        {isLeader ? (
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
                            <Crown className="h-3 w-3 text-purple-600" />
                            Team Leader
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            Member
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <School className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
                          {member.college}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-600 font-medium">
                          <GraduationCap className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          {member.year}
                        </span>
                        {member.branch && (
                          <>
                            <span>•</span>
                            <span className="text-slate-600 font-medium">{member.branch}</span>
                          </>
                        )}
                      </div>
                    </div>
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

