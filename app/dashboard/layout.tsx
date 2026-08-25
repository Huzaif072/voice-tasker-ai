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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { isRecording, isProcessing } = useSelector((s: RootState) => s.voice);
  const { startRecording, stopRecording } = useVoiceRecorder();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useSocket(user?.id);
  useContextLocation(Boolean(user));

  return (
    <div className="min-h-screen bg-slate-900">
      <Sidebar userName={user?.name} onLogout={logout} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="md:pl-60">
        <DashboardSearchProvider>
          <Header onMenuOpen={() => setSidebarOpen(true)} />
          <main className="p-4 pb-28 md:p-8">{children}</main>
        </DashboardSearchProvider>
      </div>

      <PwaStatus />
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
