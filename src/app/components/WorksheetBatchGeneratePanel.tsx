"use client";

import { useState } from "react";
import { findPedagogyRowForStudent } from "@/lib/game-pedagogy-match";
import {
  hasClassUdlForGames,
  UDL_GAME_TAB_LABEL,
  UDL_GAME_TARGET_ID,
} from "@/lib/game-udl-target";
import { runWorksheetGenerateTurn } from "@/lib/worksheet-generate-turn";
import type { WorksheetParameters } from "@/lib/worksheet-parameters";
import {
  emptyWorksheetLearnerSlot,
  patchWorksheetLearnerSlot,
  type LearnerWorksheetsMap,
} from "@/lib/worksheet-learner-state";
import type { StudentRecord } from "@/lib/student-record";
import type {
  ContentFootprint,
  LearnerProfile,
  PedagogicalStrategyState,
} from "@/lib/workflow-draft";
import { BilingualStack } from "./Bilingual";

type WorksheetBatchGeneratePanelProps = {
  worksheetTargetStudentIds: string[];
  worksheetTargetStudents: StudentRecord[];
  parameters: WorksheetParameters;
  footprint: ContentFootprint;
  learner: LearnerProfile;
  pedagogy: PedagogicalStrategyState;
  learnerWorksheets: LearnerWorksheetsMap;
  studioReady: boolean;
  worksheetChatConfigured: boolean;
  worksheetUdlChatConfigured: boolean;
  onLearnerWorksheets: (next: LearnerWorksheetsMap) => void;
  compact?: boolean;
};

type BatchFailure = { studentId: string; name: string; message: string };

type BatchStep =
  | { kind: "udl"; label: string }
  | { kind: "student"; student: StudentRecord; index: number };

