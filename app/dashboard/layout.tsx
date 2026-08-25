"use client";

import { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { VoiceMicButton } from "@/components/voice/VoiceMicButton";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import Link from "next/link";
import { DashboardSearchProvider } from "@/hooks/useDashboardSearch";
import { useContextLocation } from "@/hooks/useContextLocation";
import { PwaStatus } from "@/components/dashboard/PwaStatus";
import { NotificationAnnouncer } from "@/components/dashboard/NotificationAnnouncer";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { isRecording, isProcessing } = useSelector((s: RootState) => s.voice);
  const { startRecording, stopRecording } = useVoiceRecorder();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useSocket(user?.id);
  useContextLocation(Boolean(user));

  return (
    <div className="min-h-screen bg-slate-900">
      <a href="#main-content" className="sr-only z-[100] rounded-md bg-white px-4 py-2 text-slate-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to main content</a>
      <Sidebar userName={user?.name} onLogout={logout} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="md:pl-60">
        <DashboardSearchProvider>
          <Header onMenuOpen={() => setSidebarOpen(true)} />
          <main id="main-content" tabIndex={-1} className="p-4 pb-28 outline-none md:p-8">{children}</main>
        </DashboardSearchProvider>
      </div>

      <PwaStatus />
      <NotificationAnnouncer />
      <div className="fixed bottom-4 right-4 z-50 md:bottom-8 md:right-8">
        <Link href="/dashboard/voice" aria-label="Open voice assistant">
          <VoiceMicButton
            isRecording={isRecording}
            isProcessing={isProcessing}
            onClick={() => (isRecording ? stopRecording() : startRecording())}
          />
        </Link>
      </div>
    </div>
  );
}
