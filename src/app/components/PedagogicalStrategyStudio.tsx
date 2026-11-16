"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildPedagogyDemoDraft,
  buildPedagogyDemoPedagogyState,
  clearPedagogyChatSession,
  shouldAutoLoadPedagogyDemo,
} from "@/lib/pedagogy-demo-fixture";
import {
  formatPedagogyStepsContext,
  formatStudentRefineSeedMarkdown,
  formatUdlRefineSeedMarkdown,
  hasPedagogyBaseline,
  mergePedagogyStructuredRefine,
  type PedagogyStructuredPayload,
  pedagogyInputFingerprint,
} from "@/lib/pedagogy-strategy";
import { useStudentRoster } from "@/lib/use-student-roster";
import { useWorkflowDraft } from "@/lib/use-workflow-draft";
import {
  isLearnerStepComplete,
  isStudioContextReady,
} from "@/lib/workflow-draft";
import { BilingualStack } from "./Bilingual";
import EnvConfigBanner from "./EnvConfigBanner";
import PedagogyRefineChatDrawer from "./PedagogyRefineChatDrawer";
import PedagogyStrategyWorkspace from "./PedagogyStrategyWorkspace";
import PedagogyStudioSidebar from "./PedagogyStudioSidebar";
import StudioAnalysisStatusBanner from "./StudioAnalysisStatusBanner";

type RefineTarget =
  | { scope: "udl" }
  | { scope: "student"; index: number; studentProfile: string };

