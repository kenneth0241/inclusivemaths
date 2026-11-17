"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import type { StudioContextConfirmValues } from "@/lib/workflow-draft";
import { BilingualStack } from "./Bilingual";

type ConfirmStudioContextModalProps = {
  open: boolean;
  initial: StudioContextConfirmValues;
  onCancel: () => void;
  onConfirm: (values: StudioContextConfirmValues) => void;
};

const FIELDS: {
  key: keyof StudioContextConfirmValues;
  zh: string;
  en: string;
  rows: number;
}[] = [
  {
    key: "topicSummary",
    zh: "主題摘要",
    en: "Topic summary",
    rows: 4,
  },
  {
    key: "scope",
    zh: "具體範圍與限制",
    en: "Specific scope & constraints",
    rows: 4,
  },
];

export default function ConfirmStudioContextModal({
  open,
  initial,
  onCancel,
  onConfirm,
}: ConfirmStudioContextModalProps) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [values, setValues] = useState(initial);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setValues(initial);
    }
  }, [open, initial]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onCancel]);

  const canConfirm =
    values.topicSummary.trim().length > 0 &&
    values.scope.trim().length > 0;

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-[5vw]">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/40"
        aria-label="關閉 · Close"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[min(90vh,52rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-zinc-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 border-b border-zinc-100 px-6 py-5 sm:px-8">
          <h2 id={titleId} className="text-lg font-semibold text-zinc-900">
            <BilingualStack
              zh="確認內容足跡"
              en="Confirm content footprint"
              layout="stack"
              enClassName="text-base font-medium text-zinc-500"
            />
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            <BilingualStack
              layout="stack"
              zh="請檢查並編輯主題摘要與具體範圍，確認後會儲存並顯示於第二步（學習者檔案）。"
              en="Review topic summary and scope. After you confirm, they are saved and shown on Step 2 (Learner profile)."
              enClassName="text-zinc-500"
            />
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5 sm:px-8">
          {FIELDS.map((field) => (
            <label key={field.key} className="block">
              <BilingualStack
                zh={field.zh}
                en={field.en}
                zhClassName="text-sm font-semibold text-zinc-900"
                enClassName="text-sm text-zinc-500"
              />
              <textarea
                rows={field.rows}
                value={values[field.key]}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [field.key]: event.target.value,
                  }))
                }
                className="mt-2 w-full resize-y rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 text-zinc-900 outline-none ring-teal-500/20 focus:ring-4"
              />
            </label>
          ))}
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-zinc-100 px-6 py-4 sm:px-8">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
          >
            <BilingualStack
              zh="取消"
              en="Cancel"
              layout="inline"
              enClassName="text-zinc-500"
            />
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() =>
              onConfirm({
                topicSummary: values.topicSummary.trim(),
                scope: values.scope.trim(),
              })
            }
            className={`rounded-full px-5 py-2.5 text-sm font-semibold text-white ${
              canConfirm
                ? "bg-teal-ink hover:bg-teal-700"
                : "cursor-not-allowed bg-zinc-300"
            }`}
          >
            <BilingualStack
              zh="確認並繼續"
              en="Confirm and continue"
              layout="inline"
              enClassName="text-xs font-medium opacity-90"
            />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
