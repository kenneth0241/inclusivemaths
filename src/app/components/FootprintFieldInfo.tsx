"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import {
  FOOTPRINT_FIELD_GUIDES,
  type FootprintGuideBlock,
} from "@/lib/content-footprint-field-guides";
import type { FootprintField } from "@/lib/workflow-draft";

type FootprintFieldInfoProps = {
  field: FootprintField;
};

function InfoIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="size-[1.125rem]"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6M12 7h.01" strokeLinecap="round" />
    </svg>
  );
}

function exampleLineClass(line: string) {
  if (line.startsWith("❌")) {
    return "text-red-800";
  }
  if (line.startsWith("✅")) {
    return "text-emerald-900";
  }
  return "text-zinc-800";
}

function GuideBlockView({ block }: { block: FootprintGuideBlock }) {
  return (
    <section className="space-y-4 border-b border-zinc-100 pb-6 last:border-b-0 last:pb-0">
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-zinc-900">{block.headingZh}</h3>
        <p className="whitespace-pre-wrap text-[15px] leading-7 text-zinc-800">
          {block.bodyZh}
        </p>
        {block.examplesZh?.length ? (
          <ul className="list-none space-y-2.5 pl-0">
            {block.examplesZh.map((line) => (
              <li
                key={line}
                className={`whitespace-pre-wrap text-[15px] leading-7 ${exampleLineClass(line)}`}
              >
                {line}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="space-y-3 border-t border-zinc-100 pt-4">
        <h3 className="text-base font-semibold text-zinc-600">{block.headingEn}</h3>
        <p className="whitespace-pre-wrap text-[15px] leading-7 text-zinc-600">
          {block.bodyEn}
        </p>
        {block.examplesEn?.length ? (
          <ul className="list-none space-y-2.5 pl-0">
            {block.examplesEn.map((line) => (
              <li
                key={line}
                className={`whitespace-pre-wrap text-[15px] leading-7 ${exampleLineClass(line)}`}
              >
                {line}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

export default function FootprintFieldInfo({ field }: FootprintFieldInfoProps) {
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const guide = FOOTPRINT_FIELD_GUIDES[field];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const dialog =
    open && mounted ? (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-[5vw]">
        <button
          type="button"
          className="absolute inset-0 bg-zinc-900/40"
          aria-label="關閉 · Close"
          onClick={() => setOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="relative flex max-h-[min(88vh,52rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-zinc-200"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-100 px-6 py-5 sm:px-8">
            <div>
              <h2 id={titleId} className="text-lg font-semibold text-zinc-900">
                {guide.titleZh}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">{guide.titleEn}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
            >
              關閉 · Close
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-7">
            <div className="space-y-6">
              {guide.blocks.map((block) => (
                <GuideBlockView key={block.headingZh} block={block} />
              ))}
            </div>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <>
      <button
        type="button"
        className={`inline-flex shrink-0 rounded-full p-1 align-top focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 ${
          open
            ? "bg-sky-100 text-teal-ink"
            : "text-sky-lock hover:bg-sky-50 hover:text-teal-ink"
        }`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="欄位說明 · Field guidance"
        onClick={() => setOpen(true)}
      >
        <InfoIcon />
      </button>
      {mounted && dialog ? createPortal(dialog, document.body) : null}
    </>
  );
}