export default function PedagogicalStrategyStudio() {
  const { draft, setDraft, hydrated } = useWorkflowDraft();
  const { findStudent } = useStudentRoster();
  const [baselineLoading, setBaselineLoading] = useState(false);
  const [baselineError, setBaselineError] = useState("");
  const [refineBusy, setRefineBusy] = useState(false);
  const [refineTarget, setRefineTarget] = useState<RefineTarget | null>(null);
  const [workflowConfigured, setWorkflowConfigured] = useState<boolean | null>(
    null,
  );
  const [individualRefineConfigured, setIndividualRefineConfigured] = useState<
    boolean | null
  >(null);
  const [deployHint, setDeployHint] = useState<"local" | "vercel">("local");
  const demoAutoLoaded = useRef(false);
  const baselineRunFp = useRef<string | null>(null);
  const [demoLoadNonce, setDemoLoadNonce] = useState(0);

  const canUse =
    hydrated &&
    isStudioContextReady(draft.footprint) &&
    isLearnerStepComplete(draft.learner);

  const inputFingerprint = useMemo(
    () => pedagogyInputFingerprint(draft.footprint, draft.learner),
    [draft.footprint, draft.learner],
  );

  const selectedStudents = useMemo(
    () =>
      draft.learner.studentIds
        .map((id) => findStudent(draft.learner.classId, id))
        .filter((s): s is NonNullable<typeof s> => s !== null),
    [draft.learner.classId, draft.learner.studentIds, findStudent],
  );

  const patchPedagogyStructured = useCallback(
    (payload: PedagogyStructuredPayload) => {
      setDraft((current) => ({
        ...current,
        pedagogy: {
          ...current.pedagogy,
          educationalTheory:
            payload.educationalTheory.trim() ||
            current.pedagogy.educationalTheory,
          learningStrategies:
            payload.learningStrategies.trim() ||
            current.pedagogy.learningStrategies,
          udl: payload.udl,
          individualized: payload.individualized,
          lastInputFingerprint: inputFingerprint,
        },
      }));
    },
    [inputFingerprint, setDraft],
  );

  const resetPedagogyOutputs = useCallback(() => {
    setDraft((current) => ({
      ...current,
      pedagogy: {
        ...current.pedagogy,
        conversationId: "",
        educationalTheory: "",
        learningStrategies: "",
        udl: null,
        individualized: [],
        lastInputFingerprint: "",
      },
    }));
    baselineRunFp.current = null;
    setBaselineError("");
  }, [setDraft]);

  const runBaseline = useCallback(async () => {
    if (!canUse || !workflowConfigured) {
      return;
    }
    if (baselineRunFp.current === inputFingerprint) {
      return;
    }
    if (hasPedagogyBaseline(draft.pedagogy, inputFingerprint)) {
      baselineRunFp.current = inputFingerprint;
      return;
    }

    baselineRunFp.current = inputFingerprint;
    setBaselineLoading(true);
    setBaselineError("");

    try {
      const response = await fetch("/api/pedagogy-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          footprint: draft.footprint,
          classId: draft.learner.classId,
          studentIds: draft.learner.studentIds,
          classProfile: draft.learner.classProfile,
          pedagogicalSynthesis: draft.learner.pedagogicalSynthesis,
          profileSynthesisStructured: draft.learner.profileSynthesisStructured,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || "Strategy analysis failed.");
      }

      const payload = (await response.json()) as PedagogyStructuredPayload;
      patchPedagogyStructured(payload);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Strategy analysis failed.";
      setBaselineError(message);
      baselineRunFp.current = null;
    } finally {
      setBaselineLoading(false);
    }
  }, [
    canUse,
    workflowConfigured,
    inputFingerprint,
    draft.pedagogy,
    draft.footprint,
    draft.learner,
    patchPedagogyStructured,
  ]);

  useEffect(() => {
    if (!hydrated || !canUse) {
      return;
    }
    const stored = draft.pedagogy.lastInputFingerprint;
    if (!stored || stored === inputFingerprint) {
      return;
    }
    clearPedagogyChatSession();
    resetPedagogyOutputs();
  }, [
    hydrated,
    canUse,
    inputFingerprint,
    draft.pedagogy.lastInputFingerprint,
    resetPedagogyOutputs,
  ]);

  useEffect(() => {
    if (!canUse || workflowConfigured !== true) {
      return;
    }
    if (hasPedagogyBaseline(draft.pedagogy, inputFingerprint)) {
      return;
    }
    void runBaseline();
  }, [
    canUse,
    workflowConfigured,
    inputFingerprint,
    draft.pedagogy.lastInputFingerprint,
    draft.pedagogy.udl,
    draft.pedagogy.individualized.length,
    demoLoadNonce,
    runBaseline,
  ]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/config");
        const body = (await response.json()) as {
          pedagogyWorkflowConfigured?: boolean;
          pedagogyIndividualRefineConfigured?: boolean;
          deployHint?: "local" | "vercel";
        };
        if (!cancelled) {
          setWorkflowConfigured(Boolean(body.pedagogyWorkflowConfigured));
          setIndividualRefineConfigured(
            Boolean(body.pedagogyIndividualRefineConfigured),
          );
          setDeployHint(body.deployHint === "vercel" ? "vercel" : "local");
        }
      } catch {
        if (!cancelled) {
          setWorkflowConfigured(false);
          setIndividualRefineConfigured(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function loadDemoContext() {
    clearPedagogyChatSession();
    setRefineTarget(null);
    setBaselineError("");
    baselineRunFp.current = null;
    setDemoLoadNonce((nonce) => nonce + 1);
    setDraft((current) => {
      const next = buildPedagogyDemoDraft(current);
      if (workflowConfigured === false) {
        return {
          ...next,
          pedagogy: buildPedagogyDemoPedagogyState(
            next.footprint,
            next.learner,
          ),
        };
      }
      return next;
    });
  }

  useEffect(() => {
    if (!hydrated || demoAutoLoaded.current || !shouldAutoLoadPedagogyDemo()) {
      return;
    }
    demoAutoLoaded.current = true;
    loadDemoContext();
  }, [hydrated]);

  function handleRefineStructured(
    payload: PedagogyStructuredPayload,
    scope: "udl" | "student",
    studentIndex?: number,
  ) {
    setDraft((current) => {
      const currentPayload: PedagogyStructuredPayload = {
        educationalTheory: current.pedagogy.educationalTheory,
        learningStrategies: current.pedagogy.learningStrategies,
        udl: current.pedagogy.udl,
        individualized: current.pedagogy.individualized,
      };
      const merged = mergePedagogyStructuredRefine(
        currentPayload,
        payload,
        scope,
        studentIndex,
      );
      return {
        ...current,
        pedagogy: {
          ...current.pedagogy,
          educationalTheory: merged.educationalTheory,
          learningStrategies: merged.learningStrategies,
          udl: merged.udl,
          individualized: merged.individualized,
          lastInputFingerprint: inputFingerprint,
        },
      };
    });
  }

  const stepsContextMarkdown = useMemo(
    () => formatPedagogyStepsContext(draft.footprint, draft.learner),
    [draft.footprint, draft.learner],
  );

  const hasBaseline = hasPedagogyBaseline(draft.pedagogy, inputFingerprint);

  const baselineAnalyzing =
    canUse &&
    hydrated &&
    !hasBaseline &&
    !baselineError &&
    workflowConfigured !== false;

  const refineStudentRow = useMemo(() => {
    if (refineTarget?.scope !== "student") {
      return null;
    }
    return draft.pedagogy.individualized[refineTarget.index] ?? null;
  }, [refineTarget, draft.pedagogy.individualized]);

  const refineStudentId = useMemo(() => {
    if (refineTarget?.scope !== "student") {
      return undefined;
    }
    return draft.learner.studentIds[refineTarget.index];
  }, [refineTarget, draft.learner.studentIds]);

  const refineSeedMarkdown = useMemo(() => {
    if (!refineTarget || !hasBaseline) {
      return "";
    }
    if (refineTarget.scope === "udl") {
      return formatUdlRefineSeedMarkdown(draft.pedagogy);
    }
    const row = draft.pedagogy.individualized[refineTarget.index];
    return row ? formatStudentRefineSeedMarkdown(row) : "";
  }, [refineTarget, hasBaseline, draft.pedagogy]);

  const refineDrawerOpen = refineTarget !== null;
  const refineTitle =
    refineTarget?.scope === "student"
      ? {
          zh: `細化 · ${refineTarget.studentProfile.split("(")[0]?.trim() || "Student"}`,
          en: "Refine individual student strategy",
        }
      : { zh: "細化 UDL · 全班策略", en: "Refine class-wide UDL" };

  return (
    <div className="w-full space-y-5">
      <EnvConfigBanner
        configured={Boolean(workflowConfigured)}
        deployHint={deployHint}
        envKey="DIFY_APP_PEDAGOGY_API_KEY"
        bilingual
      />

      {!canUse && hydrated ? (
        <div
          className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <BilingualStack
            layout="stack"
            zh="請先完成 Step 1 內容確認與 Step 2 Profile Synthesizer 分析。"
            en="Complete Step 1 and Step 2 Profile Synthesizer first."
            enClassName="text-amber-900/85"
          />
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={loadDemoContext}
              className="rounded-full bg-amber-100 px-4 py-2 text-xs font-semibold text-amber-950 ring-1 ring-amber-300 transition hover:bg-amber-200"
            >
              <BilingualStack
                zh="載入示範 Step 1–2 並自動執行 Step 3 分析"
                en="Load demo Steps 1–2 and auto-run Step 3 analysis"
                layout="auto"
              />
            </button>
            <span className="text-xs text-amber-900/75">
              <code className="rounded bg-amber-100/80 px-1 font-mono">
                /design/pedagogy?demo=1
              </code>
            </span>
          </div>
        </div>
      ) : null}

      {baselineAnalyzing ? (
        <StudioAnalysisStatusBanner
          zh="分析中…正在產生 Step 3 教學策略"
          en="Analyzing… building Step 3 pedagogical strategy"
          subZh="整合 Step 1 內容足跡與 Step 2 學習者檔案"
          subEn="Combining Step 1 footprint with Step 2 learner profiles"
        />
      ) : null}

      {canUse && hydrated ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            disabled={baselineLoading}
            onClick={loadDemoContext}
            className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-950 ring-1 ring-amber-200 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <BilingualStack
              zh="載入／重設示範資料"
              en="Load / reset demo data"
              layout="auto"
            />
          </button>
          <code className="text-[11px] text-zinc-500">?demo=1</code>
        </div>
      ) : null}

      <div className="grid w-full gap-5 lg:grid-cols-[3fr_2fr] lg:items-start">
        <div className="min-w-0">
          <PedagogyStrategyWorkspace
            pedagogy={draft.pedagogy}
            contextReady={canUse}
            hasBaseline={hasBaseline}
            baselineLoading={baselineLoading}
            baselineAnalyzing={baselineAnalyzing}
            baselineError={baselineError}
            refineBusy={refineBusy}
            onRefineUdl={() => setRefineTarget({ scope: "udl" })}
            onRefineStudent={(index) => {
              const row = draft.pedagogy.individualized[index];
              setRefineTarget({
                scope: "student",
                index,
                studentProfile: row?.studentProfile ?? "",
              });
            }}
          />
        </div>

        <aside className="min-w-0 lg:sticky lg:top-4 lg:self-start">
          <PedagogyStudioSidebar
            footprint={draft.footprint}
            learner={draft.learner}
            selectedStudents={selectedStudents}
          />
        </aside>
      </div>

      <PedagogyRefineChatDrawer
        open={refineDrawerOpen}
        scope={refineTarget?.scope ?? "udl"}
        studentIndex={
          refineTarget?.scope === "student" ? refineTarget.index : undefined
        }
        studentProfile={
          refineTarget?.scope === "student"
            ? refineTarget.studentProfile
            : undefined
        }
        titleZh={refineTitle.zh}
        titleEn={refineTitle.en}
        stepsContextMarkdown={stepsContextMarkdown}
        seedAnalysisMarkdown={refineSeedMarkdown}
        needsInitialAnalysis={!hasBaseline && !baselineLoading}
        footprint={draft.footprint}
        learner={draft.learner}
        workflowConfigured={Boolean(workflowConfigured)}
        individualRefineConfigured={Boolean(individualRefineConfigured)}
        individualizedRow={refineStudentRow}
        studentId={refineStudentId}
        disabled={!canUse}
        onClose={() => setRefineTarget(null)}
        onBaselineComplete={(payload) => {
          patchPedagogyStructured(payload);
          setBaselineError("");
          baselineRunFp.current = inputFingerprint;
        }}
        onBaselineFailed={setBaselineError}
        onStructuredResult={handleRefineStructured}
        onBusyChange={(busy) => {
          setRefineBusy(busy);
          setBaselineLoading(
            busy &&
              !hasPedagogyBaseline(draft.pedagogy, inputFingerprint),
          );
          if (!busy && hasPedagogyBaseline(draft.pedagogy, inputFingerprint)) {
            setBaselineError("");
          }
        }}
      />
    </div>
  );
}
