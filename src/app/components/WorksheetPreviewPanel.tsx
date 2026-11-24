"use client";

import { useMemo, useState } from "react";
import { downloadBlob, downloadText } from "@/lib/download-text";
import {
  buildWorksheetDocxBlob,
  worksheetDocxFilename,
} from "@/lib/worksheet-docx-export";
import { normalizeWorksheetStructuredOutput } from "@/lib/worksheet-structured-output";
import type { WorkflowDraft } from "@/lib/workflow-draft";
import type { StudentRecord } from "@/lib/student-record";
import { isSenStudent } from "@/lib/student-record";
import { BilingualStack } from "./Bilingual";
import { UDL_GAME_TAB_LABEL } from "@/lib/game-udl-target";
import GameLearnerTabBar, { type GameLearnerTab } from "./GameLearnerTabBar";
import WorksheetPreview from "./WorksheetPreview";
import WorksheetStructuredPreview from "./WorksheetStructuredPreview";
import type { WorksheetParameters } from "@/lib/worksheet-parameters";

type WorksheetPreviewPanelProps = {
  tabs: GameLearnerTab[];
  activeStudentId: string;
  onActiveStudentId: (id: string) => void;
  markdown: string;
  parameters: WorksheetParameters;
  student: StudentRecord | null;
  isUdlTarget?: boolean;
  draft: WorkflowDraft;
  structuredJson?: string;
  status?: string;
  teacherNote?: string;
  worksheetChatConfigured?: boolean;
  disabled?: boolean;
  generating?: boolean;
  generateError?: string;
  onGenerate?: () => void;
};

function worksheetDownloadFilename(
  student: StudentRecord | null,
  draftTopic: string,
) {
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
  return learner ? `${slug}-${learner}-worksheet.md` : `${slug}-worksheet.md`;
}

