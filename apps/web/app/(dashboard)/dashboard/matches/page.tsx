"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Star,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { MatchScore, Job } from "@agenthire/shared";

function ScoreRing({
  score,
  size = 56,
  strokeWidth = 4,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 85
      ? "text-accent-green"
      : score >= 70
        ? "text-accent-blue"
        : score >= 50
          ? "text-accent-orange"
          : "text-accent-red";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-bg-tertiary"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={color}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-text-primary">
        {score}
      </span>
    </div>
  );
}

function MatchCard({
  match,
  job,
}: {
  match: MatchScore;
  job: Job | undefined;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!job) return null;

  return (
    <div className="rounded-xl border border-border-primary bg-bg-card transition-all duration-200 hover:border-border-secondary">
      <div className="p-5">
        <div className="flex items-start gap-5">
          <ScoreRing score={match.overallScore} />
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-text-primary">
              {job.title}
            </h3>
            <p className="text-sm text-accent-blue">{job.company}</p>
            <p className="mt-2 text-xs leading-relaxed text-text-secondary">
              {match.reasoning}
            </p>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="mt-4 grid grid-cols-4 gap-3">
          {[
            { label: "Skills", score: match.skillMatchScore, color: "bg-accent-blue" },
            { label: "Experience", score: match.experienceMatchScore, color: "bg-accent-purple" },
            { label: "Education", score: match.educationMatchScore, color: "bg-accent-cyan" },
            { label: "Culture", score: match.cultureFitScore, color: "bg-accent-green" },
          ].map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-text-muted">{item.label}</span>
                <span className="font-medium text-text-secondary">
                  {item.score}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-bg-tertiary">
                <div
                  className={`h-1.5 rounded-full ${item.color} transition-all`}
                  style={{ width: `${item.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div className="expand-enter mt-4 space-y-4 border-t border-border-primary pt-4">
            {/* Strengths */}
            {match.strengths.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-accent-green">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Strengths
                </h4>
                <ul className="space-y-1">
                  {match.strengths.map((s, i) => (
                    <li key={i} className="text-xs text-text-secondary">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Skill Gaps */}
            {match.skillGaps.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-accent-orange">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Skill Gaps
                </h4>
                <div className="space-y-2">
                  {match.skillGaps.map((gap, i) => (
                    <div
                      key={i}
                      className="rounded-lg bg-bg-tertiary p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-text-primary">
                          {gap.skill}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            gap.gapSeverity === "critical"
                              ? "bg-accent-red/10 text-accent-red"
                              : gap.gapSeverity === "moderate"
                                ? "bg-accent-orange/10 text-accent-orange"
                                : "bg-accent-blue/10 text-accent-blue"
                          }`}
                        >
                          {gap.gapSeverity}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-text-muted">
                        {gap.profileLevel} → {gap.requiredLevel}
                      </p>
                      {gap.suggestion && (
                        <p className="mt-1.5 text-xs text-text-secondary">
                          {gap.suggestion}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border-primary px-5 py-3">
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="flex items-center gap-1 text-xs font-medium text-accent-blue transition-colors hover:text-accent-blue-hover"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" /> Less Details
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" /> More Details
            </>
          )}
        </button>
        <div className="flex gap-2">
          <button className="rounded-lg border border-border-primary bg-bg-tertiary px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-card-hover">
            Tailor Resume
          </button>
          <button className="rounded-lg bg-accent-blue px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-blue-hover">
            Prep Interview
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MatchesPage() {
  const router = useRouter();
  const { matches, jobs } = useAppStore();

  const jobMap = new Map(jobs.map((j) => [j.id, j]));
  const sortedMatches = [...matches].sort(
    (a, b) => b.overallScore - a.overallScore,
  );

  const avgScore =
    matches.length > 0
      ? Math.round(
          matches.reduce((sum, m) => sum + m.overallScore, 0) / matches.length,
        )
      : 0;

  const topMatch = sortedMatches[0];
  const gapCount = matches.reduce(
    (sum, m) => sum + m.skillGaps.length,
    0,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Matches</h1>
        <p className="mt-1 text-sm text-text-secondary">
          AI-scored job matches with detailed analysis
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border-primary bg-bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent-blue/10 p-2">
              <Target className="h-5 w-5 text-accent-blue" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">
                {matches.length}
              </p>
              <p className="text-xs text-text-muted">Total Matches</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border-primary bg-bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent-green/10 p-2">
              <TrendingUp className="h-5 w-5 text-accent-green" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">
                {avgScore}%
              </p>
              <p className="text-xs text-text-muted">Avg Score</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border-primary bg-bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent-purple/10 p-2">
              <Star className="h-5 w-5 text-accent-purple" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">
                {topMatch ? `${topMatch.overallScore}%` : "--"}
              </p>
              <p className="text-xs text-text-muted">Top Match</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border-primary bg-bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent-orange/10 p-2">
              <AlertTriangle className="h-5 w-5 text-accent-orange" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">
                {gapCount}
              </p>
              <p className="text-xs text-text-muted">Skill Gaps</p>
            </div>
          </div>
        </div>
      </div>

      {/* Match List */}
      {sortedMatches.length > 0 ? (
        <div className="space-y-4">
          {sortedMatches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              job={jobMap.get(match.jobId)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-secondary py-20">
          <Target className="mb-3 h-8 w-8 text-text-muted" />
          <h3 className="text-lg font-medium text-text-primary">
            No matches yet
          </h3>
          <p className="mt-2 max-w-sm text-center text-sm text-text-secondary">
            Upload your profile and search for jobs to get AI-powered match
            scores.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-6 rounded-lg bg-accent-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-blue-hover"
          >
            Go to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
