import { BottomNav } from "@/components/ui/bottom-nav";
import { ImpersonationBanner } from "@/components/features/ImpersonationBanner";
import { OnboardingTutorialLoader } from "@/components/features/OnboardingTutorialLoader";
import { PageTransition } from "@/components/features/PageTransition";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { WorkoutSessionProvider } from "@/contexts/workout-session-context";
import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-visual",
};

export const metadata: Metadata = {
  title: "LogEveryLift",
  description: "Track your workouts with intelligent progress monitoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash of light mode — runs before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var s=localStorage.getItem('theme');if(s!=='light'){document.documentElement.classList.add('dark')}})()`,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased pb-nav-safe`}
      >
        <ThemeProvider>
          <ImpersonationBanner />
          <WorkoutSessionProvider>
            <PageTransition>{children}</PageTransition>
            <BottomNav />
            <Suspense fallback={null}>
              <OnboardingTutorialLoader />
            </Suspense>
          </WorkoutSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
