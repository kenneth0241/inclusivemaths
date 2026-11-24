"use client";

import type { WorksheetStructuredOutput } from "@/lib/worksheet-structured-output";
import { BilingualStack } from "./Bilingual";
import WorksheetSvgPreview from "./WorksheetSvgPreview";

type WorksheetStructuredPreviewProps = {
  output: WorksheetStructuredOutput;
};

export default function WorksheetStructuredPreview({
  output,
}: WorksheetStructuredPreviewProps) {
  const title =
    output.worksheet_title.trim() ||
    output.topic_summary.trim() ||
    "Worksheet";

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h3 className="text-2xl font-semibold text-zinc-900">{title}</h3>
        {output.student_name.trim() ? (
          <p className="text-sm text-zinc-600">
            <BilingualStack
              zh={`學生：${output.student_name.trim()}`}
              en={`Student: ${output.student_name.trim()}`}
              layout="inline"
            />
          </p>
        ) : null}
        {output.teacher_note.trim() ? (
          <p className="rounded-xl bg-teal-50/80 px-3 py-2 text-xs leading-5 text-teal-950 ring-1 ring-teal-100">
            {output.teacher_note.trim()}
            {output.status ? (
              <span className="mt-1 block text-teal-800/80">
                Status: {output.status}
              </span>
            ) : null}
          </p>
        ) : null}
      </header>

      <ol className="space-y-8">
        {output.items.map((item) => (
          <li
            key={item.number}
            className="rounded-2xl border border-zinc-100 bg-zinc-50/40 p-5"
          >
            <h4 className="text-lg font-semibold text-zinc-900">
              <BilingualStack
                zh={`第 ${item.number} 題`}
                en={`Question ${item.number}`}
                layout="inline"
              />
            </h4>
            {item.objective.trim() ? (
              <p className="mt-1 text-sm italic text-zinc-600">
                {item.objective.trim()}
              </p>
            ) : null}
            {item.student_text.trim() ? (
              <div className="mt-4 space-y-2 text-lg leading-9 text-zinc-900">
                {item.student_text.split("\n").map((line, index) =>
                  line.trim() ? (
                    <p key={index}>{line}</p>
                  ) : (
                    <div key={index} className="h-1" />
                  ),
                )}
              </div>
            ) : null}
            {item.highlight_keywords.length > 0 ? (
              <p className="mt-2 text-sm text-zinc-600">
                <span className="font-medium">
                  <BilingualStack zh="關鍵字" en="Keywords" layout="inline" />:
                </span>{" "}
                {item.highlight_keywords.join(", ")}
              </p>
            ) : null}
            {item.step_breakdown.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-700">
                {item.step_breakdown.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            ) : null}
            {item.svg_code.trim() ? (
              <WorksheetSvgPreview
                svgCode={item.svg_code}
                caption={item.visual_asset.trim() || undefined}
              />
            ) : item.visual_asset.trim() ? (
              <p className="mt-3 text-sm text-zinc-500">{item.visual_asset}</p>
            ) : null}
            {item.options.length > 0 ? (
              <ul className="mt-4 space-y-2 text-base">
                {item.options.map((opt, index) => (
                  <li
                    key={opt}
                    className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-zinc-200"
                  >
                    <span
                      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-semibold text-teal-900"
                      aria-hidden
                    >
                      {String.fromCharCode(65 + index)}
                    </span>
                    {opt}
                  </li>
                ))}
              </ul>
            ) : null}
            {(item.teacher_review.answer ||
              item.teacher_review.marking_criterion) && (
              <details className="mt-4 rounded-xl bg-white px-3 py-2 text-xs text-zinc-600 ring-1 ring-zinc-200">
                <summary className="cursor-pointer font-medium text-zinc-800">
                  <BilingualStack
                    zh="教師參考（勿印給學生）"
                    en="Teacher reference (do not print for pupils)"
                    layout="inline"
                  />
                </summary>
                <ul className="mt-2 space-y-1 pl-1">
                  {item.teacher_review.answer ? (
                    <li>
                      Answer: {item.teacher_review.answer}
                      {item.teacher_review.unit
                        ? ` ${item.teacher_review.unit}`
                        : ""}
                    </li>
                  ) : null}
                  {item.teacher_review.marking_criterion ? (
                    <li>Marking: {item.teacher_review.marking_criterion}</li>
                  ) : null}
                  {item.teacher_review.applied_adaptation ? (
                    <li>Adaptation: {item.teacher_review.applied_adaptation}</li>
                  ) : null}
                </ul>
              </details>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}