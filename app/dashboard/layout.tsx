"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { VoiceMicButton } from "@/components/voice/VoiceMicButton";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { isRecording, isProcessing } = useSelector((s: RootState) => s.voice);
  const { startRecording, stopRecording } = useVoiceRecorder();

  useSocket(user?.id);

  return (
    <div className="min-h-screen bg-slate-900">
      <Sidebar userName={user?.name} onLogout={logout} />
      <div className="pl-60">
        <Header unreadCount={0} />
        <main className="p-8">{children}</main>
      </div>

      <div className="fixed bottom-8 right-8 z-50">
        <Link href="/dashboard/voice">
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
