"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  gameTargetIdsEqual,
  normalizeGameTargetStudentIds,
} from "@/lib/game-targets";
import { hasPedagogyBaseline, pedagogyInputFingerprint } from "@/lib/pedagogy-strategy";
import { useStudentRoster } from "@/lib/use-student-roster";
import { useWorkflowDraft } from "@/lib/use-workflow-draft";
import {
  isLearnerStepComplete,
  isStudioContextReady,
} from "@/lib/workflow-draft";
import { BilingualStack } from "./Bilingual";
import GameGenerationChatPanel from "./GameGenerationChatPanel";
import GameHtmlPreviewPanel from "./GameHtmlPreviewPanel";
import GameParametersForm from "./GameParametersForm";
import GameTargetLearnersPanel from "./GameTargetLearnersPanel";
import MaterialsContextSidebar from "./MaterialsContextSidebar";

export default function GameMaterialsStudio() {
  const { draft, setDraft, hydrated } = useWorkflowDraft();
  const { findStudent } = useStudentRoster();

  const canUse =
    hydrated &&
    isStudioContextReady(draft.footprint) &&
    isLearnerStepComplete(draft.learner);

  const inputFingerprint = useMemo(
    () => pedagogyInputFingerprint(draft.footprint, draft.learner),
    [draft.footprint, draft.learner],
  );

  const hasBaseline = hasPedagogyBaseline(draft.pedagogy, inputFingerprint);

  const rosterStudents = useMemo(
    () =>
      draft.learner.studentIds
        .map((id) => findStudent(draft.learner.classId, id))
        .filter((s): s is NonNullable<typeof s> => s !== null),
    [draft.learner.classId, draft.learner.studentIds, findStudent],
  );

  const selectedStudents = rosterStudents;

  useEffect(() => {
    const normalized = normalizeGameTargetStudentIds(
      draft.assets.gameTargetStudentIds,
      draft.learner.studentIds,
    );
    if (
      gameTargetIdsEqual(normalized, draft.assets.gameTargetStudentIds)
    ) {
      return;
    }
    setDraft((current) => ({
      ...current,
      assets: { ...current.assets, gameTargetStudentIds: normalized },
    }));
  }, [
    draft.assets.gameTargetStudentIds,
    draft.learner.studentIds,
    setDraft,
  ]);

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

  const studioReady = canUse && hasBaseline;

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
            onChangeGameTargets={(ids) =>
              setDraft((current) => ({
                ...current,
                assets: { ...current.assets, gameTargetStudentIds: ids },
              }))
            }
          />

          <GameParametersForm
            value={draft.assets.gameParameters}
            disabled={!studioReady}
            onChange={(next) =>
              setDraft((current) => ({
                ...current,
                assets: { ...current.assets, gameParameters: next },
              }))
            }
          />

          <GameHtmlPreviewPanel
            gameHtml={draft.assets.gameHtml}
            draft={draft}
            disabled={!studioReady}
            onGameHtml={(html) =>
              setDraft((current) => ({
                ...current,
                assets: { ...current.assets, gameHtml: html },
              }))
            }
          />

          <GameGenerationChatPanel
            parameters={draft.assets.gameParameters}
            disabled={!studioReady}
          />
        </div>

        <aside className="hidden min-w-0 lg:block">
          <div className="sticky top-4">
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
