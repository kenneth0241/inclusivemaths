"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildGameHtmlForStudent } from "@/lib/asset-generators";
import { findPedagogyRowForStudent } from "@/lib/game-pedagogy-match";
import { downloadText } from "@/lib/download-text";
import type { PedagogyIndividualizedRow } from "@/lib/workflow-draft";
import type { StudentRecord } from "@/lib/student-record";
import { BilingualStack } from "./Bilingual";
import GameLearnerTabBar, { type GameLearnerTab } from "./GameLearnerTabBar";

type PreviewView = "preview" | "code";

type GameHtmlPreviewPanelProps = {
  tabs: GameLearnerTab[];
  activeStudentId: string;
  onActiveStudentId: (id: string) => void;
  gameHtml: string;
  student: StudentRecord | null;
  pedagogyRow: PedagogyIndividualizedRow | null;
  targetIndex: number;
  draft: Parameters<typeof buildGameHtmlForStudent>[0];
  disabled?: boolean;
  onGameHtml: (html: string) => void;
};

function gameDownloadFilename(student: StudentRecord | null, draftTopic: string) {
  const slug =
    draftTopic
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "inclusive-maths";
  const learner = student?.name
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .slice(0, 24);
  return learner ? `${slug}-${learner}-game.html` : `${slug}-game.html`;
}

export default function GameHtmlPreviewPanel({
  tabs,
  activeStudentId,
  onActiveStudentId,
  gameHtml,
  student,
  pedagogyRow,
  targetIndex,
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
      <div className="space-y-3 border-b border-zinc-100 px-4 py-3">
        <BilingualStack
          zh="遊戲預覽"
          en="Game preview"
          zhClassName="text-sm font-semibold text-zinc-900"
          enClassName="text-zinc-500"
        />
        <GameLearnerTabBar
          tabs={tabs}
          activeStudentId={activeStudentId}
          onChange={onActiveStudentId}
        />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ViewToggle view={view} onChange={setView} disabled={!gameHtml} />
          <button
            type="button"
            disabled={disabled || !student}
            onClick={() => {
              if (!student) {
                return;
              }
              const row =
                pedagogyRow ??
                findPedagogyRowForStudent(
                  draft.pedagogy,
                  student,
                  targetIndex,
                );
              const next = buildGameHtmlForStudent(draft, student, row);
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
                    gameDownloadFilename(
                      student,
                      draft.lesson.topic || draft.footprint.scope,
                    ),
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
              key={`${activeStudentId}-${previewKey}`}
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
            <GameCodeView
              html={gameHtml}
              fullscreen={isFullscreen}
              onEdit={disabled ? undefined : onGameHtml}
            />
          )
        ) : (
          <GamePreviewPlaceholder hasTargets={tabs.length > 0} />
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
  onEdit,
}: {
  html: string;
  fullscreen?: boolean;
  onEdit?: (html: string) => void;
}) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl bg-zinc-900 ${
        fullscreen ? "min-h-0 flex-1" : "h-full min-h-[28rem] sm:min-h-[32rem]"
      }`}
    >
      <p className="border-b border-zinc-700 px-4 py-2 text-[11px] font-medium text-zinc-400">
        <BilingualStack
          zh="HTML 原始碼（可編輯；後續對話會帶入 current_code）"
          en="HTML source (editable; sent as current_code on follow-up)"
          layout="inline"
        />
      </p>
      <textarea
        value={html}
        readOnly={!onEdit}
        onChange={(event) => onEdit?.(event.target.value)}
        spellCheck={false}
        className="min-h-0 flex-1 resize-none overflow-auto bg-zinc-950 p-4 font-mono text-left text-xs leading-5 text-emerald-100/95 focus:outline-none focus:ring-2 focus:ring-teal-500/40 disabled:opacity-90"
      />
    </div>
  );
}

function GamePreviewPlaceholder({ hasTargets }: { hasTargets: boolean }) {
  return (
    <div className="flex h-full min-h-[28rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 bg-white/80 px-6 text-center sm:min-h-[32rem]">
      <p className="text-sm font-medium text-zinc-700">
        <BilingualStack
          zh="尚無此學習者的遊戲 HTML"
          en="No game HTML for this learner yet"
          layout="inline"
        />
      </p>
      <p className="max-w-sm text-xs leading-5 text-zinc-500">
        <BilingualStack
          zh={
            hasTargets
              ? "請按上方「為每位學習者生成」；之後可用示範 HTML 預覽或下方對話微調。"
              : "請先勾選遊戲對象並填寫遊戲參數。"
          }
          en={
            hasTargets
              ? 'Use "Generate for each learner" above; then preview demo HTML or refine in chat.'
              : "Pick game targets and fill parameters first."
          }
          layout="stack"
        />
      </p>
    </div>
  );
}