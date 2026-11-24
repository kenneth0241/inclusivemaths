"use client";

import { useEffect, useId, useState } from "react";
import {
  clampQuestionCount,
  defaultQuestionCountForTarget,
  WORKSHEET_RESPONSE_FORMATS,
  type WorksheetParameters,
  type WorksheetResponseFormatId,
} from "@/lib/worksheet-parameters";
import { BilingualStack } from "./Bilingual";

type WorksheetParametersFormProps = {
  value: WorksheetParameters;
  disabled?: boolean;
  adaptiveHint: { isUdl: boolean; isSen: boolean };
  onChange: (next: WorksheetParameters) => void;
};

export default function WorksheetParametersForm({
  value,
  disabled = false,
  adaptiveHint,
  onChange,
}: WorksheetParametersFormProps) {
  const panelId = useId();
  const [expanded, setExpanded] = useState(true);
  const suggested = defaultQuestionCountForTarget({
    isUdl: adaptiveHint.isUdl,
    isSen: adaptiveHint.isSen,
  });

  useEffect(() => {
    setExpanded(true);
  }, [adaptiveHint.isUdl, adaptiveHint.isSen]);

  return (
    <section className="rounded-3xl bg-white ring-1 ring-teal-100">
      <header className="relative z-20 flex flex-wrap items-start justify-between gap-3 p-5 pb-0 sm:p-6 sm:pb-0">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-teal-ink uppercase">
            <BilingualStack
              zh="工作紙參數"
              en="Worksheet parameters"
              layout="inline"
              enClassName="text-teal-700/80"
            />
          </p>
          {expanded ? (
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              <BilingualStack
                zh="依所選 SEN 學習者調整題數與作答形式；預設 SEN 6 題、一般 10 題，可自行修改。"
                en="Per SEN learner: default 6 items (SEN) or 10 (general), editable."
                layout="stack"
                enClassName="text-zinc-400"
              />
            </p>
          ) : (
            <p className="mt-2 text-xs text-zinc-600">
              <BilingualStack
                zh={`${value.questionCount} 題 · ${WORKSHEET_RESPONSE_FORMATS.find((f) => f.id === value.responseFormat)?.titleZh ?? value.responseFormat}`}
                en={`${value.questionCount} items`}
                layout="inline"
              />
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="shrink-0 rounded-full bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100"
        >
          <BilingualStack
            zh={expanded ? "收合" : "展開"}
            en={expanded ? "Collapse" : "Expand"}
            layout="inline"
          />
        </button>
      </header>

      <div
        id={panelId}
        hidden={!expanded}
        className="space-y-5 p-5 pt-4 sm:p-6 sm:pt-4"
      >
        <label className="block">
          <span className="text-xs font-medium text-zinc-700">
            <BilingualStack
              zh="題數 question_count"
              en="Number of questions"
              layout="inline"
            />
          </span>
          <p className="mt-1 text-xs text-zinc-500">
            <BilingualStack
              zh={`建議（自適應）：${suggested} 題`}
              en={`Adaptive default: ${suggested} items`}
              layout="inline"
            />
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="number"
              min={1}
              max={40}
              step={1}
              disabled={disabled}
              value={value.questionCount}
              onChange={(event) =>
                onChange({
                  ...value,
                  questionCount: clampQuestionCount(Number(event.target.value)),
                })
              }
              className="w-28 rounded-2xl border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 text-sm text-zinc-900 focus:border-teal-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 disabled:opacity-60"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                onChange({ ...value, questionCount: suggested })
              }
              className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-900 ring-1 ring-teal-100 disabled:opacity-40"
            >
              <BilingualStack
                zh="套用建議題數"
                en="Use adaptive default"
                layout="inline"
              />
            </button>
          </div>
        </label>

        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-zinc-700">
            <BilingualStack
              zh="作答形式 response_format"
              en="Answer mode"
              layout="inline"
            />
          </legend>
          <ul className="grid gap-2">
            {WORKSHEET_RESPONSE_FORMATS.map((preset) => {
              const selected = value.responseFormat === preset.id;
              return (
                <li key={preset.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    aria-pressed={selected}
                    onClick={() =>
                      onChange({
                        ...value,
                        responseFormat: preset.id as WorksheetResponseFormatId,
                      })
                    }
                    className={`w-full rounded-2xl px-4 py-3 text-left ring-1 transition disabled:opacity-60 ${
                      selected
                        ? "bg-teal-50 ring-teal-300"
                        : "bg-zinc-50/80 ring-zinc-200 hover:ring-teal-200"
                    }`}
                  >
                    <p className="text-sm font-semibold text-zinc-900">
                      <BilingualStack
                        zh={preset.titleZh}
                        en={preset.titleEn}
                        layout="inline"
                        enClassName="font-normal text-zinc-500"
                      />
                    </p>
                    <p className="mt-1 text-xs leading-5 text-zinc-600">
                      <BilingualStack
                        zh={preset.summaryZh}
                        en={preset.summaryEn}
                        layout="stack"
                        enClassName="text-zinc-500"
                      />
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      </div>
    </section>
  );
}