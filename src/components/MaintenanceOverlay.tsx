"use client";

import React, { useEffect, useState } from "react";

export default function MaintenanceOverlay() {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
  }>({ hours: 2, minutes: 0, seconds: 0, totalSeconds: 7200 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    const STORAGE_KEY = "codesprint_maintenance_target_time_v2";

    let targetTime = localStorage.getItem(STORAGE_KEY);
    let targetTimestamp: number;

    if (!targetTime) {
      targetTimestamp = Date.now() + DURATION_MS;
      localStorage.setItem(STORAGE_KEY, targetTimestamp.toString());
    } else {
      targetTimestamp = parseInt(targetTime, 10);
      if (isNaN(targetTimestamp) || Date.now() >= targetTimestamp) {
        // If expired or invalid, reset for a fresh 2 hour timer
        targetTimestamp = Date.now() + DURATION_MS;
        localStorage.setItem(STORAGE_KEY, targetTimestamp.toString());
      }
    }

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, targetTimestamp - now);

      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft({ hours, minutes, seconds, totalSeconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!mounted) {
    return (
      <div className="fixed inset-0 z-[999999] bg-black text-white flex items-center justify-center">
        <div className="animate-pulse text-neutral-400 font-mono text-sm">
          Loading system state...
        </div>
      </div>
    );
  }

  const TOTAL_DURATION_SEC = 7200; // 2 hours in seconds
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(((TOTAL_DURATION_SEC - timeLeft.totalSeconds) / TOTAL_DURATION_SEC) * 100))
  );

  const formatTwoDigits = (num: number) => String(num).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[999999] bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 select-none overflow-hidden font-sans">
      {/* Background Gradients & Glow Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-purple-900/20 via-blue-900/20 to-amber-500/10 rounded-full blur-3xl pointer-events-none animate-pulse duration-1000" />
      <div className="absolute inset-0 bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 max-w-2xl w-full text-center space-y-8 bg-neutral-900/80 backdrop-blur-2xl p-8 sm:p-12 rounded-3xl border border-neutral-800/80 shadow-2xl shadow-black/80">
        
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
          </span>
          Site Under Updates
        </div>

        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
            Under Scheduled Updates
          </h1>
          <p className="text-neutral-400 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
            We are performing essential system maintenance and feature rollouts across the platform. The site will be available after <span className="text-amber-400 font-semibold">2 hours</span>.
          </p>
        </div>

        {/* Timer Display */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-md mx-auto py-2">
          {/* Hours */}
          <div className="flex flex-col items-center justify-center p-4 bg-neutral-950/70 border border-neutral-800 rounded-2xl shadow-inner">
            <span className="font-mono text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-wider">
              {formatTwoDigits(timeLeft.hours)}
            </span>
            <span className="text-[10px] sm:text-xs font-medium text-neutral-500 uppercase tracking-widest mt-1">
              Hours
            </span>
          </div>

          {/* Minutes */}
          <div className="flex flex-col items-center justify-center p-4 bg-neutral-950/70 border border-neutral-800 rounded-2xl shadow-inner">
            <span className="font-mono text-3xl sm:text-4xl md:text-5xl font-bold text-amber-400 tracking-wider">
              {formatTwoDigits(timeLeft.minutes)}
            </span>
            <span className="text-[10px] sm:text-xs font-medium text-neutral-500 uppercase tracking-widest mt-1">
              Minutes
            </span>
          </div>

          {/* Seconds */}
          <div className="flex flex-col items-center justify-center p-4 bg-neutral-950/70 border border-neutral-800 rounded-2xl shadow-inner">
            <span className="font-mono text-3xl sm:text-4xl md:text-5xl font-bold text-amber-500 tracking-wider">
              {formatTwoDigits(timeLeft.seconds)}
            </span>
            <span className="text-[10px] sm:text-xs font-medium text-neutral-500 uppercase tracking-widest mt-1">
              Seconds
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 max-w-md mx-auto pt-2">
          <div className="flex justify-between text-xs text-neutral-400 font-mono">
            <span>Maintenance Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full bg-neutral-950 h-2.5 rounded-full overflow-hidden border border-neutral-800 p-0.5">
            <div
              className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(245,158,11,0.5)]"
              style={{ width: `${Math.max(5, progressPercent)}%` }}
            />
          </div>
        </div>

        {/* Notice Footer */}
        <div className="pt-4 border-t border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Auto-refresh will restore access when countdown finishes</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors text-xs font-medium border border-neutral-700/60 flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Check Status
          </button>
        </div>

      </div>
    </div>
  );
}
