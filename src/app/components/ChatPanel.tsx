"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  cleanMergedAssistantAnswer,
  extractAllFollowUpsFromRaw,
  extractSuggestedFollowUpsFromChatEvent,
  mergeSuggestedFollowUps,
} from "@/lib/chat-follow-ups";
import {
  extractCitationsFromChatEvent,
  mergeRetrieverResources,
  type DifyRetrieverResource,
} from "@/lib/dify-citations";
import {
  difyResultToView,
  localDetectionToView,
  type StudioAnalysisView,
  type StudioWorkflowParsed,
} from "@/lib/chat-topic-analysis";
import { analyzeTeachingTopic } from "@/lib/chat-topic-suggest";
import AssistantChatMessage from "./AssistantChatMessage";
import ChatFollowUpSuggestions from "./ChatFollowUpSuggestions";
import { BilingualStack } from "./Bilingual";
import EnvConfigBanner from "./EnvConfigBanner";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: DifyRetrieverResource[];
  suggestedFollowUps?: string[];
};

export type ChatTranscriptMessage = {
  role: ChatMessage["role"];
  content: string;
};

export type ChatStudioAnalysisState = {
  analysis: StudioAnalysisView;
  busy: boolean;
  loading: boolean;
  error: string;
  difyConfigured: boolean;
};

/** @deprecated Use ChatStudioAnalysisState */
export type ChatTopicPanelState = ChatStudioAnalysisState;

function lessonTitleFromAnalysis(analysis: StudioAnalysisView): string {
  const raw = analysis.summary?.trim() || analysis.topic?.trim() || "";
  if (!raw) {
    return "";
  }
  const first = raw.split(/\n|。/)[0]?.trim();
  return (first || raw).slice(0, 120);
}

type ChatPanelProps = {
  onTranscriptChange?: (messages: ChatTranscriptMessage[], busy: boolean) => void;
  onTopicHint?: (topic: string) => void;
  onTopicPanelState?: (state: ChatStudioAnalysisState) => void;
};

const CONVERSATION_KEY = "inclusive-maths-conversation-id";

const FIRST_RUN_QUESTION = "請列出一年級數學的完整目錄與所有單元。";

