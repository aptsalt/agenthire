import { z } from "zod";

export const SkillSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["technical", "soft", "domain", "tool", "language"]),
  level: z.enum(["beginner", "intermediate", "advanced", "expert"]),
  yearsOfExperience: z.number().min(0).optional(),
});

export const ExperienceSchema = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  startDate: z.string(),
  endDate: z.string().optional(),
  current: z.boolean().default(false),
  description: z.string(),
  highlights: z.array(z.string()),
  skills: z.array(z.string()),
});

export const EducationSchema = z.object({
  institution: z.string().min(1),
  degree: z.string().min(1),
  field: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),
  gpa: z.number().optional(),
});

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  title: z.string(),
  summary: z.string(),
  location: z.string().optional(),
  skills: z.array(SkillSchema),
  experience: z.array(ExperienceSchema),
  education: z.array(EducationSchema),
  linkedinUrl: z.string().url().optional(),
  portfolioUrl: z.string().url().optional(),
  resumeFileUrl: z.string().optional(),
  embedding: z.array(z.number()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateProfileSchema = ProfileSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  embedding: true,
});

export type Skill = z.infer<typeof SkillSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type CreateProfile = z.infer<typeof CreateProfileSchema>;
