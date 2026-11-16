"use client";

import { useState } from "react";
import { step3BriefPreview } from "@/lib/game-materials-context";
import { formatProfileAnalysisText } from "@/lib/profile-synthesizer";
import { hasPedagogyBaseline, pedagogyInputFingerprint } from "@/lib/pedagogy-strategy";
import {
  isLearnerStepComplete,
  isStudioContextReady,
  type ContentFootprint,
  type LearnerProfile,
  type PedagogicalStrategyState,
} from "@/lib/workflow-draft";
import type { StudentRecord } from "@/lib/student-record";
import { BilingualStack } from "./Bilingual";
import MaterialsContextDetailDialog, {
  type MaterialsContextPanel,
} from "./MaterialsContextDetailDialog";

function briefSummary(value: string, max = 96) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  const firstLine = trimmed.split(/\n/)[0]?.replace(/\s+/g, " ").trim() ?? "";
  if (firstLine.length <= max) {
    return firstLine;
  }
  return `${firstLine.slice(0, max).trim()}…`;
}

type MaterialsContextSidebarProps = {
  footprint: ContentFootprint;
  learner: LearnerProfile;
  pedagogy: PedagogicalStrategyState;
  selectedStudents: StudentRecord[];
};

export default function MaterialsContextSidebar({
  footprint,
  learner,
  pedagogy,
  selectedStudents,
}: MaterialsContextSidebarProps) {
  const [contextDialog, setContextDialog] =
    useState<MaterialsContextPanel | null>(null);

  const step1Ready = isStudioContextReady(footprint);
  const step2Ready = isLearnerStepComplete(learner);
  const inputFingerprint = pedagogyInputFingerprint(footprint, learner);
  const step3Ready = hasPedagogyBaseline(pedagogy, inputFingerprint);
  const synthesisText = formatProfileAnalysisText(learner.pedagogicalSynthesis);

  const step1Preview = briefSummary(
    footprint.topicSummary.trim() ||
      footprint.scope.trim() ||
      footprint.visualModels.trim(),
  );
  const step2Preview = briefSummary(
    synthesisText ||
      [
        learner.classId ? `${learner.classId}` : "",
        learner.studentIds.length ? `${learner.studentIds.length} 位學生` : "",
      ]
        .filter(Boolean)
        .join(" · "),
  );
  const step3Preview = briefSummary(step3BriefPreview(pedagogy));

  return (
    <>
      <MaterialsContextDetailDialog
        open={contextDialog !== null}
        panel={contextDialog ?? "step1"}
        footprint={footprint}
        learner={learner}
        pedagogy={pedagogy}
        selectedStudents={selectedStudents}
        onClose={() => setContextDialog(null)}
      />

      <section className="rounded-3xl bg-white p-5 ring-1 ring-teal-100 sm:p-6">
        <p className="text-xs font-semibold tracking-wide text-teal-ink uppercase">
          <BilingualStack
            zh="Step 1–3 參考"
            en="Steps 1–3 reference"
            layout="inline"
            enClassName="text-teal-700/80"
          />
        </p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          <BilingualStack
            zh="遊戲生成會引用左欄參數與對話；此處僅供查閱鎖定內容。"
            en="Game generation uses the left panel; open cards here for full locked context."
            layout="stack"
            enClassName="text-zinc-400"
          />
        </p>

        <div className="mt-3 space-y-3">
          <ContextCard
            stepLabel="Step 1"
            titleZh="教學主題"
            titleEn="Lesson topic"
            preview={step1Ready ? step1Preview : ""}
            emptyZh="尚未完成"
            emptyEn="Not complete"
            warning={!step1Ready}
            onOpen={() => setContextDialog("step1")}
          />
          <ContextCard
            stepLabel="Step 2"
            titleZh="學習者概覽"
            titleEn="Learner overview"
            preview={step2Ready ? step2Preview : ""}
            emptyZh="尚未完成"
            emptyEn="Not complete"
            warning={!step2Ready}
            onOpen={() => setContextDialog("step2")}
          />
          <ContextCard
            stepLabel="Step 3"
            titleZh="教學策略"
            titleEn="Pedagogy"
            preview={step3Ready ? step3Preview : ""}
            emptyZh="尚未完成"
            emptyEn="Not complete"
            warning={!step3Ready}
            onOpen={() => setContextDialog("step3")}
          />
        </div>
      </section>
    </>
  );
}

function ContextCard({
  stepLabel,
  titleZh,
  titleEn,
  preview,
  emptyZh,
  emptyEn,
  warning = false,
  onOpen,
}: {
  stepLabel: string;
  titleZh: string;
  titleEn: string;
  preview: string;
  emptyZh: string;
  emptyEn: string;
  warning?: boolean;
  onOpen: () => void;
}) {
  const canOpen = preview.length > 0 || warning;

  return (
    <button
      type="button"
      onClick={canOpen ? onOpen : undefined}
      disabled={!canOpen}
      className="block w-full rounded-2xl bg-zinc-50/80 p-4 text-left ring-1 ring-zinc-200/90 transition hover:bg-teal-50/40 hover:ring-teal-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 disabled:cursor-default disabled:opacity-70"
    >
      <p className="text-xs font-semibold tracking-wide text-sky-lock uppercase">
        {stepLabel}
      </p>
      <h3 className="mt-1 text-sm font-semibold text-zinc-900">
        <BilingualStack
          zh={titleZh}
          en={titleEn}
          layout="inline"
          enClassName="font-normal text-zinc-500"
        />
      </h3>
      {preview ? (
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-600">
          {preview}
        </p>
      ) : (
        <p
          className={`mt-2 text-xs ${warning ? "text-amber-900" : "text-zinc-500"}`}
        >
          <BilingualStack
            layout="stack"
            zh={emptyZh}
            en={emptyEn}
            enClassName={warning ? "text-amber-800/85" : "text-zinc-400"}
          />
        </p>
      )}
      {canOpen ? (
        <p className="mt-2 text-[11px] font-medium text-teal-ink">
          <BilingualStack
            zh="查看全文"
            en="View all"
            layout="inline"
            enClassName="text-teal-700/80"
          />
        </p>
      ) : null}
    </button>
  );
}
