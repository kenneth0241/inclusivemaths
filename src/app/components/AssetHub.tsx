"use client";

import { useMemo, useState } from "react";
import { buildGameHtml, buildWorksheetMarkdown } from "@/lib/asset-generators";
import { downloadText } from "@/lib/download-text";
import { useWorkflowDraft } from "@/lib/use-workflow-draft";
import { isLessonReady } from "@/lib/workflow-draft";

function WorksheetPreview({ markdown }: { markdown: string }) {
  return (
    <div className="space-y-3">
      {markdown.split("\n").map((line, index) => {
        if (line.startsWith("# ")) {
          return (
            <h3 key={index} className="text-2xl font-semibold">
              {line.slice(2)}
            </h3>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h4 key={index} className="pt-2 text-xl font-semibold">
              {line.slice(3)}
            </h4>
          );
        }
        if (line.trim() === "---") {
          return <hr key={index} className="border-zinc-200" />;
        }
        if (!line.trim()) {
          return <div key={index} className="h-2" />;
        }
        return (
          <p key={index} className="whitespace-pre-wrap">
            {line.replaceAll("**", "")}
          </p>
        );
      })}
    </div>
  );
}

export default function AssetHub() {
  const { draft, setDraft, hydrated } = useWorkflowDraft();
  const [gameKey, setGameKey] = useState(0);
  const ready = isLessonReady(draft.lesson);

  const worksheet =
    draft.assets.worksheetMarkdown ||
    (hydrated && ready ? buildWorksheetMarkdown(draft) : "");
  const gameHtml =
    draft.assets.gameHtml || (hydrated && ready ? buildGameHtml(draft) : "");

  const gameSrcDoc = useMemo(() => gameHtml, [gameHtml, gameKey]);

  function persist(partial: {
    worksheetMarkdown?: string;
    gameHtml?: string;
  }) {
    setDraft((current) => ({
      ...current,
      assets: { ...current.assets, ...partial },
    }));
  }

  function generateWorksheet() {
    const next = buildWorksheetMarkdown(draft);
    persist({ worksheetMarkdown: next });
  }

  function generateGame() {
    const next = buildGameHtml(draft);
    persist({ gameHtml: next });
    setGameKey((value) => value + 1);
  }

  if (!hydrated) {
    return <p className="text-sm text-zinc-500">Loading draft…</p>;
  }

  if (!ready) {
    return (
      <p className="rounded-3xl bg-white px-5 py-6 text-sm leading-6 text-zinc-600 ring-1 ring-zinc-200">
        Generate and keep a lesson plan in Step 3 first. The worksheet and game
        use that plan as the source.
      </p>
    );
  }

  return (
    <div className="grid w-full gap-5 md:grid-cols-2">
      <section className="flex flex-col rounded-3xl bg-white p-5 ring-1 ring-teal-100">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-sky-lock uppercase">
              Worksheet
            </p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-900">
              SpLD-friendly practice
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={generateWorksheet}
              className="rounded-full bg-teal-ink px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
            >
              Generate
            </button>
            <button
              type="button"
              onClick={() =>
                downloadText(
                  "inclusive-maths-worksheet.md",
                  worksheet,
                  "text/markdown;charset=utf-8",
                )
              }
              disabled={!worksheet}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 ring-1 ring-zinc-200 disabled:opacity-40"
            >
              Download .md
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!worksheet}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 ring-1 ring-zinc-200 disabled:opacity-40"
            >
              Export PDF
            </button>
          </div>
        </div>
        <article className="print-worksheet mt-4 flex-1 rounded-2xl bg-paper px-5 py-6 text-lg leading-9 tracking-wide text-zinc-900">
          {worksheet ? (
            <WorksheetPreview markdown={worksheet} />
          ) : (
            "Generate a worksheet to preview it here."
          )}
        </article>
      </section>

      <section className="flex flex-col rounded-3xl bg-white p-5 ring-1 ring-teal-100">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-sky-lock uppercase">
              Educational game
            </p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-900">
              HTML5 preview
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={generateGame}
              className="rounded-full bg-teal-ink px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
            >
              Generate
            </button>
            <button
              type="button"
              onClick={() => {
                const popup = window.open("", "_blank");
                if (popup) {
                  popup.document.write(gameHtml);
                  popup.document.close();
                }
              }}
              disabled={!gameHtml}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 ring-1 ring-zinc-200 disabled:opacity-40"
            >
              Fullscreen
            </button>
            <button
              type="button"
              onClick={() =>
                downloadText(
                  "inclusive-maths-game.html",
                  gameHtml,
                  "text/html;charset=utf-8",
                )
              }
              disabled={!gameHtml}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 ring-1 ring-zinc-200 disabled:opacity-40"
            >
              Download .html
            </button>
          </div>
        </div>
        <div className="mt-4 min-h-[420px] overflow-hidden rounded-2xl bg-paper ring-1 ring-zinc-200">
          {gameSrcDoc ? (
            <iframe
              title="Inclusive maths game preview"
              className="h-[420px] w-full border-0 bg-white"
              sandbox="allow-scripts"
              srcDoc={gameSrcDoc}
            />
          ) : (
            <p className="p-5 text-sm text-zinc-500">
              Generate a game to preview it in this frame.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
