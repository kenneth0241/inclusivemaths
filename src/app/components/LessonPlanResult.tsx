"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import type { DifyRetrieverResource } from "@/lib/dify-citations";
import type { LessonPlanCitation } from "@/lib/lesson-plan";
import {
  parseLessonSections,
  serializeLessonSections,
} from "@/lib/lesson-template";
import DifyCitationsList from "./DifyCitationsList";

type LessonPlanResultProps = {
  content: string;
  citations?: LessonPlanCitation[];
  streaming?: boolean;
  editable?: boolean;
  onChange?: (markdown: string) => void;
};

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-zinc-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function MarkdownBody({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  function flushList() {
    if (listItems.length === 0) {
      return;
    }
    blocks.push(
      <ul
        key={`list-${blocks.length}`}
        className="my-3 list-disc space-y-1 pl-5 text-zinc-700"
      >
        {listItems.map((item, index) => (
          <li key={index}>{renderInline(item)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  }

  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (trimmed.startsWith("### ")) {
      flushList();
      blocks.push(
        <h4
          key={`h4-${blocks.length}`}
          className="mt-4 text-sm font-semibold text-zinc-900"
        >
          {renderInline(trimmed.slice(4))}
        </h4>,
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushList();
      blocks.push(
        <h3
          key={`h3-${blocks.length}`}
          className="mt-5 text-base font-semibold text-zinc-900"
        >
          {renderInline(trimmed.slice(3))}
        </h3>,
      );
      continue;
    }
    if (trimmed.startsWith("# ")) {
      flushList();
      blocks.push(
        <h2
          key={`h2-${blocks.length}`}
          className="mt-5 text-lg font-semibold text-zinc-900"
        >
          {renderInline(trimmed.slice(2))}
        </h2>,
      );
      continue;
    }
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      listItems.push(trimmed.slice(2));
      continue;
    }
    flushList();
    if (trimmed === "") {
      blocks.push(<div key={`sp-${blocks.length}`} className="h-2" />);
      continue;
    }
    blocks.push(
      <p key={`p-${blocks.length}`} className="leading-7 text-zinc-700">
        {renderInline(trimmed)}
      </p>,
    );
  }

  flushList();
  return <>{blocks}</>;
}

export default function LessonPlanResult({
  content,
  citations = [],
  streaming,
  editable = false,
  onChange,
}: LessonPlanResultProps) {
  const sections = useMemo(() => parseLessonSections(content), [content]);

  if (!content && !streaming) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">
          Lesson plan · 教案
        </h2>
        {streaming ? (
          <span className="text-sm text-teal-ink">Generating…</span>
        ) : null}
      </div>

      {streaming || !editable || sections.length === 0 ? (
        <div className="rounded-3xl bg-white p-6 ring-1 ring-teal-100">
          {content ? (
            <div className="max-w-none text-sm">
              <MarkdownBody content={content} />
            </div>
          ) : (
            <p className="text-zinc-500">Waiting for the first tokens…</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((section, index) => (
            <article
              key={`${section.title}-${index}`}
              className="rounded-3xl bg-white p-5 ring-1 ring-teal-100"
            >
              <h3 className="text-sm font-semibold tracking-wide text-teal-ink uppercase">
                {section.title}
              </h3>
              <textarea
                rows={Math.max(4, section.body.split("\n").length + 1)}
                value={section.body}
                onChange={(event) => {
                  const next = sections.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, body: event.target.value }
                      : item,
                  );
                  onChange?.(serializeLessonSections(next));
                }}
                className="mt-3 w-full resize-y rounded-2xl border border-zinc-200 bg-paper/60 px-4 py-3 text-sm leading-7 text-zinc-800 outline-none ring-teal-500/20 focus:ring-4"
              />
            </article>
          ))}
        </div>
      )}

      {citations.length > 0 ? (
        <DifyCitationsList
          citations={citations as DifyRetrieverResource[]}
          className="border-zinc-100"
        />
      ) : null}
    </div>
  );
}
