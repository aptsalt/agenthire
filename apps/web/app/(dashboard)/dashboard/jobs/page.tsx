"use client";

import { useState } from "react";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  Search,
  Filter,
  Wifi,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { Job } from "@agenthire/shared";

const EXP_LEVEL_BADGE: Record<string, string> = {
  junior: "bg-accent-green/10 text-accent-green",
  mid: "bg-accent-blue/10 text-accent-blue",
  senior: "bg-accent-purple/10 text-accent-purple",
  lead: "bg-accent-orange/10 text-accent-orange",
  executive: "bg-accent-red/10 text-accent-red",
};

function formatSalary(min?: number, max?: number, currency?: string): string {
  if (!min && !max) return "Not specified";
  const fmt = (n: number) =>
    `${currency === "USD" ? "$" : ""}${(n / 1000).toFixed(0)}K`;
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

function JobCard({ job }: { job: Job }) {
  const [expanded, setExpanded] = useState(false);
  const expStyle =
    EXP_LEVEL_BADGE[job.experienceLevel] ?? EXP_LEVEL_BADGE["mid"];

  return (
    <div className="rounded-xl border border-border-primary bg-bg-card transition-all duration-200 hover:border-border-secondary">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-text-primary">
              {job.title}
            </h3>
            <p className="mt-1 text-sm font-medium text-accent-blue">
              {job.company}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-muted">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {job.location}
              </span>
              {job.remote && (
                <span className="flex items-center gap-1 text-accent-green">
                  <Wifi className="h-3.5 w-3.5" />
                  Remote
                </span>
              )}
              <span className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {job.employmentType}
              </span>
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${expStyle}`}
          >
            {job.experienceLevel}
          </span>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          {job.description}
        </p>

        {/* Skills */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-border-primary bg-bg-tertiary px-2.5 py-0.5 text-xs text-text-secondary"
            >
              {skill}
            </span>
          ))}
        </div>

        {/* Expandable details */}
        {expanded && (
          <div className="expand-enter mt-4 space-y-3 border-t border-border-primary pt-4">
            {job.requirements.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold text-text-primary">
                  Requirements
                </h4>
                <ul className="space-y-1">
                  {job.requirements.map((req, i) => (
                    <li
                      key={i}
                      className="text-xs text-text-secondary before:mr-2 before:text-accent-blue before:content-['->']"
                    >
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {job.niceToHaves && job.niceToHaves.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold text-text-primary">
                  Nice to Have
                </h4>
                <ul className="space-y-1">
                  {job.niceToHaves.map((item, i) => (
                    <li
                      key={i}
                      className="text-xs text-text-secondary before:mr-2 before:text-accent-purple before:content-['->']"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border-primary px-5 py-3">
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="text-xs font-medium text-accent-blue transition-colors hover:text-accent-blue-hover"
        >
          {expanded ? "Show Less" : "View Details"}
        </button>
        <div className="flex gap-2">
          <span className="text-xs text-text-muted">
            Posted {new Date(job.postedDate).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function JobsPage() {
  const { jobs } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredJobs = jobs.filter(
    (job) =>
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.skills.some((s) =>
        s.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Jobs</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Browse and filter matched job opportunities
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search by title, company, or skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border-primary bg-bg-card py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder-text-muted outline-none transition-colors focus:border-accent-blue"
          />
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-border-primary bg-bg-card px-4 py-2.5 text-sm text-text-secondary transition-colors hover:bg-bg-card-hover">
          <Filter className="h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Results count */}
      <p className="text-xs text-text-muted">
        {filteredJobs.length} job{filteredJobs.length !== 1 ? "s" : ""} found
      </p>

      {/* Job List */}
      {filteredJobs.length > 0 ? (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-secondary py-20">
          <Briefcase className="mb-3 h-8 w-8 text-text-muted" />
          <h3 className="text-lg font-medium text-text-primary">
            No jobs found
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            {searchQuery
              ? "Try adjusting your search terms"
              : "Start a conversation to search for jobs"}
          </p>
        </div>
      )}
    </div>
  );
}
