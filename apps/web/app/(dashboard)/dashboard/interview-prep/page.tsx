"use client";

import { useState } from "react";
import {
  MessageSquare,
  Play,
  CheckCircle,
  ChevronRight,
  Mic,
  BookOpen,
  Star,
  Target,
} from "lucide-react";
import { useAppStore } from "@/lib/store";

const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  behavioral: { bg: "bg-accent-blue/10", text: "text-accent-blue" },
  technical: { bg: "bg-accent-purple/10", text: "text-accent-purple" },
  situational: { bg: "bg-accent-orange/10", text: "text-accent-orange" },
  company: { bg: "bg-accent-green/10", text: "text-accent-green" },
};

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "text-accent-green",
  medium: "text-accent-orange",
  hard: "text-accent-red",
};

export default function InterviewPrepPage() {
  const { jobs, matches, interviewTopics } = useAppStore();
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");

  const topMatch = [...matches].sort(
    (a, b) => b.overallScore - a.overallScore,
  )[0];
  const targetJob = topMatch
    ? jobs.find((j) => j.id === topMatch.jobId)
    : undefined;

  const activeTopic = interviewTopics.find((t) => t.id === activeTopicId);
  const activeQuestion = activeTopic?.questions[activeQuestionIndex];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Interview Prep
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Practice with AI-generated questions tailored to your target roles
        </p>
      </div>

      {/* Target Role Banner */}
      {targetJob && (
        <div className="rounded-xl border border-accent-blue/30 bg-accent-blue/5 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent-blue/10 p-2">
              <Target className="h-5 w-5 text-accent-blue" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Preparing for</p>
              <p className="text-sm font-semibold text-text-primary">
                {targetJob.title} at {targetJob.company}
              </p>
            </div>
            {topMatch && (
              <div className="ml-auto text-right">
                <p className="text-xs text-text-muted">Match Score</p>
                <p className="text-lg font-bold text-accent-blue">
                  {topMatch.overallScore}%
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border-primary bg-bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent-purple/10 p-2">
              <BookOpen className="h-5 w-5 text-accent-purple" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">
                {interviewTopics.length}
              </p>
              <p className="text-xs text-text-muted">Topics Available</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border-primary bg-bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent-green/10 p-2">
              <CheckCircle className="h-5 w-5 text-accent-green" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">
                {interviewTopics.reduce(
                  (sum, t) => sum + t.questions.length,
                  0,
                )}
              </p>
              <p className="text-xs text-text-muted">Total Questions</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border-primary bg-bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent-orange/10 p-2">
              <Star className="h-5 w-5 text-accent-orange" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">--</p>
              <p className="text-xs text-text-muted">Avg Rating</p>
            </div>
          </div>
        </div>
      </div>

      {interviewTopics.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-secondary py-20">
          <MessageSquare className="mb-3 h-8 w-8 text-text-muted" />
          <h3 className="text-lg font-medium text-text-primary">
            No interview topics yet
          </h3>
          <p className="mt-2 max-w-sm text-center text-sm text-text-secondary">
            Start a conversation on the Dashboard to generate interview prep
            topics tailored to your profile and target roles.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Topics List */}
          <div>
            <h2 className="mb-3 text-lg font-semibold text-text-primary">
              Practice Topics
            </h2>
            <div className="space-y-2">
              {interviewTopics.map((topic) => {
                const catStyle =
                  CATEGORY_STYLES[topic.category] ??
                  CATEGORY_STYLES["technical"]!;
                const catBg = catStyle?.bg ?? "bg-accent-purple/10";
                const catText = catStyle?.text ?? "text-accent-purple";
                return (
                  <button
                    key={topic.id}
                    onClick={() => {
                      if (activeTopicId === topic.id) {
                        setActiveTopicId(null);
                      } else {
                        setActiveTopicId(topic.id);
                        setActiveQuestionIndex(0);
                        setUserAnswer("");
                      }
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200 ${
                      activeTopicId === topic.id
                        ? "border-accent-blue/50 bg-accent-blue/5 shadow-[0_0_12px_rgba(59,130,246,0.1)]"
                        : "border-border-primary bg-bg-card hover:border-border-secondary hover:bg-bg-card-hover"
                    }`}
                  >
                    <div className={`rounded-lg p-2 ${catBg}`}>
                      <MessageSquare
                        className={`h-4 w-4 ${catText}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary">
                        {topic.title}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-text-muted">
                        <span className={catText}>
                          {topic.category}
                        </span>
                        <span>{topic.questions.length} questions</span>
                        <span
                          className={
                            DIFFICULTY_STYLES[topic.difficulty] ??
                            DIFFICULTY_STYLES["medium"]
                          }
                        >
                          {topic.difficulty}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-text-muted" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Practice Session */}
          <div>
            <h2 className="mb-3 text-lg font-semibold text-text-primary">
              Practice Session
            </h2>
            {activeTopic && activeQuestion ? (
              <div className="rounded-xl border border-border-primary bg-bg-card">
                <div className="border-b border-border-primary p-5">
                  <div className="flex items-center gap-2">
                    <Mic className="h-4 w-4 text-accent-blue" />
                    <span className="text-xs font-medium text-accent-blue">
                      Question {activeQuestionIndex + 1} of{" "}
                      {activeTopic.questions.length}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-text-primary">
                    {activeQuestion.question}
                  </p>
                </div>

                {/* Tip */}
                <div className="border-b border-border-primary bg-accent-purple/5 px-5 py-3">
                  <p className="text-xs text-accent-purple">
                    <span className="font-semibold">Tip: </span>
                    {activeQuestion.tip}
                  </p>
                </div>

                {/* Answer Area */}
                <div className="p-5">
                  <textarea
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Type your answer here... Use the STAR method for behavioral questions."
                    rows={6}
                    className="w-full resize-none rounded-lg border border-border-primary bg-bg-tertiary p-3 text-sm text-text-primary placeholder-text-muted outline-none transition-colors focus:border-accent-blue"
                  />
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-text-muted">
                      {userAnswer.length} characters
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (
                            activeQuestionIndex <
                            activeTopic.questions.length - 1
                          ) {
                            setActiveQuestionIndex(activeQuestionIndex + 1);
                            setUserAnswer("");
                          }
                        }}
                        className="rounded-lg border border-border-primary px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-tertiary"
                      >
                        Skip
                      </button>
                      <button
                        disabled={userAnswer.trim().length === 0}
                        className="rounded-lg bg-accent-blue px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-blue-hover disabled:opacity-50"
                      >
                        Submit Answer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-secondary py-20">
                <Play className="mb-3 h-8 w-8 text-text-muted" />
                <h3 className="text-lg font-medium text-text-primary">
                  Select a topic to start
                </h3>
                <p className="mt-2 max-w-sm text-center text-sm text-text-secondary">
                  Choose a practice topic from the list to begin your mock
                  interview session.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
