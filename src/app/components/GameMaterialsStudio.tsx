"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_GAME_GENERATION_PROMPT } from "@/lib/game-generation-settings";
import { ensureUdlGameSlot, pruneLearnerGames } from "@/lib/game-learner-state";
import {
  hasClassUdlForGames,
  isUdlGameTargetId,
  UDL_GAME_TAB_LABEL,
  UDL_GAME_TARGET_ID,
} from "@/lib/game-udl-target";
import {
  gameTargetIdsEqual,
  normalizeGameTargetStudentIds,
} from "@/lib/game-targets";
import { patchLearnerGameSlot } from "@/lib/game-generation";
import { findPedagogyRowForStudent } from "@/lib/game-pedagogy-match";
import { hasPedagogyBaseline, pedagogyInputFingerprint } from "@/lib/pedagogy-strategy";
import { useStudentRoster } from "@/lib/use-student-roster";
import { useWorkflowDraft } from "@/lib/use-workflow-draft";
import {
  isLearnerStepComplete,
  isStudioContextReady,
  type GameLearnerSlot,
  type LearnerGamesMap,
} from "@/lib/workflow-draft";
import { BilingualStack } from "./Bilingual";
import GameBatchGeneratePanel from "./GameBatchGeneratePanel";
import GameGenerationChatPanel from "./GameGenerationChatPanel";
import GameHtmlPreviewPanel from "./GameHtmlPreviewPanel";
import GameParametersForm from "./GameParametersForm";
import GameTargetLearnersPanel from "./GameTargetLearnersPanel";
import MaterialsContextSidebar from "./MaterialsContextSidebar";
import type { GameLearnerTab } from "./GameLearnerTabBar";

function legacyGameHtmlFromMap(
  map: LearnerGamesMap,
  targetIds: string[],
): string {
  const first = targetIds[0];
  return first ? map[first]?.html?.trim() ?? "" : "";
}

