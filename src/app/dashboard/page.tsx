'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { LayoutDashboard, Users, Ticket, Award, Calendar, Sparkles, CheckCircle2, ShieldAlert, Copy, ExternalLink, Plus, UserPlus, LogOut, Check, X, Shield, Download, Bell, HelpCircle, School, Loader } from 'lucide-react';
import QRCode from 'qrcode';

export default function UserDashboard() {
  const router = useRouter();
  const { user, token, loading, logout, refreshUser } = useAuth();
  const { socket, addToast, triggerRefreshNotifications } = useSocket();

  // Tab State: overview | team | receipt | certificate
  const [activeTab, setActiveTab] = useState('overview');

  // Team States
  const [teamDetails, setTeamDetails] = useState<any>(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [teamForm, setTeamForm] = useState({ name: '', description: '', logoUrl: '' });
  const [copiedLink, setCopiedLink] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Invite system state
  const [inviteEmail, setInviteEmail]         = useState('');
  const [inviteSending, setInviteSending]     = useState(false);
  const [inviteMsg, setInviteMsg]             = useState<{ text: string; ok: boolean } | null>(null);
  const [pendingInvites, setPendingInvites]   = useState<any[]>([]);
  const [respondingInvite, setRespondingInvite] = useState<string | null>(null);

  // General dashboard announcements & problems
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [problems, setProblems] = useState<any[]>([]);

  // Form input validation messages
  const [teamError, setTeamError] = useState('');

  // Generate QR code onto canvas whenever teamDetails.inviteLink or activeTab changes
  useEffect(() => {
    if (teamDetails?.inviteLink && qrCanvasRef.current) {
      QRCode.toCanvas(qrCanvasRef.current, teamDetails.inviteLink, {
        width: 144,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      });
    }
  }, [teamDetails?.inviteLink, activeTab]);
  const [teamSuccess, setTeamSuccess] = useState('');

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch Team Details
  const fetchMyTeam = async () => {
    if (!user || !user.teamId) {
      setTeamDetails(null);
      return;
    }
    setTeamLoading(true);
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/teams/my-team', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTeamDetails(data);
      }
    } catch (err) {
      console.error('Error fetching my team details:', err);
    } finally {
      setTeamLoading(false);
    }
  };

  // Fetch Announcements (user-scoped notifications)
  const fetchAnnouncements = async () => {
    if (!user) return;
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/notifications', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const list = await res.json();
        // Sort by date newest first
        list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAnnouncements(list);
      }
    } catch (err) {
      console.error('Error fetching notifications feed:', err);
    }
  };

  const fetchProblems = async () => {
    if (!user) return;
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/user/problem-statements', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setProblems(await res.json());
      }
    } catch (e) {
      console.error('Error fetching problems:', e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMyTeam();
      fetchAnnouncements();
      fetchProblems();
      fetchPendingInvites();
    }
  }, [user]);

  // Fetch pending invites for this user
  const fetchPendingInvites = async () => {
    if (!token) return;
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/teams/my-invites', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setPendingInvites(await res.json());
    } catch { }
  };

  // Send invite (leader only)
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteSending(true); setInviteMsg(null);
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/teams/invite', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteeEmail: inviteEmail.trim().toLowerCase() }),
      });
      const data = await res.json();
      setInviteMsg({ text: res.ok ? `Invite sent to ${inviteEmail}!` : (data.message || 'Failed to send invite.'), ok: res.ok });
      if (res.ok) setInviteEmail('');
    } catch { setInviteMsg({ text: 'Network error.', ok: false }); }
    finally { setInviteSending(false); }
  };

  // Respond to an invite (accept/reject)
  const handleInviteRespond = async (inviteId: string, action: 'accept' | 'reject') => {
    setRespondingInvite(inviteId);
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/teams/invite-respond', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast(action === 'accept' ? 'Team Joined!' : 'Invite Declined', data.message, action === 'accept' ? 'success' : 'warning');
        await refreshUser();
        fetchPendingInvites();
        if (action === 'accept') fetchMyTeam();
      } else {
        addToast('Error', data.message || 'Failed.', 'warning');
      }
    } catch { }
    finally { setRespondingInvite(null); }
  };

  // Socket triggers for auto-updating team state
  useEffect(() => {
    if (!socket || !user) return;

    // Join team socket room if they have one
    if (user.teamId) {
      socket.emit('join_team_room', user.teamId);
    }

    socket.on('team_updated', () => {
      console.log('[Socket] Team updated, reloading details...');
      fetchMyTeam();
      refreshUser();
    });

    socket.on('request_response_received', () => {
      console.log('[Socket] Request response, reloading user...');
      refreshUser();
    });

    return () => {
      socket.off('team_updated');
      socket.off('request_response_received');
    };
  }, [socket, user]);

  if (loading || !user) {
    return (
      <div className="flex-1 w-full bg-slate-50 flex items-center justify-center text-slate-555">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-purple-600/30 border-t-purple-600 animate-spin"></div>
          <span className="text-xs font-bold">Loading user dashboard session...</span>
        </div>
      </div>
    );
  }

  // Create Team
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamError('');
    setTeamSuccess('');
    setCreatingTeam(true);

    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/teams/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(teamForm)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setTeamSuccess('Team created successfully!');
        addToast('Team Created', `Successfully formed team "${data.team.name}".`, 'success');
        
        // Refresh session profile and load team
        await refreshUser();
        if (socket) {
          socket.emit('team_modified', data.team.id);
        }
      } else {
        setTeamError(data.message || 'Failed to create team.');
      }
    } catch (err) {
      console.error(err);
      setTeamError('Server connection failed.');
    } finally {
      setCreatingTeam(false);
    }
  };

  // Respond to join request (Accept / Reject)
  const handleRespondRequest = async (requestUserId: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/teams/respond-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          teamId: teamDetails?.id,
          requestUserId,
          status
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        addToast(
          status === 'approved' ? 'Request Approved' : 'Request Declined',
          status === 'approved' ? 'Participant is now in your team.' : 'Join request declined.',
          status === 'approved' ? 'success' : 'warning'
        );

        // Fetch fresh team details
        fetchMyTeam();

        // Notify responder via Socket
        if (socket) {
          socket.emit('request_response', {
            userId: requestUserId,
            teamId: teamDetails?.id,
            status
          });
          socket.emit('team_modified', teamDetails?.id);
        }
      } else {
        addToast('Action Failed', data.message || 'Could not update request.', 'warning');
      }
    } catch (err) {
      console.error(err);
      addToast('Connection Error', 'Failed to communicate approval choice.', 'warning');
    }
  };

  // Remove member or Leave team
  const handleRemoveMember = async (targetUserId: string) => {
    const isSelf = targetUserId === user.id;
    const confirmMsg = isSelf 
      ? 'Are you sure you want to leave this team?' 
      : 'Are you sure you want to remove this member?';

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/teams/remove-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          teamId: teamDetails?.id,
          targetUserId
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        addToast(
          isSelf ? 'Team Left' : 'Member Removed',
          isSelf ? 'You have successfully left the team.' : 'Member removed from team.',
          'warning'
        );

        // Refresh user context and fetch team again
        await refreshUser();
        fetchMyTeam();

        // Emit Socket event to update team room
        if (socket) {
          socket.emit('team_modified', teamDetails?.id);
          socket.emit('request_response', {
            userId: targetUserId,
            teamId: teamDetails?.id,
            status: 'rejected' // Simulates removal alert
          });
        }
      } else {
        addToast('Action Failed', data.message || 'Operation failed.', 'warning');
      }
    } catch (err) {
      console.error(err);
      addToast('Connection Error', 'Failed to remove member.', 'warning');
    }
  };

  const copyInviteLink = () => {
    if (!teamDetails) return;
    navigator.clipboard.writeText(teamDetails.inviteLink);
    setCopiedLink(true);
    addToast('Link Copied', 'Team invitation URL copied to clipboard.', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const printReceipt = () => {
    window.print();
  };

  // Calculate team completion %
  const completionPercentage = teamDetails 
    ? Math.round((teamDetails.members.length / 5) * 100) 
    : 0;

  return (
    <div className="flex-1 w-full bg-slate-50 text-slate-800 relative overflow-hidden bg-grid py-12 px-4 sm:px-6 lg:px-8 animate-[fadeIn_0.3s_ease-out]">
      {/* Decorative ambient glows */}
      <div className="absolute top-[-10%] left-[-15%] w-[45%] h-[45%] rounded-full bg-purple-100/50 blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[45%] h-[45%] rounded-full bg-blue-100/50 blur-[100px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8">
        
        {/* Left Side Navigation Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0 flex flex-col gap-2">
          {/* User Brief profile card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 mb-4 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 h-[2px] w-[50%] bg-gradient-to-r from-purple-500/50 to-blue-500/50" />
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Attendee</span>
            <h2 className="text-sm font-bold text-slate-900 mt-0.5 truncate">{user.name}</h2>
            <p className="text-xxs text-slate-500 mt-1 truncate">{user.college}</p>
            {user.teamId && (
              <p className="text-xxs text-slate-500 mt-1">
                Team ID: <span className="font-mono font-bold text-purple-600">{user.teamId}</span>
              </p>
            )}
            
            {/* Role Badge */}
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                user.paymentStatus === 'paid' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' 
                  : 'bg-amber-50 text-amber-700 border-amber-200/80'
              }`}>
                {user.paymentStatus === 'paid' ? 'Registered Attendee' : 'Payment Pending'}
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-655 hover:text-slate-900 hover:bg-slate-200/40 border border-transparent'
            }`}
          >
            <LayoutDashboard className={`h-4.5 w-4.5 ${activeTab === 'overview' ? 'text-white' : 'text-purple-600'}`} />
            Overview Dashboard
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'team'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-655 hover:text-slate-900 hover:bg-slate-200/40 border border-transparent'
            }`}
          >
            <Users className={`h-4.5 w-4.5 ${activeTab === 'team' ? 'text-white' : 'text-blue-600'}`} />
            Team Management
          </button>

          <button
            onClick={() => setActiveTab('receipt')}
            className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'receipt'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-655 hover:text-slate-900 hover:bg-slate-200/40 border border-transparent'
            }`}
          >
            <Ticket className={`h-4.5 w-4.5 ${activeTab === 'receipt' ? 'text-white' : 'text-indigo-600'}`} />
            Payment & QR Code
          </button>

          <button
            onClick={() => setActiveTab('certificate')}
            className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'certificate'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-655 hover:text-slate-900 hover:bg-slate-200/40 border border-transparent'
            }`}
          >
            <Award className={`h-4.5 w-4.5 ${activeTab === 'certificate' ? 'text-white' : 'text-amber-600'}`} />
            E-Certificates
          </button>
        </aside>

        {/* Right Side Content Panel */}
        <main className="flex-1 min-h-[450px]">
          
          {/* Pending Invites Banner (Teamless Users) */}
          {!user.teamId && pendingInvites.length > 0 && (
            <div className="mb-6 space-y-3 animate-[fadeIn_0.2s_ease-out]">
              {pendingInvites.map(inv => (
                <div key={inv.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-l-purple-600 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center">
                      <Bell className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <span className="text-[10px] text-slate-505 font-bold uppercase tracking-wider block">Pending Team Invite</span>
                      <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                        You're invited to join <span className="text-purple-650 font-extrabold">{inv.teamName}</span>
                      </h4>
                      <p className="text-xxs text-slate-500 mt-0.5">Invited by {inv.leaderName} ({inv.inviteeEmail})</p>
                    </div>
                  </div>
                  <div className="flex gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleInviteRespond(inv.id, 'reject')}
                      disabled={respondingInvite === inv.id}
                      className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-bold transition-all cursor-pointer"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleInviteRespond(inv.id, 'accept')}
                      disabled={respondingInvite === inv.id}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1.5 active:scale-[0.98]"
                    >
                      {respondingInvite === inv.id ? (
                        <Loader className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Accept & Join
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* --- TAB 1: OVERVIEW DASHBOARD --- */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
              {/* Event updates banners */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    Welcome to CodeSprint-2026!
                    <Sparkles className="h-4.5 w-4.5 text-purple-650" />
                  </h1>
                  <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
                    Your registration has been completed. Join a team or create one below to start preparation. KVT Hall check-in desk will open on Saturday, August 8 at 09:00 AM.
                  </p>
                </div>
                {user.paymentStatus === 'paid' ? (
                  <div className="flex-shrink-0 self-start md:self-center px-4 py-2 border border-emerald-200 bg-emerald-50 text-emerald-700 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Entry Confirmed
                  </div>
                ) : (
                  <button
                    onClick={() => router.push('/register')}
                    className="flex-shrink-0 self-start md:self-center px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                  >
                    Complete Payment
                  </button>
                )}
              </div>

              {/* Layout grid cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Announcements Feed */}
                <div className="bg-white border border-slate-200/85 rounded-2xl p-6 flex flex-col h-96 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                    <Bell className="h-4 w-4 text-purple-600" />
                    Announcements & Logs
                  </h3>
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3.5 pr-1">
                    {announcements.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-center text-xs text-slate-400 py-10">
                        No broadcast messages received yet.
                      </div>
                    ) : (
                      announcements.map((ann, idx) => (
                        <div key={ann.id || idx} className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl transition-all">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-xs text-slate-800">{ann.title}</span>
                            <span className="text-[9px] text-slate-400 shrink-0 font-mono">
                              {new Date(ann.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-slate-600 text-xxs mt-1 leading-relaxed">{ann.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Timeline and schedule progress */}
                <div className="bg-white border border-slate-200/85 rounded-2xl p-6 flex flex-col h-96 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    Schedule Progress
                  </h3>
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1 text-xs">
                    <div className="flex gap-4 items-start opacity-100">
                      <span className="text-[10px] font-bold font-mono text-purple-600 shrink-0 w-16 pt-0.5">ONLINE NOW</span>
                      <div className="flex-1 pl-4 border-l-2 border-purple-300 relative">
                        <div className="absolute left-[-6px] top-1.5 h-2 w-2 rounded-full bg-purple-600 ring-4 ring-purple-100" />
                        <h4 className="font-bold text-slate-800">Matchmaking & Prep</h4>
                        <p className="text-xxs text-slate-500 mt-0.5 leading-relaxed">Form teams on the dashboard, search public groups, align stack.</p>
                      </div>
                    </div>

                    <div className="flex gap-4 items-start opacity-75">
                      <span className="text-[10px] font-bold font-mono text-slate-500 shrink-0 w-16 pt-0.5">AUG 08, 09:00</span>
                      <div className="flex-1 pl-4 border-l-2 border-slate-100 relative">
                        <div className="absolute left-[-5px] top-1.5 h-1.5 w-1.5 rounded-full bg-slate-400" />
                        <h4 className="font-bold text-slate-700">Check-in at KVT Hall</h4>
                        <p className="text-xxs text-slate-500 mt-0.5 leading-relaxed">Verify entry QR ticket at registration desk for inclusions badge.</p>
                      </div>
                    </div>

                    <div className="flex gap-4 items-start opacity-75">
                      <span className="text-[10px] font-bold font-mono text-slate-500 shrink-0 w-16 pt-0.5">AUG 08, 10:00</span>
                      <div className="flex-1 pl-4 border-l-2 border-slate-100 relative">
                        <div className="absolute left-[-5px] top-1.5 h-1.5 w-1.5 rounded-full bg-slate-400" />
                        <h4 className="font-bold text-slate-700">Hacking Begins</h4>
                        <p className="text-xxs text-slate-500 mt-0.5 leading-relaxed">Prompts unlocked. Start development rounds under evaluations.</p>
                      </div>
                    </div>

                    <div className="flex gap-4 items-start opacity-75">
                      <span className="text-[10px] font-bold font-mono text-slate-500 shrink-0 w-16 pt-0.5">AUG 08, 15:00</span>
                      <div className="flex-1 pl-4 border-l-2 border-slate-100 relative">
                        <div className="absolute left-[-5px] top-1.5 h-1.5 w-1.5 rounded-full bg-slate-400" />
                        <h4 className="font-bold text-slate-700">Pitch & Demo Round</h4>
                        <p className="text-xxs text-slate-500 mt-0.5 leading-relaxed">Present design iterations and working logic before final jury desk.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assigned Problem Statements */}
              {problems.length > 0 && (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                    <Award className="h-4.5 w-4.5 text-purple-600" />
                    Assigned Problem Statements
                  </h3>
                  <div className="space-y-4">
                    {problems.map((p, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200/60 rounded-xl p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-slate-800 text-sm">{p.title}</h4>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">Active</span>
                        </div>
                        <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                          {p.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- TAB 2: TEAM MANAGEMENT --- */}
          {activeTab === 'team' && (
            <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
              {/* check if user is not in a team */}
              {!user.teamId ? (
                /* No team — send to Get In page */
                <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center relative overflow-hidden shadow-sm">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[1px] w-3/5 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-5 shadow-sm">
                    <Users className="h-6 w-6 text-slate-800" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">You're not in a team yet</h3>
                  <p className="text-xs text-slate-500 mt-2 mb-6 max-w-sm mx-auto leading-relaxed">
                    Join an open team or create your own and become Group Leader. Teams require 3–5 members.
                  </p>

                  {/* Pending invites shown here too */}
                  {pendingInvites.length > 0 && (
                    <div className="mb-6 text-left space-y-3">
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest pl-1 animate-pulse">Pending Team Invites ({pendingInvites.length})</p>
                      {pendingInvites.map(inv => (
                        <div key={inv.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4 shadow-sm">
                          <div>
                            <p className="text-xs font-bold text-slate-900">{inv.teamName}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Invited by <span className="text-slate-700 font-semibold">{inv.leaderName}</span></p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleInviteRespond(inv.id, 'reject')}
                              disabled={respondingInvite === inv.id}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-655 hover:text-slate-900 text-xs font-bold transition-all cursor-pointer"
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => handleInviteRespond(inv.id, 'accept')}
                              disabled={respondingInvite === inv.id}
                              className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <Check className="h-3 w-3" />Accept
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => router.push('/get-in')}
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all cursor-pointer active:scale-[0.97]"
                  >
                    <UserPlus className="h-4 w-4" />
                    Go to Get In Page
                  </button>
                </div>
              ) : (
                /* user is in a team - display team status and dashboard */
                <div className="space-y-6">
                  
                  {/* Team details header */}
                  {teamLoading || !teamDetails ? (
                    <div className="bg-white border border-slate-200/80 p-6 rounded-2xl animate-pulse h-32" />
                  ) : (
                    <div className="bg-white border border-slate-200 p-6 rounded-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
                      {/* Ambient background blur */}
                      <div className="absolute top-0 right-0 h-[2px] w-[60%] bg-gradient-to-r from-purple-500/50 to-blue-500/50" />

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{teamDetails.name}</h1>
                          <span className="text-[9px] bg-purple-50 border border-purple-200 text-purple-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                            ID: {teamDetails.id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 max-w-xl leading-relaxed">{teamDetails.description}</p>
                        <p className="text-xxs text-slate-500 mt-2 flex items-center gap-1">
                          <School className="h-3.5 w-3.5 text-purple-650" />
                          College Restriction: <strong className="text-slate-700 font-bold">{teamDetails.college}</strong>
                        </p>
                      </div>

                      <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                        <span className="text-xxs text-slate-500 uppercase tracking-widest font-bold">Team Completion</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500" style={{ width: `${completionPercentage}%` }}></div>
                          </div>
                          <span className="text-xs font-bold text-slate-800 font-mono">{completionPercentage}%</span>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1">({teamDetails.members.length} / 5 Members)</span>
                      </div>
                    </div>
                  )}

                  {/* Team Members, Invites & Requests Grid */}
                  {/* Pending Invites Banner (for non-leaders with no team yet — covered above; here show sent invite status for leader) */}

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Team Members List */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                          <Users className="h-4.5 w-4.5 text-slate-400" />
                          Team Members List
                        </h3>

                        <div className="space-y-3">
                          {teamDetails?.members.map((member: any) => {
                            const isLeader = teamDetails.leaderId === member.id;
                            const isMe = member.id === user.id;

                            return (
                              <div
                                key={member.id}
                                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/60 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center font-bold text-purple-700 uppercase">
                                    {member.name.substring(0, 2)}
                                  </div>
                                  <div className="text-left">
                                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                      {member.name}
                                      {isMe && <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-normal">You</span>}
                                      {isLeader && <span className="text-[9px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded font-normal">Leader</span>}
                                    </h4>
                                    <p className="text-[10px] text-slate-500 truncate max-w-[200px]">{member.email}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  {/* Payment status badge */}
                                  <span className="hidden sm:inline-block text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                                    Paid
                                  </span>

                                  {/* Remove member logic */}
                                  {user.id === teamDetails.leaderId && !isLeader && (
                                    <button
                                      onClick={() => handleRemoveMember(member.id)}
                                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                      title="Remove Member"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  )}
                                  
                                  {/* Leave team logic */}
                                  {isMe && !isLeader && (
                                    <button
                                      onClick={() => handleRemoveMember(user.id)}
                                      className="px-2.5 py-1 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <LogOut className="h-3 w-3" />
                                      Leave
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Pending Join Requests (Leader only) */}
                      {user.id === teamDetails?.leaderId && (
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                          <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                            <UserPlus className="h-4.5 w-4.5 text-blue-600" />
                            Pending Join Requests
                          </h3>

                          {/* list of requests */}
                          {!teamDetails?.joinRequests || teamDetails.joinRequests.filter((r: any) => r.status === 'pending').length === 0 ? (
                            <p className="text-xs text-slate-500 text-center py-6">
                              No pending join requests at the moment. Share invite links.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {teamDetails.joinRequests
                                .filter((r: any) => r.status === 'pending')
                                .map((req: any) => (
                                  <div
                                    key={req.userId}
                                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50"
                                  >
                                    <div className="text-left">
                                      <h4 className="text-xs font-bold text-slate-800">{req.name}</h4>
                                      <p className="text-[10px] text-slate-500 mt-0.5">{req.college} • {req.email}</p>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleRespondRequest(req.userId, 'approved')}
                                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-750 border border-emerald-250/70 rounded-lg cursor-pointer transition-colors"
                                        title="Accept Request"
                                      >
                                        <Check className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => handleRespondRequest(req.userId, 'rejected')}
                                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-750 border border-rose-250/70 rounded-lg cursor-pointer transition-colors"
                                        title="Decline Request"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* QR Code Invitation & Invite Link Box */}
                    <div className="space-y-6">

                      {/* Invite by Email (Leader Only) */}
                      {user.id === teamDetails?.leaderId && teamDetails?.remainingSlots > 0 && (
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                          <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                            <UserPlus className="h-4.5 w-4.5 text-slate-400" />
                            Invite Member by Email
                          </h3>
                          <p className="text-[10px] text-slate-500 mb-4 leading-relaxed">
                            Enter the Gmail address of a registered, paid participant. They'll see the invite on their dashboard.
                          </p>
                          {inviteMsg && (
                            <div className={`flex items-center gap-2 text-xs p-2.5 rounded-xl mb-3 border ${
                              inviteMsg.ok
                                ? 'bg-emerald-50 border-emerald-250 text-emerald-800'
                                : 'bg-rose-50 border-rose-250 text-rose-800'
                            }`}>
                              {inviteMsg.ok ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-600" /> : <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0 text-rose-605" />}
                              {inviteMsg.text}
                            </div>
                          )}
                          <form onSubmit={handleSendInvite} className="flex flex-col gap-2">
                            <input
                              type="email"
                              required
                              placeholder="friend@gmail.com"
                              value={inviteEmail}
                              onChange={e => setInviteEmail(e.target.value)}
                              className="block w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 text-xs transition-all"
                            />
                            <button
                              type="submit"
                              disabled={inviteSending || !inviteEmail.trim()}
                              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                            >
                              {inviteSending ? 'Sending...' : 'Send Invite'}
                            </button>
                          </form>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- TAB 3: RECEIPT DOWNLOADER --- */}
          {activeTab === 'receipt' && (
            <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
              <div className="bg-white border border-slate-200 p-8 rounded-3xl max-w-xl mx-auto relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 bg-emerald-50 border-b border-l border-emerald-250 text-emerald-700 text-[10px] px-3.5 py-1 font-bold">
                  PAID CONFIRMED
                </div>

                <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4 text-left">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 tracking-widest font-mono">CodeSprint-2026</h2>
                    <p className="text-[10px] text-slate-500 mt-0.5">KVT Hall, Gudur, AP, India</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-slate-500 uppercase">Receipt No</p>
                    <p className="text-xs font-semibold text-slate-800 font-mono">REC-{user.id.substring(0, 6).toUpperCase()}</p>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs text-left border-b border-slate-100 pb-4 mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Attendee Name</span>
                    <span className="font-semibold text-slate-800">{user.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">College</span>
                    <span className="font-semibold text-slate-800">{user.college}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Registered Email</span>
                    <span className="font-semibold text-slate-800">{user.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reference Txn ID</span>
                    <span className="font-semibold text-slate-800 font-mono text-[10px]">{user.paymentId || 'pay_simulated'}</span>
                  </div>
                  {user.couponUsed && (
                    <div className="flex justify-between text-emerald-650 font-bold">
                      <span>Coupon Applied</span>
                      <span>{user.couponUsed}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center text-left">
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase">Amount Paid</p>
                    <p className="text-2xl font-extrabold text-slate-900 font-mono">₹{user.amountPaid || '1000'}</p>
                  </div>
                  {/* Event Check-in QR */}
                  <div className="h-20 w-20 bg-white p-1 rounded-xl shadow-md border border-slate-200">
                    <img
                      src={`https://quickchart.io/qr?text=${encodeURIComponent(user.id)}&size=100&margin=1`}
                      alt="Check-in QR"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 text-[10px] text-slate-500 text-center leading-normal">
                  Show this check-in QR code at the registration desk for instant manual QR verification.
                </div>
              </div>

              <div className="max-w-xl mx-auto flex gap-4 justify-center">
                <button
                  onClick={printReceipt}
                  className="px-6 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-sm"
                >
                  <Download className="h-4.5 w-4.5" />
                  Print Receipt / PDF
                </button>
              </div>
            </div>
          )}

          {/* --- TAB 4: CERTIFICATES UNLOCKED --- */}
          {activeTab === 'certificate' && (
            <div className="space-y-6 animate-[fadeIn_0.2s_ease-out] text-center">
              {!user.checkedIn ? (
                <div className="bg-white border border-slate-200 p-12 rounded-3xl max-w-xl mx-auto shadow-sm">
                  <Award className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-900">Certificates Locked</h3>
                  <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                    Participation certificates are unlocked automatically after you scan your QR code check-in at the event registration desk.
                  </p>
                  <div className="mt-8 p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3 text-left shadow-inner">
                    <Shield className="h-5 w-5 text-purple-600 flex-shrink-0" />
                    <p className="text-[10px] text-slate-600 leading-normal">
                      Are you at the venue? Head over to the admin desk, show your ticket QR, and get checked in to unlock this tab instantly.
                    </p>
                  </div>
                </div>
              ) : (
                /* checked in -> display certificate */
                <div className="space-y-6">
                  {/* Certificate Frame */}
                  <div className="border border-amber-500/40 bg-white p-8 sm:p-12 rounded-3xl max-w-3xl mx-auto relative overflow-hidden shadow-2xl text-left border-double border-4">
                    {/* Glowing ring borders */}
                    <div className="absolute top-0 left-[50%] transform -translate-x-[50%] h-[1px] w-[90%] bg-gradient-to-r from-transparent via-amber-550/30 to-transparent" />
                    
                    <div className="text-center space-y-6">
                      <span className="text-[10px] text-amber-600 font-extrabold uppercase tracking-widest font-mono">CERTIFICATE OF PARTICIPATION</span>
                      
                      <div className="space-y-2">
                        <h1 className="text-3xl font-extrabold text-amber-800 tracking-wide font-serif">CodeSprint-2026</h1>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">KVT Hall, Gudur, India</p>
                      </div>

                      <div className="py-4 space-y-3.5 max-w-md mx-auto">
                        <p className="text-xs text-slate-500 leading-relaxed">
                          This is to certify that the creative design capabilities of
                        </p>
                        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 max-w-xs mx-auto tracking-wide">{user.name}</h2>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          from <strong className="text-slate-800 font-bold">{user.college}</strong> has been successfully recognized for participation and contribution in the 8-Hours National Level Hackathon at CodeSprint-2026.
                        </p>
                      </div>

                      {/* Signatures */}
                      <div className="grid grid-cols-2 gap-8 pt-8 max-w-sm mx-auto border-t border-slate-100">
                        <div className="text-center">
                          <p className="font-mono text-slate-800 text-xs italic font-bold">Dr. N. Penchalaiah</p>
                          <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-1 border-t border-slate-200 pt-1 font-semibold">Faculty Coordinator</p>
                        </div>
                        <div className="text-center">
                          <p className="font-mono text-slate-800 text-xs italic font-bold">Dr. K. Dhanumjaya</p>
                          <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-1 border-t border-slate-200 pt-1 font-semibold">Dean, SET</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={printReceipt}
                    className="px-6 py-2.5 rounded-xl border border-amber-500/30 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all mx-auto active:scale-[0.98]"
                  >
                    <Download className="h-4.5 w-4.5" />
                    Download PDF Certificate
                  </button>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
