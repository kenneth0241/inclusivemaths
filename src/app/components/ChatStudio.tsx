"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { extractContentFootprint } from "@/lib/content-footprint";
import { useWorkflowDraft } from "@/lib/use-workflow-draft";
import {
  mergeExtractedFootprint,
  type FootprintField,
} from "@/lib/workflow-draft";
import { emptyLocalStudioView } from "@/lib/chat-topic-analysis";
import ChatPanel, {
  type ChatStudioAnalysisState,
  type ChatTranscriptMessage,
} from "./ChatPanel";
import ChatWelcome from "./ChatWelcome";
import { ContentFootprintDrawer } from "./ContentFootprintPanel";

const INITIAL_STUDIO_ANALYSIS: ChatStudioAnalysisState = {
  analysis: emptyLocalStudioView(),
  busy: false,
  loading: false,
  error: "",
  difyConfigured: false,
};

export default function ChatStudio() {
  const { draft, setDraft, hydrated } = useWorkflowDraft();
  const [hasMessages, setHasMessages] = useState(false);
  const [studioAnalysis, setStudioAnalysis] =
    useState<ChatStudioAnalysisState>(INITIAL_STUDIO_ANALYSIS);
  const difyFootprintEnabled = useRef(false);
  const [flashed, setFlashed] = useState<Partial<Record<FootprintField, boolean>>>(
    {},
  );
  const flashTimers = useRef<Partial<Record<FootprintField, number>>>({});

  useEffect(() => {
    difyFootprintEnabled.current = studioAnalysis.difyConfigured;
  }, [studioAnalysis.difyConfigured]);

  useEffect(() => {
    return () => {
      Object.values(flashTimers.current).forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const flash = useCallback((fields: FootprintField[]) => {
    if (fields.length === 0) {
      return;
    }
    setFlashed((current) => {
      const next = { ...current };
      for (const field of fields) {
        next[field] = true;
      }
      return next;
    });
    for (const field of fields) {
      window.clearTimeout(flashTimers.current[field]);
      flashTimers.current[field] = window.setTimeout(() => {
        setFlashed((current) => ({ ...current, [field]: false }));
      }, 700);
    }
  }, []);

  const mergeFootprintIntoDraft = useCallback(
    (incoming: { scope: string; visualModels: string }) => {
      if (!hydrated) {
        return;
      }
      setDraft((current) => {
        const merged = mergeExtractedFootprint(current.footprint, incoming);
        const changed = (["scope", "visualModels"] as const).filter(
          (field) => merged[field] !== current.footprint[field],
        );
        if (changed.length > 0) {
          queueMicrotask(() => flash(changed));
          return { ...current, footprint: merged };
        }
        return current;
      });
    },
    [hydrated, setDraft, flash],
  );

  useEffect(() => {
    if (
      !hydrated ||
      !studioAnalysis.difyConfigured ||
      studioAnalysis.loading ||
      studioAnalysis.busy
    ) {
      return;
    }
    const { scope, visualModels } = studioAnalysis.analysis.footprint;
    const summary = studioAnalysis.analysis.summary?.trim() ?? "";
    if (!scope.trim() && !visualModels.trim() && !summary) {
      return;
    }
    mergeFootprintIntoDraft({ scope, visualModels });
    if (summary) {
      setDraft((current) => {
        if (current.footprint.edited.topicSummary) {
          return current;
        }
        if (current.footprint.topicSummary === summary) {
          return current;
        }
        return {
          ...current,
          footprint: {
            ...current.footprint,
            topicSummary: summary,
          },
        };
      });
    }
  }, [
    hydrated,
    studioAnalysis.difyConfigured,
    studioAnalysis.loading,
    studioAnalysis.busy,
    studioAnalysis.analysis.footprint,
    studioAnalysis.analysis.summary,
    mergeFootprintIntoDraft,
    setDraft,
  ]);

  const applyTranscript = useCallback(
    (messages: ChatTranscriptMessage[], busy: boolean) => {
      setHasMessages(messages.length > 0);
      if (!hydrated || busy || difyFootprintEnabled.current) {
        return;
      }
      const last = messages[messages.length - 1];
      if (!last || last.role !== "assistant" || !last.content.trim()) {
        return;
      }
      const extracted = extractContentFootprint(messages);
      mergeFootprintIntoDraft(extracted);
    },
    [hydrated, mergeFootprintIntoDraft],
  );

  function handleFieldChange(field: FootprintField, value: string) {
    setDraft((current) => ({
      ...current,
      footprint: {
        ...current.footprint,
        [field]: value,
        edited: {
          ...current.footprint.edited,
          [field]: value.trim().length > 0,
        },
      },
    }));
  }

  function handleTopicHint(topic: string) {
    setDraft((current) => ({
      ...current,
      lesson: { ...current.lesson, topic },
      footprint: current.footprint.edited.scope
        ? current.footprint
        : {
            ...current.footprint,
            scope: current.footprint.scope.trim()
              ? current.footprint.scope
              : topic,
          },
    }));
  }

  return (
    <div className="flex w-full flex-col gap-5">
      {hasMessages ? null : <ChatWelcome />}
      <div className="grid w-full gap-5 md:grid-cols-12">
        <div className="md:col-span-7">
          <ChatPanel
            onTranscriptChange={applyTranscript}
            onTopicHint={handleTopicHint}
            onTopicPanelState={setStudioAnalysis}
          />
        </div>
        <aside className="md:col-span-5 md:sticky md:top-4 md:self-start">
          <ContentFootprintDrawer
            footprint={draft.footprint}
            flashed={flashed}
            onChange={handleFieldChange}
            studio={{
              analysis: studioAnalysis.analysis,
              busy: studioAnalysis.busy,
              loading: studioAnalysis.loading,
              error: studioAnalysis.error,
              difyConfigured: studioAnalysis.difyConfigured,
            }}
          />
        </aside>
      </div>
    </div>
  );
}
