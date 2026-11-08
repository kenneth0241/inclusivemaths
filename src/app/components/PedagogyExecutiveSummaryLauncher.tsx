"use client";

import { useEffect, useState } from "react";
import PedagogyExecutiveSummaryDialog from "./PedagogyExecutiveSummaryDialog";

const SESSION_KEY = "inclusive-maths-pedagogy-exec-summary-opened";

export default function PedagogyExecutiveSummaryLauncher() {
  const [open, setOpen] = useState(false);

  function openSummary() {
    setOpen(true);
  }

  function closeSummary() {
    setOpen(false);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    try {
      if (!sessionStorage.getItem(SESSION_KEY)) {
        setOpen(true);
      }
    } catch {
      setOpen(true);
    }
  }, []);

  return (
    <>
      <div className="mx-auto mt-4 w-full max-w-layout-prose">
        <button
          type="button"
          onClick={openSummary}
          className="w-full rounded-2xl border border-teal-100 bg-gradient-to-b from-teal-50/80 to-white px-4 py-3 text-left shadow-sm ring-1 ring-teal-100/80 transition hover:border-teal-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 sm:px-5"
        >
          <span className="block text-sm font-semibold text-zinc-900">
            ✨ 摘要 (Summary)
          </span>
          <span className="mt-1 block text-xs leading-5 text-zinc-600">
            分析 Step 1 教學主題與 Step 2 學習概覽，配對教育理論 (Why) 與支援策略 (How)，一鍵產出教材。
          </span>
          <span className="mt-1 block text-[11px] font-medium text-teal-ink">
            點擊閱讀全文 · Tap to read full summary
          </span>
        </button>
      </div>

      <PedagogyExecutiveSummaryDialog open={open} onClose={closeSummary} />
    </>
  );
}
