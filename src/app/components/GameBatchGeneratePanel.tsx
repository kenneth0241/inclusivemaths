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
  const [progressIndex, setProgressIndex] = useState(-1);
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
    setProgressIndex(0);

    const nextMap: LearnerGamesMap = { ...learnerGames };
    const failed: BatchFailure[] = [];

    for (let stepIndex = 0; stepIndex < batchSteps.length; stepIndex += 1) {
      const step = batchSteps[stepIndex]!;
      setProgressIndex(stepIndex);

      if (step.kind === "udl") {
        try {
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

          nextMap[UDL_GAME_TARGET_ID] = {
            html: result.html ?? "",
            conversationId: result.conversationId,
            messages,
          };
          onLearnerGames(nextMap);
        } catch (error) {
          failed.push({
            studentId: UDL_GAME_TARGET_ID,
            name: UDL_GAME_TAB_LABEL,
            message:
              error instanceof Error ? error.message : "Generation failed.",
          });
          setFailures([...failed]);
        }
        continue;
      }

      const student = step.student;
      const row = findPedagogyRowForStudent(pedagogy, student, step.index);

      try {
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

        nextMap[student.id] = {
          html: result.html ?? "",
          conversationId: result.conversationId,
          messages,
        };
        onLearnerGames(nextMap);
      } catch (error) {
        failed.push({
          studentId: student.id,
          name: student.name,
          message: error instanceof Error ? error.message : "Generation failed.",
        });
        setFailures([...failed]);
      }
    }

    setProgressIndex(-1);
    setBusy(false);
  }

  const progressStep =
    progressIndex >= 0 ? batchSteps[progressIndex] : null;

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
              zh="先選定遊戲對象並填寫遊戲參數，再按下生成。會先為全班 UDL 生成一局，再依序為每位勾選的學習者各呼叫一次 Dify。"
              en="Select targets and parameters, then generate. Runs one UDL (whole-class) game first, then one Dify request per selected learner."
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

      {busy && progressStep ? (
        <p className="mt-3 text-xs text-teal-950" role="status" aria-live="polite">
          <BilingualStack
            layout="inline"
            zh={`正在生成（${progressIndex + 1}/${batchSteps.length}）：${
              progressStep.kind === "udl"
                ? progressStep.label
                : progressStep.student.name
            }…`}
            en={`Generating (${progressIndex + 1}/${batchSteps.length}): ${
              progressStep.kind === "udl"
                ? progressStep.label
                : progressStep.student.name
            }…`}
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