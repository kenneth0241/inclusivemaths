"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import {
  StudentRosterProvider,
  useStudentRoster,
} from "@/lib/use-student-roster";
import {
  useWorkflowDraft,
  WorkflowDraftProvider,
} from "@/lib/use-workflow-draft";
import {
  hasPedagogyBaseline,
  pedagogyInputFingerprint,
} from "@/lib/pedagogy-strategy";
import {
  isFootprintReady,
  isLearnerReady,
  isLearnerStepComplete,
  isProfileSynthesisReady,
  applyConfirmedStudioContext,
  prefillLessonFromStudio,
} from "@/lib/workflow-draft";
import { BilingualStack } from "./Bilingual";
import AppNav from "./AppNav";
import ConfirmStudioContextModal from "./ConfirmStudioContextModal";

export type WorkflowStepId = 1 | 2 | 3 | 4;

const STEPS: {
  id: WorkflowStepId;
  href: string;
  en: string;
  zh: string;
}[] = [
  { id: 1, href: "/chat", en: "Textbook chat", zh: "課本對話" },
  { id: 2, href: "/design/profile", en: "Learner profile", zh: "學習者檔案" },
  {
    id: 3,
    href: "/design/pedagogy",
    en: "Pedagogical strategy",
    zh: "教學策略",
  },
  { id: 4, href: "/design/assets", en: "Assets", zh: "教材" },
];

type WorkflowShellProps = {
  step: WorkflowStepId;
  kicker: string;
  /** English subtitle under kicker (Traditional Chinese is in `kicker`). */
  kickerEn?: string;
  title: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  /** Rendered directly under the page title (e.g. executive summary trigger). */
  belowTitle?: ReactNode;
  children: ReactNode;
  wide?: boolean;
  proceedLabel?: string;
  proceedLabelEn?: string;
  onBeforeProceed?: () => boolean | void;
};

function stepUnlocked(
  target: WorkflowStepId,
  flags: { footprint: boolean; learner: boolean; pedagogy: boolean },
) {
  if (target === 1) {
    return true;
  }
  if (target === 2) {
    return flags.footprint;
  }
  if (target === 3) {
    return flags.footprint && flags.learner;
  }
  return flags.footprint && flags.learner && flags.pedagogy;
}

export default function WorkflowShell(props: WorkflowShellProps) {
  return (
    <WorkflowDraftProvider>
      <StudentRosterProvider>
        <WorkflowShellInner {...props} />
      </StudentRosterProvider>
    </WorkflowDraftProvider>
  );
}