export default function ChatPanel({
  onTranscriptChange,
  onTopicHint,
  onTopicPanelState,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [topicSuggestionDismissed, setTopicSuggestionDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [streamingAssistantId, setStreamingAssistantId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState("");
  const [chatConfigured, setChatConfigured] = useState<boolean | null>(null);
  const [topicAnalysisConfigured, setTopicAnalysisConfigured] = useState(false);
  const [difyTopicView, setDifyTopicView] = useState<StudioAnalysisView | null>(
    null,
  );
  const [topicAnalysisLoading, setTopicAnalysisLoading] = useState(false);
  const [topicAnalysisError, setTopicAnalysisError] = useState("");
  const [deployHint, setDeployHint] = useState<"local" | "vercel">("local");
  const topicFetchGeneration = useRef(0);
  const llm2FromNodeRef = useRef<{ assistantId: string; items: string[] } | null>(
    null,
  );
  const [conversationId, setConversationId] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    onTranscriptChange?.(
      messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      busy,
    );
  }, [messages, busy, onTranscriptChange]);

  const localTopicView = useMemo(
    () => localDetectionToView(analyzeTeachingTopic(messages)),
    [messages],
  );

  const topicAnalysis = useMemo(() => {
    if (topicAnalysisConfigured && difyTopicView) {
      return difyTopicView;
    }
    return localTopicView;
  }, [topicAnalysisConfigured, difyTopicView, localTopicView]);

  useEffect(() => {
    onTopicPanelState?.({
      analysis: topicAnalysis,
      busy,
      loading: topicAnalysisLoading,
      error: topicAnalysisError,
      difyConfigured: topicAnalysisConfigured,
    });
  }, [
    topicAnalysis,
    busy,
    topicAnalysisLoading,
    topicAnalysisError,
    topicAnalysisConfigured,
    onTopicPanelState,
  ]);

  const discussionSummary =
    topicAnalysis.summary?.trim() || topicAnalysis.topic?.trim() || "";

  const topicFollowUpQuestion = topicAnalysis.suggestedQuestion ?? "";

  const showTopicSuggestion =
    !busy &&
    !topicAnalysisLoading &&
    !topicSuggestionDismissed &&
    topicAnalysis.ready &&
    Boolean(discussionSummary) &&
    Boolean(topicFollowUpQuestion);

  const loadConfig = useCallback(async () => {
    const response = await fetch("/api/config", { cache: "no-store" });
    const config = (await response.json()) as {
      chatConfigured?: boolean;
      topicAnalysisConfigured?: boolean;
      deployHint?: "local" | "vercel";
    };
    setChatConfigured(Boolean(config.chatConfigured));
    setTopicAnalysisConfigured(Boolean(config.topicAnalysisConfigured));
    setDeployHint(config.deployHint === "vercel" ? "vercel" : "local");
  }, []);

  const fetchTopicFromDify = useCallback(
    async (snapshot: ChatMessage[]) => {
      if (!topicAnalysisConfigured) {
        return;
      }

      const generation = ++topicFetchGeneration.current;
      setTopicAnalysisLoading(true);
      setTopicAnalysisError("");

      try {
        const response = await fetch("/api/chat/topic-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: snapshot.map((message) => ({
              role: message.role,
              content: message.content,
            })),
            conversation_id: conversationId || undefined,
          }),
        });

        const body = (await response.json()) as StudioWorkflowParsed & {
          error?: string;
          suggested_question?: string | null;
          footprint?: { scope: string; visualModels: string };
        };

        if (generation !== topicFetchGeneration.current) {
          return;
        }

        if (!response.ok) {
          throw new Error(body.error || "Topic analysis failed.");
        }

        setDifyTopicView(
          difyResultToView({
            summary: body.summary ?? null,
            topic: body.topic ?? null,
            footprint: body.footprint ?? { scope: "", visualModels: "" },
            quality: body.quality ?? { scope: 0, visualModels: 0 },
            scopeQualityReason: body.scopeQualityReason ?? null,
            visualModelsQualityReason: body.visualModelsQualityReason ?? null,
            scopeFeedback: body.scopeFeedback ?? null,
            visualFeedback: body.visualFeedback ?? null,
            ready: Boolean(body.ready),
            suggestedQuestion:
              body.suggestedQuestion ?? body.suggested_question ?? null,
            reason: body.reason ?? null,
          }),
        );
      } catch (err) {
        if (generation !== topicFetchGeneration.current) {
          return;
        }
        const message =
          err instanceof Error ? err.message : "Topic analysis failed.";
        setTopicAnalysisError(message);
        setDifyTopicView(null);
      } finally {
        if (generation === topicFetchGeneration.current) {
          setTopicAnalysisLoading(false);
        }
      }
    },
    [topicAnalysisConfigured, conversationId],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch chat config on mount
    setConversationId(sessionStorage.getItem(CONVERSATION_KEY) ?? "");
    void loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (busy || !topicAnalysisConfigured || messages.length === 0) {
      return;
    }

    const last = messages[messages.length - 1];
    if (last.role !== "assistant" || !last.content.trim()) {
      return;
    }

    const timer = window.setTimeout(() => {
      void fetchTopicFromDify(messages);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [messages, busy, topicAnalysisConfigured, fetchTopicFromDify]);

  function appendCitations(assistantId: string, incoming: DifyRetrieverResource[]) {
    if (incoming.length === 0) {
      return;
    }
    setMessages((current) =>
      current.map((message) =>
        message.id === assistantId
          ? {
              ...message,
              citations: mergeRetrieverResources(
                message.citations ?? [],
                incoming,
              ),
            }
          : message,
      ),
    );
  }

  function setLlm2FollowUps(
    assistantId: string,
    incoming: string[],
    source: "node" | "stream",
  ) {
    const next = mergeSuggestedFollowUps([], incoming);
    if (next.length === 0) {
      return;
    }
    if (source === "node") {
      llm2FromNodeRef.current = { assistantId, items: next };
    }
    setMessages((current) =>
      current.map((message) =>
        message.id === assistantId
          ? { ...message, suggestedFollowUps: next }
          : message,
      ),
    );
  }

  function finalizeAssistantMessage(assistantId: string) {
    setMessages((current) =>
      current.map((message) => {
        if (message.id !== assistantId || message.role !== "assistant") {
          return message;
        }
        const { content, extracted } = cleanMergedAssistantAnswer(
          message.content,
        );
        const nodeItems =
          llm2FromNodeRef.current?.assistantId === assistantId
            ? llm2FromNodeRef.current.items
            : [];
        const fromTail = extractAllFollowUpsFromRaw(message.content);
        const followUps =
          nodeItems.length > 0
            ? nodeItems
            : fromTail.length > 0
              ? fromTail
              : extracted.length > 0
                ? extracted
                : (message.suggestedFollowUps ?? []);
        return {
          ...message,
          content,
          suggestedFollowUps: mergeSuggestedFollowUps([], followUps),
        };
      }),
    );
  }

  async function submitQuery(rawQuery: string) {
    const query = rawQuery.trim();
    if (!query || busy || !chatConfigured) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query,
    };
    const assistantId = `assistant-${Date.now()}`;
    setMessages((current) => [
      ...current,
      userMessage,
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setInput("");
    setTopicSuggestionDismissed(false);
    setDifyTopicView(null);
    setTopicAnalysisError("");
    llm2FromNodeRef.current = null;
    setBusy(true);
    setStreamingAssistantId(assistantId);
    setError("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          grade: "1",
          conversation_id: conversationId || undefined,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || "Chat request failed.");
      }

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
            const event = JSON.parse(payload) as Record<string, unknown> & {
              event?: string;
              answer?: string;
              conversation_id?: string;
              metadata?: unknown;
            };

            if (event.conversation_id) {
              setConversationId(String(event.conversation_id));
              sessionStorage.setItem(
                CONVERSATION_KEY,
                String(event.conversation_id),
              );
            }

            appendCitations(
              assistantId,
              extractCitationsFromChatEvent(event),
            );

            const eventName =
              typeof event.event === "string" ? event.event : "";
            const followUps = extractSuggestedFollowUpsFromChatEvent(event);
            if (followUps.length === 0) {
              // skip
            } else if (
              eventName === "node_finished" ||
              eventName === "workflow_finished"
            ) {
              setLlm2FollowUps(assistantId, followUps, "node");
            } else if (eventName === "message_end") {
              setLlm2FollowUps(assistantId, followUps, "stream");
            }

            if (event.event === "message_end") {
              finalizeAssistantMessage(assistantId);
            }

            if (
              event.event === "message" ||
              event.event === "agent_message"
            ) {
              const chunk = event.answer ?? "";
              if (chunk) {
                setMessages((current) =>
                  current.map((message) =>
                    message.id === assistantId
                      ? { ...message, content: message.content + chunk }
                      : message,
                  ),
                );
              }
            }
          } catch {
            // Skip malformed SSE chunks.
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Chat failed.";
      setError(message);
      setMessages((current) => current.filter((item) => item.id !== assistantId));
    } finally {
      finalizeAssistantMessage(assistantId);
      setBusy(false);
      setStreamingAssistantId(null);
    }
  }

  function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    void submitQuery(input);
  }

  function startNewConversation() {
    topicFetchGeneration.current += 1;
    llm2FromNodeRef.current = null;
    sessionStorage.removeItem(CONVERSATION_KEY);
    setConversationId("");
    setMessages([]);
    setInput("");
    setTopicSuggestionDismissed(false);
    setDifyTopicView(null);
    setTopicAnalysisError("");
    setTopicAnalysisLoading(false);
    setError("");
  }

  function copySuggestionToInput(question: string) {
    setInput(question);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      const length = question.length;
      inputRef.current?.setSelectionRange(length, length);
    });
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <EnvConfigBanner
        configured={Boolean(chatConfigured)}
        deployHint={deployHint}
        envKey="DIFY_APP_CHAT_API_KEY"
        bilingual
      />

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <BilingualStack
          zh="小一"
          en="Primary Grade 1"
          zhClassName="text-sm font-semibold text-zinc-900"
          enClassName="text-zinc-500"
        />
        <button
          type="button"
          onClick={startNewConversation}
          className="rounded-full bg-white px-4 py-2 text-sm font-medium ring-1 ring-zinc-200 hover:bg-zinc-50"
        >
          <BilingualStack
            zh="新對話"
            en="New conversation"
            zhClassName="text-zinc-800"
            enClassName="text-zinc-500"
          />
        </button>
      </div>

      <div className="min-h-[280px] overflow-visible rounded-3xl bg-white p-4 ring-1 ring-zinc-200">
        {messages.length === 0 ? (
          <div className="flex flex-col justify-center gap-4 px-2 py-8 sm:px-3">
            <p className="text-sm leading-6 text-zinc-500">
              <BilingualStack
                layout="stack"
                zh="點選建議問題，或在下方輸入單元或課題。"
                en="Click the suggested question, or type a unit or topic below."
                enClassName="text-zinc-400"
              />
            </p>
            <button
              type="button"
              disabled={busy || !chatConfigured}
              onClick={() => void submitQuery(FIRST_RUN_QUESTION)}
              className="w-full rounded-full border-2 border-dashed border-emerald-300 bg-white px-5 py-3.5 text-left shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50/30 disabled:opacity-50"
            >
              <span className="block text-[11px] font-semibold tracking-wide text-emerald-700 uppercase">
                建議問題 · Suggested
              </span>
              <span className="mt-1 block text-sm leading-6 text-zinc-800">
                {FIRST_RUN_QUESTION}
              </span>
            </button>
          </div>
        ) : (
          <ul className="space-y-4">
            {messages.map((message) => (
              <li
                key={message.id}
                className={`flex flex-col ${
                  message.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-normal ${
                    message.role === "user"
                      ? "bg-emerald-600 text-white"
                      : "bg-zinc-100 text-zinc-900"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <AssistantChatMessage
                      content={message.content}
                      isStreaming={streamingAssistantId === message.id}
                      citations={message.citations}
                      useMarkdown
                    />
                  ) : (
                    <p className="whitespace-pre-wrap leading-normal">
                      {message.content}
                    </p>
                  )}
                </div>
                {message.role === "assistant" &&
                message.suggestedFollowUps &&
                message.suggestedFollowUps.length > 0 &&
                streamingAssistantId !== message.id ? (
                  <ChatFollowUpSuggestions
                    questions={message.suggestedFollowUps}
                    disabled={busy || !chatConfigured}
                    onSelect={(question) => void submitQuery(question)}
                    onCopyToInput={copySuggestionToInput}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      {showTopicSuggestion ? (
        <div
          role="status"
          className="rounded-2xl bg-white p-4 ring-1 ring-emerald-200"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <BilingualStack
                zh="教學討論摘要"
                en="Discussion summary"
                zhClassName="text-sm font-semibold text-emerald-900"
                enClassName="text-emerald-800/70"
              />
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                {discussionSummary}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                <BilingualStack
                  layout="stack"
                  zh="可繼續用下面建議追問，或將摘要首句記入教案題目。"
                  en="Use the suggested follow-up below, or save the first line to the lesson title."
                  enClassName="text-zinc-400"
                />
              </p>
            </div>
            <button
              type="button"
              aria-label="Dismiss topic suggestion"
              onClick={() => setTopicSuggestionDismissed(true)}
              className="shrink-0 rounded-full px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100"
            >
              ✕
            </button>
          </div>
          <button
            type="button"
            disabled={busy || !chatConfigured}
            onClick={() => {
              setInput(topicFollowUpQuestion);
              setTopicSuggestionDismissed(true);
            }}
            className="mt-3 w-full rounded-2xl bg-emerald-50 px-4 py-3 text-left text-sm leading-normal text-emerald-950 ring-1 ring-emerald-100 hover:bg-emerald-100/80 disabled:opacity-50"
          >
            {topicFollowUpQuestion}
          </button>
          <button
            type="button"
            onClick={() =>
              onTopicHint?.(lessonTitleFromAnalysis(topicAnalysis))
            }
            className="mt-2 w-full rounded-full bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
          >
            <BilingualStack
              zh="將此主題記入教案題目"
              en="Save topic to lesson title"
              zhClassName=""
              enClassName="text-white/80"
            />
          </button>
        </div>
      ) : null}

      <form onSubmit={(event) => void sendMessage(event)} className="flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="查詢課本課題 · Ask about a textbook topic"
          disabled={busy || !chatConfigured}
          className="min-w-0 flex-1 rounded-full border border-zinc-200 bg-white px-5 py-3 text-base outline-none ring-emerald-500/30 focus:ring-4 disabled:bg-zinc-50"
        />
        <button
          type="submit"
          disabled={busy || !chatConfigured || !input.trim()}
          className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:bg-zinc-300"
        >
          {busy ? (
            <BilingualStack
              zh="思考中…"
              en="Thinking…"
              enClassName="text-white/80"
            />
          ) : (
            <BilingualStack zh="送出" en="Send" enClassName="text-white/80" />
          )}
        </button>
      </form>
    </div>
  );
}
