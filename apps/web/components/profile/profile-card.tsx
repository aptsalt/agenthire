"use client";

import { MapPin, ExternalLink, Briefcase, GraduationCap } from "lucide-react";
import type { Profile } from "@agenthire/shared";

const SKILL_LEVEL_COLORS: Record<string, string> = {
  beginner: "border-agent-idle/40 text-agent-idle bg-agent-idle/10",
  intermediate: "border-accent-blue/40 text-accent-blue bg-accent-blue/10",
  advanced: "border-accent-purple/40 text-accent-purple bg-accent-purple/10",
  expert: "border-accent-green/40 text-accent-green bg-accent-green/10",
};

const SKILL_CATEGORY_COLORS: Record<string, string> = {
  technical: "bg-accent-blue/10 text-accent-blue",
  soft: "bg-accent-green/10 text-accent-green",
  domain: "bg-accent-purple/10 text-accent-purple",
  tool: "bg-accent-orange/10 text-accent-orange",
  language: "bg-accent-cyan/10 text-accent-cyan",
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function ProfileCard({ profile }: { profile: Profile }) {
  return (
    <div className="rounded-xl border border-border-primary bg-bg-card">
      {/* Header */}
      <div className="border-b border-border-primary p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-text-primary">
              {profile.name}
            </h2>
            <p className="mt-1 text-sm text-accent-blue">{profile.title}</p>
            {profile.location && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-text-muted">
                <MapPin className="h-3.5 w-3.5" />
                {profile.location}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {profile.linkedinUrl && (
              <a
                href={profile.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-primary text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-secondary"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
        {profile.summary && (
          <p className="mt-4 text-sm leading-relaxed text-text-secondary">
            {profile.summary}
          </p>
        )}
      </div>

      {/* Skills */}
      <div className="border-b border-border-primary p-6">
        <h3 className="mb-3 text-sm font-semibold text-text-primary">
          Skills
        </h3>
        <div className="flex flex-wrap gap-2">
          {profile.skills.map((skill) => (
            <span
              key={skill.name}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                SKILL_LEVEL_COLORS[skill.level] ?? SKILL_LEVEL_COLORS["beginner"]
              }`}
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  SKILL_CATEGORY_COLORS[skill.category]
                    ?.split(" ")
                    .find((c) => c.startsWith("bg-")) ?? "bg-text-muted"
                }`}
              />
              {skill.name}
              {skill.yearsOfExperience != null && (
                <span className="text-text-muted">
                  {skill.yearsOfExperience}y
                </span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Experience Timeline */}
      <div className="border-b border-border-primary p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Briefcase className="h-4 w-4 text-text-muted" />
          Experience
        </h3>
        <div className="space-y-4">
          {profile.experience.map((exp, index) => (
            <div key={`${exp.company}-${exp.title}-${index}`} className="relative pl-6">
              {/* Timeline line */}
              {index < profile.experience.length - 1 && (
                <div className="absolute left-[7px] top-6 h-[calc(100%+1rem)] w-px bg-border-primary" />
              )}
              {/* Timeline dot */}
              <div
                className={`absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 ${
                  exp.current
                    ? "border-accent-green bg-accent-green/20"
                    : "border-border-secondary bg-bg-secondary"
                }`}
              />

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-text-primary">
                    {exp.title}
                  </h4>
                  {exp.current && (
                    <span className="rounded-full bg-accent-green/10 px-2 py-0.5 text-[10px] font-medium text-accent-green">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-xs text-accent-blue">{exp.company}</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  {formatDate(exp.startDate)} &mdash;{" "}
                  {exp.endDate ? formatDate(exp.endDate) : "Present"}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                  {exp.description}
                </p>
                {exp.highlights.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {exp.highlights.map((highlight, hIndex) => (
                      <li
                        key={hIndex}
                        className="text-xs text-text-secondary before:mr-2 before:text-text-muted before:content-['->']"
                      >
                        {highlight}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Education */}
      {profile.education.length > 0 && (
        <div className="p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
            <GraduationCap className="h-4 w-4 text-text-muted" />
            Education
          </h3>
          <div className="space-y-3">
            {profile.education.map((edu, index) => (
              <div key={`${edu.institution}-${index}`}>
                <h4 className="text-sm font-medium text-text-primary">
                  {edu.degree} in {edu.field}
                </h4>
                <p className="text-xs text-accent-blue">{edu.institution}</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  {formatDate(edu.startDate)} &mdash;{" "}
                  {edu.endDate ? formatDate(edu.endDate) : "Present"}
                  {edu.gpa != null && ` | GPA: ${edu.gpa}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
