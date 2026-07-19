'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { motion } from 'framer-motion';
import { Bell, Menu, X, LogOut, LayoutDashboard, Settings, User } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  readBy: string[];
  createdAt: string;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { notificationsCount: socketNotificationsCount, triggerRefreshNotifications } = useSocket();

  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // sliding cursor highlight states
  const [position, setPosition] = useState({ left: 0, width: 0, opacity: 0 });
  const tabsRef = useRef<(HTMLLIElement | null)[]>([]);

  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch notifications list
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('codesprint_token');
        const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/notifications', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok) {
          const list = await res.json();
          list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setNotifications(list);
        }
      } catch (err) {
        console.error('Error fetching navbar notifications:', err);
      }
    };
    fetchNotifications();
  }, [user, socketNotificationsCount]);

  // Click outside notification dropdown to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notificationsCount = user
    ? notifications.filter(n => !n.readBy.includes(user.id)).length
    : 0;

  const tabs = [
    { label: 'Home', href: '/' },
    { label: 'Public Teams', href: '/teams' },
  ];

  // Recalculate tab highlights
  const handleTabMouseEnter = (index: number) => {
    const element = tabsRef.current[index];
    if (element) {
      const { offsetLeft, offsetWidth } = element;
      setPosition({
        left: offsetLeft,
        width: offsetWidth,
        opacity: 1,
      });
    }
  };

  const handleMouseLeaveContainer = () => {
    // Keep highligher on active page or fade it out
    const activeIndex = tabs.findIndex(t => t.href === pathname);
    if (activeIndex !== -1 && tabsRef.current[activeIndex]) {
      const element = tabsRef.current[activeIndex];
      if (element) {
        const { offsetLeft, offsetWidth } = element;
        setPosition({
          left: offsetLeft,
          width: offsetWidth,
          opacity: 1,
        });
      }
    } else {
      setPosition(prev => ({ ...prev, opacity: 0 }));
    }
  };

  // Run on pathname changes
  useEffect(() => {
    const activeIndex = tabs.findIndex(t => t.href === pathname);
    if (activeIndex !== -1 && tabsRef.current[activeIndex]) {
      const element = tabsRef.current[activeIndex];
      if (element) {
        const { offsetLeft, offsetWidth } = element;
        setPosition({
          left: offsetLeft,
          width: offsetWidth,
          opacity: 1,
        });
      }
    } else {
      setPosition(prev => ({ ...prev, opacity: 0 }));
    }
  }, [pathname, mounted]);

  // Fallback layout during initial load
  if (!mounted) {
    return (
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="flex items-center gap-2 group">
                <img src="/logo.png" alt="CodeSprint Logo" className="h-9 w-auto object-contain" />
                <span className="text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-purple-600 transition-colors">CodeSprint</span>
              </Link>
            </div>
          </div>
        </div>
      </header>
    );
  }

  const markAsRead = async (notifId: string) => {
    try {
      const savedToken = localStorage.getItem('codesprint_token');
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/notifications/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${savedToken}`,
        },
        body: JSON.stringify({ notificationId: notifId }),
      });
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === notifId ? { ...n, readBy: [...n.readBy, user?.id || ''] } : n))
        );
        triggerRefreshNotifications();
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/85 backdrop-blur-md shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <img src="/logo.png" alt="CodeSprint Logo" className="h-9 w-auto object-contain" />
              <span className="text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-purple-600 transition-colors">CodeSprint</span>
            </Link>
          </div>

          {/* Navigation Links - Desktop with sliding cursor tab highlight */}
          <ul
            onMouseLeave={handleMouseLeaveContainer}
            className="hidden md:flex relative items-center gap-1.5 p-1 rounded-full border border-slate-200 bg-slate-100/50 backdrop-blur-md"
          >
            {tabs.map((tab, i) => (
              <li
                key={tab.label}
                ref={(el) => { tabsRef.current[i] = el; }}
                onMouseEnter={() => handleTabMouseEnter(i)}
                className="relative z-10 block cursor-pointer"
              >
                <Link
                  href={tab.href}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider block transition-colors duration-250 ${
                    pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href))
                      ? 'text-slate-900'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </Link>
              </li>
            ))}

            {/* Slide pill highlight block */}
            <motion.li
              animate={position}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="absolute z-0 h-8 rounded-full bg-white border border-slate-200 shadow-sm"
            />
          </ul>

          {/* Right section - User Profile, Notifications */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                {/* Notification Dropdown Container */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                    className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    <Bell className="h-5 w-5" />
                    {notificationsCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-extrabold text-white ring-2 ring-white">
                        {notificationsCount}
                      </span>
                    )}
                  </button>

                  {/* Dropdown Card */}
                  {notifDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-2xl p-2 z-50 animate-[slideIn_0.2s_ease-out]">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Notifications
                        </span>
                        {notificationsCount > 0 && (
                          <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full font-bold">
                            {notificationsCount} New
                          </span>
                        )}
                      </div>
                      <div className="max-h-64 overflow-y-auto custom-scrollbar py-1">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center text-xs text-slate-400">
                            No notifications yet
                          </div>
                        ) : (
                          notifications.map((notif) => {
                            const isUnread = !notif.readBy.includes(user.id);
                            return (
                              <div
                                key={notif.id}
                                onClick={() => isUnread && markAsRead(notif.id)}
                                className={`p-3 rounded-lg text-left transition-colors cursor-pointer text-xs mb-1 ${
                                  isUnread 
                                    ? 'bg-blue-50/50 hover:bg-blue-50 border-l-2 border-blue-500' 
                                    : 'hover:bg-slate-50 opacity-70'
                                }`}
                              >
                                <div className="flex justify-between items-start gap-1 font-bold text-slate-800 mb-0.5">
                                  <span>{notif.title}</span>
                                  {isUnread && <span className="h-1.5 w-1.5 bg-blue-500 rounded-full flex-shrink-0 mt-1"></span>}
                                </div>
                                <p className="text-slate-800 leading-relaxed text-[11px]">{notif.message}</p>
                                <span className="text-[9px] text-slate-400 mt-1 block">
                                  {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Details */}
                <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
                  <Link 
                    href={user.paymentStatus === 'paid' ? '/dashboard' : '/register'} 
                    className="flex flex-col text-right hover:opacity-80 transition-opacity cursor-pointer"
                  >
                    <span className="text-xs font-bold text-slate-800 max-w-[120px] truncate">{user.name}</span>
                    <span className="text-[10px] text-slate-455 capitalize hover:text-slate-500">{user.role.replace('-', ' ')}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                    title="Log Out"
                  >
                    <LogOut className="h-4.5 w-4.5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  className="text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-4 py-2 rounded-xl transition-all shadow-md shadow-blue-200 active:scale-[0.98] duration-200"
                >
                  Register Now
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="flex md:hidden items-center gap-3">
            {user && (
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800"
              >
                <Bell className="h-5 w-5" />
                {notificationsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-3.5 w-3.5 bg-blue-600 text-white font-extrabold rounded-full flex items-center justify-center text-[8px]">
                    {notificationsCount}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white p-4 flex flex-col gap-3 animate-[slideIn_0.2s_ease-out]">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
              pathname === '/' ? 'bg-slate-50 text-slate-900' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Home
          </Link>
          <Link
            href="/teams"
            onClick={() => setMobileMenuOpen(false)}
            className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
              pathname === '/teams' ? 'bg-slate-50 text-slate-900' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Public Teams
          </Link>
          {user && (
            <Link
              href={user.paymentStatus === 'paid' ? '/dashboard' : '/register'}
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${
                pathname.startsWith('/dashboard') || pathname.startsWith('/register') ? 'bg-slate-50 text-slate-900' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="h-4.5 w-4.5" />
              {user.paymentStatus === 'paid' ? 'Dashboard' : 'Payment Status'}
            </Link>
          )}

          {user ? (
            <div className="border-t border-slate-100 pt-3 mt-1 flex flex-col gap-2">
              <div className="flex items-center justify-between px-3 py-1">
                <Link 
                  href={user.paymentStatus === 'paid' ? '/dashboard' : '/register'} 
                  onClick={() => setMobileMenuOpen(false)} 
                  className="flex flex-col hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <span className="text-sm font-bold text-slate-800">{user.name}</span>
                  <span className="text-[10px] text-slate-450 capitalize">{user.role.replace('-', ' ')}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
                </button>
              </div>
            </div>
          ) : (
            <div className="border-t border-slate-100 pt-3 mt-1 flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 text-sm font-bold shadow-md transition-all"
              >
                Register Now
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
