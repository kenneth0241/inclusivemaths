"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildGameHtml } from "@/lib/asset-generators";
import { downloadText } from "@/lib/download-text";
import type { WorkflowDraft } from "@/lib/workflow-draft";
import { BilingualStack } from "./Bilingual";

type PreviewView = "preview" | "code";

type GameHtmlPreviewPanelProps = {
  gameHtml: string;
  draft: WorkflowDraft;
  disabled?: boolean;
  onGameHtml: (html: string) => void;
};

function gameDownloadFilename(draft: WorkflowDraft): string {
  const slug =
    draft.lesson.topic
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "inclusive-maths";
  return `${slug}-game.html`;
}

export default function GameHtmlPreviewPanel({
  gameHtml,
  draft,
  disabled = false,
  onGameHtml,
}: GameHtmlPreviewPanelProps) {
  const [previewKey, setPreviewKey] = useState(0);
  const [view, setView] = useState<PreviewView>("preview");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const previewShellRef = useRef<HTMLDivElement>(null);
  const srcDoc = useMemo(() => gameHtml, [gameHtml, previewKey]);

  const enterPreviewFullscreen = useCallback(async () => {
    const el = previewShellRef.current;
    if (!el || document.fullscreenElement) {
      return;
    }
    try {
      await el.requestFullscreen();
    } catch {
      /* user agent may deny */
    }
  }, []);

  const togglePreviewFullscreen = useCallback(async () => {
    if (document.fullscreenElement === previewShellRef.current) {
      await document.exitFullscreen();
      return;
    }
    await enterPreviewFullscreen();
  }, [enterPreviewFullscreen]);

  useEffect(() => {
    const sync = () => {
      setIsFullscreen(document.fullscreenElement === previewShellRef.current);
    };
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  return (
    <section className="relative flex min-h-[32rem] flex-col rounded-3xl bg-white ring-1 ring-teal-100 sm:min-h-[36rem]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
        <BilingualStack
          zh="遊戲預覽"
          en="Game preview"
          zhClassName="text-sm font-semibold text-zinc-900"
          enClassName="text-zinc-500"
        />
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle view={view} onChange={setView} disabled={!gameHtml} />
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              const next = buildGameHtml(draft);
              onGameHtml(next);
              setPreviewKey((value) => value + 1);
              setView("preview");
              window.setTimeout(() => {
                void enterPreviewFullscreen();
              }, 0);
            }}
            className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-900 ring-1 ring-teal-200 hover:bg-teal-100 disabled:opacity-50"
          >
            <BilingualStack zh="示範 HTML" en="Demo HTML" layout="inline" />
          </button>
          {gameHtml ? (
            <>
              {view === "preview" ? (
                <button
                  type="button"
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
                  onClick={() => void togglePreviewFullscreen()}
                >
                  <BilingualStack
                    zh={isFullscreen ? "離開全螢幕" : "全螢幕"}
                    en={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                    layout="inline"
                  />
                </button>
              ) : null}
              <button
                type="button"
                className="rounded-full bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
                onClick={() =>
                  downloadText(
                    gameDownloadFilename(draft),
                    gameHtml,
                    "text/html;charset=utf-8",
                  )
                }
              >
                <BilingualStack
                  zh="下載 HTML"
                  en="Download HTML"
                  layout="inline"
                />
              </button>
            </>
          ) : null}
        </div>
      </div>
      <div
        ref={previewShellRef}
        className={`relative min-h-0 flex-1 overflow-hidden rounded-b-3xl bg-zinc-100 p-2 ${
          isFullscreen ? "flex flex-col !rounded-none !bg-zinc-900 !p-2" : ""
        }`}
      >
        {gameHtml ? (
          view === "preview" ? (
            <iframe
              key={previewKey}
              title="HTML game preview"
              className={`w-full rounded-2xl bg-white ${
                isFullscreen
                  ? "min-h-0 flex-1"
                  : "h-full min-h-[28rem] sm:min-h-[32rem]"
              }`}
              sandbox="allow-scripts allow-same-origin"
              srcDoc={srcDoc}
            />
          ) : (
            <GameCodeView html={gameHtml} fullscreen={isFullscreen} />
          )
        ) : (
          <GamePreviewPlaceholder />
        )}
        {isFullscreen ? (
          <button
            type="button"
            onClick={() => void document.exitFullscreen()}
            className="absolute bottom-4 right-4 rounded-full bg-white/95 px-4 py-2 text-xs font-semibold text-zinc-800 shadow-lg ring-1 ring-zinc-200 hover:bg-white"
          >
            <BilingualStack zh="離開全螢幕" en="Exit fullscreen" layout="inline" />
          </button>
        ) : null}
      </div>
    </section>
  );
}

function ViewToggle({
  view,
  onChange,
  disabled,
}: {
  view: PreviewView;
  onChange: (next: PreviewView) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="預覽模式 · Preview mode"
      className="flex rounded-full bg-zinc-50 p-0.5 ring-1 ring-zinc-200"
    >
      <button
        type="button"
        disabled={disabled}
        aria-pressed={view === "preview"}
        onClick={() => onChange("preview")}
        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
          view === "preview"
            ? "bg-white text-teal-900 shadow-sm ring-1 ring-teal-200"
            : "text-zinc-600 hover:text-zinc-900 disabled:opacity-50"
        }`}
      >
        <BilingualStack zh="預覽" en="Preview" layout="inline" />
      </button>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={view === "code"}
        onClick={() => onChange("code")}
        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
          view === "code"
            ? "bg-white text-teal-900 shadow-sm ring-1 ring-teal-200"
            : "text-zinc-600 hover:text-zinc-900 disabled:opacity-50"
        }`}
      >
        <BilingualStack zh="程式碼" en="Code" layout="inline" />
      </button>
    </div>
  );
}

function GameCodeView({
  html,
  fullscreen = false,
}: {
  html: string;
  fullscreen?: boolean;
}) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl bg-zinc-900 ${
        fullscreen ? "min-h-0 flex-1" : "h-full min-h-[28rem] sm:min-h-[32rem]"
      }`}
    >
      <p className="border-b border-zinc-700 px-4 py-2 text-[11px] font-medium text-zinc-400">
        <BilingualStack
          zh="完整 HTML 原始碼（唯讀）"
          en="Full HTML source (read-only)"
          layout="inline"
        />
      </p>
      <pre className="min-h-0 flex-1 overflow-auto p-4 text-left text-xs leading-5 text-emerald-100/95">
        <code>{html}</code>
      </pre>
    </div>
  );
}

function GamePreviewPlaceholder() {
  return (
    <div className="flex h-full min-h-[28rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 bg-white/80 px-6 text-center sm:min-h-[32rem]">
      <p className="text-sm font-medium text-zinc-700">
        <BilingualStack
          zh="尚無遊戲 HTML"
          en="No game HTML yet"
          layout="inline"
        />
      </p>
      <p className="max-w-sm text-xs leading-5 text-zinc-500">
        <BilingualStack
          zh="完成對話後會在此即時預覽；亦可暫用「示範 HTML」查看版面並下載。"
          en="Generated HTML previews here after chat; use Demo HTML to try layout and download."
          layout="stack"
        />
      </p>
    </div>
  );
}
