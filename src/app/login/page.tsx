'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, CheckCircle2, Loader } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../config/firebase';

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error'; registerUrl?: string } | null>(null);

  useEffect(() => {
    // Check query params for impersonation token
    const params = new URLSearchParams(window.location.search);
    const queryToken = params.get('token');
    if (queryToken) {
      setLoading(true);
      fetch((process.env.NEXT_PUBLIC_API_URL || '') + '/api/auth/me', {
        headers: { Authorization: `Bearer ${queryToken}` }
      })
      .then(res => res.json())
      .then(userData => {
        if (userData && userData.id) {
          login(queryToken, userData);
        } else {
          setMessage({ text: 'Invalid login token provided.', type: 'error' });
          setLoading(false);
        }
      })
      .catch(err => {
        console.error(err);
        setMessage({ text: 'Error authenticating with token.', type: 'error' });
        setLoading(false);
      });
    }
  }, [login]);

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        router.push('/dashboard');
      } else if (user.paymentStatus !== 'paid') {
        router.push('/register');
      } else if (!user.teamId) {
        router.push('/get-in');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, router]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      await triggerFirebaseLogin(idToken);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        setMessage({ text: 'Sign-in popup closed before completion.', type: 'error' });
      } else {
        setMessage({ text: err.message || 'Google authentication failed.', type: 'error' });
      }
      setLoading(false);
    }
  };

  const triggerFirebaseLogin = async (idToken: string) => {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/auth/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();

      if (res.status === 404 || data.notRegistered || res.status === 202) {
        const userEmail = data.email || '';
        const userName = data.name || '';
        const regUrl = `/register${userEmail ? `?email=${encodeURIComponent(userEmail)}&name=${encodeURIComponent(userName)}` : ''}`;
        setMessage({
          text: `Account not found for ${userEmail || 'this email'}. You are not registered yet. Please register first to participate!`,
          type: 'error',
          registerUrl: regUrl
        });
      } else if (res.ok && data.token && data.user) {
        login(data.token, data.user);
        setMessage({ text: 'Welcome back! Redirecting…', type: 'success' });
        setTimeout(() => {
          if (data.user.role === 'admin') {
            router.push('/dashboard');
          } else {
            const destination = data.user.paymentStatus !== 'paid'
              ? '/register'
              : (!data.user.teamId ? '/get-in' : '/dashboard');
            router.push(destination);
          }
        }, 1000);
      } else {
        setMessage({ text: data.message || 'Google authentication failed.', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Could not connect to server. Is the backend running?', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full bg-slate-50 relative overflow-hidden flex items-center justify-center min-h-screen px-4" style={{ background: 'url(/login-bg.jpg) no-repeat center center', backgroundSize: 'cover' }}>
      {/* subtle radial light */}
      <div className="absolute inset-0 bg-gradient-radial from-purple-100/30 to-transparent pointer-events-none" />

      <div className="w-full max-w-sm relative">
        {/* Card */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
          {/* Top aesthetic accent line */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          {/* Logo mark */}
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center shadow-md">
              <span className="text-white font-black text-lg tracking-tighter">C</span>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sign in to CodeSprint-2026</h1>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Use your Google account to access your dashboard,<br />register, and manage your team.
            </p>
          </div>

          {/* Alert */}
          {message && (
            <div className={`p-3.5 rounded-xl border text-xs leading-relaxed mb-5 flex flex-col gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <div className="flex gap-2.5 items-start">
                {message.type === 'success'
                  ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600 mt-0.5" />
                  : <ShieldAlert className="h-4 w-4 flex-shrink-0 text-rose-500 mt-0.5" />}
                <span className="font-medium">{message.text}</span>
              </div>
              {message.registerUrl && (
                <a
                  href={message.registerUrl}
                  className="mt-1 inline-flex items-center justify-center py-2 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors self-start shadow-sm"
                >
                  Register for CodeSprint 2026 →
                </a>
              )}
            </div>
          )}

          {/* Google Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 shadow-lg active:scale-[0.98]"
          >
            {loading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              /* Google G logo SVG with slightly revised background path for high contrast on black btn */
              <svg width="18" height="18" viewBox="0 0 48 48" fill="none" className="bg-white p-0.5 rounded-full">
                <path d="M47.532 24.552c0-1.636-.132-3.2-.388-4.704H24v9.192h13.22c-.584 3.024-2.3 5.588-4.872 7.316v6.024h7.876c4.612-4.248 7.308-10.52 7.308-17.828z" fill="#4285F4"/>
                <path d="M24 48c6.612 0 12.168-2.196 16.224-5.948l-7.876-6.024c-2.196 1.468-4.996 2.34-8.348 2.34-6.42 0-11.856-4.336-13.796-10.16H2.044v6.22C6.084 42.864 14.452 48 24 48z" fill="#34A853"/>
                <path d="M10.204 28.208A14.46 14.46 0 0 1 9.6 24c0-1.46.252-2.876.604-4.208V13.572H2.044A23.988 23.988 0 0 0 0 24c0 3.876.936 7.548 2.044 10.428l8.16-6.22z" fill="#FBBC05"/>
                <path d="M24 9.636c3.62 0 6.868 1.244 9.42 3.676l7.02-7.02C36.168 2.392 30.612 0 24 0 14.452 0 6.084 5.136 2.044 13.572l8.16 6.22C12.144 13.972 17.58 9.636 24 9.636z" fill="#EA4335"/>
              </svg>
            )}
            {loading ? 'Signing in…' : 'Continue with Google'}
          </button>

          <p className="text-[10px] text-slate-500 text-center mt-5 leading-relaxed">
            New to CodeSprint-2026? Google sign-in will guide you through registration.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-slate-450 mt-6">
          CodeSprint-2026 · 8-Hours National Level Hackathon
        </p>
      </div>
    </div>
  );
}