export default function WorksheetBatchGeneratePanel({
  worksheetTargetStudentIds,
  worksheetTargetStudents,
  parameters,
  footprint,
  learner,
  pedagogy,
  learnerWorksheets,
  studioReady,
  worksheetChatConfigured,
  worksheetUdlChatConfigured,
  onLearnerWorksheets,
  compact = false,
}: WorksheetBatchGeneratePanelProps) {
  const [busy, setBusy] = useState(false);
  const [progressDone, setProgressDone] = useState(0);
  const [failures, setFailures] = useState<BatchFailure[]>([]);

  const includeUdl = hasClassUdlForGames(pedagogy);

  const batchSteps: BatchStep[] = [
    ...(includeUdl
      ? [{ kind: "udl" as const, label: UDL_GAME_TAB_LABEL }]
      : []),
    ...worksheetTargetStudents.map((student, index) => ({
      kind: "student" as const,
      student,
      index,
    })),
  ];

  const canGenerate =
    studioReady &&
    batchSteps.length > 0 &&
    (!includeUdl || worksheetUdlChatConfigured) &&
    (worksheetTargetStudents.length === 0 || worksheetChatConfigured);

  const hasAnyWorksheet = [
    ...(includeUdl ? [UDL_GAME_TARGET_ID] : []),
    ...worksheetTargetStudentIds,
  ].some(
    (id) =>
      Boolean(
        learnerWorksheets[id]?.structuredJson?.trim() ||
          learnerWorksheets[id]?.markdown?.trim(),
      ),
  );

  async function generateAll() {
    if (!canGenerate || busy) {
      return;
    }
    setBusy(true);
    setFailures([]);
    setProgressDone(0);
    const baseMap = { ...learnerWorksheets };

    type StepSuccess = {
      ok: true;
      slotId: string;
      patch: Parameters<typeof patchWorksheetLearnerSlot>[2];
      fallback: ReturnType<typeof emptyWorksheetLearnerSlot>;
    };
    type StepFailure = { ok: false; failure: BatchFailure };

    const outcomes = await Promise.allSettled(
      batchSteps.map(async (step): Promise<StepSuccess | StepFailure> => {
        try {
          if (step.kind === "udl") {
            const slotParams =
              baseMap[UDL_GAME_TARGET_ID]?.parameters ?? parameters;
            const { patch } = await runWorksheetGenerateTurn({
              targetId: UDL_GAME_TARGET_ID,
              student: null,
              targetIndex: -1,
              slot: baseMap[UDL_GAME_TARGET_ID],
              parameters: slotParams,
              footprint,
              learner,
              pedagogy,
              pedagogyRow: null,
            });
            return {
              ok: true,
              slotId: UDL_GAME_TARGET_ID,
              patch,
              fallback: emptyWorksheetLearnerSlot({
                student: null,
                isUdl: true,
              }),
            };
          }

          const student = step.student;
          const targetIndex = worksheetTargetStudentIds.indexOf(student.id);
          const slotParams = baseMap[student.id]?.parameters ?? parameters;
          const { patch } = await runWorksheetGenerateTurn({
            targetId: student.id,
            student,
            targetIndex,
            slot: baseMap[student.id],
            parameters: slotParams,
            footprint,
            learner,
            pedagogy,
            pedagogyRow: findPedagogyRowForStudent(
              pedagogy,
              student,
              targetIndex,
            ),
          });
          return {
            ok: true,
            slotId: student.id,
            patch,
            fallback: emptyWorksheetLearnerSlot({ student }),
          };
        } catch (error) {
          if (step.kind === "udl") {
            return {
              ok: false,
              failure: {
                studentId: UDL_GAME_TARGET_ID,
                name: UDL_GAME_TAB_LABEL,
                message:
                  error instanceof Error
                    ? error.message
                    : "Generation failed.",
              },
            };
          }
          return {
            ok: false,
            failure: {
              studentId: step.student.id,
              name: step.student.name,
              message:
                error instanceof Error ? error.message : "Generation failed.",
            },
          };
        } finally {
          setProgressDone((n) => n + 1);
        }
      }),
    );

    let working = { ...baseMap };
    const failed: BatchFailure[] = [];
    for (const settled of outcomes) {
      if (settled.status !== "fulfilled") {
        continue;
      }
      const value = settled.value;
      if (!value.ok) {
        failed.push(value.failure);
        continue;
      }
      working = patchWorksheetLearnerSlot(
        working,
        value.slotId,
        value.patch,
        value.fallback,
      );
    }

    onLearnerWorksheets(working);
    setFailures(failed);
    setProgressDone(0);
    setBusy(false);
  }
  const learnerCount = worksheetTargetStudents.length;
  const udlCount = includeUdl ? 1 : 0;
  const totalCalls = learnerCount + udlCount;

  return (
    <section className="rounded-3xl bg-teal-50/60 px-4 py-4 ring-1 ring-teal-200 sm:px-5">
      <div
        className={`flex flex-col gap-3 ${
          compact ? "" : "sm:flex-row sm:items-start sm:justify-between"
        }`}
      >
        <div className="min-w-0">
          <BilingualStack
            zh="生成工作紙"
            en="Generate worksheets"
            zhClassName="text-sm font-semibold text-zinc-900"
            enClassName="text-zinc-500"
          />
          <p className="mt-1 text-xs leading-5 text-zinc-600">
            <BilingualStack
              layout="stack"
              zh="先勾選個別對象與參數，再按下生成。UDL 全班版與每位學習者會平行呼叫 Dify（同時進行）。"
              en="Set targets and parameters, then generate — UDL and each learner are requested from Dify in parallel."
              enClassName="text-zinc-500"
            />
          </p>
          {batchSteps.length > 0 ? (
            <p className="mt-2 text-xs text-teal-900">
              <BilingualStack
                layout="inline"
                zh={`共 ${totalCalls} 次請求${includeUdl ? "（含 1 次 UDL · 全班）" : ""}、${learnerCount} 位個別學習者。`}
                en={`${totalCalls} request(s)${includeUdl ? " (includes 1 UDL whole-class)" : ""} · ${learnerCount} individualized.`}
                enClassName="text-teal-800/80"
              />
            </p>
          ) : (
            <p className="mt-2 text-xs text-amber-900">
              <BilingualStack
                layout="inline"
                zh="請先在「工作紙對象」勾選學習者（仍可單獨生成 UDL 版）。"
                en='Select learners under "Worksheet targets" (you can still generate the UDL worksheet alone).'
              />
            </p>
          )}
          {includeUdl && !worksheetUdlChatConfigured ? (
            <p className="mt-2 text-xs text-amber-900">
              <BilingualStack
                layout="stack"
                zh={
                  <>
                    尚未設定{" "}
                    <code className="font-mono">
                      DIFY_APP_WORKSHEET_UDL_API_KEY
                    </code>
                    ，無法生成 UDL 全班版工作紙。
                  </>
                }
                en={
                  <>
                    Set{" "}
                    <code className="font-mono">
                      DIFY_APP_WORKSHEET_UDL_API_KEY
                    </code>{" "}
                    to generate the whole-class UDL worksheet.
                  </>
                }
                enClassName="text-amber-800"
              />
            </p>
          ) : null}
          {worksheetTargetStudents.length > 0 && !worksheetChatConfigured ? (
            <p className="mt-2 text-xs text-amber-900">
              <BilingualStack
                layout="stack"
                zh={
                  <>
                    尚未設定{" "}
                    <code className="font-mono">DIFY_APP_WORKSHEET_API_KEY</code>
                    。
                  </>
                }
                en={
                  <>
                    Set{" "}
                    <code className="font-mono">DIFY_APP_WORKSHEET_API_KEY</code>
                    .
                  </>
                }
                enClassName="text-amber-800"
              />
            </p>
          ) : null}
          {hasAnyWorksheet && !busy ? (
            <p className="mt-1 text-xs text-amber-900">
              <BilingualStack
                layout="inline"
                zh="再次生成會覆寫現有工作紙；細部調整請用下方對話。"
                en="Regenerate replaces worksheets; use chat below to refine."
                enClassName="text-amber-800"
              />
            </p>
          ) : null}
        </div>

        <button
          type="button"
          disabled={!canGenerate || busy}
          onClick={() => void generateAll()}
          className={`rounded-2xl bg-teal-ink px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-zinc-300 ${
            compact ? "w-full" : "shrink-0"
          }`}
        >
          {busy ? (
            <BilingualStack zh="生成中…" en="Generating…" layout="inline" />
          ) : (
            <BilingualStack
              zh="批次生成工作紙"
              en="Generate worksheets (batch)"
              layout="inline"
            />
          )}
        </button>
      </div>

      {busy ? (
        <p className="mt-3 text-xs text-teal-950" role="status" aria-live="polite">
          <BilingualStack
            layout="inline"
            zh={`平行生成中：已完成 ${progressDone}/${batchSteps.length} 次請求…`}
            en={`Generating in parallel: ${progressDone}/${batchSteps.length} request(s) finished…`}
            enClassName="text-teal-900/80"
          />
        </p>
      ) : null}

      {failures.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-red-900" role="alert">
          {failures.map((item) => (
            <li key={item.studentId}>
              {item.name}: {item.message}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}