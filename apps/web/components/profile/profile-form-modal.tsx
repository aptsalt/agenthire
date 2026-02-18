"use client";

import { useState } from "react";
import { X, Plus, Trash2, ChevronDown } from "lucide-react";
import type { Profile, Skill, Experience, Education } from "@agenthire/shared";

interface ProfileFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (profile: Profile) => void;
  initialData?: Partial<Profile>;
}

const SKILL_CATEGORIES = ["technical", "soft", "domain", "tool", "language"] as const;
const SKILL_LEVELS = ["beginner", "intermediate", "advanced", "expert"] as const;

function emptySkill(): Skill {
  return { name: "", category: "technical", level: "intermediate" };
}

function emptyExperience(): Experience {
  return {
    company: "",
    title: "",
    startDate: "",
    endDate: undefined,
    current: false,
    description: "",
    highlights: [],
    skills: [],
  };
}

function emptyEducation(): Education {
  return {
    institution: "",
    degree: "",
    field: "",
    startDate: "",
    endDate: undefined,
  };
}

export function ProfileFormModal({ open, onClose, onSave, initialData }: ProfileFormModalProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [summary, setSummary] = useState(initialData?.summary ?? "");
  const [location, setLocation] = useState(initialData?.location ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(initialData?.linkedinUrl ?? "");
  const [portfolioUrl, setPortfolioUrl] = useState(initialData?.portfolioUrl ?? "");
  const [skills, setSkills] = useState<Skill[]>(initialData?.skills ?? [emptySkill()]);
  const [experience, setExperience] = useState<Experience[]>(
    initialData?.experience ?? [emptyExperience()],
  );
  const [education, setEducation] = useState<Education[]>(
    initialData?.education ?? [emptyEducation()],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!open) return null;

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors["name"] = "Name is required";
    if (!email.trim()) newErrors["email"] = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors["email"] = "Invalid email";
    if (!title.trim()) newErrors["title"] = "Title is required";
    if (!summary.trim()) newErrors["summary"] = "Summary is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSave() {
    if (!validate()) return;

    const now = new Date().toISOString();
    const filteredSkills = skills.filter((s) => s.name.trim());
    const filteredExperience = experience.filter((e) => e.company.trim() || e.title.trim());
    const filteredEducation = education.filter((e) => e.institution.trim() || e.degree.trim());

    const profile: Profile = {
      id: initialData?.id ?? crypto.randomUUID(),
      userId: initialData?.userId ?? crypto.randomUUID(),
      name: name.trim(),
      email: email.trim(),
      title: title.trim(),
      summary: summary.trim(),
      location: location.trim() || undefined,
      linkedinUrl: linkedinUrl.trim() || undefined,
      portfolioUrl: portfolioUrl.trim() || undefined,
      skills: filteredSkills,
      experience: filteredExperience,
      education: filteredEducation,
      createdAt: initialData?.createdAt ?? now,
      updatedAt: now,
    };

    onSave(profile);
    onClose();
  }

  function updateSkill(index: number, field: keyof Skill, value: string | number) {
    setSkills((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
  }

  function removeSkill(index: number) {
    setSkills((prev) => prev.filter((_, i) => i !== index));
  }

  function updateExperience(index: number, field: keyof Experience, value: unknown) {
    setExperience((prev) =>
      prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)),
    );
  }

  function removeExperience(index: number) {
    setExperience((prev) => prev.filter((_, i) => i !== index));
  }

  function updateEducation(index: number, field: keyof Education, value: unknown) {
    setEducation((prev) =>
      prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)),
    );
  }

  function removeEducation(index: number) {
    setEducation((prev) => prev.filter((_, i) => i !== index));
  }

  const inputClasses =
    "w-full rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none transition-colors focus:border-accent-blue";
  const labelClasses = "mb-1 block text-xs font-medium text-text-secondary";
  const sectionClasses = "space-y-3 border-t border-border-primary pt-5";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-xl border border-border-primary bg-bg-primary shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-primary px-6 py-4">
          <h2 className="text-lg font-semibold text-text-primary">
            {initialData ? "Edit Profile" : "New Profile"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-5">
          {/* Basic Info */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-text-primary">Basic Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClasses}>Name *</label>
                <input
                  className={inputClasses}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                />
                {errors["name"] && (
                  <p className="mt-1 text-xs text-accent-red">{errors["name"]}</p>
                )}
              </div>
              <div>
                <label className={labelClasses}>Email *</label>
                <input
                  className={inputClasses}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                />
                {errors["email"] && (
                  <p className="mt-1 text-xs text-accent-red">{errors["email"]}</p>
                )}
              </div>
              <div>
                <label className={labelClasses}>Title *</label>
                <input
                  className={inputClasses}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Senior Software Engineer"
                />
                {errors["title"] && (
                  <p className="mt-1 text-xs text-accent-red">{errors["title"]}</p>
                )}
              </div>
              <div>
                <label className={labelClasses}>Location</label>
                <input
                  className={inputClasses}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="San Francisco, CA"
                />
              </div>
              <div>
                <label className={labelClasses}>LinkedIn URL</label>
                <input
                  className={inputClasses}
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
              <div>
                <label className={labelClasses}>Portfolio URL</label>
                <input
                  className={inputClasses}
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="https://portfolio.dev"
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div>
            <label className={labelClasses}>Professional Summary *</label>
            <textarea
              className={`${inputClasses} min-h-[80px] resize-y`}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Experienced software engineer specializing in..."
              rows={3}
            />
            {errors["summary"] && (
              <p className="mt-1 text-xs text-accent-red">{errors["summary"]}</p>
            )}
          </div>

          {/* Skills */}
          <div className={sectionClasses}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">Skills</h3>
              <button
                type="button"
                onClick={() => setSkills((prev) => [...prev, emptySkill()])}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-accent-blue transition-colors hover:bg-accent-blue/10"
              >
                <Plus className="h-3 w-3" /> Add Skill
              </button>
            </div>
            {skills.map((skill, index) => (
              <div key={index} className="flex items-start gap-2">
                <input
                  className={`${inputClasses} flex-1`}
                  value={skill.name}
                  onChange={(e) => updateSkill(index, "name", e.target.value)}
                  placeholder="Skill name"
                />
                <div className="relative">
                  <select
                    className={`${inputClasses} w-32 appearance-none pr-7`}
                    value={skill.category}
                    onChange={(e) => updateSkill(index, "category", e.target.value)}
                  >
                    {SKILL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-text-muted" />
                </div>
                <div className="relative">
                  <select
                    className={`${inputClasses} w-36 appearance-none pr-7`}
                    value={skill.level}
                    onChange={(e) => updateSkill(index, "level", e.target.value)}
                  >
                    {SKILL_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-text-muted" />
                </div>
                <input
                  className={`${inputClasses} w-16`}
                  type="number"
                  min={0}
                  value={skill.yearsOfExperience ?? ""}
                  onChange={(e) =>
                    updateSkill(
                      index,
                      "yearsOfExperience",
                      e.target.value ? Number(e.target.value) : 0,
                    )
                  }
                  placeholder="Yrs"
                />
                <button
                  type="button"
                  onClick={() => removeSkill(index)}
                  className="rounded-lg p-2 text-text-muted transition-colors hover:bg-accent-red/10 hover:text-accent-red"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Experience */}
          <div className={sectionClasses}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">Experience</h3>
              <button
                type="button"
                onClick={() => setExperience((prev) => [...prev, emptyExperience()])}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-accent-blue transition-colors hover:bg-accent-blue/10"
              >
                <Plus className="h-3 w-3" /> Add Experience
              </button>
            </div>
            {experience.map((exp, index) => (
              <div
                key={index}
                className="space-y-2 rounded-lg border border-border-primary bg-bg-secondary/50 p-3"
              >
                <div className="flex items-start justify-between">
                  <div className="grid flex-1 grid-cols-2 gap-2">
                    <div>
                      <label className={labelClasses}>Company</label>
                      <input
                        className={inputClasses}
                        value={exp.company}
                        onChange={(e) => updateExperience(index, "company", e.target.value)}
                        placeholder="Company name"
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>Title</label>
                      <input
                        className={inputClasses}
                        value={exp.title}
                        onChange={(e) => updateExperience(index, "title", e.target.value)}
                        placeholder="Job title"
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>Start Date</label>
                      <input
                        className={inputClasses}
                        type="date"
                        value={exp.startDate}
                        onChange={(e) => updateExperience(index, "startDate", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>End Date</label>
                      <input
                        className={inputClasses}
                        type="date"
                        value={exp.endDate ?? ""}
                        disabled={exp.current}
                        onChange={(e) =>
                          updateExperience(index, "endDate", e.target.value || undefined)
                        }
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExperience(index)}
                    className="ml-2 rounded-lg p-2 text-text-muted transition-colors hover:bg-accent-red/10 hover:text-accent-red"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <label className="flex items-center gap-2 text-xs text-text-secondary">
                  <input
                    type="checkbox"
                    checked={exp.current}
                    onChange={(e) => {
                      updateExperience(index, "current", e.target.checked);
                      if (e.target.checked) updateExperience(index, "endDate", undefined);
                    }}
                    className="rounded border-border-primary"
                  />
                  Currently working here
                </label>
                <div>
                  <label className={labelClasses}>Description</label>
                  <textarea
                    className={`${inputClasses} min-h-[60px] resize-y`}
                    value={exp.description}
                    onChange={(e) => updateExperience(index, "description", e.target.value)}
                    placeholder="Describe your role and responsibilities..."
                    rows={2}
                  />
                </div>
                <div>
                  <label className={labelClasses}>Highlights (comma-separated)</label>
                  <input
                    className={inputClasses}
                    value={exp.highlights.join(", ")}
                    onChange={(e) =>
                      updateExperience(
                        index,
                        "highlights",
                        e.target.value
                          .split(",")
                          .map((h) => h.trim())
                          .filter(Boolean),
                      )
                    }
                    placeholder="Led team of 10, Reduced latency by 40%"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Education */}
          <div className={sectionClasses}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">Education</h3>
              <button
                type="button"
                onClick={() => setEducation((prev) => [...prev, emptyEducation()])}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-accent-blue transition-colors hover:bg-accent-blue/10"
              >
                <Plus className="h-3 w-3" /> Add Education
              </button>
            </div>
            {education.map((edu, index) => (
              <div
                key={index}
                className="space-y-2 rounded-lg border border-border-primary bg-bg-secondary/50 p-3"
              >
                <div className="flex items-start justify-between">
                  <div className="grid flex-1 grid-cols-2 gap-2">
                    <div>
                      <label className={labelClasses}>Institution</label>
                      <input
                        className={inputClasses}
                        value={edu.institution}
                        onChange={(e) => updateEducation(index, "institution", e.target.value)}
                        placeholder="University name"
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>Degree</label>
                      <input
                        className={inputClasses}
                        value={edu.degree}
                        onChange={(e) => updateEducation(index, "degree", e.target.value)}
                        placeholder="Bachelor of Science"
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>Field of Study</label>
                      <input
                        className={inputClasses}
                        value={edu.field}
                        onChange={(e) => updateEducation(index, "field", e.target.value)}
                        placeholder="Computer Science"
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>GPA</label>
                      <input
                        className={inputClasses}
                        type="number"
                        step="0.01"
                        min={0}
                        max={4}
                        value={edu.gpa ?? ""}
                        onChange={(e) =>
                          updateEducation(
                            index,
                            "gpa",
                            e.target.value ? Number(e.target.value) : undefined,
                          )
                        }
                        placeholder="3.8"
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>Start Date</label>
                      <input
                        className={inputClasses}
                        type="date"
                        value={edu.startDate}
                        onChange={(e) => updateEducation(index, "startDate", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>End Date</label>
                      <input
                        className={inputClasses}
                        type="date"
                        value={edu.endDate ?? ""}
                        onChange={(e) =>
                          updateEducation(index, "endDate", e.target.value || undefined)
                        }
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEducation(index)}
                    className="ml-2 rounded-lg p-2 text-text-muted transition-colors hover:bg-accent-red/10 hover:text-accent-red"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border-primary px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-border-primary px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-tertiary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-accent-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-blue-hover"
          >
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
}
