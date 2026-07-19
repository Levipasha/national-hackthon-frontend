'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { LayoutDashboard, Users, Ticket, Award, Calendar, Sparkles, CheckCircle2, ShieldAlert, Copy, ExternalLink, Plus, UserPlus, LogOut, Check, X, Shield, Download, Bell, HelpCircle, School, Loader, Trash2 } from 'lucide-react';
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

  // Redirect only if not logged in — let pending-payment users stay and complete payment
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  const [pendingRequestTeam, setPendingRequestTeam] = useState<any>(null);

  // Fetch Team Details
  const fetchMyTeam = async () => {
    if (!user) {
      setTeamDetails(null);
      setPendingRequestTeam(null);
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
        if (data.pendingRequestTeam) {
          setPendingRequestTeam(data.pendingRequestTeam);
          setTeamDetails(null);
        } else if (data.team === null) {
          setTeamDetails(null);
          setPendingRequestTeam(null);
        } else {
          setTeamDetails(data);
          setPendingRequestTeam(null);
        }
      }
    } catch (err) {
      console.error('Error fetching my team details:', err);
    } finally {
      setTeamLoading(false);
    }
  };

  const BRANCH_OPTIONS = [
    "Computer Science & Engineering", 
    "Information Technology", 
    "Electronics & Communication Engineering", 
    "Electrical & Electronics Engineering", 
    "Mechanical Engineering", 
    "Civil Engineering", 
    "MCA", 
    "MBA", 
    "Other"
  ];

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [addMemberError, setAddMemberError] = useState('');
  const [addMemberForm, setAddMemberForm] = useState({
    name: '',
    email: '',
    phone: '',
    rollNumber: '',
    college: '',
    branch: '',
    year: '1st Year',
    gender: 'Male',
    tshirtSize: 'M',
    foodPreference: 'Veg',
    utr: ''
  });
  const [customBranch, setCustomBranch] = useState('');
  const [customCollege, setCustomCollege] = useState('');
  const [colleges, setColleges] = useState<any[]>([]);
  const [sessionMembers, setSessionMembers] = useState<any[]>([]);
  const [addMemberStep, setAddMemberStep] = useState<'input' | 'pay' | 'utr'>('input');
  const [printingTxId, setPrintingTxId] = useState<string | null>(null);

  const getDirectRazorpayUrl = (slotsCount: number) => {
    if (!user) return '';
    const baseUrl = "https://axisbpayments.razorpay.com/pl_OluX2aezURAvVF/view";
    const params = new URLSearchParams();
    
    const studentName = (user.name || '').trim();
    const rollNumber = (user.rollNumber || '').replace(/\s+/g, '').trim();
    const yearValue = (user.year || '1st Year').replace(/\s+/g, '').trim();
    const college = (user.college || '').trim();
    const course = (user.branch || (user as any).course || '').trim();

    let phoneVal = (user.phone || '').trim();
    if (/^\d{10}$/.test(phoneVal)) {
      phoneVal = `91${phoneVal}`;
    } else if (/^91\d{10}$/.test(phoneVal)) {
      // already has 91 prefix, keep as is
    }

    params.set("email", user.email || '');
    params.set("phone", phoneVal);
    params.set("contact", phoneVal);
    params.set("name", studentName);

    params.set("prefill[email]", user.email || '');
    params.set("prefill[phone]", phoneVal);
    params.set("prefill[contact]", phoneVal);
    params.set("prefill[name]", studentName);

    params.set("student_name", studentName);
    params.set("prefill[student_name]", studentName);
    params.set("STUDENT NAME", studentName);
    params.set("prefill[STUDENT NAME]", studentName);

    params.set("roll_number", rollNumber);
    params.set("prefill[roll_number]", rollNumber);
    params.set("ROLL NUMBER", rollNumber);
    params.set("prefill[ROLL NUMBER]", rollNumber);

    params.set("college", college);
    params.set("prefill[college]", college);
    params.set("COLLEGE", college);
    params.set("prefill[COLLEGE]", college);

    params.set("course", course);
    params.set("prefill[course]", course);
    params.set("COURSE", course);
    params.set("prefill[COURSE]", course);

    params.set("year", yearValue);
    params.set("prefill[year]", yearValue);
    params.set("YEAR", yearValue);
    params.set("prefill[YEAR]", yearValue);

    params.set("hackthon_fees", "REGISTRATION FEES");
    params.set("prefill[hackthon_fees]", "REGISTRATION FEES");
    params.set("HACKTHON FEES", "REGISTRATION FEES");
    params.set("prefill[HACKTHON FEES]", "REGISTRATION FEES");

    const finalPriceVal = (399 * slotsCount).toString();
    params.set("amount", finalPriceVal);
    params.set("prefill[amount]", finalPriceVal);
    params.set("AMOUNT", finalPriceVal);
    params.set("prefill[AMOUNT]", finalPriceVal);

    return `${baseUrl}?${params.toString().replace(/%5B/g, '[').replace(/%5D/g, ']')}`;
  };

  const getPaymentRecords = () => {
    if (!teamDetails?.members) return [];
    
    // Group members by transaction ID (prefer paymentId, fallback to utr)
    const groups: { [key: string]: { members: any[], utr: string, status: string, amount: number, date?: string } } = {};
    
    teamDetails.members.forEach((m: any) => {
      const txId = (m.paymentId || m.utr || '').trim();
      if (!txId) return;
      
      if (!groups[txId]) {
        groups[txId] = {
          members: [],
          utr: txId,
          status: m.paymentStatus, // 'paid' | 'submitted' | 'rejected'
          amount: 0,
          date: m.createdAt // Fallback date
        };
      }
      groups[txId].members.push(m);
      groups[txId].amount += m.amountPaid || 0;
      
      if (m.paymentStatus === 'paid') {
        groups[txId].status = 'paid';
      } else if (m.paymentStatus === 'submitted' && groups[txId].status !== 'paid') {
        groups[txId].status = 'submitted';
      } else if (m.paymentStatus === 'rejected' && groups[txId].status !== 'paid' && groups[txId].status !== 'submitted') {
        groups[txId].status = 'rejected';
      }
    });
    
    // For groups where amount is 0 (e.g. pending ones where amountPaid is not set yet),
    // we can set the amount to members.length * 399
    Object.keys(groups).forEach(txId => {
      const group = groups[txId];
      if (group.amount === 0) {
        group.amount = group.members.length * 399;
      }
    });
    
    return Object.values(groups);
  };

  // UTR Submission handler (for pending-payment users on dashboard)
  const [dashUtr, setDashUtr] = useState('');
  const [dashUtrLoading, setDashUtrLoading] = useState(false);
  const [dashUtrError, setDashUtrError] = useState('');
  const [dashUtrSuccess, setDashUtrSuccess] = useState(false);

  const handleDashUtrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dashUtr.trim() || dashUtr.trim().length < 12) return;
    setDashUtrLoading(true);
    setDashUtrError('');
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/payments/submit-utr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ utr: dashUtr.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setDashUtrSuccess(true);
        await refreshUser();
      } else {
        setDashUtrError(data.message || 'Failed to submit UTR.');
      }
    } catch {
      setDashUtrError('Network error. Please try again.');
    } finally {
      setDashUtrLoading(false);
    }
  };

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionMembers.length === 0 || !addMemberForm.utr.trim()) {
      setAddMemberError('Please add at least one member and provide a UTR number.');
      return;
    }

    setAddMemberLoading(true);
    setAddMemberError('');
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/teams/add-member', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          members: sessionMembers,
          utr: addMemberForm.utr.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addToast('Success', 'Member request submitted successfully! Pending admin approval.', 'success');
        setShowAddMemberModal(false);
        setAddMemberForm({
          name: '',
          email: '',
          phone: '',
          rollNumber: '',
          college: '',
          branch: '',
          year: '1st Year',
          gender: 'Male',
          tshirtSize: 'M',
          foodPreference: 'Veg',
          utr: ''
        });
        setCustomBranch('');
        setSessionMembers([]);
        setAddMemberStep('input');
        fetchMyTeam();
        refreshUser();
      } else {
        setAddMemberError(data.message || 'Failed to add member.');
      }
    } catch (err) {
      console.error(err);
      setAddMemberError('Network connection error.');
    } finally {
      setAddMemberLoading(false);
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
      
      // Fetch colleges
      fetch(process.env.NEXT_PUBLIC_API_URL + '/api/colleges')
        .then(res => res.json())
        .then(data => setColleges(data))
        .catch(console.error);
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

      {/* ── PAYMENT PENDING SCREEN ── shown when user is registered but hasn't paid */}
      {user.paymentStatus !== 'paid' && (
        <div className="min-h-[70vh] flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 h-[2px] w-[60%] bg-gradient-to.r from-purple-500/50 to-blue-500/50" />

            {/* Status header */}
            {user.paymentStatus === 'submitted' ? (
              <div className="text-center space-y-2 mb-8">
                <div className="inline-flex p-3 bg-amber-50 rounded-full border border-amber-200 text-amber-600 mb-2">
                  <Loader className="h-7 w-7 animate-spin" />
                </div>
                <h1 className="text-xl font-extrabold text-slate-900">UTR Under Review</h1>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                  Your transaction reference has been submitted. Our team will verify and confirm your registration shortly.
                </p>
                <div className="inline-flex items-center gap-2 py-1.5 px-4 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-extrabold uppercase rounded-full tracking-wider mt-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                  Verification Pending
                </div>
              </div>
            ) : user.paymentStatus === 'rejected' ? (
              <div className="text-center space-y-2 mb-8">
                <div className="inline-flex p-3 bg-rose-50 rounded-full border border-rose-200 text-rose-600 mb-2">
                  <ShieldAlert className="h-7 w-7" />
                </div>
                <h1 className="text-xl font-extrabold text-slate-900">UTR Rejected</h1>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                  Your transaction reference was not verified. Please pay again and submit a valid UTR number.
                </p>
              </div>
            ) : dashUtrSuccess ? (
              <div className="text-center space-y-2 mb-8">
                <div className="inline-flex p-3 bg-emerald-50 rounded-full border border-emerald-200 text-emerald-600 mb-2">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h1 className="text-xl font-extrabold text-slate-900">UTR Submitted!</h1>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                  Thank you! Your UTR reference has been submitted. We'll verify it and activate your dashboard shortly.
                </p>
              </div>
            ) : (
              <div className="text-center space-y-2 mb-7">
                <div className="inline-flex items-center gap-2 py-1.5 px-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-extrabold uppercase rounded-full tracking-wider">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Payment Required
                </div>
                <h1 className="text-xl font-extrabold text-slate-900">Complete Your Payment</h1>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                  Pay <strong>₹399</strong> via Razorpay to activate your account, then come back here and enter your UTR number to confirm.
                </p>
              </div>
            )}

            {/* Pay via Razorpay button — shown for pending and rejected */}
            {(user.paymentStatus === 'pending' || user.paymentStatus === 'rejected') && !dashUtrSuccess && (
              <div className="mb-5 text-center">
                <a
                  href={getDirectRazorpayUrl(1)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all w-full"
                >
                  <span>Pay ₹399 via Razorpay</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <p className="text-[10px] text-slate-400 mt-2">You'll be redirected to the secure Axis Bank payment page.</p>
              </div>
            )}

            {/* UTR form — shown for pending and rejected (after paying) */}
            {(user.paymentStatus === 'pending' || user.paymentStatus === 'rejected') && !dashUtrSuccess && (
              <form onSubmit={handleDashUtrSubmit} className="space-y-4 border-t border-slate-100 pt-5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest pl-1 mb-1.5">
                    UTR / Transaction Reference Number
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={16}
                    placeholder="Enter 12-digit UTR reference number"
                    value={dashUtr}
                    onChange={e => setDashUtr(e.target.value.replace(/\s+/g, ''))}
                    className="block w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono"
                  />
                  <p className="text-[10px] text-slate-400 pl-1 mt-1.5">Find this in your Razorpay/bank payment SMS or email confirmation.</p>
                </div>
                {dashUtrError && (
                  <p className="text-rose-500 text-xs pl-1">{dashUtrError}</p>
                )}
                <button
                  type="submit"
                  disabled={dashUtrLoading || dashUtr.trim().length < 12}
                  className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  {dashUtrLoading ? 'Submitting...' : 'Submit UTR & Request Verification'}
                </button>
              </form>
            )}

            {/* Logout link */}
            <div className="mt-6 text-center">
              <button
                onClick={logout}
                className="text-[10px] text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1 mx-auto"
              >
                <LogOut className="h-3 w-3" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN DASHBOARD — only shown for paid users ── */}
      {user.paymentStatus === 'paid' && (
        <>
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
            Payment Records
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
                pendingRequestTeam ? (
                  /* Pending Request screen */
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center relative overflow-hidden shadow-sm animate-[fadeIn_0.2s_ease-out]">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[1px] w-3/5 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto mb-5 shadow-sm">
                      <Loader className="h-6 w-6 animate-spin" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Join Request Pending</h3>
                    <p className="text-xs text-slate-500 mt-2 mb-3 max-w-sm mx-auto leading-relaxed">
                      You have submitted a request to join the team <strong className="text-slate-800 font-bold">{pendingRequestTeam.name}</strong> (Code: <code className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-bold text-purple-650 font-mono">{pendingRequestTeam.id}</code>).
                    </p>
                    <div className="text-xs text-amber-600 font-semibold mb-6 max-w-sm mx-auto bg-amber-50 border border-amber-200/50 px-4 py-3 rounded-2xl leading-normal text-center">
                      Your team leader has not accepted the request yet. Please wait for approval.
                    </div>
                    <div className="flex flex-col sm:flex-row justify-center gap-3 max-w-xs mx-auto">
                      <button
                        onClick={fetchMyTeam}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all cursor-pointer active:scale-[0.97]"
                      >
                        Check Status / Refresh
                      </button>
                      <button
                        onClick={() => router.push('/get-in')}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-850 font-bold text-xs transition-all cursor-pointer active:scale-[0.97]"
                      >
                        Browse Teams
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[1px] w-3/5 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-5 shadow-sm">
                      <Users className="h-6 w-6 text-slate-800" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">You&apos;re not in a team yet</h3>
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
                )
              ) : (
                <div className="space-y-6">
                  {/* Team details header */}
                  {teamLoading || !teamDetails ? (
                    <div className="bg-white border border-slate-200/80 p-6 rounded-2xl animate-pulse h-32" />
                  ) : (
                    <div className="bg-white border border-slate-200 p-6 rounded-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
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
                  {/* Team Members List */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Users className="h-4.5 w-4.5 text-slate-400" />
                        Team Members List
                      </h3>
                      {user.id === teamDetails?.leaderId && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setAddMemberForm({
                                name: '',
                                email: '',
                                phone: '',
                                rollNumber: '',
                                college: '',
                                branch: '',
                                year: '1st Year',
                                gender: 'Male',
                                tshirtSize: 'M',
                                foodPreference: 'Veg',
                                utr: ''
                              });
                              setSessionMembers([]);
                              setAddMemberStep('input');
                              setShowAddMemberModal(true);
                            }}
                            disabled={teamDetails.members.length >= 5}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-750 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-[0.98] flex items-center gap-1"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            <span>Add Member ({teamDetails.members.length} / 5)</span>
                          </button>
                        </div>
                      )}
                    </div>
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
                            <div className="flex items-center gap-2">
                               {member.paymentStatus === 'submitted' ? (
                                 <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-250 px-2 py-0.5 rounded-full font-bold animate-pulse">
                                   Pending Admin Approval
                                 </span>
                               ) : member.profileCompleted === false ? (
                                 <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                                   Profile Incomplete
                                 </span>
                               ) : (
                                 <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                                   Profile Completed
                                 </span>
                               )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Join Requests Section (Team Leader Only) */}
                  {user.id === teamDetails?.leaderId && (
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Users className="h-4.5 w-4.5 text-slate-400" />
                          Join Requests
                        </h3>
                        <span className="text-[10px] text-slate-500 font-bold bg-slate-105 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                          {teamDetails.joinRequests?.filter((r: any) => r.status === 'PENDING' || r.status === 'pending').length || 0} Pending
                        </span>
                      </div>

                      {(!teamDetails.joinRequests || teamDetails.joinRequests.filter((r: any) => r.status === 'PENDING' || r.status === 'pending').length === 0) ? (
                        <p className="text-xs text-slate-500 text-center py-4">No pending requests at the moment.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {teamDetails.joinRequests
                            .filter((r: any) => r.status === 'PENDING' || r.status === 'pending')
                            .map((request: any) => (
                              <div
                                key={request.userId}
                                className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/60 transition-colors flex flex-col justify-between"
                              >
                                <div className="text-left space-y-1.5">
                                  <div className="flex justify-between items-start">
                                    <h4 className="text-xs font-bold text-slate-800">{request.name}</h4>
                                    <span className="text-[9px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-bold">
                                      {request.gender || 'Unknown'}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 font-mono truncate">{request.email}</p>
                                  
                                  <div className="text-[10px] text-slate-600 space-y-1 border-t border-slate-200/50 pt-2">
                                    <div>College: <span className="font-semibold text-slate-800">{request.college}</span></div>
                                    <div>Branch: <span className="font-semibold text-slate-800">{request.branch || 'N/A'}</span></div>
                                    <div>Year: <span className="font-semibold text-slate-800">{request.year || 'N/A'}</span></div>
                                  </div>
                                </div>

                                <div className="flex gap-2.5 mt-4 pt-2.5 border-t border-slate-200/50">
                                  <button
                                    onClick={() => handleRespondRequest(request.userId, 'rejected')}
                                    className="flex-1 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold text-[10px] transition-all cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                  <button
                                    onClick={() => handleRespondRequest(request.userId, 'approved')}
                                    className="flex-1 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] transition-all cursor-pointer"
                                  >
                                    Accept
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}
            </div>
          )}

          {/* --- TAB 3: RECEIPT DOWNLOADER / PAYMENT RECORDS --- */}
          {activeTab === 'receipt' && (
            <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-left">
                  <h3 className="text-lg font-bold text-slate-900">Payment History</h3>
                  <p className="text-xs text-slate-500 mt-1">Below are the verified transaction records for your team registrations.</p>
                </div>

                {getPaymentRecords().length === 0 ? (
                  <div className="bg-white border border-slate-200 p-12 rounded-3xl text-center shadow-sm">
                    <Ticket className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900">No Payment Records</h3>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      No payment records found for your team yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {getPaymentRecords().map((rec: any) => {
                      const isPaid = rec.status === 'paid';
                      const isPending = rec.status === 'submitted' || rec.status === 'pending';
                      const isRejected = rec.status === 'rejected';

                      return (
                        <div 
                          key={rec.utr} 
                          className={`printable-receipt-card bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl relative overflow-hidden shadow-md text-left transition-all ${
                            printingTxId === rec.utr ? 'printing' : ''
                          }`}
                        >
                          {/* Top Status Bar */}
                          <div className={`absolute top-0 right-0 border-b border-l text-[10px] px-4 py-1 font-extrabold uppercase ${
                            isPaid 
                              ? 'bg-emerald-50 border-emerald-250 text-emerald-700' 
                              : isPending 
                              ? 'bg-amber-50 border-amber-200 text-amber-700 animate-pulse' 
                              : 'bg-rose-50 border-rose-250 text-rose-700'
                          }`}>
                            {isPaid ? 'PAID CONFIRMED' : isPending ? 'VERIFICATION PENDING' : 'PAYMENT REJECTED'}
                          </div>

                          <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
                            <div>
                              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-wider font-mono">CodeSprint-2026</h2>
                              <p className="text-[10px] text-slate-500 mt-0.5">KVT Hall, Gudur, AP, India</p>
                            </div>
                            <div className="text-right pr-28 sm:pr-32">
                              <p className="text-[8px] text-slate-400 uppercase font-bold">Receipt No</p>
                              <p className="text-xxs font-mono font-bold text-slate-800 uppercase">REC-{rec.utr.substring(0, 8)}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-xs border-b border-slate-100 pb-4 mb-4">
                            <div>
                              <span className="text-slate-400 font-semibold text-[10px] uppercase block pl-0.5">Attendee Names Paid For</span>
                              <p className="font-bold text-slate-800 mt-0.5 text-xs leading-normal">
                                {rec.members.map((m: any) => m.name).join(', ')}
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-400 font-semibold text-[10px] uppercase block pl-0.5">Reference Txn ID / UTR</span>
                              <p className="font-mono font-bold text-slate-800 mt-0.5 text-xs">{rec.utr}</p>
                            </div>
                            <div>
                              <span className="text-slate-400 font-semibold text-[10px] uppercase block pl-0.5">College</span>
                              <p className="font-semibold text-slate-700 mt-0.5 text-[11px] leading-relaxed truncate" title={rec.members[0]?.college}>
                                {rec.members[0]?.college || user.college}
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-400 font-semibold text-[10px] uppercase block pl-0.5">Registered Emails</span>
                              <p className="font-mono text-slate-600 mt-0.5 text-[10px] leading-relaxed">
                                {rec.members.map((m: any) => m.email).join(', ')}
                              </p>
                            </div>
                          </div>

                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-[9px] text-slate-400 font-bold uppercase pl-0.5">Total Amount Paid</p>
                              <p className="text-xl font-black text-slate-900 font-mono">₹{rec.amount}</p>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => {
                                setPrintingTxId(rec.utr);
                                setTimeout(() => {
                                  window.print();
                                  setPrintingTxId(null);
                                }, 100);
                              }}
                              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 bg-white text-slate-700 font-bold text-xxs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-sm active:scale-[0.98] no-print"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>Print Receipt</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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

      {showAddMemberModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl max-w-2xl w-full relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => {
                setShowAddMemberModal(false);
                setAddMemberError('');
                setAddMemberForm({
                  name: '',
                  email: '',
                  phone: '',
                  rollNumber: '',
                  college: '',
                  branch: '',
                  year: '1st Year',
                  gender: 'Male',
                  tshirtSize: 'M',
                  foodPreference: 'Veg',
                  utr: ''
                });
                setCustomBranch('');
                setSessionMembers([]);
                setAddMemberStep('input');
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-655 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
              <UserPlus className="h-4.5 w-4.5 text-purple-655" />
              Add Team Member
            </h3>
            
            {addMemberError && (
              <div className="mb-4 p-2.5 rounded-xl border border-rose-100 bg-rose-50 text-rose-800 text-[10px] leading-relaxed text-center font-bold">
                {addMemberError}
              </div>
            )}

            {/* List of members being added in this session */}
            {sessionMembers.length > 0 && (
              <div className="mb-6 border border-purple-100 rounded-2xl p-4 bg-purple-50/30 space-y-3 text-left">
                <h4 className="text-[10px] font-extrabold text-purple-800 uppercase tracking-wider border-b border-purple-100 pb-1.5 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-purple-600" />
                  Teammates being added
                </h4>
                <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
                  {sessionMembers.map((m, idx) => (
                    <div key={idx} className="flex justify-between items-center text-slate-800 text-[10px] font-semibold bg-white rounded-xl p-2.5 border border-purple-100/50 shadow-xs animate-[fadeIn_0.2s_ease-out]">
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="font-bold text-slate-900 truncate">{m.name}</span>
                        <span className="text-[9px] text-slate-500 font-mono truncate">{m.email}</span>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0 text-slate-600 font-mono text-[9px]">
                        <span>{m.gender} | Size {m.tshirtSize}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSessionMembers(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="text-rose-500 hover:text-rose-750 transition-colors p-0.5 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between pt-1 font-bold text-[9px] text-purple-700 uppercase tracking-widest">
                  <span>Total New: {sessionMembers.length} member(s)</span>
                  <span>Amount: ₹{sessionMembers.length * 399}</span>
                </div>
              </div>
            )}

            {addMemberStep === 'input' && (
              <div className="space-y-4">
                {(teamDetails?.members?.length || 0) + sessionMembers.length < 5 ? (
                  <div className="space-y-4">
                    <p className="text-[10px] text-slate-550 leading-relaxed text-left border-b border-slate-100 pb-2">
                      Enter the details of the teammate you want to add to your list below.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                      <div>
                        <label htmlFor="memberName" className="block text-[10px] font-bold text-slate-600 mb-1 uppercase pl-0.5">Full Name</label>
                        <input
                          id="memberName"
                          type="text"
                          required
                          placeholder="e.g. John Doe"
                          value={addMemberForm.name}
                          onChange={(e) => setAddMemberForm(prev => ({ ...prev, name: e.target.value }))}
                          className="block w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 text-xs"
                        />
                      </div>

                      <div>
                        <label htmlFor="memberEmail" className="block text-[10px] font-bold text-slate-650 mb-1 uppercase pl-0.5">Email Address</label>
                        <input
                          id="memberEmail"
                          type="email"
                          required
                          placeholder="e.g. john@gmail.com"
                          value={addMemberForm.email}
                          onChange={(e) => setAddMemberForm(prev => ({ ...prev, email: e.target.value }))}
                          className="block w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 text-xs"
                        />
                      </div>

                      <div>
                        <label htmlFor="memberPhone" className="block text-[10px] font-bold text-slate-650 mb-1 uppercase pl-0.5">Phone Number</label>
                        <input
                          id="memberPhone"
                          type="text"
                          required
                          placeholder="10-digit mobile number"
                          value={addMemberForm.phone}
                          onChange={(e) => setAddMemberForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="block w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 text-xs"
                        />
                      </div>

                      <div>
                        <label htmlFor="memberRoll" className="block text-[10px] font-bold text-slate-655 mb-1 uppercase pl-0.5">Roll Number</label>
                        <input
                          id="memberRoll"
                          type="text"
                          required
                          placeholder="e.g. 22F11A0501"
                          value={addMemberForm.rollNumber}
                          onChange={(e) => setAddMemberForm(prev => ({ ...prev, rollNumber: e.target.value }))}
                          className="block w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 text-xs"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label htmlFor="memberCollege" className="block text-[10px] font-bold text-slate-655 mb-1 uppercase pl-0.5">College Name</label>
                        <input
                          id="memberCollege"
                          type="text"
                          required
                          list="member-college-options"
                          placeholder="Type to search college..."
                          value={addMemberForm.college}
                          onChange={(e) => setAddMemberForm(prev => ({ ...prev, college: e.target.value }))}
                          className="block w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 text-xs"
                        />
                        <datalist id="member-college-options">
                          {colleges.map((c: any) => (
                            <option key={c.id} value={c.name} />
                          ))}
                        </datalist>
                      </div>

                      <div>
                        <label htmlFor="memberBranch" className="block text-[10px] font-bold text-slate-655 mb-1 uppercase pl-0.5">Branch / Specialization</label>
                        <select
                          id="memberBranch"
                          required
                          value={addMemberForm.branch}
                          onChange={(e) => setAddMemberForm(prev => ({ ...prev, branch: e.target.value }))}
                          className="block w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-500/50 text-xs cursor-pointer"
                        >
                          <option value="" disabled>Select branch</option>
                          {BRANCH_OPTIONS.map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                        {addMemberForm.branch === 'Other' && (
                          <input
                            type="text"
                            required
                            placeholder="Enter member branch name manually"
                            value={customBranch}
                            onChange={(e) => setCustomBranch(e.target.value)}
                            className="block w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-500/50 text-xs mt-2"
                          />
                        )}
                      </div>

                      <div>
                        <label htmlFor="memberYear" className="block text-[10px] font-bold text-slate-655 mb-1 uppercase pl-0.5">Current Year</label>
                        <select
                          id="memberYear"
                          required
                          value={addMemberForm.year}
                          onChange={(e) => setAddMemberForm(prev => ({ ...prev, year: e.target.value }))}
                          className="block w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-500/50 text-xs cursor-pointer"
                        >
                          <option value="1st Year">1st Year</option>
                          <option value="2nd Year">2nd Year</option>
                          <option value="3rd Year">3rd Year</option>
                          <option value="4th Year">4th Year</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="memberGender" className="block text-[10px] font-bold text-slate-655 mb-1 uppercase pl-0.5">Gender</label>
                        <select
                          id="memberGender"
                          required
                          value={addMemberForm.gender}
                          onChange={(e) => setAddMemberForm(prev => ({ ...prev, gender: e.target.value }))}
                          className="block w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-500/50 text-xs cursor-pointer"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="memberTshirt" className="block text-[10px] font-bold text-slate-655 mb-1 uppercase pl-0.5">T-Shirt Size</label>
                        <select
                          id="memberTshirt"
                          required
                          value={addMemberForm.tshirtSize}
                          onChange={(e) => setAddMemberForm(prev => ({ ...prev, tshirtSize: e.target.value }))}
                          className="block w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-500/50 text-xs cursor-pointer"
                        >
                          <option value="S">S</option>
                          <option value="M">M</option>
                          <option value="L">L</option>
                          <option value="XL">XL</option>
                          <option value="XXL">XXL</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                      {sessionMembers.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setAddMemberError('');
                            setAddMemberStep('pay');
                          }}
                          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
                        >
                          <span>Proceed to Payment (₹{sessionMembers.length * 399})</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (!addMemberForm.name.trim() ||
                              !addMemberForm.email.trim() ||
                              !addMemberForm.phone.trim() ||
                              !addMemberForm.rollNumber.trim() ||
                              !addMemberForm.college.trim() ||
                              !addMemberForm.branch) {
                            setAddMemberError('Please enter all required fields.');
                            return;
                          }
                          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addMemberForm.email.trim())) {
                            setAddMemberError('Invalid member email.');
                            return;
                          }
                          if (!/^\d{10}$/.test(addMemberForm.phone.trim())) {
                            setAddMemberError('Member phone must be exactly 10 digits.');
                            return;
                          }
                          if (addMemberForm.branch === 'Other' && !customBranch.trim()) {
                            setAddMemberError('Please enter your custom Branch name.');
                            return;
                          }

                          // Check duplicates
                          const emailLower = addMemberForm.email.toLowerCase().trim();
                          if (user.email.toLowerCase() === emailLower) {
                            setAddMemberError('You cannot add yourself (Team Leader) as a teammate.');
                            return;
                          }
                          const isDupInTeam = teamDetails?.members?.some((member: any) => member.email.toLowerCase() === emailLower);
                          if (isDupInTeam) {
                            setAddMemberError('This member is already in your team.');
                            return;
                          }
                          const isDupInSession = sessionMembers.some(m => m.email.toLowerCase() === emailLower);
                          if (isDupInSession) {
                            setAddMemberError('A member with this email is already added to the list.');
                            return;
                          }

                          setAddMemberError('');
                          const finalBranch = addMemberForm.branch === 'Other' ? customBranch.trim() : addMemberForm.branch;
                          const finalCollege = addMemberForm.college.trim();

                          setSessionMembers(prev => [...prev, {
                            name: addMemberForm.name.trim(),
                            email: emailLower,
                            phone: addMemberForm.phone.trim(),
                            rollNumber: addMemberForm.rollNumber.trim(),
                            college: finalCollege,
                            branch: finalBranch,
                            year: addMemberForm.year,
                            gender: addMemberForm.gender,
                            tshirtSize: addMemberForm.tshirtSize,
                            foodPreference: addMemberForm.foodPreference
                          }]);

                          // Reset form fields
                          setAddMemberForm({
                            name: '',
                            email: '',
                            phone: '',
                            rollNumber: '',
                            college: '',
                            branch: '',
                            year: '1st Year',
                            gender: 'Male',
                            tshirtSize: 'M',
                            foodPreference: 'Veg',
                            utr: ''
                          });
                          setCustomBranch('');
                          setCustomCollege('');
                        }}
                        className="px-5 py-2.5 border border-purple-200 text-purple-755 bg-purple-50 hover:bg-purple-100 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-[0.98]"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>Add Member to Team</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center border border-slate-200 bg-slate-50 text-slate-500 rounded-xl text-xs font-semibold">
                    Team capacity reached (5 total members added). Remove a teammate from the session list to add another, or proceed to payment.
                  </div>
                )}
              </div>
            )}

            {addMemberStep === 'pay' && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-left flex justify-between items-center text-xs font-bold text-slate-800">
                  <span>Total Registration Amount ({sessionMembers.length} member(s))</span>
                  <span className="text-purple-700 font-mono">₹{sessionMembers.length * 399}</span>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      window.open(getDirectRazorpayUrl(sessionMembers.length), '_blank');
                      setAddMemberStep('utr');
                    }}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Pay ₹{sessionMembers.length * 399}</span>
                  </button>
                  <p className="text-[9px] text-slate-500 text-center leading-normal mt-2">
                    Click the button above to pay securely. After paying, you will enter the transaction UTR number.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setAddMemberStep('input')}
                  className="w-full text-center text-[10px] text-purple-655 hover:underline font-bold mt-1"
                >
                  Edit Teammate Details
                </button>
              </div>
            )}

            {addMemberStep === 'utr' && (
              <form onSubmit={handleAddMemberSubmit} className="space-y-4">
                <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-left flex justify-between items-center text-xs font-bold text-slate-800">
                  <span>Total Amount Paid</span>
                  <span className="text-emerald-700 font-mono">₹{sessionMembers.length * 399}</span>
                </div>

                <div>
                  <label htmlFor="memberUtr" className="block text-[10px] font-bold text-slate-655 mb-1 uppercase pl-0.5">Transaction UTR / Txn ID</label>
                  <input
                    id="memberUtr"
                    type="text"
                    required
                    placeholder="Enter 12-digit transaction UTR"
                    value={addMemberForm.utr}
                    onChange={(e) => setAddMemberForm(prev => ({ ...prev, utr: e.target.value }))}
                    className="block w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 text-xs"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={addMemberLoading || !addMemberForm.utr.trim()}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
                  >
                    {addMemberLoading ? (
                      <Loader className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    <span>Submit UTR & Add Teammate(s)</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media print {
          body * {
            visibility: hidden !important;
          }
          .printable-receipt-card.printing {
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .printable-receipt-card.printing * {
            visibility: visible !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
        </> 
      )} {/* end user.paymentStatus === 'paid' */}
    </div>
  );
}
