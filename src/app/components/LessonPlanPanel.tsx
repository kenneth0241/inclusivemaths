"use client";

import { useCallback, useEffect, useState } from "react";
import {
  extractCitationsFromChatEvent,
  mergeRetrieverResources,
  parseRetrieverResources,
} from "@/lib/dify-citations";
import {
  LESSON_PLAN_CONVERSATION_KEY,
  type LessonPlanCitation,
  type LessonPlanDifyExtras,
  type LessonPlanFormValues,
} from "@/lib/lesson-plan";
import { buildLocalLessonPlan } from "@/lib/lesson-template";
import { useStudentRoster } from "@/lib/use-student-roster";
import { useWorkflowDraft } from "@/lib/use-workflow-draft";
import { deriveLearnerProfileTag } from "@/lib/workflow-draft";
import EnvConfigBanner from "./EnvConfigBanner";
import LessonPlanForm from "./LessonPlanForm";
import LessonPlanResult from "./LessonPlanResult";

async function consumeLessonPlanStream(
  response: Response,
  onChunk: (text: string) => void,
  onCitations: (citations: LessonPlanCitation[]) => void,
  onConversationId: (id: string) => void,
) {
  const streamKind = response.headers.get("X-Lesson-Plan-Stream");
  const isChatRefine = streamKind === "chatflow-refine";

  if (!response.body) {
    throw new Error("No response stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) {
        continue;
      }
      const payload = line.slice(6).trim();
      if (!payload || payload === "[DONE]") {
        continue;
      }

      try {
        const event = JSON.parse(payload) as {
          event?: string;
          answer?: string;
          conversation_id?: string;
          metadata?: unknown;
          data?: {
            text?: string;
            outputs?: { text?: string };
            retriever_resources?: LessonPlanCitation[];
          };
        };

        if (event.conversation_id) {
          onConversationId(event.conversation_id);
        }

        if (isChatRefine) {
          if (
            event.event === "message" ||
            event.event === "agent_message"
          ) {
            const chunk = event.answer ?? "";
            if (chunk) {
              onChunk(chunk);
            }
          }
          const cite = extractCitationsFromChatEvent(
            event as Record<string, unknown>,
          );
          if (cite.length > 0) {
            onCitations(cite);
          }
          continue;
        }

        // Workflow stream: text_chunk + optional retriever_resources on nodes.
        if (event.event === "text_chunk") {
          const chunk = event.data?.text ?? "";
          if (chunk) {
            onChunk(chunk);
          }
        }

        const workflowCitations = extractCitationsFromChatEvent(
          event as Record<string, unknown>,
        );
        if (workflowCitations.length === 0 && event.event === "retriever_resources") {
          onCitations(parseRetrieverResources(event.data));
        } else if (workflowCitations.length > 0) {
          onCitations(workflowCitations);
        }

        if (event.event === "error") {
          throw new Error("Dify returned an error while generating.");
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          continue;
        }
        throw error;
      }
    }
  }
}

function extrasFromDraft(
  draft: ReturnType<typeof useWorkflowDraft>["draft"],
): LessonPlanDifyExtras {
  return {
    contentScope: draft.footprint.scope,
    visualModels: draft.footprint.visualModels,
    classId: draft.learner.classId,
    audience: draft.learner.audience,
    learnerProfileTag: deriveLearnerProfileTag(draft.learner),
    classProfile: draft.learner.classProfile,
  };
}