function WorkflowShellInner({
  step,
  kicker,
  kickerEn,
  title,
  titleEn,
  description,
  descriptionEn,
  belowTitle,
  children,
  wide = false,
  proceedLabel,
  proceedLabelEn,
  onBeforeProceed,
}: WorkflowShellProps) {
  const router = useRouter();
  const { draft, setDraft, hydrated } = useWorkflowDraft();
  const { findStudent } = useStudentRoster();
  const [confirmStudioOpen, setConfirmStudioOpen] = useState(false);
  const confirmStudioInitial = useMemo(
    () => ({
      topicSummary: draft.footprint.topicSummary,
      scope: draft.footprint.scope,
    }),
    [confirmStudioOpen, draft.footprint.topicSummary, draft.footprint.scope],
  );
  const pedagogyFingerprint = pedagogyInputFingerprint(
    draft.footprint,
    draft.learner,
  );
  const flags = {
    footprint: isFootprintReady(draft.footprint),
    learner: isLearnerStepComplete(draft.learner),
    pedagogy: hasPedagogyBaseline(draft.pedagogy, pedagogyFingerprint),
  };
  const learnerPickedNotAnalyzed =
    hydrated &&
    step === 2 &&
    isLearnerReady(draft.learner) &&
    !isProfileSynthesisReady(draft.learner);
  const nextStep = STEPS.find((item) => item.id === step + 1);
  const prevStep = STEPS.find((item) => item.id === step - 1);
  const canProceed = nextStep
    ? stepUnlocked(nextStep.id, flags)
    : false;

  function proceed() {
    if (!nextStep || !canProceed) {
      return;
    }
    if (onBeforeProceed && onBeforeProceed() === false) {
      return;
    }
    if (step === 1 && nextStep.id === 2) {
      setConfirmStudioOpen(true);
      return;
    }
    if (nextStep.id === 3) {
      setDraft((current) => prefillLessonFromStudio(current, findStudent));
    }
    router.push(nextStep.href);
  }

  function confirmStudioAndProceed(
    values: Parameters<typeof applyConfirmedStudioContext>[1],
  ) {
    const profileHref = nextStep?.href ?? "/design/profile";
    setDraft((current) => applyConfirmedStudioContext(current, values));
    setConfirmStudioOpen(false);
    router.push(profileHref);
  }

  return (
    <div className="flex flex-1 flex-col bg-paper pb-20">
      <ConfirmStudioContextModal
        open={confirmStudioOpen}
        initial={confirmStudioInitial}
        onCancel={() => setConfirmStudioOpen(false)}
        onConfirm={confirmStudioAndProceed}
      />
      <AppNav />
      <div className="no-print mx-auto w-full max-w-layout pt-6">
        <ol className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {STEPS.map((item) => {
            const unlocked =
              item.id === 1 || (hydrated && stepUnlocked(item.id, flags));
            const current = item.id === step;
            const done =
              hydrated &&
              ((item.id === 1 && flags.footprint) ||
                (item.id === 2 && flags.learner) ||
                (item.id === 3 && flags.pedagogy));
            const className = current
              ? "bg-teal-ink text-white ring-teal-ink"
              : unlocked
                ? "bg-white text-zinc-800 ring-teal-100 hover:ring-teal-300"
                : "cursor-not-allowed bg-white/70 text-zinc-400 ring-zinc-200";

            const inner = (
              <>
                <span className="text-xs font-semibold tracking-wide uppercase">
                  第 {item.id} 步
                  {done && !current ? " · 完成 · done" : ""}
                </span>
                <span className="mt-1 block text-sm font-medium">{item.zh}</span>
                <span className="block text-xs opacity-80">{item.en}</span>
              </>
            );

            if (!unlocked) {
              return (
                <li
                  key={item.id}
                  className={`rounded-2xl px-3 py-3 ring-1 ${className}`}
                  aria-disabled
                >
                  {inner}
                </li>
              );
            }

            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`block rounded-2xl px-3 py-3 ring-1 transition ${className}`}
                  aria-current={current ? "step" : undefined}
                >
                  {inner}
                </Link>
              </li>
            );
          })}
        </ol>
      </div>

      <main
        className={`studio-enter mx-auto flex w-full flex-col items-center pt-8 ${
          wide ? "max-w-layout-wide" : "max-w-layout-medium"
        }`}
      >
        <p className="mx-auto max-w-layout-prose text-center text-sm font-semibold tracking-wide text-teal-ink uppercase">
          {kickerEn ? (
            <BilingualStack
              zh={kicker}
              en={kickerEn}
              zhClassName=""
              enClassName="font-normal normal-case text-teal-700/80"
            />
          ) : (
            kicker
          )}
        </p>
        <h1
          className={`mx-auto mt-2 max-w-layout-prose text-center text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl ${
            description ? "mb-0" : "mb-8"
          }`}
        >
          {titleEn ? (
            <BilingualStack
              zh={title}
              en={titleEn}
              layout="auto"
              zhClassName=""
              enClassName="font-medium text-zinc-500 sm:text-2xl"
            />
          ) : (
            title
          )}
        </h1>
        {belowTitle ? (
          <div className="mb-2 w-full">{belowTitle}</div>
        ) : null}
        {description ? (
          <p className="mx-auto mt-3 mb-8 max-w-layout-prose text-center text-base leading-7 text-zinc-600">
            {descriptionEn ? (
              <BilingualStack
                zh={description}
                en={descriptionEn}
                layout="auto"
                enClassName="text-sm text-zinc-500"
              />
            ) : (
              description
            )}
          </p>
        ) : null}
        {children}

        {learnerPickedNotAnalyzed ? (
          <div
            className="mt-8 w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-100"
            role="status"
          >
            <BilingualStack
              layout="stack"
              zh="請在右側「Profile Synthesizer」按「執行分析」，整合 Step 1 與學生 IEP 後，才可前往教學策略。"
              en="Run Analysis in the Profile Synthesizer panel (right) before proceeding to the pedagogical strategy step."
              enClassName="text-amber-900/85"
            />
          </div>
        ) : null}

        <div className="no-print mt-8 flex w-full flex-wrap items-center justify-between gap-3">
          {prevStep ? (
            <Link
              href={prevStep.href}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
            >
              返回 · Back · {prevStep.zh}
            </Link>
          ) : (
            <span />
          )}
          {nextStep ? (
            <button
              type="button"
              disabled={!canProceed}
              onClick={proceed}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold text-white ${
                canProceed
                  ? "unlock-pop bg-teal-ink hover:bg-teal-700"
                  : "bg-zinc-300"
              }`}
            >
              {proceedLabel ? (
                proceedLabelEn ? (
                  <BilingualStack
                    zh={proceedLabel}
                    en={proceedLabelEn}
                    layout="auto"
                    enClassName="text-xs font-medium opacity-90"
                  />
                ) : (
                  proceedLabel
                )
              ) : (
                <BilingualStack
                  zh={`前往${nextStep.zh}`}
                  en={`Proceed to ${nextStep.en}`}
                  layout="auto"
                  enClassName="text-xs font-medium opacity-90"
                />
              )}
            </button>
          ) : (
            <Link
              href="/chat"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
            >
              Start another design
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
