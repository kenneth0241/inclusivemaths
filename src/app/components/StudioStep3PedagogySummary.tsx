"use client";

import type { ReactNode } from "react";
import {
  formatIndividualizedRowMarkdown,
  formatUdlStrategiesMarkdown,
  formatUdlTheoryMarkdown,
} from "@/lib/pedagogy-strategy";
import type {
  PedagogicalStrategyState,
  PedagogyIndividualizedRow,
  PedagogyUdlPart,
} from "@/lib/workflow-draft";
import { BilingualStack } from "./Bilingual";
import MarkdownRichText from "./MarkdownRichText";
import PedagogyAppliedModeChips from "./PedagogyAppliedModeChips";

type StudioStep3PedagogySummaryProps = {
  pedagogy: PedagogicalStrategyState;
};

function studentShortName(row: PedagogyIndividualizedRow) {
  const profile = row.studentProfile.trim();
  if (!profile) {
    return "Student";
  }
  return profile.split("(")[0]?.trim() || profile;
}

function hasText(...values: string[]) {
  return values.some((value) => value.trim().length > 0);
}

export function StudioStep3PedagogySummary({
  pedagogy,
}: StudioStep3PedagogySummaryProps) {
  const udl = pedagogy.udl;
  const theoryFallback =
    formatUdlTheoryMarkdown(udl) || pedagogy.educationalTheory.trim();
  const strategiesFallback =
    formatUdlStrategiesMarkdown(udl) || pedagogy.learningStrategies.trim();

  const hasUdlStructured =
    udl &&
    hasText(
      udl.educationalTheoryZh,
      udl.educationalTheoryEn,
      udl.learningStrategiesZh,
      udl.learningStrategiesEn,
    );
  const hasUdl = Boolean(hasUdlStructured || theoryFallback || strategiesFallback);
  const hasIndividual = pedagogy.individualized.length > 0;

  if (!hasUdl && !hasIndividual) {
    return (
      <p className="text-sm text-zinc-500">
        <BilingualStack
          zh="尚未完成 Step 3 教學策略。"
          en="Step 3 pedagogical strategy is not ready yet."
          layout="stack"
          enClassName="text-zinc-400"
        />
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {hasUdl ? (
        <section className="rounded-2xl bg-zinc-50/60 p-4 ring-1 ring-zinc-200 sm:p-5">
          <header className="mb-4">
            <p className="text-xs font-semibold tracking-wide text-teal-ink uppercase">
              <BilingualStack
                zh="全班 UDL"
                en="Class-wide UDL"
                layout="inline"
                enClassName="text-teal-700/80"
              />
            </p>
          </header>

          {hasUdlStructured && udl ? (
            <div className="space-y-4">
              <TheoryStrategiesBlocks udl={udl} />
            </div>
          ) : (
            <ModuleBlock titleZh='教育理論 (The "Why")' titleEn="Educational Theory">
              <MarkdownRichText content={theoryFallback} />
            </ModuleBlock>
          )}

          {!hasUdlStructured && strategiesFallback ? (
            <div className="mt-4">
              <ModuleBlock
                titleZh='支援策略 (The "How")'
                titleEn="Class learning strategies"
              >
                <MarkdownRichText content={strategiesFallback} />
              </ModuleBlock>
            </div>
          ) : null}
        </section>
      ) : null}

      {hasIndividual ? (
        <section>
          <header className="mb-3">
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
                zh={`${pedagogy.individualized.length} 位學生 · 展開閱讀`}
                en={`${pedagogy.individualized.length} students · expand to read`}
                layout="inline"
                enClassName="text-zinc-400"
              />
            </p>
          </header>
          <ul className="space-y-2">
            {pedagogy.individualized.map((row, index) => (
              <IndividualRowDetails
                key={`${row.studentProfile}-${index}`}
                row={row}
                defaultOpen={index === 0}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function TheoryStrategiesBlocks({ udl }: { udl: PedagogyUdlPart }) {
  return (
    <>
      <ModuleBlock titleZh='教育理論 (The "Why")' titleEn="Educational Theory">
        <BilingualFieldStack
          zh={udl.educationalTheoryZh}
          en={udl.educationalTheoryEn}
        />
      </ModuleBlock>
      <ModuleBlock
        titleZh='支援策略 (The "How")'
        titleEn="Class learning strategies"
      >
        <BilingualFieldStack
          zh={udl.learningStrategiesZh}
          en={udl.learningStrategiesEn}
        />
      </ModuleBlock>
    </>
  );
}

function ModuleBlock({
  titleZh,
  titleEn,
  children,
}: {
  titleZh: string;
  titleEn: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-2xl bg-white px-4 py-4 ring-1 ring-zinc-200/90">
      <h3 className="text-sm font-semibold text-zinc-900">
        <BilingualStack
          zh={titleZh}
          en={titleEn}
          layout="inline"
          enClassName="font-normal text-zinc-500"
        />
      </h3>
      <div className="mt-3">{children}</div>
    </article>
  );
}

function BilingualFieldStack({ zh, en }: { zh: string; en: string }) {
  const hasZh = zh.trim().length > 0;
  const hasEn = en.trim().length > 0;
  if (!hasZh && !hasEn) {
    return (
      <p className="text-xs text-zinc-400">
        <BilingualStack zh="（無內容）" en="(No content)" layout="inline" />
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {hasZh ? (
        <LocaleProse localeZh labelEn="Chinese" content={zh} />
      ) : null}
      {hasEn ? (
        <LocaleProse localeZh={false} labelEn="English" content={en} />
      ) : null}
    </div>
  );
}

function LocaleProse({
  localeZh,
  labelEn,
  content,
}: {
  localeZh: boolean;
  labelEn: string;
  content: string;
}) {
  return (
    <div className="rounded-xl bg-zinc-50/80 px-3 py-3 ring-1 ring-zinc-100">
      <p className="text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">
        {localeZh ? (
          <BilingualStack zh="中文" en={labelEn} layout="inline" />
        ) : (
          labelEn
        )}
      </p>
      <div className="mt-2 text-sm">
        <MarkdownRichText content={content} />
      </div>
    </div>
  );
}

function IndividualRowDetails({
  row,
  defaultOpen,
}: {
  row: PedagogyIndividualizedRow;
  defaultOpen?: boolean;
}) {
  const markdown = formatIndividualizedRowMarkdown(row);
  const name = studentShortName(row);

  return (
    <li>
      <details
        open={defaultOpen}
        className="group rounded-2xl bg-white ring-1 ring-zinc-200/90 open:bg-zinc-50/50"
      >
        <summary className="cursor-pointer list-none px-4 py-3 [&::-webkit-details-marker]:hidden">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900">{name}</p>
              {row.studentProfile.trim() && row.studentProfile.trim() !== name ? (
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  {row.studentProfile.trim()}
                </p>
              ) : null}
            </div>
            {row.appliedModes.length > 0 ? (
              <PedagogyAppliedModeChips
                modes={row.appliedModes}
                className="max-w-full justify-end"
              />
            ) : null}
          </div>
          <p className="mt-2 text-[11px] font-medium text-teal-ink group-open:hidden">
            <BilingualStack zh="展開" en="Expand" layout="inline" />
          </p>
        </summary>
        <div className="border-t border-zinc-100 px-4 pb-4 pt-3">
          {hasText(
            row.educationalTheoryZh,
            row.educationalTheoryEn,
            row.learningStrategiesZh,
            row.learningStrategiesEn,
          ) ? (
            <div className="space-y-4">
              {(row.educationalTheoryZh.trim() ||
                row.educationalTheoryEn.trim()) && (
                <div>
                  <p className="text-xs font-semibold text-zinc-700">
                    <BilingualStack
                      zh="教育理論"
                      en="Educational theory"
                      layout="inline"
                      enClassName="font-normal text-zinc-500"
                    />
                  </p>
                  <div className="mt-2">
                    <BilingualFieldStack
                      zh={row.educationalTheoryZh}
                      en={row.educationalTheoryEn}
                    />
                  </div>
                </div>
              )}
              {(row.learningStrategiesZh.trim() ||
                row.learningStrategiesEn.trim()) && (
                <div>
                  <p className="text-xs font-semibold text-zinc-700">
                    <BilingualStack
                      zh="支援策略"
                      en="Learning strategies"
                      layout="inline"
                      enClassName="font-normal text-zinc-500"
                    />
                  </p>
                  <div className="mt-2">
                    <BilingualFieldStack
                      zh={row.learningStrategiesZh}
                      en={row.learningStrategiesEn}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <MarkdownRichText content={markdown} />
          )}
        </div>
      </details>
    </li>
  );
}
