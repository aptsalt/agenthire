import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OLLAMA_BASE_URL = process.env["OLLAMA_BASE_URL"] ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env["OLLAMA_MODEL"] ?? "qwen2.5-coder:14b";

const SYSTEM_PROMPT = `You are a resume parser. Extract structured data from the resume text below.
Respond with ONLY a valid JSON object matching this exact schema — no markdown fences, no explanation, just JSON:
{
  "name": "Full Name",
  "email": "email@example.com",
  "title": "Professional Title",
  "summary": "2-3 sentence professional summary",
  "location": "City, State",
  "skills": [
    {
      "name": "Skill Name",
      "category": "technical|soft|domain|tool|language",
      "level": "beginner|intermediate|advanced|expert",
      "yearsOfExperience": 3
    }
  ],
  "experience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD or null if current",
      "current": false,
      "description": "Role description",
      "highlights": ["Achievement 1", "Achievement 2"],
      "skills": ["Skill1", "Skill2"]
    }
  ],
  "education": [
    {
      "institution": "University Name",
      "degree": "Degree Type",
      "field": "Field of Study",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "gpa": 3.8
    }
  ]
}

Rules:
- For skills, infer category and level from context clues in the resume
- Use ISO date format (YYYY-MM-DD). If only a year is given, use YYYY-01-01
- Set "current" to true and "endDate" to null for present/current positions
- Extract all skills mentioned anywhere in the resume
- If email is not found, use an empty string
- If a field cannot be determined, use a reasonable default`;

interface OllamaResponse {
  model: string;
  message: { content: string };
}

function extractJSON(text: string): Record<string, unknown> | null {
  const fenceMatch = /```json\s*([\s\S]*?)\s*```/.exec(text);
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1]) as Record<string, unknown>;
    } catch {
      // fall through
    }
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
    } catch {
      // fall through
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { text?: string };
    const text = body.text;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "Resume text is required" },
        { status: 400 },
      );
    }

    if (text.length > 512_000) {
      return NextResponse.json(
        { error: "Resume text exceeds 500KB limit" },
        { status: 400 },
      );
    }

    let response: Response;
    try {
      response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Parse this resume:\n\n${text}` },
          ],
          stream: false,
          options: {
            temperature: 0.1,
            num_predict: 4096,
          },
        }),
      });
    } catch {
      return NextResponse.json(
        { error: "Local AI (Ollama) is not running. Start Ollama and try again." },
        { status: 503 },
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Ollama error: ${errorText}` },
        { status: 502 },
      );
    }

    const data = (await response.json()) as OllamaResponse;
    const parsed = extractJSON(data.message.content);

    if (!parsed) {
      return NextResponse.json(
        { error: "Could not parse resume into structured data. Try a different format." },
        { status: 422 },
      );
    }

    const now = new Date().toISOString();
    const profile = {
      id: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      name: String(parsed["name"] ?? ""),
      email: String(parsed["email"] ?? ""),
      title: String(parsed["title"] ?? ""),
      summary: String(parsed["summary"] ?? ""),
      location: parsed["location"] ? String(parsed["location"]) : undefined,
      skills: Array.isArray(parsed["skills"]) ? parsed["skills"] : [],
      experience: Array.isArray(parsed["experience"]) ? parsed["experience"] : [],
      education: Array.isArray(parsed["education"]) ? parsed["education"] : [],
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json({ profile });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
