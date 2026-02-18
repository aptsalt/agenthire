import { z } from "zod";

export const SkillGapSchema = z.object({
  skill: z.string(),
  required: z.boolean(),
  profileLevel: z.enum(["none", "beginner", "intermediate", "advanced", "expert"]),
  requiredLevel: z.enum(["beginner", "intermediate", "advanced", "expert"]),
  gapSeverity: z.enum(["none", "minor", "moderate", "major"]),
  suggestion: z.string(),
});

export const MatchScoreSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  jobId: z.string().uuid(),
  overallScore: z.number().min(0).max(100),
  skillMatchScore: z.number().min(0).max(100),
  experienceMatchScore: z.number().min(0).max(100),
  educationMatchScore: z.number().min(0).max(100),
  cultureFitScore: z.number().min(0).max(100),
  skillGaps: z.array(SkillGapSchema),
  strengths: z.array(z.string()),
  reasoning: z.string(),
  createdAt: z.string().datetime(),
});

export const MatchRankingSchema = z.object({
  matches: z.array(MatchScoreSchema),
  totalJobs: z.number(),
  averageScore: z.number(),
  topSkillGaps: z.array(z.string()),
});

export type SkillGap = z.infer<typeof SkillGapSchema>;
export type MatchScore = z.infer<typeof MatchScoreSchema>;
export type MatchRanking = z.infer<typeof MatchRankingSchema>;
