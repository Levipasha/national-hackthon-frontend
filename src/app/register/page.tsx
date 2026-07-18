'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { 
  Sparkles, User, Mail, Phone, School, BookOpen, Calendar, 
  Globe, Ticket, CreditCard, ShieldAlert, CheckCircle2, 
  Download, ArrowRight, Loader
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
    branch: '',
    year: '1st Year',
    gender: 'Male',
    tshirtSize: 'M',
    linkedin: '',
    portfolio: ''
  });

  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
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
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
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

  // Step 1: Submit Form -> Create Order & Open Razorpay Simulation
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const price = appliedCoupon ? appliedCoupon.finalPrice : 399;

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

        {/* --- STEP 1: REGISTRATION FORM --- */}
        {paymentStep === 'form' && (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm mb-3">
                <Sparkles className="h-3 w-3 text-purple-600" />
                Step 1: Individual Registration Details
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">CodeSprint-2026 Registration</h1>
              <p className="text-xs text-slate-500 mt-1">₹399 entry fee per participant. Teams will be created after payment.</p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs mb-6 flex gap-2.5 items-start leading-relaxed animate-[slideIn_0.2s_ease-out]">
                <ShieldAlert className="h-4.5 w-4.5 text-rose-500 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-6">
              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label htmlFor="name" className="block text-xs font-semibold text-slate-600 mb-1.5 pl-1 uppercase">Full Name</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><User className="h-4 w-4" /></span>
                    <input id="name" type="text" required placeholder="John Doe" value={formData.name} onChange={handleChange} className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 text-xs" />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-slate-600 mb-1.5 pl-1 uppercase">Email Address</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><Mail className="h-4 w-4" /></span>
                    <input id="email" type="email" required placeholder="john@college.edu" value={formData.email} onChange={handleChange} className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 text-xs" />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-xs font-semibold text-slate-600 mb-1.5 pl-1 uppercase">Phone Number</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><Phone className="h-4 w-4" /></span>
                    <input id="phone" type="tel" required placeholder="9876543210" value={formData.phone} onChange={handleChange} className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 text-xs" />
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

                {/* LinkedIn */}
                <div>
                  <label htmlFor="linkedin" className="block text-xs font-semibold text-slate-600 mb-1.5 pl-1 uppercase">LinkedIn URL</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><Globe className="h-4 w-4" /></span>
                    <input id="linkedin" type="url" required placeholder="https://linkedin.com/in/username" value={formData.linkedin} onChange={handleChange} className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 text-xs" />
                  </div>
                </div>
              </div>

              {/* Portfolio */}
              <div>
                <label htmlFor="portfolio" className="block text-xs font-semibold text-slate-600 mb-1.5 pl-1 uppercase">Portfolio / GitHub / Website (Optional)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><Globe className="h-4 w-4" /></span>
                  <input id="portfolio" type="url" placeholder="https://github.com/username" value={formData.portfolio} onChange={handleChange} className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 text-xs" />
                </div>
              </div>

              {/* Coupon Management */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col gap-3">
                <label htmlFor="coupon" className="block text-xs font-bold text-slate-500 pl-1 uppercase">Coupon Discount Code</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><Ticket className="h-4 w-4" /></span>
                    <input
                      id="coupon"
                      type="text"
                      placeholder="e.g. COLLEGE50, FRESH100"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="block w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    Apply Coupon
                  </button>
                </div>
                {appliedCoupon && (
                  <p className="text-xxs text-emerald-600 font-bold pl-1">
                    ✓ Code Applied! Final Price: ₹{appliedCoupon.finalPrice} ({appliedCoupon.discountValue}% discount applied)
                  </p>
                )}
                {couponError && (
                  <p className="text-xxs text-rose-600 font-bold pl-1">✕ {couponError}</p>
                )}
              </div>

              {/* Price Calculation details */}
              <div className="border-t border-slate-100 pt-4 flex flex-col gap-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Standard Registration Fee</span>
                  <span>₹399</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Coupon Discount ({appliedCoupon.code})</span>
                    <span>-₹{appliedCoupon.discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 text-sm border-t border-slate-100 pt-2">
                  <span>Grand Total to Pay</span>
                  <span className="text-purple-600 font-extrabold text-base">₹{appliedCoupon ? appliedCoupon.finalPrice : 399}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
              >
                {loading ? 'Processing Registration...' : 'Authorize and Proceed to Payment'}
                <CreditCard className="h-4 w-4" />
              </button>
            </form>
          </>
        )}

        {/* --- STEP 2: PAYMENT COMING SOON (White Premium Card Combo) --- */}
        {paymentStep === 'coming-soon' && (
          <div className="py-6 text-center text-slate-900 bg-white rounded-3xl p-4 animate-[slideIn_0.3s_ease-out]">
            {/* DEMO / TEST MODE BANNER */}
            <div className="mb-6 py-1.5 px-4 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-extrabold uppercase rounded-full inline-flex items-center gap-1.5 tracking-wider shadow-sm">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
              Client Demo / Test Mode Active
            </div>

            <div className="inline-flex p-3.5 bg-purple-50 rounded-full text-purple-600 mb-5">
              <CreditCard className="h-8 w-8" />
            </div>

            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Payment Gateway Coming Soon</h1>
            <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
              We are currently integrating our Razorpay payment portal for <strong>CodeSprint-2026</strong>. 
              The standard registration fee is <strong>₹399</strong>.
            </p>

            <div className="my-6 p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left shadow-inner">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">Registration Status</h3>
              <p className="text-xxs text-slate-500 leading-normal mb-3">
                Your participant profile has been created successfully! You are registered in a <strong>Pending Payment</strong> state.
              </p>
              <div className="space-y-1.5 text-xxs text-slate-600 font-mono">
                <div>Name: <span className="text-slate-900 font-bold">{formData.name}</span></div>
                <div>Email: <span className="text-slate-900 font-bold">{formData.email}</span></div>
                <div>Amount: <span className="text-slate-900 font-bold">₹{appliedCoupon ? appliedCoupon.finalPrice : 399}</span></div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-3 max-w-md mx-auto">
              <button
                onClick={handleMockPaymentVerify}
                className="w-full py-3.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
              >
                Bypass & Verify Payment (Mock Success)
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => router.push('/login')}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 font-semibold text-xs transition-all cursor-pointer"
              >
                Keep Pending & Return to Login
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
