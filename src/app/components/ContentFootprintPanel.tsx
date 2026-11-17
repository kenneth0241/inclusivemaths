"use client";

import { useId, useMemo, useState } from "react";
import type { StudioAnalysisView } from "@/lib/chat-topic-analysis";
import { BilingualStack } from "./Bilingual";
import FootprintFieldFeedback from "./FootprintFieldFeedback";
import FootprintFieldInfo from "./FootprintFieldInfo";
import {
  isFootprintReady,
  type ContentFootprint,
  type FootprintField,
} from "@/lib/workflow-draft";

const FIELDS: {
  key: FootprintField;
  zh: string;
  en: string;
  hint: string;
}[] = [
  {
    key: "scope",
    zh: "具體範圍與限制",
    en: "Specific Scope & Constraints",
    hint: "(e.g. 10 以內加法，不涉及進位)",
  },
];

export type ContentFootprintStudioProps = {
  analysis: StudioAnalysisView;
  busy: boolean;
  loading: boolean;
  error: string;
  difyConfigured: boolean;
};

function FootprintSectionTitle() {
  return (
    <h2 className="text-lg font-semibold text-zinc-900">
      <span>內容足跡</span>
      <span className="font-normal text-zinc-500"> · Content Footprint</span>
    </h2>
  );
}

