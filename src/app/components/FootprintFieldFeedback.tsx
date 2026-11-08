"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import type { FootprintField } from "@/lib/workflow-draft";
import { BilingualStack } from "./Bilingual";

const FIELD_TITLES: Record<
  FootprintField,
  { zh: string; en: string }
> = {
  scope: {
    zh: "具體範圍與限制",
    en: "Specific Scope & Constraints",
  },
  visualModels: {
    zh: "視覺圖解與表達",
    en: "Visual Models & Representations",
  },
};

type FootprintFieldFeedbackProps = {
  field: FootprintField;
  feedback: string;
  open: boolean;
  onClose: () => void;
};

export default function FootprintFieldFeedback({
  field,
  feedback,
  open,
  onClose,
}: FootprintFieldFeedbackProps) {
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const [mounted, setMounted] = useState(false);
  const titles = FIELD_TITLES[field];

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
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const dialog =
    open && mounted ? (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-[5vw]">
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
          className="relative flex max-h-[min(80vh,36rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-zinc-200"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-100 px-6 py-5">
            <div>
              <p className="text-xs font-semibold tracking-wide text-teal-ink uppercase">
                回饋 · Feedback
              </p>
              <h2 id={titleId} className="mt-1 text-lg font-semibold text-zinc-900">
                {titles.zh}
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500">{titles.en}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
            >
              關閉 · Close
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <p className="whitespace-pre-wrap text-[15px] leading-7 text-zinc-800">
              {feedback}
            </p>
          </div>
        </div>
      </div>
    ) : null;

  return mounted && dialog ? createPortal(dialog, document.body) : null;
}
