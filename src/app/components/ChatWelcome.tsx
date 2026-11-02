"use client";

import { useState } from "react";
import { BilingualStack } from "./Bilingual";

export default function ChatWelcome() {
  const [open, setOpen] = useState(false);

  return (
    <section className="w-full rounded-3xl bg-white ring-1 ring-teal-100">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left sm:px-6"
        aria-expanded={open}
      >
        <BilingualStack
          zh="小一數學教材檢索助手"
          en="Primary 1 Textbook Exploration Assistant"
          zhClassName="text-sm font-semibold text-zinc-900"
          enClassName="font-normal text-zinc-500"
        />
        <span className="shrink-0 text-xs font-medium text-teal-ink">
          {open ? (
            <BilingualStack
              zh="收起"
              en="Collapse"
              enClassName="text-teal-700/80"
            />
          ) : (
            <BilingualStack
              zh="展開"
              en="Expand"
              enClassName="text-teal-700/80"
            />
          )}
        </span>
      </button>
      {open ? (
        <div className="space-y-4 border-t border-zinc-100 px-5 pb-5 pt-4 text-sm leading-7 text-zinc-700 sm:px-6">
          <div>
            <p>
              本「小一數學教材檢索助手」已經就緒，將協助你快速梳理原版課本內容，為後續的教案設計與
              SpLD
              支援策略建立準確的數據基礎。在進入教學理論之前，我們必須先釐清課本實際涵蓋的「內容足跡」。你可以隨時查詢各個單元的重點，建議專注提取以下兩大備課關鍵（練習形式留待第四步設計工作紙時再定）：
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              This Primary 1 assistant helps you map textbook content for lesson
              design and SpLD support. Lock the Content Footprint — scope and visual
              models — before teaching strategies. Exercise formats belong in Step 4
              when you design worksheets.
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <p>
                <span className="font-semibold">具體範圍與限制（Specific Scope）：</span>{" "}
                確認課題的精確邊界，例如加法是局限於 10 以內還是 18
                以內，以及課本統一使用的核心數學字眼。
              </p>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                <span className="font-medium text-zinc-600">
                  Specific scope &amp; constraints:
                </span>{" "}
                Exact boundaries (e.g. addition within 10 vs 18) and core vocabulary
                the textbook uses.
              </p>
            </div>
            <div>
              <p>
                <span className="font-semibold">視覺圖解與表達（Visual Models）：</span>{" "}
                找出課本如何圖解抽象概念，例如是否採用了分和合（Number
                bonds）、實物排圖或是數線。
              </p>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                <span className="font-medium text-zinc-600">
                  Visual models:
                </span>{" "}
                How the book represents concepts — number bonds, manipulatives,
                number lines, and similar.
              </p>
            </div>
          </div>
          <div>
            <p>
              請直接輸入你想探索的單元名稱或數學概念（例如「單元五主要是教什麼內容？」），或者點擊下方的建議問題來展開檢索。
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Enter a unit or concept, or use the suggested starter question below.
            </p>
          </div>
          <div className="space-y-3 border-t border-zinc-100 pt-4 text-zinc-600">
            <p className="text-sm font-semibold text-zinc-700">
              範例查詢 · Example queries
            </p>
            <ol className="list-decimal space-y-3 pl-5">
              <li>
                <p>
                  釐清範圍：「第五單元的加法上限是多少？」
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  Scope: &quot;Up to what number does addition in Unit 5
                  cover?&quot;
                </p>
              </li>
              <li>
                <p>視覺模型：「課本用哪些圖像解釋這個概念？」</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Models: &quot;What images or models explain this concept?&quot;
                </p>
              </li>
            </ol>
          </div>
        </div>
      ) : null}
    </section>
  );
}
