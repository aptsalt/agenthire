"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Brain,
  Search,
  Target,
  FileText,
  MessageSquare,
  Zap,
  Clock,
  TrendingUp,
  Users,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
import { AgentGraph } from "@/components/agent-flow/agent-graph";
import { ChatPanel } from "@/components/chat/chat-panel";
import { useAppStore } from "@/lib/store";
import type { AgentName, AgentStatus } from "@agenthire/shared";

const AGENT_DISPLAY: Record<
  AgentName,
  { label: string; icon: typeof Brain; color: string; href?: string }
> = {
  "profile-analyst": {
    label: "Profile Analyst",
    icon: Brain,
    color: "text-accent-purple",
    href: "/dashboard/profiles",
  },
  "market-researcher": {
    label: "Market Researcher",
    icon: Search,
    color: "text-accent-cyan",
    href: "/dashboard/jobs",
  },
  "match-scorer": {
    label: "Match Scorer",
    icon: Target,
    color: "text-accent-green",
    href: "/dashboard/matches",
  },
  "resume-tailor": {
    label: "Resume Tailor",
    icon: FileText,
    color: "text-accent-blue",
    href: "/dashboard/matches",
  },
  "interview-coach": {
    label: "Interview Coach",
    icon: MessageSquare,
    color: "text-accent-orange",
    href: "/dashboard/interview-prep",
  },
  orchestrator: {
    label: "Orchestrator",
    icon: Zap,
    color: "text-accent-red",
  },
};

const STATUS_STYLES: Record<AgentStatus, { bg: string; text: string; dot: string }> = {
  idle: { bg: "bg-agent-idle/10", text: "text-agent-idle", dot: "bg-agent-idle" },
  thinking: { bg: "bg-agent-thinking/10", text: "text-agent-thinking", dot: "bg-agent-thinking" },
  executing: { bg: "bg-agent-executing/10", text: "text-agent-executing", dot: "bg-agent-executing" },
  "waiting-for-human": { bg: "bg-agent-waiting/10", text: "text-agent-waiting", dot: "bg-agent-waiting" },
  error: { bg: "bg-agent-error/10", text: "text-agent-error", dot: "bg-agent-error" },
  complete: { bg: "bg-agent-complete/10", text: "text-agent-complete", dot: "bg-agent-complete" },
};

