"use client";

import {
  Brain,
  Search,
  Target,
  FileText,
  MessageSquare,
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
} from "lucide-react";
import Link from "next/link";

const FEATURES = [
  {
    icon: Brain,
    title: "Profile Analysis",
    description:
      "AI agent deeply analyzes your skills, experience, and career trajectory to build a comprehensive profile.",
    color: "text-accent-purple",
    bgColor: "bg-accent-purple/10",
  },
  {
    icon: Search,
    title: "Market Research",
    description:
      "Autonomous agent scans job markets, identifies trends, and finds opportunities matching your profile.",
    color: "text-accent-cyan",
    bgColor: "bg-accent-cyan/10",
  },
  {
    icon: Target,
    title: "Match Scoring",
    description:
      "Precision matching algorithm scores jobs against your profile with detailed gap analysis.",
    color: "text-accent-green",
    bgColor: "bg-accent-green/10",
  },
  {
    icon: FileText,
    title: "Resume Tailoring",
    description:
      "Automatically tailors your resume for each target role, highlighting relevant experience.",
    color: "text-accent-blue",
    bgColor: "bg-accent-blue/10",
  },
  {
    icon: MessageSquare,
    title: "Interview Coaching",
    description:
      "AI coach prepares you with role-specific questions, behavioral scenarios, and technical drills.",
    color: "text-accent-orange",
    bgColor: "bg-accent-orange/10",
  },
  {
    icon: Zap,
    title: "Orchestrated Agents",
    description:
      "Six specialized agents coordinate through a LangGraph orchestrator to deliver end-to-end career support.",
    color: "text-accent-red",
    bgColor: "bg-accent-red/10",
  },
] as const;

const STATS = [
  { value: "6", label: "AI Agents" },
  { value: "100%", label: "Transparent" },
  { value: "<2s", label: "First Response" },
  { value: "24/7", label: "Available" },
] as const;

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-border-primary bg-bg-primary/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-blue to-accent-purple">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-text-primary">
              AgentHire
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="rounded-lg bg-gradient-to-r from-accent-blue to-accent-purple px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center px-6 pt-16">
        {/* Gradient orb backgrounds */}
        <div className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-accent-blue/5 blur-3xl" />
        <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-accent-purple/5 blur-3xl" />

        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border-primary bg-bg-secondary px-4 py-1.5 text-sm text-text-secondary">
            <Zap className="h-4 w-4 text-accent-orange" />
            Powered by 6 autonomous AI agents
          </div>

          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-text-primary sm:text-6xl lg:text-7xl">
            Your Career,{" "}
            <span className="gradient-text">Supercharged</span> by AI Agents
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-text-secondary sm:text-xl">
            A multi-agent AI system that analyzes your profile, researches
            markets, matches jobs, tailors resumes, and coaches you for
            interviews. All orchestrated, all transparent.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple px-8 py-3.5 text-base font-semibold text-white transition-all hover:shadow-lg hover:shadow-accent-blue/20"
            >
              Launch Dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#features"
              className="rounded-xl border border-border-primary bg-bg-secondary px-8 py-3.5 text-base font-semibold text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
            >
              See How It Works
            </a>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-20 grid max-w-lg grid-cols-2 gap-8 sm:grid-cols-4 sm:max-w-2xl">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold text-text-primary">
                  {stat.value}
                </div>
                <div className="text-sm text-text-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-text-primary sm:text-4xl">
              Six Agents, One Mission
            </h2>
            <p className="mx-auto max-w-2xl text-text-secondary">
              Each agent specializes in a critical phase of your career journey,
              working together through an intelligent orchestration layer.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-border-primary bg-bg-card p-6 transition-all hover:border-border-secondary hover:bg-bg-card-hover"
              >
                <div
                  className={`mb-4 inline-flex rounded-lg p-2.5 ${feature.bgColor}`}
                >
                  <feature.icon className={`h-5 w-5 ${feature.color}`} />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-text-primary">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-text-secondary">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture overview */}
      <section className="border-t border-border-primary px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-text-primary sm:text-4xl">
              Built for Transparency
            </h2>
            <p className="mx-auto max-w-2xl text-text-secondary">
              Watch every agent think, decide, and act in real-time. Full
              observability into the AI pipeline with human-in-the-loop
              checkpoints.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-border-primary bg-bg-card p-6">
              <Shield className="mb-3 h-6 w-6 text-accent-green" />
              <h3 className="mb-2 font-semibold text-text-primary">
                Human-in-the-Loop
              </h3>
              <p className="text-sm text-text-secondary">
                Approve critical decisions before agents act. You stay in control
                at every checkpoint.
              </p>
            </div>
            <div className="rounded-xl border border-border-primary bg-bg-card p-6">
              <BarChart3 className="mb-3 h-6 w-6 text-accent-blue" />
              <h3 className="mb-2 font-semibold text-text-primary">
                Full Observability
              </h3>
              <p className="text-sm text-text-secondary">
                Token usage, latency, agent traces, and quality metrics. Track
                everything through OpenTelemetry.
              </p>
            </div>
            <div className="rounded-xl border border-border-primary bg-bg-card p-6">
              <Zap className="mb-3 h-6 w-6 text-accent-orange" />
              <h3 className="mb-2 font-semibold text-text-primary">
                Real-time Streaming
              </h3>
              <p className="text-sm text-text-secondary">
                SSE-powered event stream shows agent reasoning as it happens. No
                black boxes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border-primary bg-gradient-to-br from-bg-card to-bg-secondary p-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-text-primary">
            Ready to Transform Your Job Search?
          </h2>
          <p className="mb-8 text-text-secondary">
            Let six AI agents work together to find your perfect role. Start in
            seconds.
          </p>
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple px-8 py-3.5 text-base font-semibold text-white transition-all hover:shadow-lg hover:shadow-accent-blue/20"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-primary px-6 py-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-accent-blue to-accent-purple">
              <Brain className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-text-primary">
              AgentHire
            </span>
          </div>
          <p className="text-sm text-text-muted">
            Built with LangGraph, Next.js, and Supabase
          </p>
        </div>
      </footer>
    </div>
  );
}
