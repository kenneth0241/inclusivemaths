"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import type {
  ContentFootprint,
  LearnerProfile,
  PedagogicalStrategyState,
} from "@/lib/workflow-draft";
import type { StudentRecord } from "@/lib/student-record";
import { BilingualStack } from "./Bilingual";
import ProfileAnalysisDisplay from "./ProfileAnalysisDisplay";
import { StudioStep1FootprintSummary } from "./StudioStep1FootprintSummary";
import { StudioStep2LearnerSummary } from "./StudioStep2LearnerSummary";
import { StudioStep3PedagogySummary } from "./StudioStep3PedagogySummary";

export type MaterialsContextPanel = "step1" | "step2" | "step3";

type MaterialsContextDetailDialogProps = {
  open: boolean;
  panel: MaterialsContextPanel;
  footprint: ContentFootprint;
  learner: LearnerProfile;
  pedagogy: PedagogicalStrategyState;
  selectedStudents: StudentRecord[];
  onClose: () => void;
};

const TITLES: Record<MaterialsContextPanel, { zh: string; en: string }> = {
  step1: {
    zh: "第一步 · 教學主題與內容足跡",
    en: "Step 1 · Lesson topic & content footprint",
  },
  step2: {
    zh: "第二步 · 學習者學習概覽",
    en: "Step 2 · Learner profiles overview",
  },
  step3: {
    zh: "第三步 · 教學策略",
    en: "Step 3 · Pedagogical strategy",
  },
};

export default function MaterialsContextDetailDialog({
  open,
  panel,
  footprint,
  learner,
  pedagogy,
  selectedStudents,
  onClose,
}: MaterialsContextDetailDialogProps) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const titles = TITLES[panel];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-[4vw]">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/40"
        aria-label="關閉 · Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[min(90vh,52rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-zinc-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-100 px-6 py-5 sm:px-8">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-zinc-900">
              {titles.zh}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">{titles.en}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
          >
            關閉 · Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          {panel === "step1" ? (
            <StudioStep1FootprintSummary footprint={footprint} />
          ) : null}
          {panel === "step2" ? (
            <div className="space-y-6">
              <StudioStep2LearnerSummary
                learner={learner}
                selectedStudents={selectedStudents}
              />
              {learner.pedagogicalSynthesis.trim() ? (
                <ProfileAnalysisDisplay
                  content={learner.pedagogicalSynthesis}
                  structured={learner.profileSynthesisStructured}
                />
              ) : null}
            </div>
          ) : null}
          {panel === "step3" ? (
            <StudioStep3PedagogySummary pedagogy={pedagogy} />
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