export default function LessonPlanPanel() {
  const { draft, setDraft, hydrated } = useWorkflowDraft();
  const { findStudent } = useStudentRoster();
  const formValues: LessonPlanFormValues = {
    topic: draft.lesson.topic,
    classFocus: draft.lesson.classFocus,
    learnerNotes: draft.lesson.learnerNotes,
    durationMinutes: draft.lesson.durationMinutes,
    requirements: draft.lesson.requirements,
  };
  const [planContent, setPlanContent] = useState("");
  const [citations, setCitations] = useState<LessonPlanCitation[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [refinement, setRefinement] = useState("");
  const [lessonPlanConfigured, setLessonPlanConfigured] = useState<
    boolean | null
  >(null);
  const [refineConfigured, setRefineConfigured] = useState(false);
  const [deployHint, setDeployHint] = useState<"local" | "vercel">("local");
  const [conversationId, setConversationId] = useState("");

  const loadConfig = useCallback(async () => {
    const response = await fetch("/api/config", { cache: "no-store" });
    const config = (await response.json()) as {
      lessonPlanConfigured?: boolean;
      lessonPlanRefineConfigured?: boolean;
      deployHint?: "local" | "vercel";
    };
    setLessonPlanConfigured(Boolean(config.lessonPlanConfigured));
    setRefineConfigured(Boolean(config.lessonPlanRefineConfigured));
    setDeployHint(config.deployHint === "vercel" ? "vercel" : "local");
  }, []);

  useEffect(() => {
    setConversationId(sessionStorage.getItem(LESSON_PLAN_CONVERSATION_KEY) ?? "");
    void loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (!hydrated || planContent || busy) {
      return;
    }
    if (draft.lesson.markdown.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate saved plan once
      setPlanContent(draft.lesson.markdown);
    }
  }, [hydrated, draft.lesson.markdown, planContent, busy]);

  function setFormValues(next: LessonPlanFormValues) {
    setDraft((current) => ({
      ...current,
      lesson: { ...current.lesson, ...next },
    }));
  }

  function persistPlan(markdown: string) {
    setPlanContent(markdown);
    setDraft((current) => ({
      ...current,
      lesson: { ...current.lesson, markdown },
    }));
  }

  async function runGeneration(mode: "generate" | "refine") {
    if (busy) {
      return;
    }

    if (!lessonPlanConfigured) {
      if (mode === "refine" && !refinement.trim()) {
        setError("Describe what you want to change.");
        return;
      }
      const local = buildLocalLessonPlan(
        {
          ...draft,
          lesson: { ...draft.lesson, ...formValues },
        },
        findStudent,
      );
      const next =
        mode === "refine"
          ? `${local}\n\n## Teacher refinement\n\n${refinement.trim()}`
          : local;
      persistPlan(next);
      setRefinement("");
      setError("");
      return;
    }

    if (mode === "refine" && !planContent.trim()) {
      setError("Generate a plan first, then refine it.");
      return;
    }

    if (mode === "refine" && !refinement.trim()) {
      setError("Describe what you want to change.");
      return;
    }

    setBusy(true);
    setError("");

    const previousPlanForRequest = planContent;

    if (mode === "generate") {
      setPlanContent("");
      setCitations([]);
      sessionStorage.removeItem(LESSON_PLAN_CONVERSATION_KEY);
      setConversationId("");
    } else {
      setPlanContent("");
      setCitations([]);
    }

    try {
      const response = await fetch("/api/lesson-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          ...formValues,
          ...extrasFromDraft(draft),
          previousPlan: previousPlanForRequest,
          refinement: mode === "refine" ? refinement : undefined,
          conversation_id:
            mode === "refine" && refineConfigured
              ? conversationId || undefined
              : undefined,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || "Lesson plan request failed.");
      }

      let accumulated = "";

      await consumeLessonPlanStream(
        response,
        (chunk) => {
          accumulated += chunk;
          setPlanContent(accumulated);
        },
        (incoming) => {
          setCitations((current) =>
            mergeRetrieverResources(current, incoming),
          );
        },
        (id) => {
          setConversationId(id);
          sessionStorage.setItem(LESSON_PLAN_CONVERSATION_KEY, id);
        },
      );

      persistPlan(accumulated);
      if (mode === "refine") {
        setRefinement("");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Lesson plan request failed.";
      setError(message);
      if (mode === "generate") {
        setPlanContent("");
      }
    } finally {
      setBusy(false);
    }
  }

  function startNewPlan() {
    persistPlan("");
    setCitations([]);
    setRefinement("");
    setError("");
    sessionStorage.removeItem(LESSON_PLAN_CONVERSATION_KEY);
    setConversationId("");
  }

  const showResult = busy || planContent.length > 0;

  return (
    <div className="flex w-full flex-col gap-6">
      <EnvConfigBanner
        configured={Boolean(lessonPlanConfigured)}
        deployHint={deployHint}
        envKey="DIFY_APP_LESSON_API_KEY"
      />
      {lessonPlanConfigured === false ? (
        <p className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-950 ring-1 ring-sky-100">
          No lesson workflow key yet. You can still generate a local CPA draft
          from the Content Footprint and learner profile.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <LessonPlanForm
        values={formValues}
        onChange={setFormValues}
        disabled={busy}
        onSubmit={() => void runGeneration("generate")}
        submitLabel={busy ? "Generating…" : "Generate lesson plan"}
      />

      {showResult ? (
        <>
          <LessonPlanResult
            content={planContent}
            citations={citations}
            streaming={busy}
            editable={!busy}
            onChange={persistPlan}
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void runGeneration("generate")}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 ring-1 ring-zinc-200 hover:bg-zinc-50 disabled:text-zinc-400"
            >
              Regenerate
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={startNewPlan}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50 disabled:text-zinc-400"
            >
              New plan
            </button>
          </div>

          {!busy && planContent ? (
            <div className="space-y-3 rounded-3xl bg-white p-6 ring-1 ring-zinc-200">
              <h3 className="text-sm font-semibold text-zinc-900">
                Refine this plan
              </h3>
              <p className="text-sm text-zinc-600">
                {refineConfigured
                  ? "Follow-up uses your optional Chatflow refine app and keeps conversation context."
                  : "Describe changes; the workflow receives your notes plus the current plan (add optional inputs previous_plan and refinement in Dify)."}
              </p>
              <textarea
                rows={3}
                value={refinement}
                onChange={(event) => setRefinement(event.target.value)}
                placeholder="e.g. Add more visual supports and shorten the warm-up."
                className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-base outline-none ring-emerald-500/30 focus:ring-4"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void runGeneration("refine")}
                className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:bg-zinc-300"
              >
                Apply refinement
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