export default function GameMaterialsStudio() {
  const { draft, setDraft, hydrated } = useWorkflowDraft();
  const { findStudent } = useStudentRoster();
  const [activeStudentId, setActiveStudentId] = useState("");
  const [generationPrompt, setGenerationPrompt] = useState(
    DEFAULT_GAME_GENERATION_PROMPT,
  );
  const [gameChatConfigured, setGameChatConfigured] = useState(false);
  const [gameUdlChatConfigured, setGameUdlChatConfigured] = useState(false);

  const refreshGenerationPrompt = useCallback(async () => {
    try {
      const response = await fetch("/api/game-templates", { cache: "no-store" });
      const body = (await response.json()) as { generationPrompt?: string };
      if (response.ok && body.generationPrompt?.trim()) {
        setGenerationPrompt(body.generationPrompt.trim());
      }
    } catch {
      /* keep current */
    }
  }, []);

  useEffect(() => {
    void refreshGenerationPrompt();
  }, [refreshGenerationPrompt]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/config", { cache: "no-store" });
        const body = (await response.json()) as {
          gameChatConfigured?: boolean;
          gameUdlChatConfigured?: boolean;
        };
        if (cancelled || !response.ok) {
          return;
        }
        setGameChatConfigured(Boolean(body.gameChatConfigured));
        setGameUdlChatConfigured(Boolean(body.gameUdlChatConfigured));
      } catch {
        /* keep defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const canUse =
    hydrated &&
    isStudioContextReady(draft.footprint) &&
    isLearnerStepComplete(draft.learner);

  const inputFingerprint = useMemo(
    () => pedagogyInputFingerprint(draft.footprint, draft.learner),
    [draft.footprint, draft.learner],
  );

  const hasBaseline = hasPedagogyBaseline(draft.pedagogy, inputFingerprint);
  const studioReady = canUse && hasBaseline;

  const rosterStudents = useMemo(
    () =>
      draft.learner.studentIds
        .map((id) => findStudent(draft.learner.classId, id))
        .filter((s): s is NonNullable<typeof s> => s !== null),
    [draft.learner.classId, draft.learner.studentIds, findStudent],
  );

  const selectedStudents = rosterStudents;

  const gameTargetStudents = useMemo(
    () =>
      draft.assets.gameTargetStudentIds
        .map((id) => findStudent(draft.learner.classId, id))
        .filter((s): s is NonNullable<typeof s> => s !== null),
    [draft.assets.gameTargetStudentIds, draft.learner.classId, findStudent],
  );

  const showUdlTab = hasClassUdlForGames(draft.pedagogy);

  const learnerTabs: GameLearnerTab[] = useMemo(() => {
    const tabs: GameLearnerTab[] = [];
    if (showUdlTab) {
      tabs.push({
        studentId: UDL_GAME_TARGET_ID,
        name: UDL_GAME_TAB_LABEL,
        hasHtml: Boolean(
          draft.assets.learnerGames[UDL_GAME_TARGET_ID]?.html?.trim(),
        ),
      });
    }
    tabs.push(
      ...gameTargetStudents.map((student) => ({
        studentId: student.id,
        name: student.name,
        hasHtml: Boolean(draft.assets.learnerGames[student.id]?.html?.trim()),
      })),
    );
    return tabs;
  }, [gameTargetStudents, draft.assets.learnerGames, showUdlTab]);

  const activeIsUdl = isUdlGameTargetId(activeStudentId);

  const activeStudent = useMemo(() => {
    if (activeIsUdl) {
      return null;
    }
    return (
      gameTargetStudents.find((student) => student.id === activeStudentId) ??
      gameTargetStudents[0] ??
      null
    );
  }, [activeIsUdl, activeStudentId, gameTargetStudents]);

  const activeTargetIndex = useMemo(() => {
    if (!activeStudent) {
      return -1;
    }
    return draft.assets.gameTargetStudentIds.indexOf(activeStudent.id);
  }, [activeStudent, draft.assets.gameTargetStudentIds]);

  const activePedagogyRow = useMemo(() => {
    if (!activeStudent || activeTargetIndex < 0) {
      return null;
    }
    return findPedagogyRowForStudent(
      draft.pedagogy,
      activeStudent,
      activeTargetIndex,
    );
  }, [activeStudent, activeTargetIndex, draft.pedagogy]);

  const activeSlotId = activeIsUdl
    ? UDL_GAME_TARGET_ID
    : (activeStudent?.id ?? "");
  const activeSlot = activeSlotId
    ? draft.assets.learnerGames[activeSlotId]
    : undefined;

  useEffect(() => {
    if (!showUdlTab) {
      return;
    }
    setDraft((current) => {
      const withUdl = ensureUdlGameSlot(
        current.assets.learnerGames,
        current.pedagogy,
      );
      if (withUdl === current.assets.learnerGames) {
        return current;
      }
      return {
        ...current,
        assets: {
          ...current.assets,
          learnerGames: withUdl,
        },
      };
    });
  }, [showUdlTab, setDraft]);

  useEffect(() => {
    const normalized = normalizeGameTargetStudentIds(
      draft.assets.gameTargetStudentIds,
      draft.learner.studentIds,
    );
    if (gameTargetIdsEqual(normalized, draft.assets.gameTargetStudentIds)) {
      return;
    }
    setDraft((current) => {
      const pruned = pruneLearnerGames(
        current.assets.learnerGames,
        normalized,
      );
      return {
        ...current,
        assets: {
          ...current.assets,
          gameTargetStudentIds: normalized,
          learnerGames: pruned,
          gameHtml: legacyGameHtmlFromMap(pruned, normalized),
        },
      };
    });
  }, [draft.assets.gameTargetStudentIds, draft.learner.studentIds, setDraft]);

  const prevRosterCount = useRef(0);
  useEffect(() => {
    const count = draft.learner.studentIds.length;
    const hadRoster = prevRosterCount.current > 0;
    if (count > 0 && !hadRoster && draft.assets.gameTargetStudentIds.length === 0) {
      setDraft((current) => ({
        ...current,
        assets: {
          ...current.assets,
          gameTargetStudentIds: normalizeGameTargetStudentIds(
            undefined,
            current.learner.studentIds,
          ),
        },
      }));
    }
    prevRosterCount.current = count;
  }, [
    draft.learner.studentIds.length,
    draft.assets.gameTargetStudentIds.length,
    setDraft,
  ]);

  useEffect(() => {
    if (isUdlGameTargetId(activeStudentId) && showUdlTab) {
      return;
    }
    if (
      activeStudentId &&
      draft.assets.gameTargetStudentIds.includes(activeStudentId)
    ) {
      return;
    }
    setActiveStudentId(
      showUdlTab
        ? UDL_GAME_TARGET_ID
        : (draft.assets.gameTargetStudentIds[0] ?? ""),
    );
  }, [activeStudentId, draft.assets.gameTargetStudentIds, showUdlTab]);

  function replaceLearnerGames(nextMap: LearnerGamesMap) {
    setDraft((current) => ({
      ...current,
      assets: {
        ...current.assets,
        learnerGames: nextMap,
        gameHtml: legacyGameHtmlFromMap(
          nextMap,
          current.assets.gameTargetStudentIds,
        ),
      },
    }));
  }

  function updateActiveSlot(patch: Partial<GameLearnerSlot>) {
    if (!activeSlotId) {
      return;
    }
    setDraft((current) => {
      const nextMap = patchLearnerGameSlot(
        current.assets.learnerGames,
        activeSlotId,
        patch,
      );
      return {
        ...current,
        assets: {
          ...current.assets,
          learnerGames: nextMap,
          gameHtml: legacyGameHtmlFromMap(
            nextMap,
            current.assets.gameTargetStudentIds,
          ),
        },
      };
    });
  }

  if (!hydrated) {
    return <p className="text-sm text-zinc-500">Loading draft…</p>;
  }

  return (
    <div className="space-y-5">
      {!canUse ? (
        <div
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <BilingualStack
            layout="stack"
            zh="請先完成 Step 1 內容確認與 Step 2 學習者檔案。"
            en="Complete Step 1 and Step 2 first."
          />
        </div>
      ) : null}

      {canUse && !hasBaseline ? (
        <div
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <BilingualStack
            layout="stack"
            zh="請先完成 Step 3 教學策略，再生成遊戲。"
            en="Complete Step 3 pedagogical strategy before generating games."
          />
        </div>
      ) : null}

      <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
        <div className="min-w-0 w-full max-w-full space-y-5">
          <GameTargetLearnersPanel
            learner={draft.learner}
            rosterStudents={rosterStudents}
            gameTargetStudentIds={draft.assets.gameTargetStudentIds}
            disabled={!canUse}
            onChangeGameTargets={(ids) => {
              setDraft((current) => {
                const pruned = pruneLearnerGames(
                  current.assets.learnerGames,
                  ids,
                );
                return {
                  ...current,
                  assets: {
                    ...current.assets,
                    gameTargetStudentIds: ids,
                    learnerGames: pruned,
                    gameHtml: legacyGameHtmlFromMap(pruned, ids),
                  },
                };
              });
            }}
          />

          <GameParametersForm
            value={draft.assets.gameParameters}
            disabled={!studioReady}
            onGenerationPromptChange={setGenerationPrompt}
            onChange={(next) => {
              setDraft((current) => ({
                ...current,
                assets: { ...current.assets, gameParameters: next },
              }));
            }}
          />

          <div className="lg:hidden">
            <GameBatchGeneratePanel
              compact
              generationPrompt={generationPrompt}
              gameTargetStudentIds={draft.assets.gameTargetStudentIds}
              gameTargetStudents={gameTargetStudents}
              parameters={draft.assets.gameParameters}
              footprint={draft.footprint}
              learner={draft.learner}
              pedagogy={draft.pedagogy}
              learnerGames={draft.assets.learnerGames}
              studioReady={studioReady}
              gameChatConfigured={gameChatConfigured}
              gameUdlChatConfigured={gameUdlChatConfigured}
              onLearnerGames={replaceLearnerGames}
            />
          </div>

          <GameHtmlPreviewPanel
            tabs={learnerTabs}
            activeStudentId={activeSlotId}
            onActiveStudentId={setActiveStudentId}
            gameHtml={activeSlot?.html ?? ""}
            student={activeStudent}
            pedagogyRow={activePedagogyRow}
            targetIndex={activeTargetIndex}
            draft={draft}
            disabled={!studioReady}
            onGameHtml={(html) => updateActiveSlot({ html })}
          />

          <GameGenerationChatPanel
            tabs={learnerTabs}
            activeStudentId={activeSlotId}
            onActiveStudentId={setActiveStudentId}
            activeIsUdl={activeIsUdl}
            student={activeStudent}
            pedagogyRow={activePedagogyRow}
            parameters={draft.assets.gameParameters}
            footprint={draft.footprint}
            learner={draft.learner}
            pedagogy={draft.pedagogy}
            messages={activeSlot?.messages ?? []}
            conversationId={activeSlot?.conversationId ?? ""}
            currentHtml={activeSlot?.html ?? ""}
            disabled={!studioReady}
            generationPrompt={generationPrompt}
            onSlotChange={(patch) =>
              updateActiveSlot({
                messages: patch.messages,
                conversationId: patch.conversationId,
                ...(patch.html !== undefined ? { html: patch.html } : {}),
              })
            }
          />
        </div>

        <aside className="hidden min-w-0 lg:block">
          <div className="sticky top-4 space-y-4">
            <GameBatchGeneratePanel
              compact
              generationPrompt={generationPrompt}
              gameTargetStudentIds={draft.assets.gameTargetStudentIds}
              gameTargetStudents={gameTargetStudents}
              parameters={draft.assets.gameParameters}
              footprint={draft.footprint}
              learner={draft.learner}
              pedagogy={draft.pedagogy}
              learnerGames={draft.assets.learnerGames}
              studioReady={studioReady}
              gameChatConfigured={gameChatConfigured}
              gameUdlChatConfigured={gameUdlChatConfigured}
              onLearnerGames={replaceLearnerGames}
            />
            <MaterialsContextSidebar
              footprint={draft.footprint}
              learner={draft.learner}
              pedagogy={draft.pedagogy}
              selectedStudents={selectedStudents}
            />
          </div>
        </aside>
      </div>

      <div className="lg:hidden">
        <MaterialsContextSidebar
          footprint={draft.footprint}
          learner={draft.learner}
          pedagogy={draft.pedagogy}
          selectedStudents={selectedStudents}
        />
      </div>
    </div>
  );
}