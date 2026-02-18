"use client";

import { useState, useRef } from "react";
import { X, Upload, FileText, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import type { Profile } from "@agenthire/shared";

interface ResumeUploadModalProps {
  open: boolean;
  onClose: () => void;
  onProfileParsed: (profile: Partial<Profile>) => void;
}

type UploadState = "idle" | "reading" | "parsing" | "done" | "error";

const MAX_FILE_SIZE = 500 * 1024; // 500KB

export function ResumeUploadModal({ open, onClose, onProfileParsed }: ResumeUploadModalProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [resumeText, setResumeText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  function reset() {
    setState("idle");
    setFileName("");
    setFileSize(0);
    setResumeText("");
    setErrorMessage("");
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage(`File too large (${(file.size / 1024).toFixed(0)}KB). Maximum is 500KB.`);
      setState("error");
      return;
    }

    if (!file.name.endsWith(".txt")) {
      setErrorMessage("Only .txt files are supported. PDF and DOCX support coming soon.");
      setState("error");
      return;
    }

    setFileName(file.name);
    setFileSize(file.size);
    setState("reading");

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        setResumeText(text);
        setState("idle");
      } else {
        setErrorMessage("Could not read file contents.");
        setState("error");
      }
    };
    reader.onerror = () => {
      setErrorMessage("Failed to read file.");
      setState("error");
    };
    reader.readAsText(file);
  }

  async function handleParse() {
    if (!resumeText.trim()) {
      setErrorMessage("No resume text to parse.");
      setState("error");
      return;
    }

    setState("parsing");
    setErrorMessage("");

    try {
      const response = await fetch("/api/parse-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: resumeText }),
      });

      const data = (await response.json()) as { profile?: Partial<Profile>; error?: string };

      if (!response.ok || data.error) {
        setErrorMessage(data.error ?? "Failed to parse resume.");
        setState("error");
        return;
      }

      if (!data.profile) {
        setErrorMessage("No profile data returned.");
        setState("error");
        return;
      }

      setState("done");
      onProfileParsed(data.profile);
      onClose();
    } catch {
      setErrorMessage("Network error. Is the development server running?");
      setState("error");
    }
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-border-primary bg-bg-primary shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-primary px-6 py-4">
          <h2 className="text-lg font-semibold text-text-primary">Upload Resume</h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5">
          {/* File picker */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={state === "parsing"}
              className="flex w-full items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border-secondary bg-bg-secondary/50 px-4 py-8 text-sm transition-colors hover:border-accent-blue/50 hover:bg-bg-secondary disabled:opacity-50"
            >
              <Upload className="h-5 w-5 text-text-muted" />
              <span className="text-text-secondary">
                {fileName ? "Choose a different file" : "Choose a .txt resume file"}
              </span>
            </button>
            <p className="mt-1.5 text-xs text-text-muted">
              Supported: .txt files up to 500KB. PDF and DOCX support coming soon.
            </p>
          </div>

          {/* Selected file info */}
          {fileName && state !== "error" && (
            <div className="flex items-center gap-3 rounded-lg border border-border-primary bg-bg-secondary/50 px-4 py-3">
              <FileText className="h-5 w-5 text-accent-blue" />
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">{fileName}</p>
                <p className="text-xs text-text-muted">{(fileSize / 1024).toFixed(1)} KB</p>
              </div>
              {resumeText && (
                <CheckCircle2 className="h-4 w-4 text-accent-green" />
              )}
            </div>
          )}

          {/* Preview of extracted text */}
          {resumeText && state === "idle" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Preview ({resumeText.length.toLocaleString()} characters)
              </label>
              <div className="max-h-32 overflow-y-auto rounded-lg border border-border-primary bg-bg-secondary p-3 text-xs leading-relaxed text-text-secondary">
                {resumeText.slice(0, 500)}
                {resumeText.length > 500 && (
                  <span className="text-text-muted">... ({resumeText.length - 500} more characters)</span>
                )}
              </div>
            </div>
          )}

          {/* Parsing state */}
          {state === "parsing" && (
            <div className="flex items-center gap-3 rounded-lg border border-accent-blue/30 bg-accent-blue/5 px-4 py-3">
              <Loader2 className="h-5 w-5 animate-spin text-accent-blue" />
              <div>
                <p className="text-sm font-medium text-text-primary">Analyzing resume with local AI...</p>
                <p className="text-xs text-text-muted">This may take a moment depending on your hardware</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {state === "error" && (
            <div className="flex items-start gap-3 rounded-lg border border-accent-red/30 bg-accent-red/5 px-4 py-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent-red" />
              <div>
                <p className="text-sm font-medium text-accent-red">{errorMessage}</p>
                <button
                  onClick={reset}
                  className="mt-1 text-xs font-medium text-text-secondary underline transition-colors hover:text-text-primary"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border-primary px-6 py-4">
          <button
            onClick={handleClose}
            className="rounded-lg border border-border-primary px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-tertiary"
          >
            Cancel
          </button>
          <button
            onClick={handleParse}
            disabled={!resumeText || state === "parsing" || state === "reading"}
            className="rounded-lg bg-accent-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-blue-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state === "parsing" ? "Parsing..." : "Parse Resume"}
          </button>
        </div>
      </div>
    </div>
  );
}
