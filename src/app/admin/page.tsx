'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { BarChart3, Users, Ticket, Award, Settings, Bell, Search, UserCheck, ShieldAlert, Plus, ToggleLeft, ToggleRight, Trash2, GitMerge, FileDown, Radio, Camera, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, token, loading } = useAuth();
  const { addToast, socket } = useSocket();

  // Protect page and ensure Admin role
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'admin') {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  // Tab State: stats | participants | qr | coupons | teams | broadcast
  const [activeTab, setActiveTab] = useState('stats');

  // Stats Data
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Participants Data
  const [participants, setParticipants] = useState<any[]>([]);
  const [participantSearch, setParticipantSearch] = useState('');
  const [participantsLoading, setParticipantsLoading] = useState(false);

  // QR scanner state
  const [qrScanning, setQrScanning] = useState(false);
  const [selectedScannerUser, setSelectedScannerUser] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);

  // Coupons Data
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [newCouponForm, setNewCouponForm] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: '',
    collegeName: '',
    usageLimit: '',
    expiryDate: ''
  });

  // Teams Data
  const [adminTeams, setAdminTeams] = useState<any[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [mergeTeamA, setMergeTeamA] = useState('');
  const [mergeTeamB, setMergeTeamB] = useState('');

  // Broadcast Notification State
  const [broadcastForm, setBroadcastForm] = useState({
    recipientType: 'all',
    recipientTarget: '',
    title: '',
    message: '',
    channel: 'email'
  });
  const [broadcastLoading, setBroadcastLoading] = useState(false);

  // 1. Fetch Analytics Stats
  const fetchAdminStats = async () => {
    if (!token) return;
    setStatsLoading(true);
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  // 2. Fetch Participants List
  const fetchParticipants = async () => {
    if (!token) return;
    setParticipantsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/participants?search=${participantSearch}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const list = await res.json();
        setParticipants(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setParticipantsLoading(false);
    }
  };

  // 3. Fetch Coupons
  const fetchCoupons = async () => {
    if (!token) return;
    setCouponsLoading(true);
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/admin/coupons', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const list = await res.json();
        setCoupons(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCouponsLoading(false);
    }
  };

  // 4. Fetch Teams
  const fetchAdminTeams = async () => {
    if (!token) return;
    setTeamsLoading(true);
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/admin/teams', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const list = await res.json();
        setAdminTeams(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTeamsLoading(false);
    }
  };

  // Trigger loads based on tab selection
  useEffect(() => {
    if (user && user.role === 'admin') {
      if (activeTab === 'stats') fetchAdminStats();
      if (activeTab === 'participants') fetchParticipants();
      if (activeTab === 'qr') fetchParticipants(); // Need user list for scanner select
      if (activeTab === 'coupons') fetchCoupons();
      if (activeTab === 'teams') fetchAdminTeams();
    }
  }, [activeTab, user, participantSearch]);

  if (loading || !user || user.role !== 'admin') {
    return (
      <div className="flex-1 w-full bg-[#03030f] flex items-center justify-center text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-purple-500/30 border-t-purple-500 animate-spin"></div>
          <span className="text-xs font-semibold">Validating admin credentials...</span>
        </div>
      </div>
    );
  }

  // Check-in Manual trigger
  const handleCheckIn = async (userId: string) => {
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/admin/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        addToast('Check-in Successful', `${data.user.name} checked in successfully.`, 'success');
        if (activeTab === 'participants') fetchParticipants();
        if (activeTab === 'qr') {
          setScanResult({ success: true, user: data.user, time: new Date().toLocaleTimeString() });
          fetchParticipants();
        }

        // Notify client view to reload certificate unlocked status
        if (socket) {
          socket.emit('team_modified', data.user.teamId || data.user.id);
        }
      } else {
        addToast('Check-in Failed', data.message || 'Operation declined.', 'warning');
        if (activeTab === 'qr') {
          setScanResult({ success: false, message: data.message || 'Check-in declined.' });
        }
      }
    } catch (err) {
      console.error(err);
      addToast('Connection Error', 'Failed to submit check-in command.', 'warning');
    }
  };

  // Toggle Coupon active state
  const handleToggleCoupon = async (couponId: string) => {
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/admin/coupons/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ couponId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addToast('Coupon Toggled', `Status of code ${data.coupon.code} updated.`, 'success');
        fetchCoupons();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create Coupon
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/admin/coupons/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newCouponForm)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        addToast('Coupon Created', `Promo code ${data.coupon.code} registered.`, 'success');
        setNewCouponForm({
          code: '',
          discountType: 'percentage',
          discountValue: '',
          collegeName: '',
          usageLimit: '',
          expiryDate: ''
        });
        fetchCoupons();
      } else {
        addToast('Creation Failed', data.message || 'Coupon not registered.', 'warning');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Dissolve Team
  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Dissolve team "${teamName}"? Members will be reset to individual state.`)) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/teams/${teamId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok && data.success) {
        addToast('Team Dissolved', `Dissolved "${teamName}" and reset members.`, 'warning');
        fetchAdminTeams();

        // Broadcast websocket reload
        if (socket) {
          socket.emit('team_modified', teamId);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerifyExtraSlots = async (teamId: string, action: 'approve' | 'reject') => {
    if (!token) return;
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/admin/verify-extra-slots', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ teamId, action })
      });
      const data = await res.json();
      if (res.ok) {
        addToast('Success', `Slots request has been ${action}d successfully.`, 'success');
        fetchAdminTeams(); // refresh list
      } else {
        addToast('Error', data.message || 'Verification failed.', 'warning');
      }
    } catch (err) {
      console.error(err);
      addToast('Error', 'Network error verifying extra slots.', 'warning');
    }
  };

  // Merge Teams
  const handleMergeTeams = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mergeTeamA || !mergeTeamB) return;
    if (mergeTeamA === mergeTeamB) {
      addToast('Validation Error', 'Cannot merge a team into itself.', 'warning');
      return;
    }

    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/admin/teams/merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ teamAId: mergeTeamA, teamBId: mergeTeamB })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        addToast('Teams Merged', data.message, 'success');
        setMergeTeamA('');
        setMergeTeamB('');
        fetchAdminTeams();

        // Broadcast WS update for both rooms
        if (socket) {
          socket.emit('team_modified', mergeTeamA);
          socket.emit('team_modified', mergeTeamB);
        }
      } else {
        addToast('Merge Failed', data.message || 'Operation declined.', 'warning');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Dispatch Broadcast Notification (email/SMS simulator)
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setBroadcastLoading(true);

    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/admin/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(broadcastForm)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        addToast('Broadcast Sent', `Notification dispatched via ${broadcastForm.channel}!`, 'success');
        setBroadcastForm({
          recipientType: 'all',
          recipientTarget: '',
          title: '',
          message: '',
          channel: 'email'
        });

        // Trigger Socket.IO real-time notification broadcast
        if (socket) {
          socket.emit('admin_broadcast', {
            targetType: broadcastForm.recipientType,
            targetId: broadcastForm.recipientTarget || undefined,
            title: broadcastForm.title,
            message: broadcastForm.message
          });
        }
      } else {
        addToast('Broadcast Failed', data.message || 'Could not send broadcast.', 'warning');
      }
    } catch (err) {
      console.error(err);
      addToast('Connection Error', 'Failed to communicate with notifications dispatcher.', 'warning');
    } finally {
      setBroadcastLoading(false);
    }
  };

  // Simulate camera check-in scan
  const handleSimulateScan = () => {
    if (!selectedScannerUser) return;
    setQrScanning(true);
    setScanResult(null);

    // Simulate scanning delay
    setTimeout(() => {
      setQrScanning(false);
      handleCheckIn(selectedScannerUser);
    }, 1800);
  };

  return (
    <div className="flex-1 w-full bg-[#03030f] relative overflow-hidden bg-grid py-12 px-4 sm:px-6 lg:px-8">
      {/* ambient glows */}
      <div className="absolute top-[-10%] left-[-15%] w-[45%] h-[45%] rounded-full bg-purple-900/10 blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[45%] h-[45%] rounded-full bg-blue-900/10 blur-[100px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Nav */}
        <aside className="w-full md:w-60 flex-shrink-0 flex flex-col gap-2">
          {/* Header Panel */}
          <div className="glass-panel border-purple-500/20 bg-purple-500/5 rounded-2xl p-5 mb-4 backdrop-blur-xl relative overflow-hidden">
            <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest block">Core Administrator</span>
            <h2 className="text-sm font-extrabold text-white mt-0.5">Control Terminal</h2>
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-[10px] text-zinc-400 font-semibold">Systems Secure</span>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('stats')}
            className={`w-full py-3 px-4 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'stats'
                ? 'bg-purple-500/10 border border-purple-500/20 text-white shadow-inner'
                : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <BarChart3 className="h-4.5 w-4.5 text-purple-400" />
            Live Analytics
          </button>

          <button
            onClick={() => setActiveTab('participants')}
            className={`w-full py-3 px-4 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'participants'
                ? 'bg-purple-500/10 border border-purple-500/20 text-white shadow-inner'
                : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Users className="h-4.5 w-4.5 text-blue-400" />
            Participants List
          </button>

          <button
            onClick={() => setActiveTab('qr')}
            className={`w-full py-3 px-4 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-purple-500/10 border border-purple-500/20 text-white shadow-inner'
                : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Camera className="h-4.5 w-4.5 text-emerald-400" />
            QR Ticket Scanner
          </button>

          <button
            onClick={() => setActiveTab('coupons')}
            className={`w-full py-3 px-4 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'coupons'
                ? 'bg-purple-500/10 border border-purple-500/20 text-white shadow-inner'
                : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Ticket className="h-4.5 w-4.5 text-indigo-400" />
            Coupon Manager
          </button>

          <button
            onClick={() => setActiveTab('teams')}
            className={`w-full py-3 px-4 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'teams'
                ? 'bg-purple-500/10 border border-purple-500/20 text-white shadow-inner'
                : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <GitMerge className="h-4.5 w-4.5 text-pink-400" />
            Hackathon Teams
          </button>

          <button
            onClick={() => setActiveTab('broadcast')}
            className={`w-full py-3 px-4 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'broadcast'
                ? 'bg-purple-500/10 border border-purple-500/20 text-white shadow-inner'
                : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Radio className="h-4.5 w-4.5 text-orange-400" />
            Broadcast Center
          </button>
        </aside>

        {/* Content Body */}
        <main className="flex-1 min-h-[450px]">
          
          {/* --- SUBTAB 1: LIVE ANALYTICS --- */}
          {activeTab === 'stats' && (
            <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
              {statsLoading || !stats ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(s => <div key={s} className="glass-panel border-white/5 h-24 rounded-2xl animate-pulse" />)}
                </div>
              ) : (
                <>
                  {/* Stats Grid Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="glass-panel border-white/5 p-4 rounded-2xl text-left">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold">Total Registrations</span>
                      <p className="text-xl sm:text-2xl font-extrabold text-white font-mono mt-1">{stats.totalRegistrations}</p>
                    </div>
                    <div className="glass-panel border-white/5 p-4 rounded-2xl text-left">
                      <span className="text-[10px] text-emerald-500 uppercase font-bold">Paid Participants</span>
                      <p className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono mt-1">{stats.paidParticipants}</p>
                    </div>
                    <div className="glass-panel border-white/5 p-4 rounded-2xl text-left">
                      <span className="text-[10px] text-purple-500 uppercase font-bold">Total Teams formed</span>
                      <p className="text-xl sm:text-2xl font-extrabold text-purple-400 font-mono mt-1">{stats.totalTeams}</p>
                    </div>
                    <div className="glass-panel border-white/5 p-4 rounded-2xl text-left">
                      <span className="text-[10px] text-yellow-500 uppercase font-bold">Total Revenue (₹)</span>
                      <p className="text-xl sm:text-2xl font-extrabold text-yellow-400 font-mono mt-1">₹{stats.totalRevenue.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Graphs & Distributions */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Live registration trend using interactive SVG */}
                    <div className="glass-panel border-white/5 rounded-2xl p-6 md:col-span-2 text-left h-80 flex flex-col justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Registration Timeline Trend</h3>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Aggregated daily count of attendee registrations.</p>
                      </div>
                      <div className="w-full h-44 bg-white/[0.01] border border-white/5 rounded-xl flex items-end justify-between p-4 relative">
                        {stats.liveRegistrationsGraph.length === 0 ? (
                          <span className="text-xxs text-zinc-500 m-auto">No timeline trend data yet</span>
                        ) : (
                          stats.liveRegistrationsGraph.map((g: any, i: number) => {
                            const maxVal = Math.max(...stats.liveRegistrationsGraph.map((x: any) => x.count), 1);
                            const percentHeight = Math.round((g.count / maxVal) * 80);
                            return (
                              <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group">
                                <span className="text-[9px] text-purple-400 font-bold mb-1 opacity-0 group-hover:opacity-100 transition-opacity font-mono">{g.count}</span>
                                <div
                                  className="w-[70%] rounded-t bg-gradient-to-t from-purple-600/50 to-blue-500/80 group-hover:from-purple-500 group-hover:to-blue-400 transition-all border border-purple-500/10 cursor-pointer"
                                  style={{ height: `${percentHeight}%` }}
                                />
                                <span className="text-[8px] text-zinc-600 font-semibold mt-1 font-mono">{g.date.split('-')[2]}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* College Distribution */}
                    <div className="glass-panel border-white/5 rounded-2xl p-6 text-left h-80 flex flex-col justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">College Distribution</h3>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Major hubs participating in the hackathon.</p>
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3.5 mt-4 pr-1">
                        {Object.entries(stats.collegeDistribution).length === 0 ? (
                          <span className="text-xxs text-zinc-500 block text-center py-10">No college data yet</span>
                        ) : (
                          Object.entries(stats.collegeDistribution).map(([clg, count]: any) => (
                            <div key={clg} className="text-xs space-y-1">
                              <div className="flex justify-between font-semibold">
                                <span className="text-zinc-300 truncate max-w-[130px]">{clg}</span>
                                <span className="text-zinc-400 font-mono">{count} student{count > 1 ? 's' : ''}</span>
                              </div>
                              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500" style={{ width: `${Math.min(100, (count / stats.totalRegistrations) * 100)}%` }} />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* --- SUBTAB 2: PARTICIPANTS LIST --- */}
          {activeTab === 'participants' && (
            <div className="space-y-6 animate-[fadeIn_0.2s_ease-out] text-left">
              {/* Toolbar */}
              <div className="glass-panel border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search name, email, college or phone..."
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2 rounded-xl border border-white/5 bg-[#050514]/60 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 text-xs"
                  />
                </div>

                <a
                  href={process.env.NEXT_PUBLIC_API_URL + '/api/admin/export-csv'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileDown className="h-4 w-4" />
                  Export Participants CSV
                </a>
              </div>

              {/* Participants table */}
              <div className="glass-panel border-white/5 rounded-2xl overflow-x-auto custom-scrollbar">
                <table className="w-full min-w-[700px] border-collapse text-xs text-left">
                  <thead>
                    <tr className="border-b border-white/5 text-zinc-500 font-bold uppercase tracking-wider">
                      <th className="px-5 py-4">Attendee Name</th>
                      <th className="px-5 py-4">Email / College</th>
                      <th className="px-5 py-4">Payment</th>
                      <th className="px-5 py-4">Attendance Check-in</th>
                      <th className="px-5 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participantsLoading ? (
                      [1, 2, 3].map(row => (
                        <tr key={row} className="border-b border-white/5 animate-pulse">
                          <td className="px-5 py-4"><div className="h-4 bg-white/5 rounded w-24"></div></td>
                          <td className="px-5 py-4"><div className="h-4 bg-white/5 rounded w-36"></div></td>
                          <td className="px-5 py-4"><div className="h-4 bg-white/5 rounded w-16"></div></td>
                          <td className="px-5 py-4"><div className="h-4 bg-white/5 rounded w-20"></div></td>
                          <td className="px-5 py-4"><div className="h-6 bg-white/5 rounded w-16 mx-auto"></div></td>
                        </tr>
                      ))
                    ) : participants.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-zinc-500">
                          No registered participants found matching search query.
                        </td>
                      </tr>
                    ) : (
                      participants.map((item) => (
                        <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                          <td className="px-5 py-4 font-bold text-zinc-200">{item.name}</td>
                          <td className="px-5 py-4 space-y-0.5">
                            <span className="block text-zinc-300 font-mono text-[10px]">{item.email}</span>
                            <span className="block text-zinc-500 text-[10px]">{item.college}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                              item.paymentStatus === 'paid' 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {item.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {item.checkedIn ? (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="h-4 w-4" />
                                Checked In
                              </span>
                            ) : (
                              <span className="text-zinc-500">Absent</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-center">
                            {item.paymentStatus === 'paid' && !item.checkedIn && (
                              <button
                                onClick={() => handleCheckIn(item.id)}
                                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-[10px] cursor-pointer transition-all"
                              >
                                Check In
                              </button>
                            )}
                            {item.paymentStatus === 'paid' && item.checkedIn && (
                              <span className="text-zinc-600 font-mono text-[9px]">
                                {item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Verified'}
                              </span>
                            )}
                            {item.paymentStatus !== 'paid' && (
                              <span className="text-zinc-600 font-mono text-[9px]">Unpaid</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- SUBTAB 3: SIMULATED QR SCANNER --- */}
          {activeTab === 'qr' && (
            <div className="space-y-6 animate-[fadeIn_0.2s_ease-out] text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {/* Simulated Camera Scanner UI */}
                <div className="glass-panel border-white/5 rounded-3xl p-6 flex flex-col items-center justify-between min-h-[350px]">
                  <div className="w-full flex justify-between items-center border-b border-white/5 pb-3">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Camera className="h-4.5 w-4.5 text-emerald-400 animate-pulse" />
                      QR Code Scanner Camera
                    </h3>
                    <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold px-2 py-0.5 rounded">
                      ACTIVE
                    </span>
                  </div>

                  {/* Camera lens simulation box */}
                  <div className="relative w-64 h-64 border border-white/10 rounded-2xl bg-black overflow-hidden flex items-center justify-center my-6">
                    {/* Corner crop borders */}
                    <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-emerald-500 rounded-tl" />
                    <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-emerald-500 rounded-tr" />
                    <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-emerald-500 rounded-bl" />
                    <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-emerald-500 rounded-br" />

                    {/* Scanning red laser line */}
                    {qrScanning && (
                      <div className="absolute inset-x-4 h-[2px] bg-red-500 shadow-md shadow-red-500/80 animate-[scannerLine_1.8s_infinite]" />
                    )}

                    {qrScanning ? (
                      <div className="flex flex-col items-center gap-1 text-zinc-500 text-xxs font-mono">
                        <RefreshCw className="h-6 w-6 animate-spin text-emerald-400 mb-2" />
                        <span>ANALYZING IMAGE FRAME...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-zinc-500 text-xxs font-mono text-center px-6">
                        <Camera className="h-8 w-8 text-zinc-700 mb-2" />
                        <span>AIM CAMERA AT PARTICIPANT RECEIPT QR CODE</span>
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-zinc-500 text-center">
                    Simulator will decode check-in credentials and mark attendance in DB.
                  </p>
                </div>

                {/* Scan Trigger & Verification Result Panel */}
                <div className="space-y-6">
                  {/* Select User simulation */}
                  <div className="glass-panel border-white/5 rounded-2xl p-5">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Choose Attendee to Scan</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] text-zinc-500 uppercase mb-1.5 font-bold">Select Participant</label>
                        <select
                          value={selectedScannerUser}
                          onChange={(e) => setSelectedScannerUser(e.target.value)}
                          className="w-full py-2 px-3 pr-8 rounded-xl border border-white/5 bg-[#050514]/60 text-zinc-300 focus:outline-none focus:border-purple-500/50 text-xs appearance-none cursor-pointer"
                        >
                          <option value="">-- Choose student QR --</option>
                          {participants
                            .filter(u => u.paymentStatus === 'paid' && !u.checkedIn)
                            .map((p) => (
                              <option key={p.id} value={p.id}>{p.name} ({p.college})</option>
                            ))}
                        </select>
                      </div>

                      <button
                        onClick={handleSimulateScan}
                        disabled={!selectedScannerUser || qrScanning}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {qrScanning ? 'Scanning...' : 'Simulate Scanning QR Code'}
                        <Camera className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Scan result response alert */}
                  {scanResult && (
                    <div className={`glass-panel border-white/5 rounded-2xl p-5 relative overflow-hidden ${
                      scanResult.success ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'
                    }`}>
                      {scanResult.success ? (
                        <div className="text-left space-y-2">
                          <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase">
                            <CheckCircle2 className="h-4 w-4" />
                            Attendance Verified
                          </h4>
                          <div className="text-xxs text-zinc-400 space-y-1">
                            <p>Name: <strong className="text-zinc-200">{scanResult.user.name}</strong></p>
                            <p>College: <strong className="text-zinc-200">{scanResult.user.college}</strong></p>
                            <p>Check-in time: <strong className="text-zinc-200">{scanResult.time}</strong></p>
                          </div>
                          <p className="text-[10px] text-emerald-400 font-semibold mt-2">✓ User e-certificate is now unlocked.</p>
                        </div>
                      ) : (
                        <div className="text-left space-y-2">
                          <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5 uppercase">
                            <ShieldAlert className="h-4 w-4" />
                            Validation Rejected
                          </h4>
                          <p className="text-xxs text-zinc-400 leading-normal">{scanResult.message}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* --- SUBTAB 4: COUPON MANAGER --- */}
          {activeTab === 'coupons' && (
            <div className="space-y-6 animate-[fadeIn_0.2s_ease-out] text-left">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Coupon creation form */}
                <div className="glass-panel border-white/5 rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-white mb-4 pb-2 border-b border-white/5 flex items-center gap-2">
                    <Plus className="h-4.5 w-4.5 text-purple-400" />
                    Register Promo Coupon
                  </h3>

                  <form onSubmit={handleCreateCoupon} className="space-y-4">
                    <div>
                      <label htmlFor="code" className="block text-[10px] text-zinc-500 uppercase font-bold mb-1 pl-1">Promo Code</label>
                      <input
                        id="code"
                        type="text"
                        required
                        placeholder="e.g. HYD30"
                        value={newCouponForm.code}
                        onChange={(e) => setNewCouponForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                        className="block w-full px-4 py-2.5 rounded-xl border border-white/5 bg-[#050514]/60 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="discountType" className="block text-[10px] text-zinc-500 uppercase font-bold mb-1 pl-1">Type</label>
                        <select
                          id="discountType"
                          value={newCouponForm.discountType}
                          onChange={(e) => setNewCouponForm(prev => ({ ...prev, discountType: e.target.value }))}
                          className="block w-full px-3 py-2.5 rounded-xl border border-white/5 bg-[#050514]/60 text-zinc-300 focus:outline-none focus:border-purple-500/50 text-xs"
                        >
                          <option value="percentage">% Percent</option>
                          <option value="fixed">Fixed (₹)</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="discountValue" className="block text-[10px] text-zinc-500 uppercase font-bold mb-1 pl-1">Val</label>
                        <input
                          id="discountValue"
                          type="number"
                          required
                          placeholder="e.g. 50"
                          value={newCouponForm.discountValue}
                          onChange={(e) => setNewCouponForm(prev => ({ ...prev, discountValue: e.target.value }))}
                          className="block w-full px-4 py-2.5 rounded-xl border border-white/5 bg-[#050514]/60 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="collegeName" className="block text-[10px] text-zinc-500 uppercase font-bold mb-1 pl-1">College Restrict (Opt)</label>
                      <input
                        id="collegeName"
                        type="text"
                        placeholder="e.g. JNTUH"
                        value={newCouponForm.collegeName}
                        onChange={(e) => setNewCouponForm(prev => ({ ...prev, collegeName: e.target.value }))}
                        className="block w-full px-4 py-2.5 rounded-xl border border-white/5 bg-[#050514]/60 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="usageLimit" className="block text-[10px] text-zinc-500 uppercase font-bold mb-1 pl-1">Limit</label>
                        <input
                          id="usageLimit"
                          type="number"
                          required
                          placeholder="100"
                          value={newCouponForm.usageLimit}
                          onChange={(e) => setNewCouponForm(prev => ({ ...prev, usageLimit: e.target.value }))}
                          className="block w-full px-4 py-2.5 rounded-xl border border-white/5 bg-[#050514]/60 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 text-xs"
                        />
                      </div>
                      <div>
                        <label htmlFor="expiryDate" className="block text-[10px] text-zinc-500 uppercase font-bold mb-1 pl-1">Expiry</label>
                        <input
                          id="expiryDate"
                          type="date"
                          required
                          value={newCouponForm.expiryDate}
                          onChange={(e) => setNewCouponForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                          className="block w-full px-3 py-2.5 rounded-xl border border-white/5 bg-[#050514]/60 text-zinc-300 focus:outline-none focus:border-purple-500/50 text-[10px]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Create Coupon Code
                      <Plus className="h-4 w-4" />
                    </button>
                  </form>
                </div>

                {/* Coupons list */}
                <div className="lg:col-span-2 glass-panel border-white/5 rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-white mb-4 pb-2 border-b border-white/5 flex items-center gap-2">
                    <Ticket className="h-4.5 w-4.5 text-blue-400" />
                    Active Promo Coupons
                  </h3>

                  <div className="space-y-3.5 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                    {couponsLoading ? (
                      <p className="text-zinc-500 text-xs py-6">Loading coupons list...</p>
                    ) : coupons.length === 0 ? (
                      <p className="text-zinc-500 text-xs py-6 text-center">No coupon codes registered yet.</p>
                    ) : (
                      coupons.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between p-3.5 border border-white/5 rounded-xl bg-[#050514]/40"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold font-mono text-zinc-200 text-sm">{c.code}</span>
                              <span className="text-[9px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded font-bold font-mono">
                                {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-1 space-x-2">
                              <span>Limit: <strong className="text-zinc-400">{c.usageCount} / {c.usageLimit}</strong></span>
                              {c.collegeName && <span>• College: <strong className="text-zinc-400">{c.collegeName}</strong></span>}
                              <span>• Exp: <strong className="text-zinc-400">{c.expiryDate}</strong></span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleToggleCoupon(c.id)}
                            className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                          >
                            {c.isActive ? (
                              <ToggleRight className="h-7 w-7 text-emerald-500" />
                            ) : (
                              <ToggleLeft className="h-7 w-7 text-zinc-600" />
                            )}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- SUBTAB 5: HACKATHON TEAMS --- */}
          {activeTab === 'teams' && (
            <div className="space-y-6 animate-[fadeIn_0.2s_ease-out] text-left">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Merge Teams Action box */}
                <div className="glass-panel border-white/5 rounded-2xl p-6 h-fit">
                  <h3 className="text-sm font-bold text-white mb-4 pb-2 border-b border-white/5 flex items-center gap-2">
                    <GitMerge className="h-4.5 w-4.5 text-pink-400 animate-pulse" />
                    Merge Small Teams
                  </h3>
                  <p className="text-xxs text-zinc-500 leading-normal mb-4">
                    Merge members of two small teams. Combine members under Team A. Maximum combined members allowed is 4.
                  </p>

                  <form onSubmit={handleMergeTeams} className="space-y-4">
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1.5 pl-1">Primary Team A (Keep)</label>
                      <select
                        value={mergeTeamA}
                        onChange={(e) => setMergeTeamA(e.target.value)}
                        className="w-full py-2 px-3 pr-8 rounded-xl border border-white/5 bg-[#050514]/60 text-zinc-300 focus:outline-none focus:border-purple-500/50 text-xs appearance-none cursor-pointer"
                      >
                        <option value="">-- Choose Team A --</option>
                        {adminTeams
                          .filter(t => t.memberCount < 4)
                          .map(t => <option key={t.id} value={t.id}>{t.name} ({t.memberCount} members)</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1.5 pl-1">Secondary Team B (Merge & Dissolve)</label>
                      <select
                        value={mergeTeamB}
                        onChange={(e) => setMergeTeamB(e.target.value)}
                        className="w-full py-2 px-3 pr-8 rounded-xl border border-white/5 bg-[#050514]/60 text-zinc-300 focus:outline-none focus:border-purple-500/50 text-xs appearance-none cursor-pointer"
                      >
                        <option value="">-- Choose Team B --</option>
                        {adminTeams
                          .filter(t => t.memberCount < 4 && t.id !== mergeTeamA)
                          .map(t => <option key={t.id} value={t.id}>{t.name} ({t.memberCount} members)</option>)}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={!mergeTeamA || !mergeTeamB}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      Authorize Merge Operation
                      <GitMerge className="h-4 w-4" />
                    </button>
                  </form>
                </div>

                {/* Registered Teams list */}
                <div className="lg:col-span-2 glass-panel border-white/5 rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-white mb-4 pb-2 border-b border-white/5 flex items-center gap-2">
                    <Users className="h-4.5 w-4.5 text-purple-400" />
                    Registered Design Teams
                  </h3>

                  <div className="space-y-3.5 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                    {teamsLoading ? (
                      <p className="text-zinc-500 text-xs py-6">Loading teams...</p>
                    ) : adminTeams.length === 0 ? (
                      <p className="text-zinc-500 text-xs py-6 text-center">No hackathon teams registered yet.</p>
                    ) : (
                      adminTeams.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-3.5 border border-white/5 rounded-xl bg-[#050514]/40 hover:bg-[#050514]/60 transition-colors"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-200 text-xs">{t.name}</span>
                              <span className="text-[9px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded font-bold font-mono uppercase">
                                {t.memberCount} / {t.paidSlots || 1} slots
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-1 space-x-2">
                              <span>College: <strong className="text-zinc-400">{t.college}</strong></span>
                              <span>• Leader: <strong className="text-zinc-400">{t.leaderName}</strong></span>
                            </div>

                            {/* Extra Slots Pending Approval */}
                            {t.extraSlotsStatus === 'submitted' && (
                              <div className="mt-2.5 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xxs flex items-center justify-between gap-3 text-amber-400">
                                <div>
                                  <p>Requesting <span className="font-bold text-white">+{t.extraSlotsPending} Extra Slots</span></p>
                                  <p className="text-[9px] font-mono text-zinc-400 mt-0.5">UTR: {t.extraSlotsUtr}</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => handleVerifyExtraSlots(t.id, 'approve')}
                                    className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold transition-all cursor-pointer text-[9px]"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleVerifyExtraSlots(t.id, 'reject')}
                                    className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold transition-all cursor-pointer text-[9px]"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => handleDeleteTeam(t.id, t.name)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Dissolve Team"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- SUBTAB 6: BROADCAST CENTER --- */}
          {activeTab === 'broadcast' && (
            <div className="max-w-2xl mx-auto glass-panel border-white/5 rounded-3xl p-8 animate-[fadeIn_0.2s_ease-out] text-left">
              <h3 className="text-sm font-bold text-white mb-4 pb-2 border-b border-white/5 flex items-center gap-2">
                <Radio className="h-4.5 w-4.5 text-orange-400 animate-pulse" />
                Dispatch Broadcast Notification
              </h3>
              <p className="text-xxs text-zinc-500 leading-normal mb-6">
                Broadcast notification triggers alerts to target recipient categories and displays toast alerts instantly using Socket.IO.
              </p>

              <form onSubmit={handleSendBroadcast} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="recipientType" className="block text-[10px] text-zinc-500 uppercase font-bold mb-1.5 pl-1">Target Category</label>
                    <select
                      id="recipientType"
                      value={broadcastForm.recipientType}
                      onChange={(e) => setBroadcastForm(prev => ({ ...prev, recipientType: e.target.value }))}
                      className="w-full py-2 px-3 rounded-xl border border-white/5 bg-[#050514]/60 text-zinc-300 focus:outline-none focus:border-purple-500/50 text-xs cursor-pointer"
                    >
                      <option value="all">All Registered Participants</option>
                      <option value="college">Specific College Hub</option>
                      <option value="team">Specific Design Team ID</option>
                      <option value="individual">Individual Attendee ID</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="channel" className="block text-[10px] text-zinc-500 uppercase font-bold mb-1.5 pl-1">Notification Medium</label>
                    <select
                      id="channel"
                      value={broadcastForm.channel}
                      onChange={(e) => setBroadcastForm(prev => ({ ...prev, channel: e.target.value }))}
                      className="w-full py-2 px-3 rounded-xl border border-white/5 bg-[#050514]/60 text-zinc-300 focus:outline-none focus:border-purple-500/50 text-xs cursor-pointer"
                    >
                      <option value="email">Simulate Email Dispatch</option>
                      <option value="sms">Simulate SMS Alert</option>
                      <option value="push">Live Push Notification (Toast)</option>
                    </select>
                  </div>
                </div>

                {broadcastForm.recipientType !== 'all' && (
                  <div>
                    <label htmlFor="recipientTarget" className="block text-[10px] text-zinc-500 uppercase font-bold mb-1.5 pl-1">Recipient Identifier Target</label>
                    <input
                      id="recipientTarget"
                      type="text"
                      required
                      placeholder={
                        broadcastForm.recipientType === 'college' ? 'e.g. JNTUH' :
                        broadcastForm.recipientType === 'team' ? 'e.g. figma-wizards-2a1c' : 'e.g. Attendee User ID'
                      }
                      value={broadcastForm.recipientTarget}
                      onChange={(e) => setBroadcastForm(prev => ({ ...prev, recipientTarget: e.target.value }))}
                      className="block w-full px-4 py-2.5 rounded-xl border border-white/5 bg-[#050514]/60 text-zinc-100 placeholder-zinc-600 focus:outline-none text-xs"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="broadcast-title" className="block text-[10px] text-zinc-500 uppercase font-bold mb-1.5 pl-1">Message Header Title</label>
                  <input
                    id="broadcast-title"
                    type="text"
                    required
                    placeholder="e.g. Prompt Reveal Starts in 10 mins"
                    value={broadcastForm.title}
                    onChange={(e) => setBroadcastForm(prev => ({ ...prev, title: e.target.value }))}
                    className="block w-full px-4 py-2.5 rounded-xl border border-white/5 bg-[#050514]/60 text-zinc-100 placeholder-zinc-600 focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <label htmlFor="broadcast-msg" className="block text-[10px] text-zinc-500 uppercase font-bold mb-1.5 pl-1">Detailed Content Message</label>
                  <textarea
                    id="broadcast-msg"
                    required
                    rows={4}
                    placeholder="Describe detail updates or instructions for participants..."
                    value={broadcastForm.message}
                    onChange={(e) => setBroadcastForm(prev => ({ ...prev, message: e.target.value }))}
                    className="block w-full px-4 py-2.5 rounded-xl border border-white/5 bg-[#050514]/60 text-zinc-100 placeholder-zinc-600 focus:outline-none text-xs custom-scrollbar"
                  />
                </div>

                <button
                  type="submit"
                  disabled={broadcastLoading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {broadcastLoading ? 'Dispatching notifications...' : 'Broadcast Message Notification'}
                  <Radio className="h-4 w-4" />
                </button>
              </form>
            </div>
          )}

        </main>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scannerLine {
          0% { top: 16px; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: calc(100% - 18px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
