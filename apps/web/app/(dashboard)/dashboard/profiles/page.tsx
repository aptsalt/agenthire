"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Upload, Plus } from "lucide-react";
import { ProfileCard } from "@/components/profile/profile-card";
import { ProfileFormModal } from "@/components/profile/profile-form-modal";
import { ResumeUploadModal } from "@/components/profile/resume-upload-modal";
import { useAppStore } from "@/lib/store";
import type { Profile } from "@agenthire/shared";

export default function ProfilesPage() {
  const router = useRouter();
  const { profile, setProfile, initializeMockData } = useAppStore();
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showResumeUpload, setShowResumeUpload] = useState(false);
  const [formInitialData, setFormInitialData] = useState<Partial<Profile> | undefined>(undefined);

  useEffect(() => {
    initializeMockData();
  }, [initializeMockData]);

  function handleProfileSave(newProfile: Profile) {
    setProfile(newProfile);
    setFormInitialData(undefined);
  }

  function handleResumeParsed(parsedProfile: Partial<Profile>) {
    setFormInitialData(parsedProfile);
    setShowProfileForm(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Profiles</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage your career profiles and resumes
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowResumeUpload(true)}
            className="flex items-center gap-2 rounded-lg border border-border-primary bg-bg-card px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-card-hover"
          >
            <Upload className="h-4 w-4" />
            Upload Resume
          </button>
          <button
            onClick={() => {
              setFormInitialData(undefined);
              setShowProfileForm(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-accent-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-blue-hover"
          >
            <Plus className="h-4 w-4" />
            New Profile
          </button>
        </div>
      </div>

      {/* Profile Content */}
      {profile ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Profile Card */}
          <div className="lg:col-span-2">
            <ProfileCard profile={profile} />
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border-primary bg-bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold text-text-primary">
                Profile Strength
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-text-secondary">Completeness</span>
                    <span className="font-medium text-accent-green">92%</span>
                  </div>
                  <div className="h-2 rounded-full bg-bg-tertiary">
                    <div
                      className="h-2 rounded-full bg-accent-green transition-all"
                      style={{ width: "92%" }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-text-secondary">Skills Coverage</span>
                    <span className="font-medium text-accent-blue">85%</span>
                  </div>
                  <div className="h-2 rounded-full bg-bg-tertiary">
                    <div
                      className="h-2 rounded-full bg-accent-blue transition-all"
                      style={{ width: "85%" }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-text-secondary">ATS Score</span>
                    <span className="font-medium text-accent-purple">78%</span>
                  </div>
                  <div className="h-2 rounded-full bg-bg-tertiary">
                    <div
                      className="h-2 rounded-full bg-accent-purple transition-all"
                      style={{ width: "78%" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border-primary bg-bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold text-text-primary">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => router.push("/dashboard/matches")}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
                >
                  View Match Results
                </button>
                <button
                  onClick={() => router.push("/dashboard/jobs")}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
                >
                  Browse Jobs
                </button>
                <button
                  onClick={() => router.push("/dashboard/interview-prep")}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
                >
                  Start Interview Prep
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-secondary py-20">
          <div className="rounded-full bg-bg-tertiary p-4">
            <User className="h-8 w-8 text-text-muted" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-text-primary">
            No profile yet
          </h3>
          <p className="mt-2 max-w-sm text-center text-sm text-text-secondary">
            Upload your resume or create a new profile to get started with
            AI-powered job matching.
          </p>
          <button
            onClick={() => {
              setFormInitialData(undefined);
              setShowProfileForm(true);
            }}
            className="mt-6 flex items-center gap-2 rounded-lg bg-accent-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-blue-hover"
          >
            <Plus className="h-4 w-4" />
            Create Profile
          </button>
        </div>
      )}

      {/* Modals */}
      <ProfileFormModal
        open={showProfileForm}
        onClose={() => {
          setShowProfileForm(false);
          setFormInitialData(undefined);
        }}
        onSave={handleProfileSave}
        initialData={formInitialData}
      />

      <ResumeUploadModal
        open={showResumeUpload}
        onClose={() => setShowResumeUpload(false)}
        onProfileParsed={handleResumeParsed}
      />
    </div>
  );
}