function FieldQualityIndex({
  field,
  score,
  threshold,
  feedback,
  loading,
}: {
  field: FootprintField;
  score: number;
  threshold: number;
  feedback: string | null;
  loading: boolean;
}) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const maxScore = 5;
  const barColor =
    score >= threshold
      ? "bg-emerald-500"
      : score >= threshold - 1
        ? "bg-amber-400"
        : "bg-zinc-300";
  const barPercent = score > 0 ? (score / maxScore) * 100 : 0;
  const feedbackText = feedback?.trim() ?? "";
  const showFeedback = feedbackText.length > 0 && !loading;

  return (
  <>
    <div className="rounded-xl bg-white/80 px-3 py-2 ring-1 ring-zinc-200/80">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <BilingualStack
          zh="資訊完整度"
          en="Information completeness"
          layout="inline"
          zhClassName="text-xs font-semibold text-zinc-700"
          enClassName="text-xs text-zinc-500"
        />
        <p className="text-sm tabular-nums text-zinc-600">
          {loading ? (
            <span className="text-zinc-500">…</span>
          ) : score > 0 ? (
            <>
              <span className="text-base font-semibold text-zinc-900">
                {score}
              </span>
              <span className="text-zinc-400"> / 5</span>
            </>
          ) : (
            <span className="text-zinc-400">— / 5</span>
          )}
        </p>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100"
        role="meter"
        aria-valuenow={loading ? 0 : score}
        aria-valuemin={0}
        aria-valuemax={maxScore}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${loading ? 0 : barPercent}%` }}
        />
      </div>
      {showFeedback ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setFeedbackOpen(true);
          }}
          className="mt-2 w-full rounded-lg border border-zinc-100 bg-zinc-50/80 px-2.5 py-2 text-left transition hover:border-teal-100 hover:bg-teal-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
          aria-haspopup="dialog"
          aria-expanded={feedbackOpen}
        >
          <BilingualStack
            zh="回饋"
            en="Feedback"
            layout="inline"
            zhClassName="text-[11px] font-semibold text-zinc-700"
            enClassName="text-[11px] text-zinc-500"
          />
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-600">
            {feedbackText}
          </p>
          <p className="mt-1 text-[11px] font-medium text-teal-ink">
            <BilingualStack
              zh="點擊查看完整回饋"
              en="Tap for full feedback"
              layout="inline"
              enClassName="text-teal-700/80"
            />
          </p>
        </button>
      ) : null}
    </div>
    <FootprintFieldFeedback
      field={field}
      feedback={feedbackText}
      open={feedbackOpen}
      onClose={() => setFeedbackOpen(false)}
    />
  </>
  );
}

type ContentFootprintPanelProps = {
  footprint: ContentFootprint;
  flashed: Partial<Record<FootprintField, boolean>>;
  compact?: boolean;
  onChange: (field: FootprintField, value: string) => void;
  studio: ContentFootprintStudioProps;
};

export default function ContentFootprintPanel({
  footprint,
  flashed,
  compact = false,
  onChange,
  studio,
}: ContentFootprintPanelProps) {
  const fieldIdPrefix = useId();
  const { analysis, busy, loading, error, difyConfigured } = studio;
  const ready = isFootprintReady(footprint);
  const filledCount = FIELDS.filter((field) => footprint[field.key].trim()).length;
  const qualityByField: Record<FootprintField, number> = {
    scope: analysis.quality.scope,
  };
  const feedbackByField: Record<FootprintField, string | null> = {
    scope: analysis.scopeFeedback ?? analysis.scopeQualityReason,
  };

  const sourceNote = difyConfigured
    ? {
        zh: "由 Dify Workflow 分析對話並填入足跡。",
        en: "Filled from Dify conversation analysis.",
      }
    : {
        zh: "未設定 Dify 時以本機規則填入；可編輯以鎖定欄位。",
        en: "Local rules when Dify is off. Edit to lock a field.",
      };

  const topicSummaryText =
    footprint.topicSummary.trim() || analysis.summary?.trim() || "";
  const showTopicSummary =
    difyConfigured && (loading || topicSummaryText.length > 0);

  return (
    <section
      className={`flex flex-col gap-3 ${compact ? "" : "rounded-3xl bg-white p-4 ring-1 ring-teal-100 sm:p-5"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <FootprintSectionTitle />
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            <BilingualStack
              layout="stack"
              zh={sourceNote.zh}
              en={sourceNote.en}
              enClassName="text-zinc-500"
            />
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            ready ? "bg-sky-50 text-sky-lock" : "bg-zinc-100 text-zinc-500"
          }`}
        >
          {filledCount}/1
        </span>
      </div>

      {showTopicSummary ? (
        <div className="block w-full rounded-2xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
          <span className="flex min-w-0 items-start gap-1">
            <BilingualStack
              zh="主題摘要"
              en="Topic summary"
              zhClassName="text-sm font-semibold text-zinc-900"
              enClassName="text-zinc-500"
            />
          </span>
          <textarea
            readOnly
            rows={compact ? 3 : 4}
            value={loading && !topicSummaryText ? "…" : topicSummaryText}
            aria-label="主題摘要 · Topic summary"
            className="mt-3 w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm leading-6 text-zinc-900 outline-none read-only:cursor-default read-only:bg-white"
          />
        </div>
      ) : null}

      {FIELDS.map((field) => {
        const value = footprint[field.key];
        const locked = value.trim().length > 0;
        const teacherEdited = footprint.edited[field.key];
        const textareaId = `${fieldIdPrefix}-${field.key}`;
        return (
          <div
            key={field.key}
            className={`block rounded-2xl p-3 ring-1 ${
              flashed[field.key] ? "footprint-flash ring-sky-300" : "ring-zinc-200"
            } ${locked ? "bg-sky-50/50" : "bg-zinc-50"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-1">
                <BilingualStack
                  zh={field.zh}
                  en={field.en}
                  zhClassName="text-sm font-semibold text-zinc-900"
                  enClassName="text-zinc-500"
                />
                <FootprintFieldInfo field={field.key} />
              </div>
              {locked ? (
                <span className="shrink-0 text-[11px] font-medium text-sky-lock">
                  <BilingualStack
                    zh={teacherEdited ? "已由你鎖定" : "已鎖定"}
                    en={teacherEdited ? "Locked by you" : "Locked in"}
                    enClassName="text-sky-lock/80"
                  />
                </span>
              ) : null}
            </div>

            <div className="mt-3 space-y-2">
              <FieldQualityIndex
                field={field.key}
                score={qualityByField[field.key]}
                threshold={analysis.quality.threshold}
                feedback={feedbackByField[field.key]}
                loading={loading}
              />
              <label htmlFor={textareaId} className="sr-only">
                {field.zh} · {field.en}
              </label>
              <textarea
                id={textareaId}
                rows={compact ? 3 : 4}
                value={value}
                onChange={(event) => onChange(field.key, event.target.value)}
                placeholder={field.hint}
                aria-label={`${field.zh} · ${field.en}`}
                className="w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm leading-6 text-zinc-900 outline-none ring-sky-500/20 placeholder:text-zinc-400 focus:ring-4"
              />
            </div>
          </div>
        );
      })}

      {busy || loading ? (
        <p className="text-xs text-zinc-500">
          <BilingualStack
            layout="inline"
            zh={`${busy ? "助理回覆中…" : ""}${loading ? " Workflow 分析中…" : ""}`}
            en={`${busy ? "Assistant replying…" : ""}${loading ? " Workflow running…" : ""}`}
            enClassName="text-zinc-400"
          />
        </p>
      ) : null}

      {!difyConfigured ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-100">
          <BilingualStack
            layout="stack"
            zh={
              <>
                新增 <code className="font-mono">DIFY_APP_TOPIC_API_KEY</code>{" "}
                以啟用資訊完整度評分與 Dify 萃取（見 docs/dify-studio-analysis-workflow.md）。
              </>
            }
            en={
              <>
                Add <code className="font-mono">DIFY_APP_TOPIC_API_KEY</code>{" "}
                for completeness ratings and Dify extraction.
              </>
            }
            enClassName="text-amber-800/85"
          />
        </p>
      ) : null}

      {error ? (
        <div className="space-y-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-red-100">
          <p>{error}</p>
          {error.includes("scope_feedback_placeholder") ||
          error.includes("scope_and_constraints_en") ||
          error.includes("visual_models_en") ||
          error.includes("Structured output validation failed") ||
          error.includes("Additional properties are not allowed") ? (
            <p className="text-red-900/80">
              Dify structured output must use exactly these keys:{" "}
              <code className="font-mono">topic_summary</code>,{" "}
              <code className="font-mono">scope_and_constraints</code>, ratings,{" "}
              <code className="font-mono">scope_feedback</code>. Do not use{" "}
              <code className="font-mono">*_en</code>,{" "}
              <code className="font-mono">*_zh</code>, or{" "}
              <code className="font-mono">*_placeholder</code>. Update the LLM
              schema and system prompt in Textbook_Chat_Analysis (see{" "}
              <code className="font-mono">docs/dify-studio-analysis-workflow.md</code>
              ), then publish again.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function ContentFootprintDrawer({
  footprint,
  flashed,
  onChange,
  studio,
}: Omit<ContentFootprintPanelProps, "compact">) {
  const filledCount = useMemo(
    () =>
      footprint.scope.trim() ? 1 : 0,
    [footprint],
  );
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left text-sm font-medium text-zinc-800 ring-1 ring-teal-100"
        >
          <span>
            <span className="text-zinc-900">內容足跡</span>
            <span className="font-normal text-zinc-500"> · Content Footprint</span>
          </span>
          <span className="text-sky-lock">{filledCount}/1</span>
        </button>
        {open ? (
          <div className="mt-3 rounded-3xl bg-white p-4 ring-1 ring-teal-100">
            <ContentFootprintPanel
              compact
              footprint={footprint}
              flashed={flashed}
              onChange={onChange}
              studio={studio}
            />
          </div>
        ) : null}
      </div>
      <div className="hidden md:block">
        <ContentFootprintPanel
          footprint={footprint}
          flashed={flashed}
          onChange={onChange}
          studio={studio}
        />
      </div>
    </>
  );
}
