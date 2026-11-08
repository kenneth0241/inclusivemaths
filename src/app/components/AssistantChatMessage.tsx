"use client";

import { useState } from "react";
import { extractLastFollowUpPayload } from "@/lib/chat-follow-ups";
import {
  formatChatDisplayText,
  splitChatThinkContent,
} from "@/lib/chat-think";
import type { DifyRetrieverResource } from "@/lib/dify-citations";
import DifyCitationsList from "./DifyCitationsList";
import MarkdownRichText from "./MarkdownRichText";

type AssistantChatMessageProps = {
  content: string;
  isStreaming: boolean;
  citations?: DifyRetrieverResource[];
  /** Pedagogy refine: do not strip trailing JSON follow-up payloads from the answer. */
  skipFollowUpExtraction?: boolean;
  /** Render the visible answer with GFM markdown (tables, headings, lists). */
  useMarkdown?: boolean;
};

export default function AssistantChatMessage({
  content,
  isStreaming,
  citations = [],
  skipFollowUpExtraction = false,
  useMarkdown = false,
}: AssistantChatMessageProps) {
  const { think, answer } = splitChatThinkContent(content);
  const [manuallyOpen, setManuallyOpen] = useState(false);
  const showThinkBody = manuallyOpen || !isStreaming;

  const answerBody = answer || (!think ? content : "");
  const visibleAnswer = answerBody
    ? skipFollowUpExtraction
      ? answerBody
      : extractLastFollowUpPayload(answerBody).textWithout
    : "";

  return (
    <>
      {think ? (
        <details
          open={manuallyOpen}
          className="mb-3 rounded-xl border border-zinc-200 bg-white/80"
          onToggle={(event) => {
            setManuallyOpen((event.currentTarget as HTMLDetailsElement).open);
          }}
        >
          <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-zinc-500">
            {isStreaming ? (
              <span className="inline-flex items-center gap-1.5">
                <span>Reasoning in progress</span>
                <span
                  className="inline-block size-1.5 animate-pulse rounded-full bg-zinc-400"
                  aria-hidden
                />
              </span>
            ) : (
              "Show reasoning"
            )}
          </summary>
          {showThinkBody ? (
            <p className="max-h-72 overflow-y-auto border-t border-zinc-100 px-3 py-2 whitespace-pre-wrap text-xs leading-5 text-zinc-600">
              {think}
            </p>
          ) : null}
        </details>
      ) : null}

      {visibleAnswer ? (
        useMarkdown ? (
          <MarkdownRichText
            content={formatChatDisplayText(visibleAnswer)}
            className="leading-normal"
          />
        ) : (
          <p className="whitespace-pre-wrap leading-normal">
            {formatChatDisplayText(visibleAnswer)}
          </p>
        )
      ) : isStreaming ? (
        <p className="text-sm text-zinc-500">
          {think ? "Composing reply…" : "…"}
        </p>
      ) : null}

      {!isStreaming && citations.length > 0 ? (
        <DifyCitationsList citations={citations} className="mt-3" />
      ) : null}
    </>
  );
}
