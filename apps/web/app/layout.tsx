import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AgentHire - AI-Powered Career Platform",
  description:
    "Multi-agent AI system that analyzes profiles, researches markets, matches jobs, tailors resumes, and coaches interviews.",
  keywords: ["AI", "career", "agents", "job matching", "resume", "interview"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="min-h-screen bg-bg-primary font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
