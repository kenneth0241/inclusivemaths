"use client";

import { useState } from "react";
import { DEFAULT_GAME_GENERATION_PROMPT } from "@/lib/game-generation-settings";
import {
  gameChatTurnMessages,
  runGameChatTurn,
  runGameUdlChatTurn,
} from "@/lib/game-chat-client";
import { findPedagogyRowForStudent } from "@/lib/game-pedagogy-match";
import { canAutoGenerateLearnerGames } from "@/lib/game-learner-state";
import { hasGameParametersContent } from "@/lib/game-parameters";
import {
  hasClassUdlForGames,
  UDL_GAME_TAB_LABEL,
  UDL_GAME_TARGET_ID,
} from "@/lib/game-udl-target";
import type { StudentRecord } from "@/lib/student-record";
import type {
  ContentFootprint,
  GameParameters,
  LearnerGamesMap,
  LearnerProfile,
  PedagogicalStrategyState,
} from "@/lib/workflow-draft";
import { BilingualStack } from "./Bilingual";

type GameBatchGeneratePanelProps = {
  gameTargetStudentIds: string[];
  gameTargetStudents: StudentRecord[];
  parameters: GameParameters;
  footprint: ContentFootprint;
  learner: LearnerProfile;
  pedagogy: PedagogicalStrategyState;
  learnerGames: LearnerGamesMap;
  studioReady: boolean;
  gameChatConfigured: boolean;
  gameUdlChatConfigured: boolean;
  onLearnerGames: (next: LearnerGamesMap) => void;
  /** Narrow right sidebar on desktop Step 4 */
  compact?: boolean;
  generationPrompt?: string;
};

type BatchFailure = { studentId: string; name: string; message: string };

type BatchStep =
  | { kind: "udl"; label: string }
  | { kind: "student"; student: StudentRecord; index: number };

