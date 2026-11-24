"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  gameTargetIdsEqual,
  normalizeWorksheetTargetStudentIds,
} from "@/lib/game-targets";
import { findPedagogyRowForStudent } from "@/lib/game-pedagogy-match";
import { runWorksheetGenerateTurn } from "@/lib/worksheet-generate-turn";
import {
  hasClassUdlForGames,
  isUdlGameTargetId,
  UDL_GAME_TAB_LABEL,
  UDL_GAME_TARGET_ID,
} from "@/lib/game-udl-target";
import { hasPedagogyBaseline, pedagogyInputFingerprint } from "@/lib/pedagogy-strategy";
import { useStudentRoster } from "@/lib/use-student-roster";
import { useWorkflowDraft } from "@/lib/use-workflow-draft";
import {
  emptyWorksheetLearnerSlot,
  ensureUdlWorksheetSlot,
  legacyWorksheetMarkdownFromMap,
  patchWorksheetLearnerSlot,
  pruneLearnerWorksheets,
} from "@/lib/worksheet-learner-state";
import {
  isLearnerStepComplete,
  isStudioContextReady,
  type LearnerWorksheetsMap,
} from "@/lib/workflow-draft";
import { isSenStudent } from "@/lib/student-record";
import { BilingualStack } from "./Bilingual";
import GameTargetLearnersPanel from "./GameTargetLearnersPanel";
import type { GameLearnerTab } from "./GameLearnerTabBar";
import MaterialsContextSidebar from "./MaterialsContextSidebar";
import WorksheetBatchGeneratePanel from "./WorksheetBatchGeneratePanel";
import WorksheetGenerationChatPanel from "./WorksheetGenerationChatPanel";
import WorksheetParametersForm from "./WorksheetParametersForm";
import WorksheetPreviewPanel from "./WorksheetPreviewPanel";

