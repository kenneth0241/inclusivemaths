"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { formatIndividualizedRowMarkdown } from "@/lib/pedagogy-strategy";
import type { PedagogyIndividualizedRow } from "@/lib/workflow-draft";
import { BilingualStack } from "./Bilingual";
import MarkdownRichText from "./MarkdownRichText";

type PedagogyIndividualizedDetailDialogProps = {
  open: boolean;
  row: PedagogyIndividualizedRow | null;
  onClose: () => void;
};

export default function PedagogyIndividualizedDetailDialog({
  open,
  row,
  onClose,
}: PedagogyIndividualizedDetailDialogProps) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);

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

  if (!open || !mounted || !row) {
    return null;
  }

  const title = row.studentProfile.trim() || "Student";
  const body = formatIndividualizedRowMarkdown(row);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-[4vw]">
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
        className="relative flex max-h-[min(90vh,52rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-zinc-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-100 px-6 py-5">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-zinc-900">
              {title}
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              <BilingualStack
                zh="個別調適 · Individualized support"
                en="Individualized support"
                layout="inline"
              />
            </p>
            {row.appliedModes.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {row.appliedModes.map((mode) => (
                  <span
                    key={mode}
                    className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-medium text-sky-900 ring-1 ring-sky-200"
                  >
                    {mode}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
          >
            關閉 · Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 text-sm">
          <MarkdownRichText content={body} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
