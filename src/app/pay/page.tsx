'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import React, { Suspense, useState, useRef } from 'react';
import { ShieldCheck, User, Mail, Phone, BookOpen, Hash, Building2, Calendar, CreditCard, ArrowLeft, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function PayFrame() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const razorpayUrl  = searchParams.get('url') || '';
  const name         = searchParams.get('name') || '';
  const email        = searchParams.get('email') || '';
  const phone        = searchParams.get('phone') || '';
  const rollNumber   = searchParams.get('rollNumber') || '';
  const college      = searchParams.get('college') || '';
  const course       = searchParams.get('course') || '';
  const year         = searchParams.get('year') || '';
  const amount       = searchParams.get('amount') || '399';

  React.useEffect(() => {
    if (!razorpayUrl) {
      router.push('/register');
    }
  }, [router, razorpayUrl]);

  const [iframeReady, setIframeReady]   = useState(false);
  const [showIframe, setShowIframe]     = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { token, refreshUser } = useAuth();
  const [utrInput, setUtrInput] = useState('');
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [utrError, setUtrError] = useState('');

  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrInput.trim()) return;
    setSubmittingUtr(true);
    setUtrError('');
    try {
      const activeToken = token || localStorage.getItem('codesprint_token');
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/payments/submit-utr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify({ utr: utrInput.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        await refreshUser();
        router.push('/register');
      } else {
        setUtrError(data.message || 'Failed to submit UTR.');
        if (data.autoRejected) {
          await refreshUser();
          router.push('/register');
        }
      }
    } catch (err) {
      console.error(err);
      setUtrError('Network error. Please try again.');
    } finally {
      setSubmittingUtr(false);
    }
  };

  if (!razorpayUrl) {
    return (
      <div className="flex-1 w-full flex items-center justify-center text-slate-500 text-sm">
        Invalid payment session.{' '}
        <button onClick={() => router.back()} className="ml-2 underline">Go Back</button>
      </div>
    );
  }

  const fields = [
    { icon: User,      label: 'Student Name',  value: name },
    { icon: Mail,      label: 'Email Address', value: email },
    { icon: Phone,     label: 'Phone Number',  value: phone },
    { icon: Hash,      label: 'Roll Number',   value: rollNumber },
    { icon: Building2, label: 'College',       value: college },
    { icon: BookOpen,  label: 'Course',        value: course },
    { icon: Calendar,  label: 'Year',          value: year },
  ];

  return (
    <>
      {/* ── HIDDEN PRE-LOADED IFRAME ── loads in background so it's instant when shown */}
      <iframe
        ref={iframeRef}
        src={razorpayUrl}
        title="Razorpay Payment"
        allow="payment"
        onLoad={() => setIframeReady(true)}
        style={{
          position: 'fixed',
          /* Push completely off screen; still loads in background */
          top: 0, left: '-200vw',
          width: '100vw', height: '100vh',
          border: 'none',
          pointerEvents: 'none',
          opacity: 0,
          zIndex: -1,
        }}
      />

      {/* ── RAZORPAY FULLSCREEN OVERLAY (shown after Pay click) ── */}
      {showIframe && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: '#fff',
          display: 'flex', flexDirection: 'column'
        }}>
          {/* top bar */}
          <div style={{
            height: 48, background: 'linear-gradient(90deg,#7c3aed,#4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 20px', flexShrink: 0,
            boxShadow: '0 2px 8px rgba(124,58,237,0.4)'
          }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>
              CodeSprint 2026 — Secure Payment
            </span>
            <button
              onClick={() => setShowIframe(false)}
              style={{
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff', borderRadius: 8, padding: '4px 14px',
                fontSize: 11, fontWeight: 700, cursor: 'pointer'
              }}
            >
              ← Back
            </button>
          </div>

          {/* the actual iframe — now visible and interactive */}
          <iframe
            src={razorpayUrl}
            title="Razorpay Payment Live"
            allow="payment"
            style={{ flex: 1, border: 'none', width: '100%' }}
          />
        </div>
      )}

      {/* ── SUMMARY PAGE ── */}
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1040 50%, #0f0f1a 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '40px 16px', fontFamily: "'Inter', sans-serif"
      }}>
        {/* Back button */}
        <div style={{ width: '100%', maxWidth: 560, marginBottom: 20 }}>
          <button
            onClick={() => router.back()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.7)', borderRadius: 10, padding: '7px 14px',
              fontSize: 12, fontWeight: 600, cursor: 'pointer'
            }}
          >
            <ArrowLeft size={13} /> Back to Registration
          </button>
        </div>

        {/* Card */}
        <div style={{
          width: '100%', maxWidth: 560,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 24, overflow: 'hidden',
          boxShadow: '0 25px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.15)'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            padding: '28px 32px 24px',
            display: 'flex', alignItems: 'center', gap: 16
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <ShieldCheck size={24} color="#fff" />
            </div>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>
                CodeSprint 2026 · Secure Checkout
              </div>
              <div style={{ color: '#fff', fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>
                Payment Summary
              </div>
            </div>
            <div style={{
              marginLeft: 'auto',
              background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '4px 10px',
              fontSize: 10, color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4
            }}>
              <Lock size={9} />
              {iframeReady ? 'Ready' : 'Loading...'}
            </div>
          </div>

          {/* Fields */}
          <div style={{ padding: '24px 32px 8px' }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
              Registration Details
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {fields.map(({ icon: Icon, label, value }) => value ? (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 12, padding: '11px 16px'
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: 'rgba(124,58,237,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <Icon size={14} color="#a78bfa" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>
                      {label}
                    </div>
                    <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {value}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 9, fontWeight: 700, color: 'rgba(124,58,237,0.8)',
                    background: 'rgba(124,58,237,0.12)', borderRadius: 6, padding: '2px 7px', flexShrink: 0
                  }}>
                    locked
                  </div>
                </div>
              ) : null)}
            </div>
          </div>

          {/* Amount row */}
          <div style={{ padding: '16px 32px' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(79,70,229,0.15))',
              border: '1px solid rgba(124,58,237,0.3)',
              borderRadius: 14, padding: '16px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                  Registration Fee
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Hackathon Entry · CodeSprint 2026</div>
              </div>
              <div style={{ color: '#c4b5fd', fontSize: 26, fontWeight: 900, letterSpacing: '-0.03em' }}>₹{amount}</div>
            </div>
          </div>

          {/* Pay button */}
          <div style={{ padding: '0 32px 32px' }}>
            <button
              onClick={() => setShowIframe(true)}
              disabled={!iframeReady}
              style={{
                width: '100%', padding: '16px 24px',
                background: iframeReady
                  ? 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)'
                  : 'rgba(124,58,237,0.3)',
                border: 'none', borderRadius: 14,
                cursor: iframeReady ? 'pointer' : 'wait',
                color: '#fff', fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: iframeReady ? '0 8px 32px rgba(124,58,237,0.5)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              {iframeReady ? (
                <><CreditCard size={18} /> Pay ₹{amount} via Razorpay</>
              ) : (
                <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Preparing secure payment...</>
              )}
            </button>
            <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
            <p style={{
              textAlign: 'center', color: 'rgba(255,255,255,0.3)',
              fontSize: 10, marginTop: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5
            }}>
              <Lock size={9} /> Secured by Razorpay · Axis Bank Payment Gateway
            </p>

            {/* UTR Input Form */}
            <form onSubmit={handleSubmitUtr} style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ color: '#c4b5fd', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                Step 2: Enter Transaction UTR Number
              </p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, lineHeight: 1.4, marginBottom: 12 }}>
                After completing the payment in the Razorpay window, copy the 12-digit UTR (Unique Transaction Reference) / Ref No. and submit it below to request activation.
              </p>
              
              {utrError && (
                <div style={{ padding: 10, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: 11, marginBottom: 12 }}>
                  {utrError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  placeholder="12-digit UTR / Txn ID"
                  required
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value.replace(/\s+/g, ''))}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff', fontSize: 12, outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={submittingUtr || utrInput.length < 12}
                  style={{
                    padding: '10px 16px', borderRadius: 10, border: 'none',
                    background: utrInput.length >= 12 ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'rgba(124,58,237,0.3)',
                    color: '#fff', fontSize: 12, fontWeight: 700, cursor: utrInput.length >= 12 ? 'pointer' : 'not-allowed'
                  }}
                >
                  {submittingUtr ? 'Submitting...' : 'Submit UTR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f1a', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
        Loading payment session...
      </div>
    }>
      <PayFrame />
    </Suspense>
  );
}