export default function WorksheetMaterialsStudio() {
  const { draft, setDraft, hydrated } = useWorkflowDraft();
  const { findStudent } = useStudentRoster();
  const [activeStudentId, setActiveStudentId] = useState("");
  const [worksheetChatConfigured, setWorksheetChatConfigured] = useState(false);
  const [worksheetUdlChatConfigured, setWorksheetUdlChatConfigured] =
    useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  const rosterById = useMemo(() => {
    const map = new Map<string, NonNullable<ReturnType<typeof findStudent>>>();
    for (const id of draft.learner.studentIds) {
      const student = findStudent(draft.learner.classId, id);
      if (student) {
        map.set(id, student);
      }
    }
    return map;
  }, [draft.learner.classId, draft.learner.studentIds, findStudent]);

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

  const worksheetTargetStudents = useMemo(
    () =>
      draft.assets.worksheetTargetStudentIds
        .map((id) => findStudent(draft.learner.classId, id))
        .filter((s): s is NonNullable<typeof s> => s !== null),
    [draft.assets.worksheetTargetStudentIds, draft.learner.classId, findStudent],
  );

  const showUdlTab = hasClassUdlForGames(draft.pedagogy);

  const worksheetSlotHasContent = (id: string) => {
    const slot = draft.assets.learnerWorksheets[id];
    return Boolean(
      slot?.structuredJson?.trim() || slot?.markdown?.trim(),
    );
  };

  const learnerTabs: GameLearnerTab[] = useMemo(() => {
    const tabs: GameLearnerTab[] = [];
    if (showUdlTab) {
      tabs.push({
        studentId: UDL_GAME_TARGET_ID,
        name: UDL_GAME_TAB_LABEL,
        hasHtml: worksheetSlotHasContent(UDL_GAME_TARGET_ID),
      });
    }
    tabs.push(
      ...worksheetTargetStudents.map((student) => ({
        studentId: student.id,
        name: student.name,
        hasHtml: worksheetSlotHasContent(student.id),
      })),
    );
    return tabs;
  }, [showUdlTab, worksheetTargetStudents, draft.assets.learnerWorksheets]);

  const activeIsUdl = isUdlGameTargetId(activeStudentId);

  const activeStudent = useMemo(() => {
    if (activeIsUdl) {
      return null;
    }
    return (
      worksheetTargetStudents.find((student) => student.id === activeStudentId) ??
      worksheetTargetStudents[0] ??
      null
    );
  }, [activeIsUdl, activeStudentId, worksheetTargetStudents]);

  const activeSlotId = activeIsUdl
    ? UDL_GAME_TARGET_ID
    : (activeStudent?.id ?? "");

  const activeTargetIndex = useMemo(() => {
    if (!activeStudent) {
      return -1;
    }
    return draft.assets.worksheetTargetStudentIds.indexOf(activeStudent.id);
  }, [activeStudent, draft.assets.worksheetTargetStudentIds]);

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

  const activeSlot = activeSlotId
    ? draft.assets.learnerWorksheets[activeSlotId]
    : undefined;

  const activeFallback = useMemo(
    () =>
      emptyWorksheetLearnerSlot({
        student: activeStudent,
        isUdl: activeIsUdl,
      }),
    [activeStudent, activeIsUdl],
  );

  const activeApiConfigured = activeIsUdl
    ? worksheetUdlChatConfigured
    : worksheetChatConfigured;

  const activeParameters =
    activeSlot?.parameters ?? activeFallback.parameters;
  const activeMarkdown = activeSlot?.markdown ?? "";
  const activeStructuredJson = activeSlot?.structuredJson ?? "";
  const activeTeacherNote = activeSlot?.teacherNote ?? "";
  const activeStatus = activeSlot?.status ?? "";
  const activeMessages = activeSlot?.messages ?? [];
  const activeConversationId = activeSlot?.conversationId ?? "";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/config", { cache: "no-store" });
        const body = (await response.json()) as {
          worksheetChatConfigured?: boolean;
          worksheetUdlChatConfigured?: boolean;
        };
        if (!cancelled && response.ok) {
          setWorksheetChatConfigured(Boolean(body.worksheetChatConfigured));
          setWorksheetUdlChatConfigured(
            Boolean(body.worksheetUdlChatConfigured),
          );
        }
      } catch {
        /* keep default */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pruneWithRoster = useCallback(
    (map: LearnerWorksheetsMap, ids: string[]) =>
      pruneLearnerWorksheets(map, ids, rosterById),
    [rosterById],
  );

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    setDraft((current) => {
      const withUdl = ensureUdlWorksheetSlot(
        current.assets.learnerWorksheets,
        current.pedagogy,
      );
      if (withUdl === current.assets.learnerWorksheets) {
        return current;
      }
      return {
        ...current,
        assets: {
          ...current.assets,
          learnerWorksheets: withUdl,
        },
      };
    });
  }, [hydrated, showUdlTab, setDraft]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    const normalized = normalizeWorksheetTargetStudentIds(
      draft.assets.worksheetTargetStudentIds,
      draft.learner.studentIds,
    );
    if (
      gameTargetIdsEqual(normalized, draft.assets.worksheetTargetStudentIds)
    ) {
      return;
    }
    setDraft((current) => {
      const pruned = pruneWithRoster(
        current.assets.learnerWorksheets,
        normalized,
      );
      return {
        ...current,
        assets: {
          ...current.assets,
          worksheetTargetStudentIds: normalized,
          learnerWorksheets: pruned,
          worksheetMarkdown: legacyWorksheetMarkdownFromMap(pruned, normalized),
        },
      };
    });
  }, [
    hydrated,
    draft.assets.worksheetTargetStudentIds,
    draft.learner.studentIds,
    pruneWithRoster,
    setDraft,
  ]);

  const prevRosterCount = useRef(0);
  useEffect(() => {
    if (!hydrated) {
      return;
    }
    const count = draft.learner.studentIds.length;
    const hadRoster = prevRosterCount.current > 0;
    if (
      count > 0 &&
      !hadRoster &&
      draft.assets.worksheetTargetStudentIds.length === 0
    ) {
      setDraft((current) => ({
        ...current,
        assets: {
          ...current.assets,
          worksheetTargetStudentIds: normalizeWorksheetTargetStudentIds(
            undefined,
            current.learner.studentIds,
          ),
        },
      }));
    }
    prevRosterCount.current = count;
  }, [
    hydrated,
    draft.learner.studentIds.length,
    draft.assets.worksheetTargetStudentIds.length,
    setDraft,
  ]);

  useEffect(() => {
    if (isUdlGameTargetId(activeStudentId) && showUdlTab) {
      return;
    }
    if (
      activeStudentId &&
      draft.assets.worksheetTargetStudentIds.includes(activeStudentId)
    ) {
      return;
    }
    setActiveStudentId(
      showUdlTab
        ? UDL_GAME_TARGET_ID
        : (draft.assets.worksheetTargetStudentIds[0] ?? ""),
    );
  }, [activeStudentId, draft.assets.worksheetTargetStudentIds, showUdlTab]);

  function replaceLearnerWorksheets(nextMap: LearnerWorksheetsMap) {
    setDraft((current) => ({
      ...current,
      assets: {
        ...current.assets,
        learnerWorksheets: nextMap,
        worksheetMarkdown: legacyWorksheetMarkdownFromMap(
          nextMap,
          current.assets.worksheetTargetStudentIds,
        ),
      },
    }));
  }

  async function generateActiveWorksheet() {
    if (!activeSlotId || generating) {
      return;
    }
    if (!activeIsUdl && !activeStudent) {
      return;
    }
    if (!activeApiConfigured) {
      setGenerateError(
        activeIsUdl
          ? "Set DIFY_APP_WORKSHEET_UDL_API_KEY in .env.local and restart the dev server."
          : "Set DIFY_APP_WORKSHEET_API_KEY in .env.local and restart the dev server.",
      );
      return;
    }
    setGenerateError("");
    setGenerating(true);
    try {
      const { patch } = await runWorksheetGenerateTurn({
        targetId: activeSlotId,
        student: activeStudent,
        targetIndex: activeTargetIndex,
        slot: activeSlot,
        parameters: activeParameters,
        footprint: draft.footprint,
        learner: draft.learner,
        pedagogy: draft.pedagogy,
        pedagogyRow: activeIsUdl ? null : activePedagogyRow,
      });
      updateActiveSlot(patch);
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : "Worksheet generation failed.",
      );
    } finally {
      setGenerating(false);
    }
  }

  function updateActiveSlot(
    patch: Parameters<typeof patchWorksheetLearnerSlot>[2],
  ) {
    if (!activeSlotId) {
      return;
    }
    setDraft((current) => {
      const fallback = emptyWorksheetLearnerSlot({ student: activeStudent });
      const nextMap = patchWorksheetLearnerSlot(
        current.assets.learnerWorksheets,
        activeSlotId,
        patch,
        fallback,
      );
      return {
        ...current,
        assets: {
          ...current.assets,
          learnerWorksheets: nextMap,
          worksheetMarkdown: legacyWorksheetMarkdownFromMap(
            nextMap,
            current.assets.worksheetTargetStudentIds,
          ),
        },
      };
    });
  }

  if (!hydrated) {
    return <p className="text-sm text-zinc-500">Loading draft…</p>;
  }

  return (
    <div className="w-full space-y-5">
      {hydrated && !canUse ? (
        <div
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <BilingualStack
            layout="stack"
            zh={
              !isStudioContextReady(draft.footprint)
                ? "請先完成 Step 1：主題摘要與範圍（在課本對話確認足跡）。"
                : !isLearnerStepComplete(draft.learner)
                  ? "請先完成 Step 2：選班／學生並執行 Profile Synthesizer。"
                  : "請先完成 Step 1 與 Step 2。"
            }
            en={
              !isStudioContextReady(draft.footprint)
                ? "Complete Step 1: topic summary and scope (confirm footprint in textbook chat)."
                : !isLearnerStepComplete(draft.learner)
                  ? "Complete Step 2: class, learners, and Profile Synthesizer."
                  : "Complete Steps 1 and 2 first."
            }
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
            zh="請先完成 Step 3 教學策略，再生成工作紙。"
            en="Complete Step 3 pedagogical strategy before generating worksheets."
          />
        </div>
      ) : null}

      <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
        <div className="min-w-0 space-y-5">
          <GameTargetLearnersPanel
            variant="worksheet"
            learner={draft.learner}
            rosterStudents={rosterStudents}
            gameTargetStudentIds={draft.assets.worksheetTargetStudentIds}
            disabled={!canUse}
            onChangeGameTargets={(ids) => {
              setDraft((current) => {
                const pruned = pruneWithRoster(
                  current.assets.learnerWorksheets,
                  ids,
                );
                return {
                  ...current,
                  assets: {
                    ...current.assets,
                    worksheetTargetStudentIds: ids,
                    learnerWorksheets: pruned,
                    worksheetMarkdown: legacyWorksheetMarkdownFromMap(
                      pruned,
                      ids,
                    ),
                  },
                };
              });
            }}
          />

          <WorksheetParametersForm
            value={activeParameters}
            disabled={!studioReady || !activeSlotId}
            adaptiveHint={{
              isUdl: activeIsUdl,
              isSen: activeStudent ? isSenStudent(activeStudent) : false,
            }}
            onChange={(next) => updateActiveSlot({ parameters: next })}
          />

          <div className="lg:hidden">
            <WorksheetBatchGeneratePanel
              compact
              worksheetTargetStudentIds={draft.assets.worksheetTargetStudentIds}
              worksheetTargetStudents={worksheetTargetStudents}
              parameters={activeParameters}
              footprint={draft.footprint}
              learner={draft.learner}
              pedagogy={draft.pedagogy}
              learnerWorksheets={draft.assets.learnerWorksheets}
              studioReady={studioReady}
              worksheetChatConfigured={worksheetChatConfigured}
              worksheetUdlChatConfigured={worksheetUdlChatConfigured}
              onLearnerWorksheets={replaceLearnerWorksheets}
            />
          </div>

          <WorksheetPreviewPanel
            tabs={learnerTabs}
            activeStudentId={activeSlotId}
            onActiveStudentId={setActiveStudentId}
            markdown={activeMarkdown}
            structuredJson={activeStructuredJson}
            parameters={activeParameters}
            student={activeStudent}
            isUdlTarget={activeIsUdl}
            status={activeStatus}
            teacherNote={activeTeacherNote}
            draft={draft}
            worksheetChatConfigured={activeApiConfigured}
            disabled={!studioReady || !activeSlotId || !activeApiConfigured}
            generating={generating}
            generateError={generateError}
            onGenerate={() => void generateActiveWorksheet()}
          />

          <WorksheetGenerationChatPanel
            tabs={learnerTabs}
            activeStudentId={activeSlotId}
            onActiveStudentId={setActiveStudentId}
            student={activeStudent}
            pedagogyRow={activePedagogyRow}
            parameters={activeParameters}
            footprint={draft.footprint}
            learner={draft.learner}
            pedagogy={draft.pedagogy}
            messages={activeMessages}
            conversationId={activeConversationId}
            currentStructuredJson={activeStructuredJson}
            disabled={!studioReady}
            activeTargetId={activeSlotId}
            isUdlTarget={activeIsUdl}
            worksheetChatConfigured={worksheetChatConfigured}
            worksheetUdlChatConfigured={worksheetUdlChatConfigured}
            generating={generating}
            onRequestGenerate={() => void generateActiveWorksheet()}
            onSlotChange={(patch) => updateActiveSlot(patch)}
          />
        </div>

        <aside className="hidden min-w-0 lg:block">
          <div className="sticky top-4 space-y-4">
            <WorksheetBatchGeneratePanel
              compact
              worksheetTargetStudentIds={draft.assets.worksheetTargetStudentIds}
              worksheetTargetStudents={worksheetTargetStudents}
              parameters={activeParameters}
              footprint={draft.footprint}
              learner={draft.learner}
              pedagogy={draft.pedagogy}
              learnerWorksheets={draft.assets.learnerWorksheets}
              studioReady={studioReady}
              worksheetChatConfigured={worksheetChatConfigured}
              worksheetUdlChatConfigured={worksheetUdlChatConfigured}
              onLearnerWorksheets={replaceLearnerWorksheets}
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