'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { 
  Sparkles, User, Mail, Phone, School, BookOpen, Calendar, 
  Globe, Ticket, CreditCard, ShieldAlert, CheckCircle2, 
  Download, ArrowRight, Loader, Users, ArrowLeft, Search, FileText
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

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user, refreshUser } = useAuth();

  // URL prefills
  const initialEmail = searchParams.get('email') || '';
  const initialName = searchParams.get('name') || '';

  const [formData, setFormData] = useState({
    name: initialName,
    email: initialEmail,
    phone: '',
    college: '',
    rollNumber: '',
    branch: '',
    year: '1st Year',
    gender: 'Male',
    tshirtSize: 'M',
    linkedin: '',
    teamPreference: 'Create a Team',
    teamName: '',
    teamCode: ''
  });

  const [generatedTeamCode, setGeneratedTeamCode] = useState('CS2026-001');

  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_API_URL + '/api/public/teams')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const count = data.length;
          const code = `CS2026-${String(count + 1).padStart(3, '0')}`;
          setGeneratedTeamCode(code);
          setFormData(prev => ({
            ...prev,
            teamCode: prev.teamPreference === 'Create a Team' ? code : prev.teamCode
          }));
        }
      })
      .catch(console.error);
  }, []);

  const handleTeamPreferenceChange = (pref: 'Join a Team' | 'Create a Team') => {
    setFormData(prev => ({
      ...prev,
      teamPreference: pref,
      teamCode: pref === 'Create a Team' ? generatedTeamCode : ''
    }));
    setSearchStatus('idle');
    setSearchedTeam(null);
  };

  const [searchedTeam, setSearchedTeam] = useState<any>(null);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'found' | 'not-found'>('idle');

  const handleSearchTeam = async () => {
    if (!formData.teamCode.trim()) return;
    setSearchStatus('searching');
    setSearchedTeam(null);
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/public/teams');
      if (res.ok) {
        const teams = await res.json();
        const found = teams.find((t: any) => t.id.toLowerCase() === formData.teamCode.trim().toLowerCase());
        if (found) {
          setSearchedTeam(found);
          setSearchStatus('found');
        } else {
          setSearchStatus('not-found');
        }
      } else {
        setSearchStatus('not-found');
      }
    } catch (err) {
      console.error(err);
      setSearchStatus('not-found');
    }
  };

  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPaymentFrame, setShowPaymentFrame] = useState(false);
  const [paymentFrameUrl, setPaymentFrameUrl] = useState('');

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setErrorMsg('Full Name is required.');
      const nameInput = document.getElementById('name');
      if (nameInput) nameInput.focus();
      return;
    }
    if (!formData.email.trim()) {
      setErrorMsg('Email Address is required.');
      const emailInput = document.getElementById('email');
      if (emailInput) emailInput.focus();
      return;
    }
    // Simple email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setErrorMsg('Please enter a valid Email Address.');
      const emailInput = document.getElementById('email');
      if (emailInput) emailInput.focus();
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMsg('Phone Number is required.');
      const phoneInput = document.getElementById('phone');
      if (phoneInput) phoneInput.focus();
      return;
    }
    // 10-digit number validation check
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(formData.phone.trim())) {
      setErrorMsg('Please enter a valid 10-digit Phone Number.');
      const phoneInput = document.getElementById('phone');
      if (phoneInput) phoneInput.focus();
      return;
    }
    if (!formData.college.trim()) {
      setErrorMsg('College Name is required.');
      const collegeInput = document.getElementById('college');
      if (collegeInput) collegeInput.focus();
      return;
    }
    if (!formData.rollNumber.trim()) {
      setErrorMsg('Roll Number is required.');
      const rollInput = document.getElementById('rollNumber');
      if (rollInput) rollInput.focus();
      return;
    }
    if (!formData.branch.trim()) {
      setErrorMsg('Branch / Specialization is required.');
      const branchInput = document.getElementById('branch');
      if (branchInput) branchInput.focus();
      return;
    }
    
    setErrorMsg('');
    setFormStep(2);
  };
  
  const [colleges, setColleges] = useState<any[]>([]);

  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_API_URL + '/api/colleges')
      .then(res => res.json())
      .then(data => setColleges(data))
      .catch(console.error);
  }, []);

  // Payment states
  const [paymentStep, setPaymentStep] = useState<'form' | 'coming-soon' | 'success'>('form');
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [paidUser, setPaidUser] = useState<any>(null);
  const [receiptDetails, setReceiptDetails] = useState<any>(null);

  // If user is already registered and paid, redirect appropriately
  useEffect(() => {
    if (user && user.paymentStatus === 'paid') {
      if (user.teamId) {
        router.push('/dashboard');
      } else {
        router.push('/get-in');
      }
    }
  }, [user, router]);

  // Handle Input Changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let value = e.target.value;
    if (e.target.id === 'phone') {
      // Keep only digits and slice to max 10 characters
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    setFormData(prev => ({ ...prev, [e.target.id]: value }));
  };

  // Validate and Apply Coupon Code
  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setCouponError('');
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, college: formData.college })
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedCoupon(data);
      } else {
        setAppliedCoupon(null);
        setCouponError(data.message || 'Invalid coupon code');
      }
    } catch (err) {
      console.error(err);
      setCouponError('Error validating coupon code');
    }
  };

  // Generate Razorpay pre-filled payment link
  const getRazorpayPaymentUrl = () => {
    const baseUrl = "https://axisbpayments.razorpay.com/pl_OluX2aezURAvVF/view";
    const params = new URLSearchParams();
    
    // Clean and sanitize inputs for Razorpay alphanumeric pattern validations
    const studentName = formData.name.trim();
    // Strip spaces from roll number since pattern is alphanumeric
    const rollNumber = formData.rollNumber.replace(/\s+/g, '').trim();
    // Strip spaces from year since pattern is alphanumeric
    const yearValue = formData.year.replace(/\s+/g, '').trim();
    const college = formData.college.trim();
    const course = formData.branch.trim();

    // Format phone number to international format (e.g., +919876543210) for Razorpay to auto-select country prefix
    let phoneVal = formData.phone.trim();
    if (/^\d{10}$/.test(phoneVal)) {
      phoneVal = `+91${phoneVal}`;
    } else if (/^91\d{10}$/.test(phoneVal)) {
      phoneVal = `+${phoneVal}`;
    }

    // Standard parameters
    params.set("email", formData.email);
    params.set("phone", phoneVal);
    params.set("contact", phoneVal);
    params.set("name", studentName);

    params.set("prefill[email]", formData.email);
    params.set("prefill[phone]", phoneVal);
    params.set("prefill[contact]", phoneVal);
    params.set("prefill[name]", studentName);

    // Custom Fields pre-fills:
    // 1. STUDENT NAME
    params.set("student_name", studentName);
    params.set("prefill[student_name]", studentName);
    params.set("STUDENT NAME", studentName);
    params.set("prefill[STUDENT NAME]", studentName);

    // 2. ROLL NUMBER (mapped to inputted rollNumber)
    params.set("roll_number", rollNumber);
    params.set("prefill[roll_number]", rollNumber);
    params.set("ROLL NUMBER", rollNumber);
    params.set("prefill[ROLL NUMBER]", rollNumber);

    // 3. COLLEGE
    params.set("college", college);
    params.set("prefill[college]", college);
    params.set("COLLEGE", college);
    params.set("prefill[COLLEGE]", college);

    // 4. COURSE (mapped to user branch)
    params.set("course", course);
    params.set("prefill[course]", course);
    params.set("COURSE", course);
    params.set("prefill[COURSE]", course);

    // 5. YEAR (stripped space to satisfy alphanumeric constraint)
    params.set("year", yearValue);
    params.set("prefill[year]", yearValue);
    params.set("YEAR", yearValue);
    params.set("prefill[YEAR]", yearValue);

    // 6. HACKTHON FEES dropdown select
    params.set("hackthon_fees", "REGISTRATION FEES");
    params.set("prefill[hackthon_fees]", "REGISTRATION FEES");
    params.set("HACKTHON FEES", "REGISTRATION FEES");
    params.set("prefill[HACKTHON FEES]", "REGISTRATION FEES");

    // 7. AMOUNT (mapped to 399 entry fee)
    params.set("amount", "399");
    params.set("prefill[amount]", "399");
    params.set("AMOUNT", "399");
    params.set("prefill[AMOUNT]", "399");

    // Replace URL-encoded brackets %5B and %5D back to literal [ and ] so Razorpay page successfully parses them!
    return `${baseUrl}?${params.toString().replace(/%5B/g, '[').replace(/%5D/g, ']')}`;
  };

  // Build the /pay summary page URL (includes individual fields + razorpay url)
  const getPayPageUrl = () => {
    const p = new URLSearchParams();
    p.set('url',        getRazorpayPaymentUrl());
    p.set('name',       formData.name.trim());
    p.set('email',      formData.email.trim());
    p.set('phone',      formData.phone.trim());
    p.set('rollNumber', formData.rollNumber.trim());
    p.set('college',    formData.college.trim());
    p.set('course',     formData.branch.trim());
    p.set('year',       formData.year.trim());
    return `/pay?${p.toString()}`;
  };

  // Step 1: Submit Form -> Create Order & Open Razorpay Simulation
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Step 2 validations
    if (formData.teamPreference === 'Create a Team' && !formData.teamName.trim()) {
      setErrorMsg('Team Name is required.');
      const teamNameInput = document.getElementById('teamName');
      if (teamNameInput) teamNameInput.focus();
      return;
    }
    if (formData.teamPreference === 'Join a Team' && !formData.teamCode.trim()) {
      setErrorMsg('Team Code is required.');
      const teamCodeInput = document.getElementById('teamCode');
      if (teamCodeInput) teamCodeInput.focus();
      return;
    }

    setLoading(true);

    const price = 399;

    try {
      // 1. Create/Verify User account first
      const signupRes = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/auth/otp-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          code: '123456' // Mock OTP bypass
        })
      });

      const signupData = await signupRes.json();
      if (!signupRes.ok && signupRes.status !== 202) {
        setErrorMsg(signupData.message || 'Registration failed.');
        setLoading(false);
        return;
      }

      const verifiedUserToken = signupData.token;
      const verifiedUser = signupData.user;

      // Log in client session
      if (verifiedUserToken && verifiedUser) {
        login(verifiedUserToken, verifiedUser);
      }

      // 2. Create Razorpay order
      const activeToken = verifiedUserToken || localStorage.getItem('codesprint_token');
      const orderRes = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify({ amount: price })
      });

      const orderData = await orderRes.json();
      if (orderRes.ok) {
        setCreatedOrder(orderData);
        setPaymentStep('coming-soon');
        setLoading(false);
        // Navigate to the custom payment summary page
        router.push(getPayPageUrl());
      } else {
        setErrorMsg(orderData.message || 'Failed to create payment order.');
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Server connection error. Please try again.');
      setLoading(false);
    }
  };

  // Simulate payment verification for Coming Soon bypass
  const handleMockPaymentVerify = async () => {
    setLoading(true);
    setErrorMsg('');

    const tokenToUse = localStorage.getItem('codesprint_token');
    const finalAmount = appliedCoupon ? appliedCoupon.finalPrice : 399;
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
          couponCode: appliedCoupon?.code || undefined,
          amount: finalAmount
        })
      });

      const verifyData = await verifyRes.json();

      if (verifyRes.ok && verifyData.success) {
        // Update user state
        login(tokenToUse!, verifyData.user);
        setPaidUser(verifyData.user);

        // Perform background Team Action
        try {
          if (formData.teamPreference === 'Create a Team' && formData.teamName.trim()) {
            await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/teams/create', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${tokenToUse}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: formData.teamName.trim(),
                description: 'Created during registration.',
                customTeamId: formData.teamCode.trim()
              })
            });
          } else if (formData.teamPreference === 'Join a Team' && formData.teamCode.trim()) {
            await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/teams/join-request', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${tokenToUse}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                teamId: formData.teamCode.trim()
              })
            });
          }
        } catch (teamErr) {
          console.error('Error performing background team setup:', teamErr);
        }
        
        // Setup receipt info
        setReceiptDetails({
          receiptNo: `REC-${Math.floor(100000 + Math.random() * 900000)}`,
          date: new Date().toLocaleDateString(),
          amount: finalAmount,
          couponUsed: appliedCoupon?.code || 'None',
          discount: appliedCoupon ? (399 - appliedCoupon.finalPrice) : 0,
          paymentId: verifyData.user.paymentId,
        });

        // Refresh user context profile
        await refreshUser();
        setPaymentStep('success');
      } else {
        setErrorMsg(verifyData.message || 'Payment verification failed.');
        setPaymentStep('form');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error confirming payment verification.');
      setPaymentStep('form');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 w-full relative overflow-hidden flex items-center justify-center py-20 px-4 animate-[fadeIn_0.3s_ease-out]" style={{ background: 'url(/register-bg.jpg) no-repeat center center', backgroundSize: 'cover' }}>
      {/* Glow decorations */}
      <div className="absolute top-[-10%] left-[-15%] w-[45%] h-[45%] rounded-full bg-purple-100/50 blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[45%] h-[45%] rounded-full bg-blue-100/50 blur-[100px] pointer-events-none -z-10" />

      {/* Main Container Card */}
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-8 relative shadow-2xl">
        <div className="absolute top-0 left-[50%] transform -translate-x-[50%] h-[1px] w-[80%] bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        {/* Absolute Back Button at Top Left (Only shown in Step 2) */}
        {paymentStep === 'form' && formStep === 2 && (
          <button
            type="button"
            onClick={() => setFormStep(1)}
            className="absolute top-7 left-6 md:top-8 md:left-8 text-slate-500 hover:text-slate-900 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold active:scale-[0.98]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </button>
        )}

        {/* --- STEP 1: REGISTRATION FORM --- */}
        {paymentStep === 'form' && (
          <>
            <div className="text-center pt-4 pb-2 mb-6">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">CodeSprint-2026 Registration</h1>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs mb-6 flex gap-2.5 items-start leading-relaxed animate-[slideIn_0.2s_ease-out]">
                <ShieldAlert className="h-4.5 w-4.5 text-rose-500 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-6">
              {formStep === 1 ? (
                <div className="space-y-6">
                  {/* Form Grid for Step 1 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div>
                      <label htmlFor="name" className="block text-xs font-semibold text-slate-600 mb-1.5 pl-1 uppercase">Full Name</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><User className="h-4 w-4" /></span>
                        <input id="name" type="text" required placeholder="Aravind Sharma" value={formData.name} onChange={handleChange} className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 text-xs" />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="block text-xs font-semibold text-slate-600 mb-1.5 pl-1 uppercase">Email Address</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><Mail className="h-4 w-4" /></span>
                        <input id="email" type="email" required placeholder="aravind@college.edu" value={formData.email} onChange={handleChange} className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 text-xs" />
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label htmlFor="phone" className="block text-xs font-semibold text-slate-600 mb-1.5 pl-1 uppercase">Phone Number</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><Phone className="h-4 w-4" /></span>
                        <input id="phone" type="tel" required maxLength={10} placeholder="9876543210" value={formData.phone} onChange={handleChange} className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 text-xs" />
                      </div>
                    </div>

                    {/* College */}
                    <div>
                      <label htmlFor="college" className="block text-xs font-semibold text-slate-600 mb-1.5 pl-1 uppercase">College Name</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><School className="h-4 w-4" /></span>
                        {colleges.length > 0 ? (
                          <select id="college" required value={formData.college} onChange={handleChange} className="block w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-500/50 text-xs cursor-pointer appearance-none">
                            <option value="" disabled>Select your college</option>
                            {colleges.map((c: any) => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        ) : (
                          <input id="college" type="text" required placeholder="Audisankara College / ASCET" value={formData.college} onChange={handleChange} className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 text-xs" />
                        )}
                      </div>
                    </div>

                    {/* Roll Number */}
                    <div>
                      <label htmlFor="rollNumber" className="block text-xs font-semibold text-slate-600 mb-1.5 pl-1 uppercase">Roll Number</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><FileText className="h-4 w-4" /></span>
                        <input id="rollNumber" type="text" required placeholder="e.g. 26CS001" value={formData.rollNumber} onChange={handleChange} className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 text-xs" />
                      </div>
                    </div>

                    {/* Branch */}
                    <div>
                      <label htmlFor="branch" className="block text-xs font-semibold text-slate-600 mb-1.5 pl-1 uppercase">Branch / Specialization</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><BookOpen className="h-4 w-4" /></span>
                        <input id="branch" type="text" required placeholder="CSE / IT / ECE" value={formData.branch} onChange={handleChange} className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 text-xs" />
                      </div>
                    </div>

                    {/* Year */}
                    <div>
                      <label htmlFor="year" className="block text-xs font-semibold text-slate-600 mb-1.5 pl-1 uppercase">Current Year</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><Calendar className="h-4 w-4" /></span>
                        <select id="year" value={formData.year} onChange={handleChange} className="block w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:border-purple-500/50 text-xs cursor-pointer">
                          <option value="1st Year">1st Year</option>
                          <option value="2nd Year">2nd Year</option>
                          <option value="3rd Year">3rd Year</option>
                          <option value="4th Year">4th Year</option>
                          <option value="Postgraduate">Postgraduate</option>
                        </select>
                      </div>
                    </div>

                    {/* Gender */}
                    <div>
                      <label htmlFor="gender" className="block text-xs font-semibold text-slate-600 mb-1.5 pl-1 uppercase">Gender</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><User className="h-4 w-4" /></span>
                        <select id="gender" value={formData.gender} onChange={handleChange} className="block w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:border-purple-500/50 text-xs cursor-pointer">
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    {/* T-Shirt Size */}
                    <div>
                      <label htmlFor="tshirtSize" className="block text-xs font-semibold text-slate-600 mb-1.5 pl-1 uppercase">T-Shirt Size</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l4 4m0 0l3-3 3 3m0 0l4-4M5 3v18h14V3" /></svg>
                        </span>
                        <select id="tshirtSize" value={formData.tshirtSize} onChange={handleChange} className="block w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:border-purple-500/50 text-xs cursor-pointer">
                          <option value="S">S — Small</option>
                          <option value="M">M — Medium</option>
                          <option value="L">L — Large</option>
                          <option value="XL">XL — Extra Large</option>
                          <option value="XXL">XXL — Double Extra Large</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full py-3.5 px-4 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] mt-4"
                  >
                    <span>Continue to Step 2</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Join / Create Selector Box (no title, separated by /) */}
                  <div className="border border-slate-200 bg-slate-50 rounded-xl p-1.5 flex items-center justify-between text-xs font-bold text-slate-500 shadow-inner">
                    <button
                      type="button"
                      onClick={() => handleTeamPreferenceChange('Create a Team')}
                      className={`flex-1 py-2 rounded-lg transition-all text-center cursor-pointer ${
                        formData.teamPreference === 'Create a Team'
                          ? 'bg-slate-900 text-white shadow-sm font-extrabold'
                          : 'hover:text-slate-800 text-slate-400'
                      }`}
                    >
                      Create a Team
                    </button>
                    <span className="px-4 text-slate-200 select-none">/</span>
                    <button
                      type="button"
                      onClick={() => handleTeamPreferenceChange('Join a Team')}
                      className={`flex-1 py-2 rounded-lg transition-all text-center cursor-pointer ${
                        formData.teamPreference === 'Join a Team'
                          ? 'bg-slate-900 text-white shadow-sm font-extrabold'
                          : 'hover:text-slate-800 text-slate-400'
                      }`}
                    >
                      Join a Team
                    </button>
                  </div>

                  {/* Conditional inputs based on selector */}
                  {formData.teamPreference === 'Join a Team' ? (
                    <div className="animate-[fadeIn_0.2s_ease-out] space-y-3">
                      <label htmlFor="teamCode" className="block text-xs font-semibold text-slate-600 mb-1.5 pl-1 uppercase">Enter Team Code</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <Users className="h-4 w-4" />
                          </span>
                          <input
                            id="teamCode"
                            type="text"
                            required
                            placeholder="e.g. CS2026-001"
                            value={formData.teamCode}
                            onChange={handleChange}
                            className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 text-xs"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleSearchTeam}
                          disabled={searchStatus === 'searching'}
                          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-[0.98]"
                        >
                          {searchStatus === 'searching' ? (
                            <Loader className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Search className="h-3.5 w-3.5" />
                          )}
                          <span>Search Team</span>
                        </button>
                      </div>

                      {/* Display Search Results */}
                      {searchStatus === 'found' && searchedTeam && (
                        <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/70 text-emerald-800 text-xs leading-relaxed animate-[slideIn_0.2s_ease-out]">
                          <p className="font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <span>Team Found!</span>
                          </p>
                          <div className="mt-1.5 space-y-0.5 text-slate-600 pl-5.5">
                            <p><strong>Team Name:</strong> {searchedTeam.name}</p>
                            <p><strong>Leader:</strong> {searchedTeam.leaderName || 'Unknown Leader'}</p>
                            <p><strong>College:</strong> {searchedTeam.college}</p>
                            <p><strong>Slots Available:</strong> {searchedTeam.remainingSlots} slots remaining</p>
                          </div>
                          <div className="mt-3 pt-2.5 border-t border-emerald-200/50 flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 font-medium">Selected Option:</span>
                            <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-200">
                              Request to Join on Payment
                            </span>
                          </div>
                        </div>
                      )}

                      {searchStatus === 'not-found' && (
                        <div className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/70 text-rose-800 text-xs leading-relaxed animate-[slideIn_0.2s_ease-out]">
                          <p className="font-bold flex items-center gap-1.5">
                            <ShieldAlert className="h-4 w-4 text-rose-500" />
                            <span>Team Not Found</span>
                          </p>
                          <p className="mt-1 text-slate-600 pl-5.5">No team registered under code <strong>{formData.teamCode}</strong>. Please check the code and search again.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-[fadeIn_0.2s_ease-out]">
                      {/* Team Name */}
                      <div>
                        <label htmlFor="teamName" className="block text-xs font-semibold text-slate-600 mb-1.5 pl-1 uppercase">Team Name</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <Sparkles className="h-4 w-4" />
                          </span>
                          <input
                            id="teamName"
                            type="text"
                            required
                            placeholder="e.g. Code Wizards"
                            value={formData.teamName}
                            onChange={handleChange}
                            className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 text-xs"
                          />
                        </div>
                      </div>

                      {/* Generated Team Code (Read-Only) */}
                      <div>
                        <label htmlFor="teamCode" className="block text-xs font-semibold text-slate-600 mb-1.5 pl-1 uppercase">Generated Team Code</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <Users className="h-4 w-4" />
                          </span>
                          <input
                            id="teamCode"
                            type="text"
                            readOnly
                            value={formData.teamCode}
                            className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed text-xs font-mono font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LinkedIn URL (placed above the fee calculation details) */}
                  <div className="animate-[fadeIn_0.2s_ease-out]">
                    <label htmlFor="linkedin" className="block text-xs font-semibold text-slate-600 mb-1.5 pl-1 uppercase">LinkedIn URL (Optional)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><Globe className="h-4 w-4" /></span>
                      <input id="linkedin" type="url" placeholder="https://linkedin.com/in/username" value={formData.linkedin} onChange={handleChange} className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 text-xs" />
                    </div>
                  </div>

                  {/* Price Calculation details */}
                  <div className="border-t border-slate-100 pt-4 flex flex-col gap-2 text-xs">
                    <div className="flex justify-between font-bold text-slate-900 text-sm">
                      <span>Registration Fee</span>
                      <span className="text-purple-600 font-extrabold text-base">₹399</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-3.5 px-4 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                    >
                      {loading ? 'Processing Registration...' : 'Authorize and Proceed to Payment'}
                      <CreditCard className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </form>
          </>
        )}

        {/* --- STEP 2: PAYMENT VERIFICATION (Razorpay Link Gateway) --- */}
        {paymentStep === 'coming-soon' && (
          <div className="py-6 text-center text-slate-900 bg-white rounded-3xl p-6 animate-[slideIn_0.3s_ease-out] shadow-xl max-w-lg mx-auto">
            {/* PAY NOW GATEWAY BANNER */}
            <div className="mb-6 py-1.5 px-4 bg-purple-50 border border-purple-200 text-purple-800 text-[10px] font-extrabold uppercase rounded-full inline-flex items-center gap-1.5 tracking-wider shadow-sm animate-pulse">
              <span className="h-2 w-2 rounded-full bg-purple-500"></span>
              Secure Razorpay Link Checkout
            </div>

            <div className="inline-flex p-3.5 bg-purple-50 rounded-full text-purple-600 mb-5">
              <CreditCard className="h-8 w-8" />
            </div>

            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Complete Your Payment</h1>
            <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
              Please complete the entry fee of <strong>₹399</strong> on our secure Razorpay Payment Link page. Your billing details are pre-filled automatically.
            </p>

            <div className="my-6 p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left shadow-inner">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3">Pre-filled Billing Details</h3>
              <div className="space-y-2 text-xxs text-slate-600 font-mono">
                <div>Attendee: <span className="text-slate-900 font-bold">{formData.name}</span></div>
                <div>Email: <span className="text-slate-900 font-bold">{formData.email}</span></div>
                <div>Contact: <span className="text-slate-900 font-bold">{formData.phone}</span></div>
                <div>Roll Number: <span className="text-slate-900 font-bold">{formData.rollNumber}</span></div>
                <div>Fee Amount: <span className="text-purple-600 font-extrabold">₹399</span></div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-3 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => router.push(getPayPageUrl())}
                className="w-full py-3.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
              >
                Pay ₹399 Securely
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleMockPaymentVerify}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {loading ? 'Processing...' : 'Verify Payment & Complete Registration'}
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </button>

              <button
                type="button"
                onClick={() => router.push('/login')}
                className="w-full py-2 px-4 rounded-xl text-slate-400 hover:text-slate-500 font-semibold text-xxs transition-all cursor-pointer"
              >
                Cancel & Return to Login
              </button>
            </div>
          </div>
        )}

        {/* --- STEP 3: PAYMENT SUCCESS / RECEIPT --- */}
        {paymentStep === 'success' && receiptDetails && paidUser && (
          <div className="py-4 text-center animate-[slideIn_0.3s_ease-out]">
            <div className="inline-flex p-3 bg-emerald-50 rounded-full border border-emerald-200 text-emerald-600 mb-4 animate-bounce">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Registration Successful!</h1>
            {/* DEMO SUCCESS INDICATOR */}
            <div className="mb-2 py-1 px-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[9px] font-bold uppercase rounded-full inline-block tracking-wider">
              Paid (Demo Simulator Mode Verified)
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              Thank you, {paidUser.name}! Your payment was verified, and your entry ticket has been dispatched.
            </p>

            {/* Printable Receipt Frame */}
            <div id="print-receipt" className="my-8 p-6 rounded-2xl border border-slate-200 bg-slate-50 text-left relative overflow-hidden shadow-inner">
              <div className="absolute top-0 right-0 bg-emerald-50 border-b border-l border-emerald-200 text-emerald-700 text-[10px] px-3 py-1 font-bold uppercase">
                PAID RECEIPT
              </div>
              <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-4">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900 tracking-wider font-mono">CodeSprint-2026</h2>
                  <p className="text-[10px] text-slate-500 mt-0.5">KVT Hall, Gudur, AP, India</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-500">Receipt ID</p>
                  <p className="text-xs font-bold text-slate-800 font-mono">{receiptDetails.receiptNo}</p>
                </div>
              </div>

              {/* receipt items */}
              <div className="space-y-3 text-xs border-b border-slate-200 pb-4 mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Participant Name</span>
                  <span className="font-semibold text-slate-800">{paidUser.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email Address</span>
                  <span className="font-semibold text-slate-800">{paidUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">College Name</span>
                  <span className="font-semibold text-slate-800">{paidUser.college}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Date</span>
                  <span className="font-semibold text-slate-800">{receiptDetails.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ref ID</span>
                  <span className="font-semibold text-slate-800 font-mono text-[10px]">{receiptDetails.paymentId}</span>
                </div>
                {receiptDetails.couponUsed !== 'None' && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Coupon Used</span>
                    <span>{receiptDetails.couponUsed} (-₹{receiptDetails.discount})</span>
                  </div>
                )}
              </div>

              {/* Total Paid & QR */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500">Grand Total Paid</p>
                  <p className="text-xl font-extrabold text-slate-900 font-mono">₹{receiptDetails.amount}</p>
                </div>
                {/* Embed QR Code pointing to Check-in URL using quickchart */}
                <div className="h-16 w-16 bg-white p-1 rounded-lg border border-slate-200">
                  <img
                    src={`https://quickchart.io/qr?text=${encodeURIComponent(paidUser.id)}&size=100&margin=1`}
                    alt="Attendee QR"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 text-[10px] text-slate-500 text-center leading-normal">
                Present this QR code at the check-in desk during the event for entry verification.
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-3 max-w-sm mx-auto">
              <button
                onClick={handlePrint}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
              >
                <Download className="h-4 w-4" />
                Download Receipt PDF
              </button>

              <button
                onClick={() => router.push('/get-in')}
                className="py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer w-full"
              >
                <ArrowRight className="h-4 w-4" />
                Get In — Join or Create a Team
              </button>
            </div>
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
