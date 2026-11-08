"use client";

import { useState } from "react";
import {
  formatUdlStrategiesMarkdown,
  formatUdlTheoryMarkdown,
} from "@/lib/pedagogy-strategy";
import type {
  PedagogicalStrategyState,
  PedagogyIndividualizedRow,
} from "@/lib/workflow-draft";
import { BilingualStack } from "./Bilingual";
import PedagogyIndividualizedDetailDialog from "./PedagogyIndividualizedDetailDialog";
import PedagogyStrategyResultDialog, {
  type PedagogyStrategyResultPanel,
} from "./PedagogyStrategyResultDialog";

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

function studentShortName(row: PedagogyIndividualizedRow) {
  const profile = row.studentProfile.trim();
  if (!profile) {
    return "Student";
  }
  return profile.split("(")[0]?.trim() || profile;
}

type PedagogyStrategyWorkspaceProps = {
  pedagogy: PedagogicalStrategyState;
  contextReady: boolean;
  hasBaseline: boolean;
  baselineLoading: boolean;
  baselineError: string;
  refineBusy: boolean;
  onRefineUdl: () => void;
  onRefineStudent: (index: number) => void;
};

export default function PedagogyStrategyWorkspace({
  pedagogy,
  contextReady,
  hasBaseline,
  baselineLoading,
  baselineError,
  refineBusy,
  onRefineUdl,
  onRefineStudent,
}: PedagogyStrategyWorkspaceProps) {
  const [resultDialog, setResultDialog] =
    useState<PedagogyStrategyResultPanel | null>(null);
  const [individualRow, setIndividualRow] =
    useState<PedagogyIndividualizedRow | null>(null);

  const udlTheoryText =
    formatUdlTheoryMarkdown(pedagogy.udl) || pedagogy.educationalTheory;
  const udlStrategiesText =
    formatUdlStrategiesMarkdown(pedagogy.udl) || pedagogy.learningStrategies;

  const ready = hasBaseline && !baselineLoading;

  const resultDialogContent =
    resultDialog === "strategies" ? udlStrategiesText : udlTheoryText;

  return (
    <>
      <PedagogyStrategyResultDialog
        open={resultDialog !== null}
        panel={resultDialog ?? "theory"}
        content={resultDialogContent}
        onClose={() => setResultDialog(null)}
      />

      <PedagogyIndividualizedDetailDialog
        open={individualRow !== null}
        row={individualRow}
        onClose={() => setIndividualRow(null)}
      />

      <div className="space-y-4">
        <div
          className={`rounded-2xl px-4 py-3 text-sm ring-1 ${
            baselineError
              ? "border-red-200 bg-red-50 text-red-900 ring-red-100"
              : baselineLoading
                ? "bg-sky-50 text-sky-950 ring-sky-100"
                : ready
                  ? "bg-emerald-50/90 text-emerald-950 ring-emerald-100"
                  : "bg-zinc-50 text-zinc-700 ring-zinc-200"
          }`}
          role="status"
        >
          {baselineLoading ? (
            <BilingualStack
              layout="stack"
              zh="正在依 Step 1–2 產生教學策略…"
              en="Running strategy analysis from Steps 1–2…"
              enClassName="text-sky-900/85"
            />
          ) : baselineError ? (
            <p>{baselineError}</p>
          ) : ready ? (
            <BilingualStack
              layout="stack"
              zh="策略已就緒 · 可細化 UDL 或個別學生"
              en="Strategy ready — refine UDL or individual students"
              enClassName="text-emerald-900/85"
            />
          ) : (
            <BilingualStack
              layout="stack"
              zh="完成 Step 1–2 後將自動執行首次分析；亦可點「細化 UDL」查看對話"
              en="After Steps 1–2, initial analysis runs automatically; open Refine UDL to chat"
              enClassName="text-zinc-500"
            />
          )}
        </div>

        <section className="rounded-3xl bg-white p-5 ring-1 ring-teal-100 sm:p-6">
          <p className="text-xs font-semibold tracking-wide text-teal-ink uppercase">
            <BilingualStack
              zh="通用設計學習 (UDL)"
              en="Universal Design for Learning"
              layout="inline"
              enClassName="text-teal-700/80"
            />
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            <BilingualStack
              zh="全班 · part_1_udl"
              en="Class-wide · part_1_udl"
              layout="inline"
              enClassName="text-zinc-400"
            />
          </p>

          <div className="mt-3 space-y-3">
            <StrategyPreviewCard
              titleZh='教育理論 (The "Why")'
              titleEn="Educational Theory"
              preview={briefSummary(udlTheoryText)}
              loading={baselineLoading}
              onOpen={() => setResultDialog("theory")}
              disabled={!udlTheoryText.trim()}
            />
            <StrategyPreviewCard
              titleZh='支援策略 (The "How")'
              titleEn="Class Learning Strategies"
              preview={briefSummary(udlStrategiesText)}
              loading={baselineLoading}
              onOpen={() => setResultDialog("strategies")}
              disabled={!udlStrategiesText.trim()}
            />
          </div>

          <button
            type="button"
            disabled={!contextReady || refineBusy}
            onClick={onRefineUdl}
            className="mt-4 w-full rounded-full bg-teal-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            <BilingualStack
              zh="與助手細化 UDL"
              en="Refine UDL with assistant"
              layout="auto"
            />
          </button>
        </section>

        <section className="rounded-3xl bg-white p-5 ring-1 ring-teal-100 sm:p-6">
          <p className="text-xs font-semibold tracking-wide text-teal-ink uppercase">
            <BilingualStack
              zh="個別調適"
              en="Individualized support"
              layout="inline"
              enClassName="text-teal-700/80"
            />
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            <BilingualStack
              zh="part_2_individualized"
              en="Per-student theory, strategies, and modes"
              layout="inline"
              enClassName="text-zinc-400"
            />
          </p>

          <div className="mt-3 space-y-2">
            {baselineLoading ? (
              <p className="text-xs text-zinc-500">
                <BilingualStack zh="分析中…" en="Analyzing…" layout="inline" />
              </p>
            ) : pedagogy.individualized.length === 0 ? (
              <p className="rounded-2xl bg-zinc-50 px-4 py-3 text-xs text-zinc-500 ring-1 ring-zinc-200">
                <BilingualStack
                  layout="stack"
                  zh="尚無個別調適列 · 此班可以 UDL 全班策略為主"
                  en="No individualized rows — class-wide UDL may be sufficient"
                  enClassName="text-zinc-400"
                />
              </p>
            ) : (
              pedagogy.individualized.map((row, index) => (
                <article
                  key={`${row.studentProfile}-${index}`}
                  className="rounded-2xl bg-zinc-50/80 p-4 ring-1 ring-zinc-200/90"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900">
                        {studentShortName(row)}
                      </p>
                      {row.studentProfile.trim() ? (
                        <p className="mt-0.5 text-[11px] text-zinc-500">
                          {row.studentProfile.trim()}
                        </p>
                      ) : null}
                    </div>
                    {row.appliedModes.length > 0 ? (
                      <div className="flex max-w-[14rem] flex-wrap justify-end gap-1">
                        {row.appliedModes.map((mode) => (
                          <span
                            key={mode}
                            className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-900 ring-1 ring-sky-200"
                          >
                            {mode}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-600">
                    {briefSummary(
                      [row.educationalTheoryZh, row.learningStrategiesZh]
                        .filter(Boolean)
                        .join(" "),
                    )}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setIndividualRow(row)}
                      className="rounded-full px-3 py-1 text-[11px] font-medium text-teal-ink ring-1 ring-teal-200 hover:bg-teal-50"
                    >
                      查看詳情 · Details
                    </button>
                    <button
                      type="button"
                      disabled={!contextReady || refineBusy}
                      onClick={() => onRefineStudent(index)}
                      className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-teal-ink ring-1 ring-teal-300 hover:bg-teal-50 disabled:opacity-50"
                    >
                      細化此學生 · Refine
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function StrategyPreviewCard({
  titleZh,
  titleEn,
  preview,
  loading,
  disabled,
  onOpen,
}: {
  titleZh: string;
  titleEn: string;
  preview: string;
  loading: boolean;
  disabled: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onOpen}
      disabled={disabled}
      className="block w-full rounded-2xl bg-zinc-50/80 p-4 text-left ring-1 ring-zinc-200/90 transition hover:bg-teal-50/40 hover:ring-teal-200 disabled:cursor-default disabled:opacity-70"
    >
      <h3 className="text-sm font-semibold text-zinc-900">
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
        <p className="mt-2 text-xs text-zinc-500">
          {loading ? "分析中… · Analyzing…" : "尚無輸出 · No output yet"}
        </p>
      )}
      {!disabled ? (
        <p className="mt-2 text-[11px] font-medium text-teal-ink">
          查看全文 · View all
        </p>
      ) : null}
    </button>
  );
}
