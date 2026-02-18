import type { AgentName } from "./types/index.js";

export interface McpServerConfig {
  name: string;
  agentName: AgentName;
  version: string;
  description: string;
  tools: McpToolInfo[];
}

export interface McpToolInfo {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export const AGENT_CONFIGS: Record<AgentName, McpServerConfig> = {
  "profile-analyst": {
    name: "resume-parser",
    agentName: "profile-analyst",
    version: "0.1.0",
    description: "Parses resumes and LinkedIn profiles to extract structured profile data",
    tools: [
      {
        name: "parse_resume",
        description: "Parse a resume file (PDF/DOCX) and extract structured data",
        inputSchema: {
          type: "object",
          properties: {
            fileUrl: { type: "string", description: "URL to the resume file" },
            fileType: { type: "string", enum: ["pdf", "docx", "txt"], description: "File type" },
          },
          required: ["fileUrl", "fileType"],
        },
      },
      {
        name: "extract_skills",
        description: "Extract and categorize skills from text content",
        inputSchema: {
          type: "object",
          properties: {
            text: { type: "string", description: "Text content to extract skills from" },
          },
          required: ["text"],
        },
      },
      {
        name: "build_profile",
        description: "Build a comprehensive profile from parsed resume data",
        inputSchema: {
          type: "object",
          properties: {
            parsedData: { type: "object", description: "Raw parsed resume data" },
            userId: { type: "string", description: "User ID to associate profile with" },
          },
          required: ["parsedData", "userId"],
        },
      },
    ],
  },
  "market-researcher": {
    name: "job-search",
    agentName: "market-researcher",
    version: "0.1.0",
    description: "Searches job boards and analyzes market trends",
    tools: [
      {
        name: "search_jobs",
        description: "Search for job postings matching criteria",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Job search query" },
            location: { type: "string", description: "Location filter" },
            remote: { type: "boolean", description: "Remote only filter" },
            limit: { type: "number", description: "Max results" },
          },
          required: ["query"],
        },
      },
      {
        name: "analyze_market_trends",
        description: "Analyze market trends for specific skills or roles",
        inputSchema: {
          type: "object",
          properties: {
            skills: { type: "array", items: { type: "string" }, description: "Skills to analyze" },
            role: { type: "string", description: "Role title to analyze" },
          },
          required: ["skills"],
        },
      },
      {
        name: "get_salary_data",
        description: "Get salary data for a role and location",
        inputSchema: {
          type: "object",
          properties: {
            role: { type: "string", description: "Job role" },
            location: { type: "string", description: "Location" },
            experienceLevel: { type: "string", description: "Experience level" },
          },
          required: ["role"],
        },
      },
    ],
  },
  "match-scorer": {
    name: "match-scorer",
    agentName: "match-scorer",
    version: "0.1.0",
    description: "Scores profile-to-job fit using embeddings and rules",
    tools: [
      {
        name: "score_match",
        description: "Score how well a profile matches a job posting",
        inputSchema: {
          type: "object",
          properties: {
            profileId: { type: "string", description: "Profile ID" },
            jobId: { type: "string", description: "Job ID" },
          },
          required: ["profileId", "jobId"],
        },
      },
      {
        name: "identify_gaps",
        description: "Identify skill gaps between profile and job requirements",
        inputSchema: {
          type: "object",
          properties: {
            profileId: { type: "string", description: "Profile ID" },
            jobId: { type: "string", description: "Job ID" },
          },
          required: ["profileId", "jobId"],
        },
      },
      {
        name: "rank_jobs",
        description: "Rank multiple jobs by match score for a profile",
        inputSchema: {
          type: "object",
          properties: {
            profileId: { type: "string", description: "Profile ID" },
            jobIds: { type: "array", items: { type: "string" }, description: "Job IDs to rank" },
          },
          required: ["profileId", "jobIds"],
        },
      },
    ],
  },
  "resume-tailor": {
    name: "resume-tailor",
    agentName: "resume-tailor",
    version: "0.1.0",
    description: "Tailors resumes for specific job applications",
    tools: [
      {
        name: "tailor_resume",
        description: "Tailor a resume for a specific job posting",
        inputSchema: {
          type: "object",
          properties: {
            profileId: { type: "string", description: "Profile ID" },
            jobId: { type: "string", description: "Target job ID" },
            sections: {
              type: "array",
              items: { type: "string" },
              description: "Sections to tailor (summary, experience, skills)",
            },
          },
          required: ["profileId", "jobId"],
        },
      },
      {
        name: "optimize_keywords",
        description: "Optimize resume keywords for ATS systems",
        inputSchema: {
          type: "object",
          properties: {
            resumeText: { type: "string", description: "Current resume text" },
            jobDescription: { type: "string", description: "Target job description" },
          },
          required: ["resumeText", "jobDescription"],
        },
      },
      {
        name: "generate_summary",
        description: "Generate a professional summary tailored to a job",
        inputSchema: {
          type: "object",
          properties: {
            profileId: { type: "string", description: "Profile ID" },
            jobId: { type: "string", description: "Target job ID" },
            tone: { type: "string", enum: ["professional", "creative", "technical"], description: "Tone" },
          },
          required: ["profileId", "jobId"],
        },
      },
    ],
  },
  "interview-coach": {
    name: "interview-coach",
    agentName: "interview-coach",
    version: "0.1.0",
    description: "Generates interview questions and provides coaching",
    tools: [
      {
        name: "generate_questions",
        description: "Generate interview questions for a specific job",
        inputSchema: {
          type: "object",
          properties: {
            jobId: { type: "string", description: "Job ID" },
            type: {
              type: "string",
              enum: ["behavioral", "technical", "situational", "mixed"],
              description: "Question type",
            },
            count: { type: "number", description: "Number of questions" },
          },
          required: ["jobId"],
        },
      },
      {
        name: "evaluate_answer",
        description: "Evaluate a candidate's answer to an interview question",
        inputSchema: {
          type: "object",
          properties: {
            question: { type: "string", description: "The interview question" },
            answer: { type: "string", description: "Candidate's answer" },
            jobContext: { type: "string", description: "Job context for evaluation" },
          },
          required: ["question", "answer"],
        },
      },
      {
        name: "suggest_improvements",
        description: "Suggest improvements to an interview answer",
        inputSchema: {
          type: "object",
          properties: {
            question: { type: "string", description: "The interview question" },
            answer: { type: "string", description: "Candidate's answer" },
            evaluation: { type: "string", description: "Previous evaluation" },
          },
          required: ["question", "answer"],
        },
      },
    ],
  },
  orchestrator: {
    name: "orchestrator",
    agentName: "orchestrator",
    version: "0.1.0",
    description: "Routes tasks between agents and manages workflow state",
    tools: [],
  },
};