export default function WorksheetPreviewPanel({
  tabs,
  activeStudentId,
  onActiveStudentId,
  markdown,
  parameters,
  student,
  isUdlTarget = false,
  draft,
  structuredJson = "",
  status = "",
  teacherNote = "",
  worksheetChatConfigured = false,
  disabled = false,
  generating = false,
  generateError = "",
  onGenerate,
}: WorksheetPreviewPanelProps) {
  const hasMarkdown = markdown.trim().length > 0;
  const structuredOutput = useMemo(() => {
    if (!structuredJson.trim()) {
      return null;
    }
    try {
      const parsed = JSON.parse(structuredJson) as Record<string, unknown>;
      return normalizeWorksheetStructuredOutput(parsed);
    } catch {
      return null;
    }
  }, [structuredJson]);
  const topic = draft.lesson.topic.trim() || draft.footprint.scope.trim();
  const jsonSlug = topic
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .slice(0, 32) || "worksheet";
  const [exportingDocx, setExportingDocx] = useState(false);
  const [exportDocxError, setExportDocxError] = useState("");

  async function handleExportDocx() {
    if (!structuredOutput) {
      return;
    }
    setExportingDocx(true);
    setExportDocxError("");
    try {
      const blob = await buildWorksheetDocxBlob(structuredOutput);
      const name =
        structuredOutput.student_name.trim() ||
        student?.name.trim() ||
        "student";
      downloadBlob(worksheetDocxFilename(name, topic), blob);
    } catch (err) {
      setExportDocxError(
        err instanceof Error ? err.message : "Word export failed",
      );
    } finally {
      setExportingDocx(false);
    }
  }

  return (
    <section className="flex min-h-[32rem] flex-col rounded-3xl bg-white ring-1 ring-teal-100">
      <div className="space-y-3 border-b border-zinc-100 px-4 py-4 sm:px-5">
        <BilingualStack
          zh="工作紙預覽"
          en="Worksheet preview"
          zhClassName="text-sm font-semibold text-zinc-900"
          enClassName="text-zinc-500"
        />
        <GameLearnerTabBar
          tabs={tabs}
          activeStudentId={activeStudentId}
          onChange={onActiveStudentId}
          ariaLabel="工作紙對象分頁 · Worksheet target tabs"
        />
        {teacherNote.trim() ? (
          <p className="rounded-xl bg-teal-50/80 px-3 py-2 text-xs leading-5 text-teal-950 ring-1 ring-teal-100">
            {teacherNote}
            {status.trim() ? (
              <span className="mt-1 block text-teal-800/80">
                Status: {status}
              </span>
            ) : null}
          </p>
        ) : null}
        {generateError ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-900 ring-1 ring-red-200">
            {generateError}
          </p>
        ) : null}
        {exportDocxError ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-900 ring-1 ring-red-200">
            {exportDocxError}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {onGenerate ? (
            <button
              type="button"
              disabled={disabled || generating || !student}
              onClick={onGenerate}
              className="rounded-2xl bg-teal-ink px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              <BilingualStack
                zh={
                  generating
                    ? "Dify 生成中…"
                    : hasMarkdown
                      ? "重新生成工作紙"
                      : "生成工作紙"
                }
                en={
                  generating
                    ? "Generating…"
                    : hasMarkdown
                      ? "Regenerate worksheet"
                      : "Generate worksheet"
                }
                layout="inline"
              />
            </button>
          ) : null}
          {structuredJson.trim() ? (
            <button
              type="button"
              onClick={() =>
                downloadText(
                  `${jsonSlug}-worksheet.json`,
                  structuredJson,
                  "application/json;charset=utf-8",
                )
              }
              className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-50"
            >
              <BilingualStack zh="下載 JSON" en="Download JSON" layout="inline" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() =>
              downloadText(
                worksheetDownloadFilename(student, topic),
                markdown,
                "text/markdown;charset=utf-8",
              )
            }
            disabled={!hasMarkdown && !structuredOutput}
            className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-50 disabled:opacity-40"
          >
            <BilingualStack zh="下載 .md" en="Download .md" layout="inline" />
          </button>
          <button
            type="button"
            onClick={() => void handleExportDocx()}
            disabled={!structuredOutput || exportingDocx}
            className="rounded-full bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-950 ring-1 ring-teal-200 hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <BilingualStack
              zh={exportingDocx ? "匯出 Word 中…" : "匯出 Word (.docx)"}
              en={exportingDocx ? "Exporting Word…" : "Export Word (.docx)"}
              layout="inline"
            />
          </button>
        </div>
        {isUdlTarget || student ? (
          <p className="text-xs text-zinc-500">
            <BilingualStack
              zh={
                isUdlTarget
                  ? `${UDL_GAME_TAB_LABEL} · ${parameters.questionCount} 題`
                  : `${student!.name} · ${isSenStudent(student!) ? "SEN" : "一般"} · ${parameters.questionCount} 題`
              }
              en={`${parameters.questionCount} items · ${parameters.responseFormat}`}
              layout="inline"
            />
          </p>
        ) : null}
      </div>
      <article className="print-worksheet min-h-0 flex-1 overflow-y-auto px-5 py-6 text-lg leading-9 tracking-wide text-zinc-900">
        {structuredOutput ? (
          <WorksheetStructuredPreview output={structuredOutput} />
        ) : hasMarkdown ? (
          <WorksheetPreview markdown={markdown} />
        ) : (
          <p className="text-sm text-zinc-500">
            <BilingualStack
              zh={
                worksheetChatConfigured
                  ? "在下方對話按「建議提示」生成，或輸入修改指示。"
                  : "設定參數後於對話區生成工作紙。"
              }
              en={
                worksheetChatConfigured
                  ? 'Use "Suggested" in the chat below, or type a refinement request.'
                  : "Set parameters, then generate via the chat panel."
              }
              layout="inline"
            />
          </p>
        )}
      </article>
    </section>
  );
}