export default function GameBatchGeneratePanel({
  gameTargetStudentIds,
  gameTargetStudents,
  parameters,
  footprint,
  learner,
  pedagogy,
  learnerGames,
  studioReady,
  gameChatConfigured,
  gameUdlChatConfigured,
  onLearnerGames,
  compact = false,
  generationPrompt = DEFAULT_GAME_GENERATION_PROMPT,
}: GameBatchGeneratePanelProps) {
  const [busy, setBusy] = useState(false);
  const [progressDone, setProgressDone] = useState(0);
  const [failures, setFailures] = useState<BatchFailure[]>([]);

  const includeUdl = hasClassUdlForGames(pedagogy);

  const batchSteps: BatchStep[] = [
    ...(includeUdl
      ? [{ kind: "udl" as const, label: UDL_GAME_TAB_LABEL }]
      : []),
    ...gameTargetStudents.map((student, index) => ({
      kind: "student" as const,
      student,
      index,
    })),
  ];

  const canGenerateLearners =
    gameChatConfigured &&
    canAutoGenerateLearnerGames(parameters, gameTargetStudentIds);

  const canGenerate =
    studioReady &&
    hasGameParametersContent(parameters) &&
    batchSteps.length > 0 &&
    (!includeUdl || gameUdlChatConfigured) &&
    (gameTargetStudents.length === 0 || canGenerateLearners);

  const hasAnyHtml = [
    ...(includeUdl ? [UDL_GAME_TARGET_ID] : []),
    ...gameTargetStudentIds,
  ].some((id) => Boolean(learnerGames[id]?.html?.trim()));

  async function generateAll() {
    if (!studioReady || busy || batchSteps.length === 0) {
      return;
    }
    if (!canGenerate) {
      return;
    }

    setBusy(true);
    setFailures([]);
    setProgressDone(0);

  type StepSuccess = {
    ok: true;
    slotId: string;
    slot: LearnerGamesMap[string];
  };
  type StepFailure = { ok: false; failure: BatchFailure };

  const outcomes = await Promise.allSettled(
    batchSteps.map(async (step): Promise<StepSuccess | StepFailure> => {
      try {
        if (step.kind === "udl") {
          const result = await runGameUdlChatTurn({
            query: generationPrompt,
            footprint,
            learner,
            pedagogy,
            game_parameters: parameters,
            current_code: "",
          });
          const messages = gameChatTurnMessages(
            generationPrompt,
            result.assistantText,
          );
          return {
            ok: true,
            slotId: UDL_GAME_TARGET_ID,
            slot: {
              html: result.html ?? "",
              conversationId: result.conversationId,
              messages,
            },
          };
        }

        const student = step.student;
        const row = findPedagogyRowForStudent(pedagogy, student, step.index);
        const result = await runGameChatTurn({
          query: generationPrompt,
          student_id: student.id,
          footprint,
          learner,
          pedagogy,
          game_parameters: parameters,
          individualized_row: row,
          current_code: "",
        });
        const messages = gameChatTurnMessages(
          generationPrompt,
          result.assistantText,
        );
        return {
          ok: true,
          slotId: student.id,
          slot: {
            html: result.html ?? "",
            conversationId: result.conversationId,
            messages,
          },
        };
      } catch (error) {
        if (step.kind === "udl") {
          return {
            ok: false,
            failure: {
              studentId: UDL_GAME_TARGET_ID,
              name: UDL_GAME_TAB_LABEL,
              message:
                error instanceof Error ? error.message : "Generation failed.",
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

    const nextMap: LearnerGamesMap = { ...learnerGames };
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
      nextMap[value.slotId] = value.slot;
    }

    onLearnerGames(nextMap);
    setFailures(failed);
    setProgressDone(0);
    setBusy(false);
  }

  const learnerCount = gameTargetStudentIds.length;
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
            zh="批量生成遊戲"
            en="Generate games"
            zhClassName="text-sm font-semibold text-zinc-900"
            enClassName="text-zinc-500"
          />
          <p className="mt-1 text-xs leading-5 text-zinc-600">
            <BilingualStack
              layout="stack"
              zh="先選定遊戲對象並填寫遊戲參數，再按下生成。UDL 與每位學習者會平行呼叫 Dify（同時進行）。"
              en="Select targets and parameters, then generate — UDL and each learner are requested from Dify in parallel."
              enClassName="text-zinc-500"
            />
          </p>
          {totalCalls > 0 ? (
            <p className="mt-2 text-xs text-teal-900">
              <BilingualStack
                layout="inline"
                zh={`共 ${totalCalls} 次請求${includeUdl ? "（含 1 次 UDL · 全班）" : ""}、${learnerCount} 位個別學習者。`}
                en={`${totalCalls} request(s)${includeUdl ? " (includes 1 UDL whole-class)" : ""} · ${learnerCount} individualized.`}
                enClassName="text-teal-800/80"
              />
            </p>
          ) : null}
          {learnerCount === 0 ? (
            <p className="mt-2 text-xs text-amber-900">
              <BilingualStack
                layout="inline"
                zh="請先在「遊戲對象」勾選學習者（仍可單獨生成 UDL 版）。"
                en="Select learners under Game targets (you can still generate the UDL game alone)."
                enClassName="text-amber-800"
              />
            </p>
          ) : null}
          {includeUdl && !gameUdlChatConfigured ? (
            <p className="mt-2 text-xs text-amber-900">
              <BilingualStack
                layout="stack"
                zh={
                  <>
                    尚未設定{" "}
                    <code className="font-mono">DIFY_APP_GAME_UDL_API_KEY</code>
                    ，無法生成 UDL 全班版。
                  </>
                }
                en={
                  <>
                    Set{" "}
                    <code className="font-mono">DIFY_APP_GAME_UDL_API_KEY</code>{" "}
                    to generate the whole-class UDL game.
                  </>
                }
                enClassName="text-amber-800"
              />
            </p>
          ) : null}
          {gameTargetStudents.length > 0 && !gameChatConfigured ? (
            <p className="mt-2 text-xs text-amber-900">
              <BilingualStack
                layout="stack"
                zh={
                  <>
                    尚未設定{" "}
                    <code className="font-mono">DIFY_APP_GAME_API_KEY</code>
                    ，無法生成個別學習者遊戲。
                  </>
                }
                en={
                  <>
                    Set{" "}
                    <code className="font-mono">DIFY_APP_GAME_API_KEY</code> for
                    per-learner games.
                  </>
                }
                enClassName="text-amber-800"
              />
            </p>
          ) : null}
          {hasAnyHtml && !busy ? (
            <p className="mt-1 text-xs text-amber-900">
              <BilingualStack
                layout="inline"
                zh="再次生成會覆寫現有 HTML；細部調整請用下方對話。"
                en="Regenerate replaces current HTML; use chat below to refine."
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
              zh="為每位學習者生成"
              en="Generate for each learner"
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