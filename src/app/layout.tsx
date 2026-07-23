import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { SocketProvider } from "../context/SocketContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import VisitorTracker from "../components/VisitorTracker";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CodeSprint-2026 | 8-Hours National Level Hackathon",
  description: "Register for CodeSprint-2026, an 8-Hours National Level Hackathon organized by Audisankara (Deemed to be University). Build working prototypes and compete for ₹2,00,000 cash prizes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-800 antialiased selection:bg-purple-100 selection:text-purple-900">
        <AuthProvider>
          <SocketProvider>
            <VisitorTracker />
            <Navbar />
            <div className="flex-1 flex flex-col overflow-x-hidden">
              {children}
            </div>
            <Footer />
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
