"use client";

import Image from "next/image";
import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type PedagogyExecutiveSummaryDialogProps = {
  open: boolean;
  onClose: () => void;
};

function SummarySection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2 border-b border-zinc-100 pb-5 last:border-b-0 last:pb-0">
      <h3 className="text-base font-semibold text-zinc-900">{heading}</h3>
      <div className="space-y-2 text-[15px] leading-7 text-zinc-800">{children}</div>
    </section>
  );
}

export default function PedagogyExecutiveSummaryDialog({
  open,
  onClose,
}: PedagogyExecutiveSummaryDialogProps) {
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

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 pt-[min(12vh,6rem)] sm:p-6">
      <button
        type="button"
        className="fixed inset-0 bg-zinc-900/45"
        aria-label="關閉 · Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative mb-8 flex max-h-[min(88vh,52rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-zinc-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4 sm:px-7">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-zinc-900">
              ✨ 摘要 (Summary)
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Pedagogical Strategy Selector
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
          >
            關閉 · Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          <ExecutiveSummaryZh />
          <div className="mt-8 border-t border-zinc-200 pt-8">
            <ExecutiveSummaryEn />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ExecutiveSummaryZh() {
  return (
    <SummaryLocaleGroup locale="zh">
      <p>
        <strong>教學策略選擇器 (Pedagogical Strategy Selector)</strong>
        能即時分析你匯入的「第一步：教學主題」與「第二步：學生學習概覽」，為你的課堂提供精準的差異化教學指引，並一鍵產出教材：
      </p>
      <SummarySection heading='教育理論 (Educational Theory - The "Why")'>
        <p>
          系統會根據學生的認知瓶頸（如讀寫障礙、工作記憶弱等），自動推薦最合適的宏觀教學框架（例如：CPA
          模式、通用設計學習 UDL），並清楚解釋為什麼這種教學法能有效移除本班的特定學習障礙。
        </p>
      </SummarySection>
      <SummarySection heading='支援策略 (Learning Strategies - The "How")'>
        <p>
          將抽象理論轉化為具體可行的操作步驟。系統會為你配對並建議啟用對應的「調適模式」（如：簡化模式、拆解模式、視覺模式），讓你清楚知道如何調整教材，精準解決學生在閱讀、專注力或視覺處理上的困難。
        </p>
      </SummarySection>
      <figure className="mt-6 overflow-hidden rounded-2xl ring-1 ring-zinc-200">
        <Image
          src="/images/pedagogy-scaffolding-modes.webp"
          alt="簡化模式、拆解模式、視覺模式示意：Simplify Mode、Chunking、Visual Mode scaffolding examples for SEN students"
          width={1024}
          height={572}
          className="h-auto w-full"
          sizes="(max-width: 768px) 100vw, 42rem"
        />
        <figcaption className="border-t border-zinc-100 bg-zinc-50 px-4 py-2 text-center text-xs text-zinc-500">
          調適模式示意 · Simplify · Chunking · Visual scaffolding modes
        </figcaption>
      </figure>
    </SummaryLocaleGroup>
  );
}

function ExecutiveSummaryEn() {
  return (
    <SummaryLocaleGroup locale="en">
      <p>
        The <strong>Pedagogical Strategy Selector</strong> analyzes your inputted
        &quot;Step 1: Lesson Topic&quot; and &quot;Step 2: Learner Profiles&quot; to
        provide precise differentiated teaching pathways and generate materials with
        one click:
      </p>
      <SummarySection heading='Educational Theory (The "Why")'>
        <p>
          Based on the students&apos; cognitive bottlenecks (e.g., dyslexia, weak
          working memory), the system recommends the most appropriate overarching
          framework (such as CPA or UDL) and explains why this specific approach will
          effectively remove barriers to learning in your classroom.
        </p>
      </SummarySection>
      <SummarySection heading='Learning Strategies (The "How")'>
        <p>
          Translates abstract theory into concrete, actionable steps. The system will
          match and recommend specific scaffolding modes for you to toggle (e.g.,
          Simplify Mode, Chunking, Visual Mode), showing you exactly how to adapt the
          materials to support reading, attention, or visual processing needs.
        </p>
      </SummarySection>
    </SummaryLocaleGroup>
  );
}

function SummaryLocaleGroup({
  locale,
  children,
}: {
  locale: "zh" | "en";
  children: ReactNode;
}) {
  return (
    <div
      className={`space-y-4 ${locale === "en" ? "text-zinc-700" : "text-zinc-800"}`}
    >
      {children}
    </div>
  );
}
