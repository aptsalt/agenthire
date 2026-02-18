import { z } from "zod";

export const JobSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string(),
  remote: z.boolean().default(false),
  description: z.string(),
  requirements: z.array(z.string()),
  niceToHaves: z.array(z.string()),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  salaryCurrency: z.string().default("USD"),
  experienceLevel: z.enum(["entry", "mid", "senior", "lead", "executive"]),
  employmentType: z.enum(["full-time", "part-time", "contract", "freelance", "internship"]),
  skills: z.array(z.string()),
  postedDate: z.string().datetime(),
  sourceUrl: z.string().url().optional(),
  source: z.string(),
  embedding: z.array(z.number()).optional(),
  createdAt: z.string().datetime(),
});

export const JobSearchParamsSchema = z.object({
  query: z.string().min(1),
  location: z.string().optional(),
  remote: z.boolean().optional(),
  experienceLevel: z.enum(["entry", "mid", "senior", "lead", "executive"]).optional(),
  salaryMin: z.number().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export const MarketTrendSchema = z.object({
  skill: z.string(),
  demandScore: z.number().min(0).max(100),
  growthRate: z.number(),
  averageSalary: z.number(),
  jobCount: z.number(),
  trendDirection: z.enum(["rising", "stable", "declining"]),
});

export type Job = z.infer<typeof JobSchema>;
export type JobSearchParams = z.infer<typeof JobSearchParamsSchema>;
export type MarketTrend = z.infer<typeof MarketTrendSchema>;
