'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { 
  Sparkles, User, Mail, Phone, School, BookOpen, Calendar, 
  Globe, Ticket, CreditCard, ShieldAlert, CheckCircle2, 
  Download, ArrowRight, Loader, Users, ArrowLeft, Search, FileText, ExternalLink, Trash2, Plus, Info
} from 'lucide-react';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const BRANCH_OPTIONS = [
  "Computer Science & Engineering (CSE)",
  "Artificial Intelligence & Machine Learning (AI-ML)",
  "Data Science",
  "Cyber Security",
  "Information Technology (IT)",
  "Electronics & Communication Engineering (ECE)",
  "Electrical & Electronics Engineering (EEE)",
  "Mechanical Engineering (ME)",
  "Civil Engineering (CE)",
  "Chemical Engineering",
  "Biotechnology",
  "Food Technology",
  "Other"
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user, refreshUser, logout } = useAuth();

  // Mode Selection: 'selection' | 'CREATE' | 'JOIN'
  const [regMode, setRegMode] = useState<'selection' | 'CREATE' | 'JOIN'>('selection');

  // Wizards steps
  // CREATE steps: 1: Team details, 2: Leader profile, 3: Add members, 4: Review & Payment, 5: Post-payment availability
  const [createStep, setCreateStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  // JOIN steps: 1: Your profile, 2: Payment
  const [joinStep, setJoinStep] = useState<1 | 2>(1);

  // Form states
  const [teamName, setTeamName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  
  const [leaderDetails, setLeaderDetails] = useState({
    name: searchParams.get('name') || '',
    email: searchParams.get('email') || '',
    phone: '',
    college: '',
    rollNumber: '',
    branch: '',
    year: '1st Year',
    gender: 'Male',
    tshirtSize: 'M',
    linkedin: '',
    foodPreference: 'Veg'
  });

  const [addedMembers, setAddedMembers] = useState<any[]>([]);

  // Member Add Input Form state
  const [memberForm, setMemberForm] = useState({
    name: '',
    email: '',
    phone: '',
    rollNumber: '',
    college: '',
    branch: '',
    year: '1st Year',
    gender: 'Male',
    tshirtSize: 'M',
    linkedin: '',
    foodPreference: 'Veg'
  });

  // Individual registration details
  const [individualDetails, setIndividualDetails] = useState({
    name: searchParams.get('name') || '',
    email: searchParams.get('email') || '',
    phone: '',
    college: '',
    rollNumber: '',
    branch: '',
    year: '1st Year',
    gender: 'Male',
    tshirtSize: 'M',
    linkedin: '',
    foodPreference: 'Veg'
  });

  // App availability settings post-payment
  const [availabilityMode, setAvailabilityMode] = useState<'CLOSE' | 'OPEN'>('CLOSE');
  const [selectedAvailableSlots, setSelectedAvailableSlots] = useState(1);

  // Dropdown options
  const [colleges, setColleges] = useState<any[]>([]);
  const [showLeaderColleges, setShowLeaderColleges] = useState(false);
  const [showMemberColleges, setShowMemberColleges] = useState(false);
  const [showIndividualColleges, setShowIndividualColleges] = useState(false);

  const getFilteredColleges = (query: string) => {
    if (!query) return colleges.slice(0, 15);
    const q = query.toLowerCase();
    return colleges.filter((c: any) => c.name.toLowerCase().includes(q)).slice(0, 15);
  };

  const [customLeaderCollege, setCustomLeaderCollege] = useState('');
  const [customIndividualCollege, setCustomIndividualCollege] = useState('');
  const [customMemberCollege, setCustomMemberCollege] = useState('');
  const [customLeaderBranch, setCustomLeaderBranch] = useState('');
  const [customIndividualBranch, setCustomIndividualBranch] = useState('');
  const [customMemberBranch, setCustomMemberBranch] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [duplicatePhones, setDuplicatePhones] = useState<Record<string, boolean>>({});
  const [duplicateEmails, setDuplicateEmails] = useState<Record<string, boolean>>({});
  const [duplicateRolls, setDuplicateRolls] = useState<Record<string, boolean>>({});
  const [successMsg, setSuccessMsg] = useState('');

  // Payment states
  const [paymentStep, setPaymentStep] = useState<'form' | 'success' | 'submitted' | 'rejected' | 'utr-input'>('form');
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [paidUser, setPaidUser] = useState<any>(null);
  const [receiptDetails, setReceiptDetails] = useState<any>(null);
  const [newUtr, setNewUtr] = useState('');
  const [teamMemberCount, setTeamMemberCount] = useState<number | null>(null);
  


  // URL Prefill Handling
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get('email');
      const nameParam = params.get('name');
      if (emailParam) {
        const cleanEmail = emailParam.toLowerCase().trim();
        setLeaderDetails(prev => ({ ...prev, email: cleanEmail, name: nameParam || prev.name }));
        setIndividualDetails(prev => ({ ...prev, email: cleanEmail, name: nameParam || prev.name }));
      }
    }

    // Restore JOIN flow state after Razorpay redirect — only if user is still authenticated
    const savedIndividual = sessionStorage.getItem('cs_individual_details');
    const savedRegMode = sessionStorage.getItem('cs_reg_mode');
    const authToken = localStorage.getItem('codesprint_token');
    if (savedIndividual && savedRegMode === 'JOIN' && authToken) {
      try {
        const parsed = JSON.parse(savedIndividual);
        setIndividualDetails(parsed);
        setRegMode('JOIN');
        setJoinStep(2);
      } catch {}
    } else if (!authToken) {
      // User logged out — clear any stale payment flow session data
      sessionStorage.removeItem('cs_individual_details');
      sessionStorage.removeItem('cs_reg_mode');
    }
  }, []);

  // Fetch Colleges List & Auto-Generate Team Code
  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_API_URL + '/api/colleges')
      .then(res => res.json())
      .then(data => setColleges(data))
      .catch(console.error);

    // Prefill unique random team code from backend
    fetch(process.env.NEXT_PUBLIC_API_URL + '/api/public/generate-team-code')
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.code) {
          setTeamCode(data.code);
        } else {
          const randomCode = `CS2026-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`;
          setTeamCode(randomCode);
        }
      })
      .catch(err => {
        console.error(err);
        const randomCode = `CS2026-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`;
        setTeamCode(randomCode);
      });
  }, []);

  // Redirection when user status updates
  useEffect(() => {
    if (user) {
      if (user.paymentStatus === 'paid') {
        sessionStorage.removeItem('cs_individual_details');
        sessionStorage.removeItem('cs_reg_mode');
        if (user.teamId) {
          router.push('/dashboard');
        } else {
          router.push('/get-in');
        }
      } else if (user.paymentStatus === 'submitted') {
        setRegMode('JOIN');
        setJoinStep(2);
        setPaymentStep('submitted');
      } else if (user.paymentStatus === 'rejected') {
        setRegMode('JOIN');
        setJoinStep(2);
        setPaymentStep('rejected');
      } else if (user.paymentStatus === 'pending') {
        setRegMode('JOIN');
        setJoinStep(2);
        setPaymentStep('utr-input');
      }
    }
  }, [user, router]);

  useEffect(() => {
    if (user && user.role === 'team-leader' && user.teamId) {
      const activeToken = localStorage.getItem('codesprint_token');
      fetch((process.env.NEXT_PUBLIC_API_URL || '') + '/api/teams/my-team', {
        headers: {
          Authorization: `Bearer ${activeToken}`
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data && data.team) {
          setTeamMemberCount(data.team.members.length);
        }
      })
      .catch(console.error);
    }
  }, [user]);



  // Check duplicate phone numbers in the database and local team list
  const checkPhoneDuplicate = async (phone: string, currentFieldId?: string) => {
    if (phone.length === 10) {
      const cleanPhone = phone.trim();
      
      // Local Check: Leader vs Members
      if (currentFieldId === 'phone') {
        if (addedMembers.some(m => m.phone.trim() === cleanPhone)) {
          setDuplicatePhones(prev => ({ ...prev, [phone]: true }));
          setErrorMsg('This phone number is already used by an added team member.');
          return true;
        }
      }
      if (currentFieldId === 'm_phone') {
        if (leaderDetails.phone.trim() === cleanPhone) {
          setDuplicatePhones(prev => ({ ...prev, [phone]: true }));
          setErrorMsg('Member phone number cannot match the Team Leader.');
          return true;
        }
        if (addedMembers.some(m => m.phone.trim() === cleanPhone)) {
          setDuplicatePhones(prev => ({ ...prev, [phone]: true }));
          setErrorMsg('A member with this phone number is already added.');
          return true;
        }
      }

      try {
        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || '') + '/api/users/check-duplicate?phone=' + phone);
        if (res.ok) {
          const data = await res.json();
          if (data.exists) {
            setDuplicatePhones(prev => ({ ...prev, [phone]: true }));
            setErrorMsg(data.message);
            return true;
          } else {
            setDuplicatePhones(prev => { const next = { ...prev }; delete next[phone]; return next; });
            setErrorMsg(prev => (prev.includes('phone') || prev.includes('Phone')) ? '' : prev);
          }
        }
      } catch (err) {
        console.error('Error checking phone duplicate:', err);
      }
    }
    return false;
  };

  // Check duplicate emails — triggers when email looks complete
  const checkEmailDuplicate = async (email: string, currentFieldId?: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (emailRegex.test(email)) {
      const cleanEmail = email.toLowerCase().trim();

      // Local Check: Leader vs Members
      if (currentFieldId === 'email') {
        if (addedMembers.some(m => m.email.toLowerCase().trim() === cleanEmail)) {
          setDuplicateEmails(prev => ({ ...prev, [cleanEmail]: true }));
          setErrorMsg('This email is already used by an added team member.');
          return true;
        }
      }
      if (currentFieldId === 'm_email') {
        if (leaderDetails.email.toLowerCase().trim() === cleanEmail) {
          setDuplicateEmails(prev => ({ ...prev, [cleanEmail]: true }));
          setErrorMsg('Member email cannot match the Team Leader.');
          return true;
        }
        if (addedMembers.some(m => m.email.toLowerCase().trim() === cleanEmail)) {
          setDuplicateEmails(prev => ({ ...prev, [cleanEmail]: true }));
          setErrorMsg('A member with this email is already added.');
          return true;
        }
      }

      try {
        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || '') + '/api/users/check-duplicate?email=' + encodeURIComponent(email));
        if (res.ok) {
          const data = await res.json();
          if (data.exists) {
            setDuplicateEmails(prev => ({ ...prev, [cleanEmail]: true }));
            setErrorMsg(data.message);
            return true;
          } else {
            setDuplicateEmails(prev => { const next = { ...prev }; delete next[cleanEmail]; return next; });
            setErrorMsg(prev => prev.toLowerCase().includes('email') ? '' : prev);
          }
        }
      } catch (err) {
        console.error('Error checking email duplicate:', err);
      }
    } else {
      setDuplicateEmails(prev => { const next = { ...prev }; delete next[email.toLowerCase()]; return next; });
    }
    return false;
  };

  // Check duplicate roll/ID numbers — triggers on blur
  const checkRollDuplicate = async (rollNumber: string, currentFieldId?: string) => {
    const clean = rollNumber.trim().toUpperCase();
    if (!clean) return false;

    // Local Check: Leader vs Members
    if (currentFieldId === 'rollNumber') {
      if (addedMembers.some(m => m.rollNumber.trim().toUpperCase() === clean)) {
        setDuplicateRolls(prev => ({ ...prev, [clean]: true }));
        setErrorMsg('This Roll/ID number is already used by an added team member.');
        return true;
      }
    }
    if (currentFieldId === 'm_rollNumber') {
      if (leaderDetails.rollNumber.trim().toUpperCase() === clean) {
        setDuplicateRolls(prev => ({ ...prev, [clean]: true }));
        setErrorMsg('Member Roll/ID number cannot match the Team Leader.');
        return true;
      }
      if (addedMembers.some(m => m.rollNumber.trim().toUpperCase() === clean)) {
        setDuplicateRolls(prev => ({ ...prev, [clean]: true }));
        setErrorMsg('A member with this Roll/ID number is already added.');
        return true;
      }
    }

    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || '') + '/api/users/check-duplicate?rollNumber=' + encodeURIComponent(clean));
      if (res.ok) {
        const data = await res.json();
        if (data.exists) {
          setDuplicateRolls(prev => ({ ...prev, [clean]: true }));
          setErrorMsg(data.message);
          return true;
        } else {
          setDuplicateRolls(prev => { const next = { ...prev }; delete next[clean]; return next; });
          setErrorMsg(prev => (prev.includes('Roll') || prev.includes('ID')) ? '' : prev);
        }
      }
    } catch (err) {
      console.error('Error checking roll duplicate:', err);
    }
    return false;
  };

  // Handle Leader details change
  const handleLeaderChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let value = e.target.value;
    if (e.target.id === 'phone') {
      value = value.replace(/\D/g, '').slice(0, 10);
      if (value.length === 10) {
        checkPhoneDuplicate(value, 'phone');
      } else {
        setDuplicatePhones(prev => { const next = { ...prev }; const old = leaderDetails.phone; if (old) delete next[old]; return next; });
      }
    }
    if (e.target.id === 'email') {
      checkEmailDuplicate(value, 'email');
    }
    setLeaderDetails(prev => ({ ...prev, [e.target.id]: value }));
  };

  // Handle Individual details change
  const handleIndividualChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let value = e.target.value;
    if (e.target.id === 'phone') {
      value = value.replace(/\D/g, '').slice(0, 10);
      if (value.length === 10) {
        checkPhoneDuplicate(value, 'phone');
      } else {
        setDuplicatePhones(prev => { const next = { ...prev }; const old = individualDetails.phone; if (old) delete next[old]; return next; });
      }
    }
    if (e.target.id === 'email') {
      checkEmailDuplicate(value, 'email');
    }
    setIndividualDetails(prev => ({ ...prev, [e.target.id]: value }));
  };

  // Handle Member Add details change
  const handleMemberChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let value = e.target.value;
    if (e.target.id === 'm_phone') {
      value = value.replace(/\D/g, '').slice(0, 10);
      if (value.length === 10) {
        checkPhoneDuplicate(value, 'm_phone');
      } else {
        setDuplicatePhones(prev => { const next = { ...prev }; const old = memberForm.phone; if (old) delete next[old]; return next; });
      }
    }
    if (e.target.id === 'm_email') {
      checkEmailDuplicate(value, 'm_email');
    }
    const fieldId = e.target.id.replace('m_', '');
    setMemberForm(prev => ({ ...prev, [fieldId]: value }));
  };

  // Verify unique team details (Step 1 CREATE)
  const verifyTeamDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!teamName.trim()) {
      setErrorMsg('Team Name is required.');
      return;
    }
    if (!teamCode.trim()) {
      setErrorMsg('Team Code is required.');
      return;
    }
    const cleanCode = teamCode.replace(/\s+/g, '').toUpperCase();
    setTeamCode(cleanCode);

    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/validate-unique?name=${encodeURIComponent(teamName.trim())}&code=${encodeURIComponent(cleanCode)}`);
      const data = await res.json();
      if (res.ok) {
        if (data.nameTaken) {
          setErrorMsg('This Team Name is already taken.');
        } else if (data.codeTaken) {
          setErrorMsg('This Team Code is already taken.');
        } else {
          setCreateStep(2);
        }
      } else {
        setErrorMsg(data.message || 'Validation failed.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Server connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Leader validation (Step 2 CREATE)
  const verifyLeaderDetails = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!leaderDetails.name.trim()) return setErrorMsg('Leader name is required.');
    if (!leaderDetails.email.trim()) return setErrorMsg('Leader email is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leaderDetails.email.trim())) return setErrorMsg('Invalid email address.');
    if (duplicateEmails[leaderDetails.email.toLowerCase().trim()]) return setErrorMsg(`Email ${leaderDetails.email} is already registered.`);
    if (!/^\d{10}$/.test(leaderDetails.phone)) return setErrorMsg('Phone number must be exactly 10 digits.');
    if (duplicatePhones[leaderDetails.phone]) return setErrorMsg(`Phone number ${leaderDetails.phone} is already registered.`);
    if (!leaderDetails.college.trim()) return setErrorMsg('Please enter or select your college.');
    if (!leaderDetails.rollNumber.trim()) return setErrorMsg('Roll number is required.');
    if (duplicateRolls[leaderDetails.rollNumber.trim().toUpperCase()]) return setErrorMsg(`Roll/ID number ${leaderDetails.rollNumber} is already registered.`);
    if (!leaderDetails.branch) return setErrorMsg('Branch/Dept is required.');
    if (leaderDetails.branch === 'Other' && !customLeaderBranch.trim()) {
      return setErrorMsg('Please enter your custom Branch/Dept name.');
    }

    setCreateStep(3);
  };

  // Add Member to the members list (Step 3 CREATE)
  const addMemberToList = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!memberForm.name.trim()) return setErrorMsg('Member name is required.');
    if (!memberForm.email.trim()) return setErrorMsg('Member email is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(memberForm.email.trim())) return setErrorMsg('Invalid member email.');
    if (duplicateEmails[memberForm.email.toLowerCase().trim()]) return setErrorMsg(`Email ${memberForm.email} is already registered.`);
    if (!/^\d{10}$/.test(memberForm.phone)) return setErrorMsg('Member phone must be exactly 10 digits.');
    if (duplicatePhones[memberForm.phone]) return setErrorMsg(`Phone number ${memberForm.phone} is already registered.`);
    if (!memberForm.rollNumber.trim()) return setErrorMsg('Member roll number is required.');
    if (duplicateRolls[memberForm.rollNumber.trim().toUpperCase()]) return setErrorMsg(`Roll/ID number ${memberForm.rollNumber} is already registered.`);
    if (!memberForm.college.trim()) return setErrorMsg('Member college is required.');
    if (!memberForm.branch) return setErrorMsg('Member branch is required.');
    if (memberForm.branch === 'Other' && !customMemberBranch.trim()) {
      return setErrorMsg('Please enter your custom Member branch name.');
    }

    // Check duplicate emails
    const leaderEmail = leaderDetails.email.toLowerCase().trim();
    const currentEmail = memberForm.email.toLowerCase().trim();
    if (leaderEmail === currentEmail) {
      return setErrorMsg('Member email cannot match the Team Leader email.');
    }
    const alreadyAdded = addedMembers.some(m => m.email.toLowerCase().trim() === currentEmail);
    if (alreadyAdded) {
      return setErrorMsg('A member with this email is already added.');
    }

    const finalCollege = memberForm.college.trim();
    const finalBranch = memberForm.branch === 'Other' ? customMemberBranch.trim() : memberForm.branch;
    setAddedMembers([...addedMembers, { 
      ...memberForm, 
      college: finalCollege, 
      branch: finalBranch, 
      email: currentEmail 
    }]);
    // Reset form
    setMemberForm({
      name: '',
      email: '',
      phone: '',
      rollNumber: '',
      college: '',
      branch: '',
      year: '1st Year',
      gender: 'Male',
      tshirtSize: 'M',
      linkedin: '',
      foodPreference: 'Veg'
    });
    setCustomMemberBranch('');
    setCustomMemberCollege('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Remove member from list (Step 3 CREATE)
  const removeMemberFromList = (index: number) => {
    const copy = [...addedMembers];
    copy.splice(index, 1);
    setAddedMembers(copy);
  };



  // Get total members & cost
  const totalMembers = addedMembers.length + 1;

  useEffect(() => {
    const maxAllowedSlots = 5 - totalMembers;
    if (maxAllowedSlots <= 0) {
      setAvailabilityMode('CLOSE');
      setSelectedAvailableSlots(0);
    } else if (selectedAvailableSlots > maxAllowedSlots) {
      setSelectedAvailableSlots(maxAllowedSlots);
    }
  }, [totalMembers, selectedAvailableSlots]);

  const basePrice = regMode === 'CREATE'
    ? totalMembers * 399
    : (user && user.role === 'team-leader' && teamMemberCount ? teamMemberCount * 399 : 399);
  
  const getFinalPrice = () => {
    return basePrice;
  };

  // Check if at least one female is present
  const hasFemaleParticipant = () => {
    if (regMode !== 'CREATE') return true; // not applicable for join
    const leaderGender = leaderDetails.gender.toLowerCase();
    const membersGenders = addedMembers.map(m => m.gender.toLowerCase());
    return leaderGender === 'female' || membersGenders.includes('female');
  };

  // Submit team registration and proceed to payment (Step 4 CREATE)
  const handleTeamRegistrationSubmit = async () => {
    setErrorMsg('');
    if (!leaderDetails.name.trim() || !leaderDetails.email.trim() || !leaderDetails.phone.trim() || !leaderDetails.college.trim() || !leaderDetails.branch) {
      return setErrorMsg('Team Leader details are incomplete. Please complete Step 2.');
    }
    if (totalMembers < 3) {
      return setErrorMsg('Minimum 3 members are required (including leader) to register a team.');
    }
    if (totalMembers > 5) {
      return setErrorMsg('Maximum 5 members are allowed in a team.');
    }
    if (!hasFemaleParticipant()) {
      return setErrorMsg('At least one female participant is mandatory for every team.');
    }
    if (duplicatePhones[leaderDetails.phone]) {
      return setErrorMsg(`The Team Leader phone number (${leaderDetails.phone}) is already registered.`);
    }
    if (addedMembers.some(m => duplicatePhones[m.phone])) {
      const dup = addedMembers.find(m => duplicatePhones[m.phone]);
      return setErrorMsg(`Member phone number (${dup?.phone}) is already registered.`);
    }

    setLoading(true);
    try {
      const leaderPayload = {
        ...leaderDetails,
        college: leaderDetails.college.trim(),
        branch: leaderDetails.branch === 'Other' ? customLeaderBranch.trim() : leaderDetails.branch
      };

      // Generate Razorpay order on the backend publicly
      const orderRes = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/payments/create-order-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationType: 'TEAM',
          quantity: totalMembers
        })
      });

      const orderData = await orderRes.json();
      if (orderRes.ok) {
        setCreatedOrder(orderData);
        
        const registrationDetails = {
          teamName: teamName.trim(),
          teamCode: teamCode.trim(),
          leader: leaderPayload,
          members: addedMembers,
          teamStatus: availabilityMode,
          availableSlots: availabilityMode === 'OPEN' ? selectedAvailableSlots : 0
        };

        await handleRazorpayRegistrationPayment(orderData, leaderPayload, 'TEAM', registrationDetails);
      } else {
        setErrorMsg(orderData.message || 'Failed to create payment order.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to process team registration.');
    } finally {
      setLoading(false);
    }
  };

  // Submit individual join team details (Step 1 JOIN)
  const handleIndividualRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!individualDetails.name.trim()) return setErrorMsg('Name is required.');
    if (!individualDetails.email.trim()) return setErrorMsg('Email is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(individualDetails.email.trim())) return setErrorMsg('Invalid email address.');
    if (duplicateEmails[individualDetails.email.toLowerCase().trim()]) return setErrorMsg(`Email ${individualDetails.email} is already registered.`);
    if (!/^\d{10}$/.test(individualDetails.phone)) return setErrorMsg('Phone number must be exactly 10 digits.');
    if (duplicatePhones[individualDetails.phone]) return setErrorMsg(`Phone number ${individualDetails.phone} is already registered.`);
    if (!individualDetails.college.trim()) return setErrorMsg('Please enter or select your college.');
    if (duplicateRolls[individualDetails.rollNumber.trim().toUpperCase()]) return setErrorMsg(`Roll/ID number ${individualDetails.rollNumber} is already registered.`);
    if (!individualDetails.rollNumber.trim()) return setErrorMsg('Roll number is required.');
    if (!individualDetails.branch) return setErrorMsg('Branch/Specialization is required.');
    if (individualDetails.branch === 'Other' && !customIndividualBranch.trim()) {
      return setErrorMsg('Please enter your custom Branch/Specialization.');
    }

    setLoading(true);
    try {
      const individualPayload = {
        ...individualDetails,
        college: individualDetails.college.trim(),
        branch: individualDetails.branch === 'Other' ? customIndividualBranch.trim() : individualDetails.branch,
        registrationType: 'INDIVIDUAL'
      };

      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/auth/otp-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...individualPayload
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message || 'Details verification failed.');
        setLoading(false);
        return;
      }

      // Generate payment order publicly
      const orderRes = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/payments/create-order-public', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          registrationType: 'INDIVIDUAL',
          quantity: 1
        })
      });

      const orderData = await orderRes.json();
      if (orderRes.ok) {
        setCreatedOrder(orderData);
        setJoinStep(2);
        await handleRazorpayRegistrationPayment(orderData, individualPayload, 'INDIVIDUAL', individualPayload);
      } else {
        setErrorMsg(orderData.message || 'Failed to create payment order.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to complete verification.');
    } finally {
      setLoading(false);
    }
  };

  // UTR submission handler
  const handleResubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUtr.trim()) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const activeToken = localStorage.getItem('codesprint_token');
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/payments/submit-utr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify({ utr: newUtr.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        await refreshUser();
        setPaymentStep('submitted');
      } else {
        setErrorMsg(data.message || 'Failed to submit UTR.');
        if (data.autoRejected) {
          await refreshUser();
          setPaymentStep('rejected');
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error submitting UTR.');
    } finally {
      setLoading(false);
    }
  };

  // Mock Payment verification bypass for development
  const handleMockPaymentVerify = async () => {
    setLoading(true);
    setErrorMsg('');
    const tokenToUse = localStorage.getItem('codesprint_token');
    const finalAmount = getFinalPrice();
    const mockPaymentId = `pay_mock_${Math.floor(100000 + Math.random() * 900000)}`;
    const mockOrderId = createdOrder?.id || `order_mock_${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      const verifyRes = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenToUse}`
        },
        body: JSON.stringify({
          razorpay_payment_id: mockPaymentId,
          razorpay_order_id: mockOrderId,
          razorpay_signature: 'mock_payment_signature',
          amount: finalAmount
        })
      });

      const verifyData = await verifyRes.json();
      if (verifyRes.ok && verifyData.success) {
        login(tokenToUse!, verifyData.user);
        setPaidUser(verifyData.user);
        setReceiptDetails({
          receiptNo: `REC-${Math.floor(100000 + Math.random() * 900000)}`,
          date: new Date().toLocaleDateString(),
          amount: finalAmount,
          couponUsed: 'None',
          discount: 0,
          paymentId: verifyData.user.paymentId || mockPaymentId
        });

        await refreshUser();
        if (regMode === 'CREATE') {
          // Advance to availability settings step for team leaders
          setCreateStep(5);
        } else {
          setPaymentStep('success');
        }
      } else {
        setErrorMsg(verifyData.message || 'Payment verification failed.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to process payment validation.');
    } finally {
      setLoading(false);
    }
  };

  // Post Payment Availability details submit (Step 5 CREATE)
  const submitAvailabilitySettings = async () => {
    setLoading(true);
    setErrorMsg('');
    const tokenToUse = localStorage.getItem('codesprint_token');
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/teams/set-availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenToUse}`
        },
        body: JSON.stringify({
          teamStatus: availabilityMode,
          availableSlots: availabilityMode === 'OPEN' ? selectedAvailableSlots : 0
        })
      });

      const data = await res.json();
      if (res.ok) {
        router.push('/dashboard');
      } else {
        setErrorMsg(data.message || 'Failed to submit availability settings.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error submitting availability settings.');
    } finally {
      setLoading(false);
    }
  };



  const getActiveUserDetails = () => {
    if (user) {
      return {
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        college: user.college || '',
        rollNumber: user.rollNumber || '',
        branch: user.branch || '',
        year: user.year || '1st Year',
        gender: user.gender || 'Male',
        tshirtSize: user.tshirtSize || 'M',
        linkedin: user.linkedin || '',
        foodPreference: user.foodPreference || 'Veg'
      };
    }
    return regMode === 'CREATE' ? leaderDetails : individualDetails;
  };

  const handleRazorpayRegistrationPayment = async (orderData: any, userDetails: any, registrationType: string, registrationDetails: any) => {
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setErrorMsg('Failed to load Razorpay Checkout SDK. Please check your network connection.');
      return;
    }

    const keyId = orderData.keyId || '';

    const options = {
      key: keyId,
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      name: 'CodeSprint 2026',
      description: 'Hackathon Registration Fee',
      order_id: orderData.id,
      handler: async function (response: any) {
        setLoading(true);
        setErrorMsg('');
        try {
          const verifyRes = await fetch((process.env.NEXT_PUBLIC_API_URL || '') + '/api/payments/verify-and-register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              registrationType,
              registrationDetails,
              amount: orderData.amount / 100
            })
          });

          const verifyData = await verifyRes.json();
          if (verifyRes.ok && verifyData.success) {
            login(verifyData.token, verifyData.user);
            setPaidUser(verifyData.user);
            setReceiptDetails({
              id: verifyData.user.paymentId || response.razorpay_payment_id,
              amount: orderData.amount / 100,
              date: new Date().toLocaleDateString()
            });
            setPaymentStep('success');
            sessionStorage.removeItem('cs_individual_details');
            sessionStorage.removeItem('cs_reg_mode');
          } else {
            setErrorMsg(verifyData.message || 'Registration verification failed.');
          }
        } catch (err) {
          console.error(err);
          setErrorMsg('Error verifying registration payment.');
        } finally {
          setLoading(false);
        }
      },
      prefill: {
        name: userDetails.name,
        email: userDetails.email,
        contact: userDetails.phone
      },
      theme: {
        color: '#6d28d9'
      },
      modal: {
        ondismiss: function () {
          setLoading(false);
        }
      }
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };




  // Render Entry Screen Selection
  if (regMode === 'selection') {
    return (
      <div className="flex-1 w-full relative flex items-center justify-center py-20 px-4 overflow-hidden" style={{ background: 'url(/register-bg.jpg) no-repeat center center', backgroundSize: 'cover' }}>
        <div className="absolute top-[-10%] left-[-15%] w-[45%] h-[45%] rounded-full bg-purple-100/50 blur-[100px] pointer-events-none -z-10" />
        <div className="absolute bottom-[-10%] right-[-15%] w-[45%] h-[45%] rounded-full bg-blue-100/50 blur-[100px] pointer-events-none -z-10" />

        <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl p-8 md:p-12 shadow-2xl text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">CodeSprint 2026 Registration</h1>
          <p className="text-sm text-slate-500 mb-10 max-w-lg mx-auto">Get ready for the ultimate 24-hour hackathon. Choose your path below to secure your spot at Audisankara University.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {/* Create Team Card */}
            <div 
              onClick={() => setRegMode('CREATE')}
              className="group border border-slate-100 rounded-2xl p-6 bg-slate-50 hover:bg-white hover:border-purple-300 hover:shadow-xl transition-all cursor-pointer text-left flex flex-col justify-between transform hover:-translate-y-1 duration-300"
            >
              <div>
                <div className="h-12 w-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-950 mb-2">Create a Team</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">Register your squad together. Perfect for teams of 3-5 members ready to build an innovative product.</p>
              </div>
              <div className="pt-4 border-t border-slate-200/50 flex justify-between items-center mt-4">
                <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">3 - 5 Members Required</span>
                <span className="text-xs font-semibold text-slate-800">₹399 / member</span>
              </div>
            </div>

            {/* Join Team Card */}
            <div 
              onClick={() => setRegMode('JOIN')}
              className="group border border-slate-100 rounded-2xl p-6 bg-slate-50 hover:bg-white hover:border-blue-300 hover:shadow-xl transition-all cursor-pointer text-left flex flex-col justify-between transform hover:-translate-y-1 duration-300"
            >
              <div>
                <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <User className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-950 mb-2">Join a Team</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">Register as an individual attendee, pay your registration, and send join requests to open teams seeking members.</p>
              </div>
              <div className="pt-4 border-t border-slate-200/50 flex justify-between items-center mt-4">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Individual Entry</span>
                <span className="text-xs font-semibold text-slate-800">₹399 Entry Fee</span>
              </div>
            </div>
          </div>
          
          <div className="mt-12 text-slate-400 text-xxs flex items-center justify-center gap-1.5">
            <Info className="h-3 w-3" />
            <span>Already registered? <span onClick={() => router.push('/login')} className="text-slate-600 hover:underline font-bold cursor-pointer">Log in to dashboard</span></span>
          </div>
        </div>
      </div>
    );
  }

  // Render CREATE TEAM Flow
  if (regMode === 'CREATE') {
    return (
      <div className="flex-1 w-full relative flex items-center justify-center py-20 px-4 overflow-hidden" style={{ background: 'url(/register-bg.jpg) no-repeat center center', backgroundSize: 'cover' }}>
        <div className="absolute top-[-10%] left-[-15%] w-[45%] h-[45%] rounded-full bg-purple-100/50 blur-[100px] pointer-events-none -z-10" />
        <div className="absolute bottom-[-10%] right-[-15%] w-[45%] h-[45%] rounded-full bg-blue-100/50 blur-[100px] pointer-events-none -z-10" />

        <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl relative">
          
          {/* Back button */}
          {createStep < 5 && (
            <button
              onClick={() => {
                if (createStep === 1) setRegMode('selection');
                else setCreateStep((createStep - 1) as any);
              }}
              className="absolute top-7 left-6 text-slate-500 hover:text-slate-900 transition-all flex items-center gap-1 text-xs font-bold"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
          )}

          {/* Stepper indicator */}
          <div className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-2">
            Step {createStep} of 5
          </div>
          <div className="h-1 bg-slate-100 w-full rounded-full overflow-hidden mt-1.5 mb-6">
            <div className="h-full bg-purple-600 transition-all duration-300" style={{ width: `${(createStep / 5) * 100}%` }}></div>
          </div>
          

          {errorMsg && (
            <div className="p-3.5 rounded-xl border border-rose-250 bg-rose-50 text-rose-800 text-xs mb-6 flex gap-2 animate-[slideIn_0.2s_ease-out]">
              <ShieldAlert className="h-4.5 w-4.5 text-rose-500 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Step 1: Team details */}
          {createStep === 1 && (
            <form onSubmit={verifyTeamDetails} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase pl-1">Team Name</label>
                <div className="relative">
                  <Users className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Cyber Knights" 
                    value={teamName} 
                    onChange={e => setTeamName(e.target.value)} 
                    className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-purple-500/50 text-xs" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase pl-1">Unique Team Code / Invite Code</label>
                <div className="relative">
                  <Sparkles className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                  <input 
                    type="text" 
                    required 
                    readOnly
                    placeholder="Generating code..." 
                    value={teamCode} 
                    className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed focus:outline-none text-xs font-mono font-bold" 
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 pl-1">This code is used by individuals requesting to join your team later if you keep it open.</p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 mt-8"
              >
                {loading ? 'Validating Unique Details...' : 'Continue to Leader Profile'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {/* Step 2: Leader profile */}
          {createStep === 2 && (
            <form onSubmit={verifyLeaderDetails} className="space-y-4">
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-3.5 mb-4 text-xxs text-purple-750 flex gap-2">
                <Info className="h-4 w-4 text-purple-550 flex-shrink-0" />
                <span>You are registering as the <strong>Team Leader</strong> (Member 1). Please complete your profile.</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase pl-1">Full Name</label>
                  <input type="text" required id="name" value={leaderDetails.name} onChange={handleLeaderChange} className="block w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase pl-1">Email Address</label>
                  <input type="email" required id="email" value={leaderDetails.email} onChange={handleLeaderChange} className="block w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs" />
                  {duplicateEmails[leaderDetails.email.toLowerCase().trim()] && (
                    <p className="text-[10px] text-rose-500 font-medium mt-1 pl-1">⚠️ This email is already registered or matches another member.</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase pl-1">Phone Number (10 digit)</label>
                  <input type="text" required id="phone" value={leaderDetails.phone} onChange={handleLeaderChange} className="block w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs" />
                  {duplicatePhones[leaderDetails.phone] && (
                    <p className="text-[10px] text-rose-500 font-medium mt-1 pl-1">
                      ⚠️ This phone number is already registered or matches another member.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase pl-1">College Name</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      id="college" 
                      required 
                      placeholder="Type to search or enter college name manually" 
                      value={leaderDetails.college} 
                      onChange={handleLeaderChange} 
                      onFocus={() => setShowLeaderColleges(true)}
                      onBlur={() => setTimeout(() => setShowLeaderColleges(false), 200)}
                      className="block w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs" 
                    />
                    {showLeaderColleges && getFilteredColleges(leaderDetails.college).length > 0 && (
                      <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100">
                        {getFilteredColleges(leaderDetails.college).map((c: any) => (
                          <div
                            key={c.id}
                            onMouseDown={() => {
                              setLeaderDetails(prev => ({ ...prev, college: c.name }));
                              setShowLeaderColleges(false);
                            }}
                            className="px-4 py-2.5 text-xs text-slate-700 hover:bg-purple-50 hover:text-purple-700 cursor-pointer transition-colors"
                          >
                            {c.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase pl-1">Roll Number</label>
                  <input
                    type="text"
                    required
                    id="rollNumber"
                    value={leaderDetails.rollNumber}
                    onChange={handleLeaderChange}
                    onBlur={e => checkRollDuplicate(e.target.value, 'rollNumber')}
                    className="block w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                  />
                  {duplicateRolls[leaderDetails.rollNumber.trim().toUpperCase()] && (
                    <p className="text-[10px] text-rose-500 font-medium mt-1 pl-1">⚠️ This Roll/ID number is already registered or matches another member.</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase pl-1">Branch / Dept</label>
                  <select id="branch" required value={leaderDetails.branch} onChange={handleLeaderChange} className="block w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                    <option value="" disabled>Select your branch</option>
                    {BRANCH_OPTIONS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  {leaderDetails.branch === 'Other' && (
                    <input 
                      type="text" 
                      required 
                      placeholder="Enter your branch name manually" 
                      value={customLeaderBranch} 
                      onChange={e => setCustomLeaderBranch(e.target.value)} 
                      className="block w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs mt-2 animate-[slideDown_0.2s_ease-out]" 
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase pl-1">Current Year</label>
                  <select id="year" value={leaderDetails.year} onChange={handleLeaderChange} className="block w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase pl-1">Gender</label>
                  <select id="gender" value={leaderDetails.gender} onChange={handleLeaderChange} className="block w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase pl-1">T-Shirt Size</label>
                  <select id="tshirtSize" value={leaderDetails.tshirtSize} onChange={handleLeaderChange} className="block w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                  </select>
                </div>
              </div>
              
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase pl-1">LinkedIn Profile (Optional)</label>
                <input type="url" id="linkedin" placeholder="https://linkedin.com/in/..." value={leaderDetails.linkedin} onChange={handleLeaderChange} className="block w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs" />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-purple-600 text-white hover:bg-purple-700 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 mt-6"
              >
                <span>Continue to Add Members</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {/* Step 3: Add Members */}
          {createStep === 3 && (
            <div className="space-y-6">
              <div className="bg-slate-50/70 border border-slate-200/60 rounded-xl p-3.5 max-w-md mx-auto shadow-sm">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 text-center">Team List (Leader + Members)</h3>
                <div className="divide-y divide-slate-100/60 text-[10px] font-medium">
                  <div className="flex justify-between py-1.5 items-center text-purple-700">
                    <span>1. {leaderDetails.name} (Leader)</span>
                    <span>{leaderDetails.gender} | {leaderDetails.tshirtSize}</span>
                  </div>
                  {addedMembers.map((m, idx) => (
                    <div key={idx} className="flex justify-between py-1.5 items-center text-slate-700">
                      <span>{idx + 2}. {m.name}</span>
                      <div className="flex items-center gap-2">
                        <span>{m.gender} | {m.tshirtSize}</span>
                        <button onClick={() => removeMemberFromList(idx)} className="text-rose-500 hover:text-rose-750 transition-colors p-0.5 cursor-pointer">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2.5 pb-1 font-bold text-[9px] text-slate-505 uppercase tracking-widest flex-wrap gap-2">
                    <span>Total Members: {totalMembers} / 5</span>
                    <span>Current Cost: <span className="text-purple-700 font-extrabold font-mono text-[10px]">₹{totalMembers * 399}</span></span>
                    <span>Required: Min 3</span>
                  </div>
                </div>
              </div>

              {/* Form to add a new member */}
              {totalMembers < 5 ? (
                <form onSubmit={addMemberToList} className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4">
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
                    <Plus className="h-4.5 w-4.5 text-purple-600" />
                    Add Team Member details
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase pl-1 mb-1">Full Name</label>
                      <input type="text" required id="m_name" value={memberForm.name} onChange={handleMemberChange} className="block w-full px-3 py-2 rounded-xl border border-slate-200 text-xxs" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase pl-1 mb-1">Email Address</label>
                      <input type="email" required id="m_email" value={memberForm.email} onChange={handleMemberChange} className="block w-full px-3 py-2 rounded-xl border border-slate-200 text-xxs" />
                      {duplicateEmails[memberForm.email.toLowerCase().trim()] && (
                        <p className="text-[10px] text-rose-500 font-medium mt-1 pl-1">⚠️ This email is already registered or matches another member.</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase pl-1 mb-1">Phone Number</label>
                      <input type="text" required id="m_phone" value={memberForm.phone} onChange={handleMemberChange} className="block w-full px-3 py-2 rounded-xl border border-slate-200 text-xxs" />
                      {duplicatePhones[memberForm.phone] && (
                        <p className="text-[10px] text-rose-500 font-medium mt-1 pl-1">
                          ⚠️ This phone number is already registered or matches another member.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase pl-1 mb-1">Roll Number</label>
                      <input
                        type="text"
                        required
                        id="m_rollNumber"
                        value={memberForm.rollNumber}
                        onChange={handleMemberChange}
                        onBlur={e => checkRollDuplicate(e.target.value, 'm_rollNumber')}
                        className="block w-full px-3 py-2 rounded-xl border border-slate-200 text-xxs"
                      />
                      {duplicateRolls[memberForm.rollNumber.trim().toUpperCase()] && (
                        <p className="text-[10px] text-rose-500 font-medium mt-1 pl-1">⚠️ This Roll/ID number is already registered or matches another member.</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase pl-1 mb-1">College Name</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          id="m_college" 
                          required 
                          placeholder="Type to search or enter college name manually" 
                          value={memberForm.college} 
                          onChange={handleMemberChange} 
                          onFocus={() => setShowMemberColleges(true)}
                          onBlur={() => setTimeout(() => setShowMemberColleges(false), 200)}
                          className="block w-full px-3 py-2 rounded-xl border border-slate-200 text-xxs" 
                        />
                        {showMemberColleges && getFilteredColleges(memberForm.college).length > 0 && (
                          <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100">
                            {getFilteredColleges(memberForm.college).map((c: any) => (
                              <div
                                key={c.id}
                                onMouseDown={() => {
                                  setMemberForm(prev => ({ ...prev, college: c.name }));
                                  setShowMemberColleges(false);
                                }}
                                className="px-3 py-2 text-xxs text-slate-700 hover:bg-purple-50 hover:text-purple-700 cursor-pointer transition-colors"
                              >
                                {c.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase pl-1 mb-1">Branch / Specialization</label>
                      <select id="m_branch" required value={memberForm.branch} onChange={handleMemberChange} className="block w-full px-3 py-2 rounded-xl border border-slate-200 text-xxs">
                        <option value="" disabled>Select branch</option>
                        {BRANCH_OPTIONS.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                      {memberForm.branch === 'Other' && (
                        <input 
                          type="text" 
                          required 
                          placeholder="Enter member branch name manually" 
                          value={customMemberBranch} 
                          onChange={e => setCustomMemberBranch(e.target.value)} 
                          className="block w-full px-3 py-2 rounded-xl border border-slate-200 text-xxs mt-2 animate-[slideDown_0.2s_ease-out]" 
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase pl-1 mb-1">Current Year</label>
                      <select id="m_year" value={memberForm.year} onChange={handleMemberChange} className="block w-full px-3 py-2 rounded-xl border border-slate-200 text-xxs">
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase pl-1 mb-1">Gender</label>
                      <select id="m_gender" value={memberForm.gender} onChange={handleMemberChange} className="block w-full px-3 py-2 rounded-xl border border-slate-200 text-xxs">
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase pl-1 mb-1">T-Shirt Size</label>
                      <select id="m_tshirtSize" value={memberForm.tshirtSize} onChange={handleMemberChange} className="block w-full px-3 py-2 rounded-xl border border-slate-200 text-xxs">
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                        <option value="XXL">XXL</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 px-3 rounded-xl border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 font-bold text-xxs transition-all flex items-center justify-center gap-1 mt-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Member to Team</span>
                  </button>
                </form>
              ) : (
                <div className="p-3 text-center border border-slate-200 bg-slate-50 text-slate-500 rounded-xl text-xs font-semibold">
                  Team capacity reached (5 total members added).
                </div>
              )}

              {/* Team Visibility Options */}
              <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
                  <Globe className="h-4.5 w-4.5 text-purple-600" />
                  Team Visibility / Status
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Closed Group */}
                  <div 
                    onClick={() => setAvailabilityMode('CLOSE')}
                    className={`border rounded-xl p-4 cursor-pointer transition-all text-left flex flex-col justify-between relative ${
                      availabilityMode === 'CLOSE' 
                        ? 'border-purple-600 bg-purple-50/10 shadow-sm' 
                        : 'border-slate-200 bg-slate-50 hover:bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-bold text-xs text-slate-950">Closed Group (Private)</span>
                        <div className="group/info relative cursor-help">
                          <Info className="h-3.5 w-3.5 text-slate-400 hover:text-slate-650" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2.5 bg-slate-900 text-white text-[9px] rounded-lg shadow-xl opacity-0 group-hover/info:opacity-100 pointer-events-none transition-opacity z-20 leading-relaxed">
                            A closed team is private. No one can see or request to join. Members can only be added manually by the leader.
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed">Only people you add manually can be part of this team.</p>
                    </div>
                  </div>

                  {/* Open Team */}
                  <div 
                    onClick={() => {
                      if (5 - totalMembers <= 0) {
                        alert("Your team already has the maximum of 5 members. It cannot be set to open.");
                        return;
                      }
                      setAvailabilityMode('OPEN');
                    }}
                    className={`border rounded-xl p-4 cursor-pointer transition-all text-left flex flex-col justify-between relative ${
                      availabilityMode === 'OPEN' 
                        ? 'border-purple-600 bg-purple-50/10 shadow-sm' 
                        : 'border-slate-200 bg-slate-50 hover:bg-white'
                    } ${5 - totalMembers <= 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-bold text-xs text-slate-950">Open Team (Public)</span>
                        <div className="group/info relative cursor-help">
                          <Info className="h-3.5 w-3.5 text-slate-400 hover:text-slate-650" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2.5 bg-slate-900 text-white text-[9px] rounded-lg shadow-xl opacity-0 group-hover/info:opacity-100 pointer-events-none transition-opacity z-20 leading-relaxed">
                            An open team is public. Teamless attendees can search for it and request to join, subject to leader approval.
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed">Publish to the available teams directory so others can request to join.</p>
                    </div>
                  </div>
                </div>

                {/* Available Slots Select Dropdown */}
                {availabilityMode === 'OPEN' && 5 - totalMembers > 0 && (
                  <div className="p-3 border border-slate-100 rounded-xl bg-slate-50 space-y-1.5 animate-[slideDown_0.2s_ease-out]">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-0.5">Open Slots for Recruitment</label>
                    <select 
                      value={selectedAvailableSlots}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setSelectedAvailableSlots(val);
                      }}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-900 focus:outline-none"
                    >
                      {Array.from({ length: 5 - totalMembers }, (_, i) => i + 1).map(n => (
                        <option key={n} value={n}>{n} Slot{n > 1 ? 's' : ''} Open</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (totalMembers < 3) {
                    setErrorMsg('A minimum of 3 members is required before proceeding to checkout.');
                    return;
                  }
                  if (!hasFemaleParticipant()) {
                    setErrorMsg('Your team must contain at least one female participant to proceed.');
                    return;
                  }
                  setCreateStep(4);
                }}
                className="w-full py-3.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Proceed to Review & Checkout</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step 4: Review & Payment */}
          {createStep === 4 && (
            <div className="space-y-6">
              {paymentStep === 'form' ? (
                <>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs text-slate-700 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2 uppercase tracking-wide">Review Team Registration Details</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-500">Team Name:</span>
                        <span className="font-bold text-slate-900">{teamName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-500">Team Code:</span>
                        <span className="font-bold text-purple-700 font-mono">{teamCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-500">College:</span>
                        <span className="font-bold text-slate-900">{leaderDetails.college}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-500">Team Status:</span>
                        <span className="font-bold text-slate-900">
                          {availabilityMode === 'OPEN' ? `Open Team (${selectedAvailableSlots} slots)` : 'Closed Group'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="border-t border-slate-200 pt-3">
                      <h4 className="font-bold text-slate-800 mb-2 uppercase text-[10px] tracking-wider">Attendee List ({totalMembers} total):</h4>
                      <ul className="space-y-1.5 text-xxs font-semibold">
                        <li className="flex justify-between text-purple-700 bg-purple-50/50 p-1.5 rounded-lg">
                          <span>• {leaderDetails.name} (Leader)</span>
                          <span>{leaderDetails.gender} | Size: {leaderDetails.tshirtSize}</span>
                        </li>
                        {addedMembers.map((m, idx) => (
                          <li key={idx} className="flex justify-between text-slate-700 p-1.5">
                            <span>• {m.name} (Member {idx + 2})</span>
                            <span>{m.gender} | Size: {m.tshirtSize}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {!hasFemaleParticipant() && (
                      <div className="p-3 border border-rose-200 bg-rose-50 text-rose-800 text-[11px] rounded-xl flex gap-2">
                        <ShieldAlert className="h-4.5 w-4.5 text-rose-500 flex-shrink-0" />
                        <span><strong>Warning:</strong> No female participant present in the team. At least one female member (either leader or participant) is mandatory.</span>
                      </div>
                    )}
                  </div>



                  {/* Pricing details */}
                  <div className="p-5 border border-slate-250 bg-slate-50 rounded-2xl flex flex-col gap-2.5">
                    <div className="flex justify-between text-xs text-slate-500 font-semibold">
                      <span>Base Registration ({totalMembers} × ₹399)</span>
                      <span>₹{basePrice}</span>
                    </div>

                    <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                      <span className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Total Amount</span>
                      <span className="text-xl font-black text-purple-700">₹{getFinalPrice()}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={loading || !hasFemaleParticipant()}
                    onClick={handleTeamRegistrationSubmit}
                    className="w-full py-3.5 px-4 bg-purple-600 hover:bg-purple-750 text-white disabled:opacity-50 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    {loading ? 'Processing Registration...' : `Register & Proceed to Payment (₹${getFinalPrice()})`}
                    <CreditCard className="h-4.5 w-4.5" />
                  </button>
                </>
              ) : (
                /* Payment Simulation / UTR Input */
                <div className="py-2 text-center space-y-6">
                  <div className="mb-4 py-1.5 px-4 bg-purple-50 border border-purple-250 text-purple-800 text-[10px] font-extrabold uppercase rounded-full inline-flex items-center gap-1.5 tracking-wider mx-auto">
                    <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                    Secure Razorpay Gateway Link
                  </div>

                  <h3 className="text-xl font-extrabold text-slate-900">Complete Team Payment</h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                    Please pay <strong>₹{getFinalPrice()}</strong>. If the Razorpay checkout window did not open, click the button below to try again.
                  </p>

                  <div className="my-4">
                    <button
                      type="button"
                      onClick={async () => {
                        if (createdOrder) {
                          const leaderPayload = {
                            ...leaderDetails,
                            college: leaderDetails.college.trim(),
                            branch: leaderDetails.branch === 'Other' ? customLeaderBranch.trim() : leaderDetails.branch
                          };
                          const registrationDetails = {
                            teamName: teamName.trim(),
                            teamCode: teamCode.trim(),
                            leader: leaderPayload,
                            members: addedMembers,
                            teamStatus: availabilityMode,
                            availableSlots: availabilityMode === 'OPEN' ? selectedAvailableSlots : 0
                          };
                          await handleRazorpayRegistrationPayment(createdOrder, leaderPayload, 'TEAM', registrationDetails);
                        }
                      }}
                      className="inline-flex items-center justify-center gap-2 py-3 px-6 bg-purple-600 hover:bg-purple-750 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                    >
                      <span>Pay ₹{getFinalPrice()} Securely</span>
                      <CreditCard className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleResubmitUtr} className="text-left border-t border-slate-100 pt-5 space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-widest pl-1 mb-1.5">Enter Transaction UTR Reference Number</label>
                      <input 
                        type="text" 
                        required 
                        maxLength={16} 
                        placeholder="Enter 12-digit UTR reference number" 
                        value={newUtr} 
                        onChange={e => setNewUtr(e.target.value.replace(/\s+/g, ''))} 
                        className="block w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono" 
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={loading || newUtr.length < 12}
                      className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      {loading ? 'Submitting...' : 'Submit UTR & Request Verification'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Post-payment Availability settings */}
          {createStep === 5 && (
            <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2 animate-bounce" />
                <h3 className="text-sm font-extrabold text-emerald-800 uppercase tracking-wider">Payment Verified / Submitted!</h3>
                <p className="text-xs text-slate-600 mt-1">Your team is successfully registered. Now configure team availability.</p>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-850 uppercase tracking-wide">Would you like to keep this team open for individuals to join?</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option 1: CLOSE */}
                  <div 
                    onClick={() => setAvailabilityMode('CLOSE')}
                    className={`border rounded-2xl p-5 cursor-pointer transition-all text-left flex flex-col justify-between ${
                      availabilityMode === 'CLOSE' 
                        ? 'border-purple-600 bg-purple-50/20 shadow-md' 
                        : 'border-slate-200 bg-slate-50 hover:bg-white'
                    }`}
                  >
                    <div>
                      <h5 className="font-extrabold text-xs text-slate-905 mb-1">Close Team (Private)</h5>
                      <p className="text-[10px] text-slate-500 leading-normal">Keep the team locked. No one can search or request to join. Ideal if your team is already fully settled.</p>
                    </div>
                  </div>

                  {/* Option 2: OPEN */}
                  <div 
                    onClick={() => {
                      if (5 - totalMembers <= 0) {
                        alert("Your team already has the maximum of 5 members. It cannot be opened for new requests.");
                        return;
                      }
                      setAvailabilityMode('OPEN');
                    }}
                    className={`border rounded-2xl p-5 cursor-pointer transition-all text-left flex flex-col justify-between ${
                      availabilityMode === 'OPEN' 
                        ? 'border-purple-600 bg-purple-50/20 shadow-md' 
                        : 'border-slate-200 bg-slate-50 hover:bg-white'
                    } ${5 - totalMembers <= 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div>
                      <h5 className="font-extrabold text-xs text-slate-905 mb-1">Keep Team Open (Discovery)</h5>
                      <p className="text-[10px] text-slate-500 leading-normal">Publish your team to the Available Teams list. Teamless paid attendees can request to fill your remaining slots.</p>
                    </div>
                  </div>
                </div>

                {/* Slots selection if open */}
                {availabilityMode === 'OPEN' && 5 - totalMembers > 0 && (
                  <div className="p-4 border border-slate-200 rounded-2xl bg-white space-y-2 animate-[slideDown_0.2s_ease-out]">
                    <label className="block text-xxs font-bold text-slate-500 uppercase tracking-widest pl-1">Number of Available Slots to Publish</label>
                    <select 
                      value={selectedAvailableSlots}
                      onChange={e => setSelectedAvailableSlots(Number(e.target.value))}
                      className="block w-full px-3 py-2 border border-slate-250 rounded-xl text-xs"
                    >
                      {Array.from({ length: 5 - totalMembers }, (_, i) => i + 1).map(n => (
                        <option key={n} value={n}>{n} Slot{n > 1 ? 's' : ''} Open</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={submitAvailabilitySettings}
                className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1"
              >
                {loading ? 'Submitting Details...' : 'Finish Setup & Go to Dashboard'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}


        </div>
      </div>
    );
  }

  // Render JOIN TEAM Flow (Individual Registration)
  return (
    <div className="flex-1 w-full relative flex items-center justify-center py-20 px-4 overflow-hidden" style={{ background: 'url(/register-bg.jpg) no-repeat center center', backgroundSize: 'cover' }}>
      <div className="absolute top-[-10%] left-[-15%] w-[45%] h-[45%] rounded-full bg-purple-100/50 blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[45%] h-[45%] rounded-full bg-blue-100/50 blur-[100px] pointer-events-none -z-10" />

      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl relative">
        
        {/* Back button — inline at top so it doesn't overlap form */}
        {joinStep === 1 && (
          <div className="mb-5">
            <button
              onClick={() => setRegMode('selection')}
              className="text-slate-500 hover:text-slate-900 transition-all flex items-center gap-1 text-xs font-bold"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl border border-rose-250 bg-rose-50 text-rose-800 text-xs mb-6 flex gap-2 animate-[slideIn_0.2s_ease-out]">
            <ShieldAlert className="h-4.5 w-4.5 text-rose-500 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Step 1: Your Profile Details */}
        {joinStep === 1 && (
          <form onSubmit={handleIndividualRegistrationSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase pl-1">Full Name</label>
                <input type="text" required id="name" value={individualDetails.name} onChange={handleIndividualChange} className="block w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase pl-1">Email Address</label>
                <input type="email" required id="email" value={individualDetails.email} onChange={handleIndividualChange} className="block w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs" />
                {duplicateEmails[individualDetails.email.toLowerCase().trim()] && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1 pl-1">⚠️ This email is already registered or matches another member.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase pl-1">Phone Number (10 digit)</label>
                <input type="text" required id="phone" value={individualDetails.phone} onChange={handleIndividualChange} className="block w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs" />
                {duplicatePhones[individualDetails.phone] && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1 pl-1">
                    ⚠️ This phone number is already registered or matches another member.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase pl-1">College Name</label>
                <div className="relative">
                  <input 
                    type="text" 
                    id="college" 
                    required 
                    placeholder="Type to search or enter college name manually" 
                    value={individualDetails.college} 
                    onChange={handleIndividualChange} 
                    onFocus={() => setShowIndividualColleges(true)}
                    onBlur={() => setTimeout(() => setShowIndividualColleges(false), 200)}
                    className="block w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs" 
                  />
                  {showIndividualColleges && getFilteredColleges(individualDetails.college).length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100">
                      {getFilteredColleges(individualDetails.college).map((c: any) => (
                        <div
                          key={c.id}
                          onMouseDown={() => {
                            setIndividualDetails(prev => ({ ...prev, college: c.name }));
                            setShowIndividualColleges(false);
                          }}
                          className="px-4 py-2.5 text-xs text-slate-700 hover:bg-purple-50 hover:text-purple-700 cursor-pointer transition-colors"
                        >
                          {c.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase pl-1">Roll Number</label>
                <input
                  type="text"
                  required
                  id="rollNumber"
                  value={individualDetails.rollNumber}
                  onChange={handleIndividualChange}
                  onBlur={e => checkRollDuplicate(e.target.value, 'rollNumber')}
                  className="block w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                />
                {duplicateRolls[individualDetails.rollNumber.trim().toUpperCase()] && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1 pl-1">⚠️ This Roll/ID number is already registered or matches another member.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase pl-1">Branch / Specialization</label>
                <select id="branch" required value={individualDetails.branch} onChange={handleIndividualChange} className="block w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                  <option value="" disabled>Select your branch</option>
                  {BRANCH_OPTIONS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                {individualDetails.branch === 'Other' && (
                  <input 
                    type="text" 
                    required 
                    placeholder="Enter your branch name manually" 
                    value={customIndividualBranch} 
                    onChange={e => setCustomIndividualBranch(e.target.value)} 
                    className="block w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs mt-2 animate-[slideDown_0.2s_ease-out]" 
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase pl-1">Current Year</label>
                <select id="year" value={individualDetails.year} onChange={handleIndividualChange} className="block w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase pl-1">Gender</label>
                <select id="gender" value={individualDetails.gender} onChange={handleIndividualChange} className="block w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase pl-1">T-Shirt Size</label>
                <select id="tshirtSize" value={individualDetails.tshirtSize} onChange={handleIndividualChange} className="block w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                  <option value="XXL">XXL</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase pl-1">LinkedIn Profile (Optional)</label>
              <input type="url" id="linkedin" placeholder="https://linkedin.com/in/..." value={individualDetails.linkedin} onChange={handleIndividualChange} className="block w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs" />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-purple-600 hover:bg-purple-750 text-white disabled:opacity-50 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1"
            >
              {loading ? 'Verifying Details...' : 'Continue to Payment Step'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        {/* Step 2: UTR Verification */}
        {joinStep === 2 && (
          <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">

            {/* ── UTR SUBMITTED — awaiting admin review ── */}
            {paymentStep === 'submitted' && (
              <div className="py-6 text-center space-y-4">
                <div className="inline-flex p-4 bg-amber-50 rounded-full border border-amber-200 text-amber-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m8.66-13H20M4 12H3m15.07 7.07-.7-.7M6.63 6.63l-.7-.7m12.74 0-.7.7M6.63 17.37l-.7.7" />
                  </svg>
                </div>
                <div className="inline-flex items-center gap-2 py-1.5 px-4 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-extrabold uppercase rounded-full tracking-wider">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                  UTR Under Review
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">Payment Verification Pending</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                  Your UTR transaction reference has been submitted. Our admin team will verify and approve your registration shortly. You'll receive a confirmation once it's done.
                </p>
                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50 text-xs text-slate-500 text-left space-y-1.5 max-w-xs mx-auto">
                  <p className="font-bold text-slate-700 text-[10px] uppercase tracking-wider">What happens next?</p>
                  <p>1. Admin verifies your UTR reference</p>
                  <p>2. Your account is activated</p>
                  <p>3. You can browse &amp; join teams</p>
                </div>

              </div>
            )}

            {/* ── PAY NOW — direct checkout via inline Razorpay ── */}
            {(paymentStep === 'form' || paymentStep === 'utr-input' || paymentStep === 'rejected') && (
              <div className="py-6 text-center space-y-6">
                <div className="inline-flex p-4 bg-purple-50 rounded-full border border-purple-200 text-purple-600">
                  <CreditCard className="h-8 w-8 animate-pulse" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">Complete Payment</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                  Click the button below to pay <strong>₹{getFinalPrice()}</strong> securely using UPI, Card, Netbanking, or Wallets to activate your registration.
                </p>
                {errorMsg && <p className="text-rose-500 text-xs pl-1">{errorMsg}</p>}
                <button
                  type="button"
                  onClick={async () => {
                    setLoading(true);
                    setErrorMsg('');
                    try {
                      let orderData = createdOrder;
                      if (!orderData) {
                        const orderRes = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/payments/create-order-public', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            registrationType: (regMode as string) === 'CREATE' ? 'TEAM' : 'INDIVIDUAL',
                            quantity: (regMode as string) === 'CREATE' ? totalMembers : 1
                          })
                        });
                        if (orderRes.ok) {
                          orderData = await orderRes.json();
                          setCreatedOrder(orderData);
                        } else {
                          const errData = await orderRes.json();
                          setErrorMsg(errData.message || 'Failed to create payment order.');
                          setLoading(false);
                          return;
                        }
                      }

                      const registrationType = (regMode as string) === 'CREATE' ? 'TEAM' : 'INDIVIDUAL';
                      const registrationDetails = (regMode as string) === 'CREATE' 
                        ? {
                            teamName: teamName.trim(),
                            teamCode: teamCode.trim(),
                            leader: {
                              ...leaderDetails,
                              college: leaderDetails.college.trim(),
                              branch: leaderDetails.branch === 'Other' ? customLeaderBranch.trim() : leaderDetails.branch
                            },
                            members: addedMembers,
                            teamStatus: availabilityMode,
                            availableSlots: availabilityMode === 'OPEN' ? selectedAvailableSlots : 0
                          }
                        : {
                            ...individualDetails,
                            college: individualDetails.college.trim(),
                            branch: individualDetails.branch === 'Other' ? customIndividualBranch.trim() : individualDetails.branch
                          };

                      await handleRazorpayRegistrationPayment(
                        orderData,
                        getActiveUserDetails(),
                        registrationType,
                        registrationDetails
                      );
                    } catch (err) {
                      console.error(err);
                      setErrorMsg('Failed to initiate checkout.');
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-purple-600 hover:bg-purple-750 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loading ? 'Processing...' : `Pay ₹${getFinalPrice()} Online`}
                </button>
              </div>
            )}

            {/* ── SUCCESS ── */}
            {paymentStep === 'success' && receiptDetails && paidUser && (
              <div className="py-4 text-center animate-[slideIn_0.3s_ease-out] space-y-5">
                <div className="inline-flex p-3 bg-emerald-50 rounded-full border border-emerald-200 text-emerald-600 mb-4 animate-bounce">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Registration Successful!</h1>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                  Thank you, {paidUser.name}! Your payment has been verified. Now proceed to browse available teams.
                </p>

                <div className="flex flex-col gap-3 max-w-sm mx-auto pt-4">
                  <button
                    onClick={() => router.push('/get-in')}
                    className="py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer w-full"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Browse & Request Open Teams
                  </button>
                </div>
              </div>
            )}

          </div>
        )}


      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 w-full bg-slate-50 flex items-center justify-center text-slate-500">
        Loading checkout session...
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
