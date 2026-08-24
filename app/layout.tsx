import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/store/providers";
import { PageTransition } from "@/components/ui/PageTransition";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: "VoiceTasker AI — Manage your day by voice",
  description:
    "Speak a task naturally and let VoiceTasker AI understand the intent, set the deadline, and keep your priorities moving.",
  applicationName: "VoiceTasker AI",
  category: "productivity",
  keywords: ["voice task management", "AI task manager", "productivity", "voice assistant"],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
  openGraph: {
    title: "VoiceTasker AI — Manage your day by voice",
    description:
      "Voice-first task management for busy days. Capture tasks, understand intent, and keep priorities moving.",
    type: "website",
    siteName: "VoiceTasker AI",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "VoiceTasker AI — Manage your day by voice",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VoiceTasker AI — Manage your day by voice",
    description: "Voice-first task management for busy days.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VoiceTasker AI",
  },
};

export const viewport: Viewport = {
  themeColor: "#7C3AED",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-slate-900 text-slate-50">
        <Providers>
          <PageTransition>{children}</PageTransition>
        </Providers>
      </body>
    </html>
  );
}