function AgentStatusCard({
  agentName,
  status,
  onClick,
}: {
  agentName: AgentName;
  status: AgentStatus;
  onClick?: () => void;
}) {
  const display = AGENT_DISPLAY[agentName];
  const statusStyle = STATUS_STYLES[status];
  const Icon = display.icon;
  const isClickable = !!onClick;

  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      className={`group rounded-xl border border-border-primary bg-bg-card p-4 text-left transition-all duration-200 hover:border-border-secondary hover:bg-bg-card-hover ${isClickable ? "cursor-pointer" : "cursor-default"}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-1.5 ${statusStyle.bg}`}>
            <Icon className={`h-4 w-4 ${display.color}`} />
          </div>
          <span className="text-sm font-medium text-text-primary">
            {display.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${statusStyle.bg} ${statusStyle.text}`}
          >
            <div
              className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot} ${
                status === "thinking" || status === "executing"
                  ? "animate-pulse"
                  : ""
              }`}
            />
            {status}
          </div>
          {isClickable && (
            <ArrowUpRight className="h-3.5 w-3.5 text-text-muted opacity-0 transition-all duration-200 group-hover:opacity-100" />
          )}
        </div>
      </div>
    </button>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { agentStatuses, events, initializeMockData } = useAppStore();

  useEffect(() => {
    initializeMockData();
  }, [initializeMockData]);

  const recentEvents = events.slice(-5).reverse();
  const agentEntries = Object.entries(agentStatuses) as [AgentName, AgentStatus][];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Monitor your AI agents and career pipeline
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border-primary bg-bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent-blue/10 p-2">
              <Users className="h-5 w-5 text-accent-blue" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">6</p>
              <p className="text-xs text-text-muted">Active Agents</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border-primary bg-bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent-green/10 p-2">
              <Target className="h-5 w-5 text-accent-green" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">24</p>
              <p className="text-xs text-text-muted">Jobs Matched</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border-primary bg-bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent-purple/10 p-2">
              <TrendingUp className="h-5 w-5 text-accent-purple" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">87%</p>
              <p className="text-xs text-text-muted">Avg Match Score</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border-primary bg-bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent-orange/10 p-2">
              <Clock className="h-5 w-5 text-accent-orange" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">1.2s</p>
              <p className="text-xs text-text-muted">Avg Response</p>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Status Grid */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-text-primary">
          Agent Status
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {agentEntries.map(([name, status]) => {
            const display = AGENT_DISPLAY[name];
            return (
              <AgentStatusCard
                key={name}
                agentName={name}
                status={status}
                onClick={
                  display.href
                    ? () => router.push(display.href!)
                    : undefined
                }
              />
            );
          })}
        </div>
      </div>

      {/* Main content - Graph + Chat */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Agent Graph */}
        <div className="overflow-hidden rounded-xl border border-border-primary bg-bg-card">
          <div className="border-b border-border-primary px-5 py-3">
            <h2 className="text-sm font-semibold text-text-primary">
              Agent Orchestration Graph
            </h2>
          </div>
          <div className="h-[360px] lg:h-[420px]">
            <AgentGraph />
          </div>
        </div>

        {/* Chat Panel */}
        <div className="overflow-hidden rounded-xl border border-border-primary bg-bg-card">
          <div className="border-b border-border-primary px-5 py-3">
            <h2 className="text-sm font-semibold text-text-primary">
              Agent Chat
            </h2>
          </div>
          <div className="h-[360px] lg:h-[420px]">
            <ChatPanel />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-text-primary">
          Recent Activity
        </h2>
        <div className="overflow-hidden rounded-xl border border-border-primary bg-bg-card">
          {recentEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-muted">
              <Clock className="mb-2 h-8 w-8" />
              <p className="text-sm">No activity yet. Start a conversation!</p>
            </div>
          ) : (
            <ul className="divide-y divide-border-primary">
              {recentEvents.map((event) => {
                const agentDisplay = AGENT_DISPLAY[event.agentName];
                const eventHref = agentDisplay.href;
                return (
                  <li
                    key={event.id}
                    onClick={
                      eventHref
                        ? () => router.push(eventHref)
                        : undefined
                    }
                    className={`flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-bg-card-hover/50 ${eventHref ? "cursor-pointer" : ""}`}
                  >
                    <div className="mt-0.5 rounded-lg bg-bg-tertiary p-1.5">
                      <agentDisplay.icon
                        className={`h-4 w-4 ${agentDisplay.color}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-text-primary">
                          {agentDisplay.label}
                        </span>
                        <span className="rounded-md bg-bg-tertiary px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                          {event.type}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-text-secondary">
                        {event.content}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <time className="text-[11px] tabular-nums text-text-muted">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </time>
                      {eventHref && (
                        <ArrowUpRight className="h-3.5 w-3.5 text-text-muted" />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-text-primary">
          Quick Actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Analyze Profile",
              icon: Brain,
              desc: "Run profile analysis",
              href: "/dashboard/profiles",
              color: "text-accent-purple",
              bg: "bg-accent-purple/10",
            },
            {
              label: "Search Jobs",
              icon: Search,
              desc: "Find matching opportunities",
              href: "/dashboard/jobs",
              color: "text-accent-cyan",
              bg: "bg-accent-cyan/10",
            },
            {
              label: "Tailor Resume",
              icon: FileText,
              desc: "Customize for a role",
              href: "/dashboard/matches",
              color: "text-accent-blue",
              bg: "bg-accent-blue/10",
            },
            {
              label: "Practice Interview",
              icon: MessageSquare,
              desc: "Start mock interview",
              href: "/dashboard/interview-prep",
              color: "text-accent-orange",
              bg: "bg-accent-orange/10",
            },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => router.push(action.href)}
              className="group flex items-center gap-3 rounded-xl border border-border-primary bg-bg-card p-4 text-left transition-all duration-200 hover:border-border-secondary hover:bg-bg-card-hover"
            >
              <div className={`rounded-lg p-2 ${action.bg} transition-colors`}>
                <action.icon className={`h-5 w-5 ${action.color}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">
                  {action.label}
                </p>
                <p className="text-xs text-text-muted">{action.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-text-muted opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
