"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cleanMergedAssistantAnswer } from "@/lib/chat-follow-ups";
import {
  type PedagogyRefineScope,
  type PedagogyStructuredPayload,
  formatPedagogyChatMarkdown,
  formatPedagogyRefineAssistantContent,
  formatStudentRefineSeedMarkdown,
  formatUdlRefineSeedMarkdown,
  parsePedagogyWorkflowOutputs,
  pedagogyStructuredResultReady,
  resolvePedagogyRefineChatReply,
  pedagogyThreadKey,
  isUnparsedPedagogyStructuredJson,
  looksLikePedagogyStructuredJsonAnswer,
  resolvePedagogyStudentChatDisplay,
  toPedagogyStructuredPayload,
  tryParsePedagogyStructuredAnswerText,
  tryParsePedagogyWorkflowOutputs,
} from "@/lib/pedagogy-strategy";

const STUDENT_STRUCTURED_STREAM_PLACEHOLDER =
  "正在整理回覆… · Preparing reply…";
import { pedagogyThreadStorageKeys } from "@/lib/pedagogy-refine-session";
import type {
  ContentFootprint,
  LearnerProfile,
  PedagogyIndividualizedRow,
} from "@/lib/workflow-draft";
import EnvConfigBanner from "./EnvConfigBanner";
import AssistantChatMessage from "./AssistantChatMessage";
import { BilingualStack } from "./Bilingual";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  kind?: "steps-context" | "analysis" | "chat";
};

type PedagogyRefineChatDrawerProps = {
  open: boolean;
  scope: PedagogyRefineScope;
  studentIndex?: number;
  studentProfile?: string;
  titleZh: string;
  titleEn: string;
  stepsContextMarkdown: string;
  seedAnalysisMarkdown: string;
  needsInitialAnalysis: boolean;
  footprint: ContentFootprint;
  learner: LearnerProfile;
  workflowConfigured: boolean;
  individualRefineConfigured: boolean;
  individualizedRow?: PedagogyIndividualizedRow | null;
  studentId?: string;
  disabled?: boolean;
  onClose: () => void;
  onBaselineComplete: (payload: PedagogyStructuredPayload) => void;
  onBaselineFailed?: (message: string) => void;
  onStructuredResult: (
    payload: PedagogyStructuredPayload,
    scope: PedagogyRefineScope,
    studentIndex?: number,
  ) => void;
  onBusyChange?: (busy: boolean) => void;
};

const CONTEXT_USER_QUERY =
  "請根據以上 Step 1–2 內容執行教學策略分析。\nRun pedagogical strategy analysis from the Step 1–2 context above.";

function buildStepsContextMessage(
  stepsContextMarkdown: string,
): ChatMessage {
  return {
    id: `ctx-${Date.now()}`,
    role: "user",
    kind: "steps-context",
    content: stepsContextMarkdown.trim()
      ? `${stepsContextMarkdown.trim()}\n\n---\n\n${CONTEXT_USER_QUERY}`
      : CONTEXT_USER_QUERY,
  };
}

function ensureStepsContextBanner(
  messages: ChatMessage[],
  stepsContextMarkdown: string,
): ChatMessage[] {
  if (!stepsContextMarkdown.trim()) {
    return messages;
  }
  const withoutContext = messages.filter(
    (message) => message.kind !== "steps-context",
  );
  return [buildStepsContextMessage(stepsContextMarkdown), ...withoutContext];
}

function prepareRestoredMessages(
  restored: ChatMessage[],
  scope: PedagogyRefineScope,
  stepsContextMarkdown: string,
): ChatMessage[] {
  if (scope === "student") {
    return restored.filter((message) => message.kind !== "steps-context");
  }
  return ensureStepsContextBanner(restored, stepsContextMarkdown);
}

export default function PedagogyRefineChatDrawer({
  open,
  scope,
  studentIndex,
  studentProfile,
  titleZh,
  titleEn,
  stepsContextMarkdown,
  seedAnalysisMarkdown,
  needsInitialAnalysis,
  footprint,
  learner,
  workflowConfigured,
  individualRefineConfigured,
  individualizedRow = null,
  studentId,
  disabled = false,
  onClose,
  onBaselineComplete,
  onBaselineFailed,
  onStructuredResult,
  onBusyChange,
}: PedagogyRefineChatDrawerProps) {
  const threadKey = pedagogyThreadKey(scope, studentIndex);
  const { conversation: conversationKey, messages: messagesKey } =
    pedagogyThreadStorageKeys(threadKey);

  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [streamingAssistantId, setStreamingAssistantId] = useState<string | null>(
    null,
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initGeneration = useRef(0);
  const threadHydratedKey = useRef<string | null>(null);
  const submitGenerationRef = useRef(0);
  const individualizedRowRef = useRef(individualizedRow);
  individualizedRowRef.current = individualizedRow;
  const [deployHint, setDeployHint] = useState<"local" | "vercel">("local");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  useEffect(() => {
    if (!open) {
      threadHydratedKey.current = null;
      return;
    }
    if (threadHydratedKey.current === threadKey) {
      return;
    }
    threadHydratedKey.current = threadKey;
    const generation = ++initGeneration.current;
    setError("");

    const storedId = sessionStorage.getItem(conversationKey);
    if (storedId) {
      setConversationId(storedId);
    }

    let restored: ChatMessage[] = [];
    try {
      const raw = sessionStorage.getItem(messagesKey);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          restored = parsed;
        }
      }
    } catch {
      sessionStorage.removeItem(messagesKey);
    }

    if (restored.length > 0) {
      setMessages(prepareRestoredMessages(restored, scope, stepsContextMarkdown));
      setTimeout(() => inputRef.current?.focus(), 200);
      return;
    }

    const contextMessage = buildStepsContextMessage(stepsContextMarkdown);
    const seedMessage: ChatMessage = {
      id: `seed-${Date.now()}`,
      role: "assistant",
      kind: "analysis",
      content: seedAnalysisMarkdown.trim(),
    };

    if (seedAnalysisMarkdown.trim()) {
      setMessages(
        scope === "student"
          ? [seedMessage]
          : [contextMessage, seedMessage],
      );
      setTimeout(() => inputRef.current?.focus(), 200);
      return;
    }

    setMessages(scope === "student" ? [] : [contextMessage]);

    if (!needsInitialAnalysis || !workflowConfigured || disabled) {
      setTimeout(() => inputRef.current?.focus(), 200);
      return;
    }

    void (async () => {
      setBusy(true);
      const assistantId = `assistant-baseline-${Date.now()}`;
      const baselineSeed: ChatMessage[] =
        scope === "student"
          ? []
          : [buildStepsContextMessage(stepsContextMarkdown)];
      setMessages((current) => [
        ...current,
        ...baselineSeed.filter(
          (seed) => !current.some((message) => message.kind === "steps-context"),
        ),
        { id: assistantId, role: "assistant", kind: "analysis", content: "" },
      ]);
      setStreamingAssistantId(assistantId);

      try {
        const response = await fetch("/api/pedagogy-strategy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            footprint,
            classId: learner.classId,
            studentIds: learner.studentIds,
            classProfile: learner.classProfile,
            pedagogicalSynthesis: learner.pedagogicalSynthesis,
            profileSynthesisStructured: learner.profileSynthesisStructured,
          }),
        });

        if (generation !== initGeneration.current) {
          return;
        }

        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error || "Strategy analysis failed.");
        }

        const payload = (await response.json()) as PedagogyStructuredPayload;
        onBaselineComplete(payload);

        let analysisMarkdown = "";
        if (scope === "student" && studentIndex !== undefined) {
          const row = payload.individualized[studentIndex];
          analysisMarkdown = row
            ? formatStudentRefineSeedMarkdown(row)
            : formatPedagogyChatMarkdown({ ...payload, chatReply: "", raw: {} });
        } else if (scope === "student" && studentProfile) {
          const row = payload.individualized.find(
            (item) => item.studentProfile.trim() === studentProfile.trim(),
          );
          analysisMarkdown = row
            ? formatStudentRefineSeedMarkdown(row)
            : formatPedagogyChatMarkdown({ ...payload, chatReply: "", raw: {} });
        } else {
          analysisMarkdown =
            formatUdlRefineSeedMarkdown(payload) ||
            formatPedagogyChatMarkdown({ ...payload, chatReply: "", raw: {} });
        }

        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? { ...message, content: analysisMarkdown }
              : message,
          ),
        );
      } catch (err) {
        if (generation !== initGeneration.current) {
          return;
        }
        const message = err instanceof Error ? err.message : "Analysis failed.";
        setError(message);
        onBaselineFailed?.(message);
        setMessages((current) =>
          current.filter((item) => item.id !== assistantId),
        );
      } finally {
        if (generation === initGeneration.current) {
          setBusy(false);
          setStreamingAssistantId(null);
          setTimeout(() => inputRef.current?.focus(), 200);
        }
      }
    })();
  }, [
    open,
    threadKey,
    stepsContextMarkdown,
    seedAnalysisMarkdown,
    needsInitialAnalysis,
    workflowConfigured,
    disabled,
    conversationKey,
    messagesKey,
    footprint,
    learner,
    scope,
    studentIndex,
    studentProfile,
    onBaselineComplete,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    if (!open || messages.length === 0) {
      return;
    }
    const toStore =
      scope === "student"
        ? messages.filter((message) => message.kind !== "steps-context")
        : messages;
    sessionStorage.setItem(messagesKey, JSON.stringify(toStore));
  }, [messages, open, messagesKey, scope]);

  useEffect(() => {
    if (!open || scope !== "student") {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/config");
        const body = (await response.json()) as { deployHint?: "local" | "vercel" };
        if (!cancelled) {
          setDeployHint(body.deployHint === "vercel" ? "vercel" : "local");
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, scope]);

  async function submitQuery(rawQuery: string) {
    const query = rawQuery.trim();
    if (!query || busy || disabled) {
      return;
    }

    if (scope === "student" && !individualRefineConfigured) {
      setError(
        "Set DIFY_APP_PEDAGOGY_INDIVIDUAL_API_KEY for individualized refine.",
      );
      return;
    }

    const activeIndividualRow = individualizedRowRef.current;
    if (scope === "student" && !activeIndividualRow) {
      setError("Missing individualized strategy row for this student.");
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      kind: "chat",
      content: query,
    };
    const assistantId = `assistant-${Date.now()}`;
    setMessages((current) => [
      ...current,
      userMessage,
      { id: assistantId, role: "assistant", kind: "chat", content: "" },
    ]);
    setInput("");
    setBusy(true);
    setStreamingAssistantId(assistantId);
    setError("");
    const submitGeneration = ++submitGenerationRef.current;

    let assistantText = "";
    let structuredHandled = false;

    const applyStructuredAssistantResult = (
      parsed: ReturnType<typeof tryParsePedagogyStructuredAnswerText>,
    ) => {
      if (!parsed) {
        return false;
      }
      const chatReply = resolvePedagogyRefineChatReply(parsed);
      if (!chatReply.trim() && parsed.individualized.length === 0 && !parsed.udl) {
        return false;
      }
      structuredHandled = true;
      assistantText = chatReply;
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? { ...message, content: chatReply }
            : message,
        ),
      );
      onStructuredResult(
        toPedagogyStructuredPayload(parsed),
        scope === "student" ? "student" : scope,
        studentIndex,
      );
      return true;
    };

    const applyStudentChatDisplayFromRaw = (raw: string) => {
      if (scope !== "student") {
        return false;
      }
      if (isUnparsedPedagogyStructuredJson(raw)) {
        return false;
      }
      const { display, parsed } = resolvePedagogyStudentChatDisplay(raw);
      if (!display.trim()) {
        return false;
      }
      structuredHandled = true;
      assistantText = display;
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? { ...message, content: display }
            : message,
        ),
      );
      if (parsed) {
        onStructuredResult(
          toPedagogyStructuredPayload(parsed),
          "student",
          studentIndex,
        );
      }
      return true;
    };

    const applyFromWorkflowOutputs = (outputs: Record<string, unknown>) => {
      const parsed = parsePedagogyWorkflowOutputs(outputs);
      if (!pedagogyStructuredResultReady(parsed)) {
        const rawText = ["text", "answer", "output", "result"]
          .map((key) => outputs[key])
          .find((value) => typeof value === "string" && value.trim());
        if (typeof rawText === "string") {
          return applyStructuredAssistantResult(
            tryParsePedagogyStructuredAnswerText(rawText),
          );
        }
        return false;
      }
      return applyStructuredAssistantResult(parsed);
    };

    const chatTranscript = [
      ...messages.filter(
        (message) => message.kind === "chat" && message.content.trim(),
      ),
      userMessage,
    ].map(({ role, content }) => ({ role, content }));

    try {
      const response = await fetch("/api/pedagogy-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          conversation_id: conversationId || undefined,
          refine_scope: scope,
          student_index: studentIndex,
          student_id: studentId,
          student_profile: studentProfile,
          individualized_row:
            scope === "student" ? activeIndividualRow : undefined,
          transcript: chatTranscript,
          footprint,
          learner,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as {
          error?: string;
          difyDebug?: {
            requestUrl?: string;
            status?: number;
            bodyPreview?: string;
          };
        };
        let detail = body.error || "Chat request failed.";
        const debug = body.difyDebug;
        if (debug?.requestUrl) {
          detail += `\n\nDify URL: ${debug.requestUrl} (HTTP ${debug.status ?? "?"})`;
        }
        if (debug?.bodyPreview) {
          detail += `\nResponse: ${debug.bodyPreview}`;
        }
        throw new Error(detail);
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
            const event = JSON.parse(payload) as {
              event?: string;
              answer?: string;
              chat_reply?: string;
              conversation_id?: string;
              refine_scope?: PedagogyRefineScope;
              student_index?: number;
              educationalTheory?: string;
              learningStrategies?: string;
              udl?: PedagogyStructuredPayload["udl"];
              individualized?: PedagogyStructuredPayload["individualized"];
              data?: { outputs?: Record<string, unknown> };
            };

            if (event.conversation_id) {
              const id = String(event.conversation_id);
              setConversationId(id);
              sessionStorage.setItem(conversationKey, id);
            }

            if (
              event.event === "message" ||
              event.event === "agent_message"
            ) {
              const chunk = event.answer ?? "";
              if (chunk) {
                if (submitGeneration === submitGenerationRef.current) {
                  setError("");
                }
                assistantText += chunk;
                const hideStructuredJson =
                  scope === "student" &&
                  looksLikePedagogyStructuredJsonAnswer(assistantText);
                if (hideStructuredJson) {
                  setMessages((current) =>
                    current.map((message) =>
                      message.id === assistantId
                        ? {
                            ...message,
                            content: message.content.trim()
                              ? message.content
                              : STUDENT_STRUCTURED_STREAM_PLACEHOLDER,
                          }
                        : message,
                    ),
                  );
                } else {
                  setMessages((current) =>
                    current.map((message) =>
                      message.id === assistantId
                        ? { ...message, content: message.content + chunk }
                        : message,
                    ),
                  );
                }
              }
            }

            if (event.event === "pedagogy_structured") {
              const panelPayload = {
                educationalTheory: event.educationalTheory?.trim() ?? "",
                learningStrategies: event.learningStrategies?.trim() ?? "",
                udl: event.udl ?? null,
                individualized: Array.isArray(event.individualized)
                  ? event.individualized
                  : [],
              };
              const hasPanels =
                panelPayload.educationalTheory.length > 0 ||
                panelPayload.learningStrategies.length > 0 ||
                panelPayload.udl !== null ||
                panelPayload.individualized.length > 0;
              let chatReply = event.chat_reply?.trim() ?? "";
              if (!chatReply) {
                chatReply = resolvePedagogyRefineChatReply({
                  chatReply: "",
                  ...panelPayload,
                });
              }
              if (!chatReply && assistantText.trim()) {
                const parsedFromStream =
                  tryParsePedagogyStructuredAnswerText(assistantText);
                if (parsedFromStream) {
                  chatReply = resolvePedagogyRefineChatReply(parsedFromStream);
                }
              }
              if (chatReply || hasPanels) {
                structuredHandled = true;
                if (chatReply) {
                  assistantText = chatReply;
                  setMessages((current) =>
                    current.map((message) =>
                      message.id === assistantId
                        ? { ...message, content: chatReply }
                        : message,
                    ),
                  );
                }
              }
              if (hasPanels) {
                onStructuredResult(
                  panelPayload,
                  event.refine_scope === "student" ? "student" : scope,
                  event.student_index ?? studentIndex,
                );
              }
            }

            if (event.event === "message_end" && !structuredHandled) {
              const structuredFromText =
                scope === "student"
                  ? tryParsePedagogyStructuredAnswerText(assistantText)
                  : null;
              if (
                !applyStructuredAssistantResult(structuredFromText) &&
                !applyStudentChatDisplayFromRaw(assistantText) &&
                assistantText.trim()
              ) {
                const { content } = cleanMergedAssistantAnswer(assistantText);
                const resolved =
                  scope === "student"
                    ? resolvePedagogyStudentChatDisplay(content)
                    : { display: content, parsed: null };
                if (
                  resolved.display.trim() &&
                  !isUnparsedPedagogyStructuredJson(resolved.display)
                ) {
                  structuredHandled = true;
                  setMessages((current) =>
                    current.map((message) =>
                      message.id === assistantId
                        ? { ...message, content: resolved.display }
                        : message,
                    ),
                  );
                  if (resolved.parsed) {
                    onStructuredResult(
                      toPedagogyStructuredPayload(resolved.parsed),
                      "student",
                      studentIndex,
                    );
                  }
                }
              }
            }

            if (
              (event.event === "workflow_finished" ||
                event.event === "node_finished") &&
              scope === "student"
            ) {
              const outputs = event.data?.outputs;
              if (outputs && !structuredHandled) {
                applyFromWorkflowOutputs(outputs);
              } else if (!structuredHandled && assistantText.trim()) {
                applyStructuredAssistantResult(
                  tryParsePedagogyStructuredAnswerText(assistantText),
                );
              }
            }
          } catch {
            // Skip malformed SSE chunks.
          }
        }
      }

      if (!structuredHandled && assistantText.trim()) {
        if (scope === "student") {
          if (
            !applyStructuredAssistantResult(
              tryParsePedagogyStructuredAnswerText(assistantText),
            ) &&
            !applyStudentChatDisplayFromRaw(assistantText) &&
            isUnparsedPedagogyStructuredJson(assistantText)
          ) {
            setError(
              "Could not parse structured reply. Check Dify output or try again.",
            );
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? { ...message, content: "" }
                  : message,
              ),
            );
          }
        } else {
          const { content } = cleanMergedAssistantAnswer(assistantText);
          if (content.trim()) {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? { ...message, content }
                  : message,
              ),
            );
          }
        }
      }
    } catch (err) {
      if (submitGeneration !== submitGenerationRef.current) {
        return;
      }
      const message = err instanceof Error ? err.message : "Chat failed.";
      setError(message);
      if (
        /403|401|HTML response|conversation/i.test(message) &&
        conversationId
      ) {
        setConversationId("");
        sessionStorage.removeItem(conversationKey);
      }
      setMessages((current) => current.filter((item) => item.id !== assistantId));
    } finally {
      if (submitGeneration === submitGenerationRef.current) {
        setBusy(false);
        setStreamingAssistantId(null);
      }
    }
  }

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/40"
        aria-label="關閉 · Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex h-full w-[60vw] min-w-0 max-w-[60vw] flex-col bg-white shadow-2xl ring-1 ring-zinc-200"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">{titleZh}</h2>
            <p className="text-sm text-zinc-500">{titleEn}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
          >
            關閉 · Close
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {scope === "student" ? (
            <div className="mb-3">
              <EnvConfigBanner
                configured={individualRefineConfigured}
                deployHint={deployHint}
                envKey="DIFY_APP_PEDAGOGY_INDIVIDUAL_API_KEY"
                bilingual
              />
            </div>
          ) : null}
          <ul className="space-y-4">
            {messages.map((message) => (
              <li
                key={message.id}
                className={`flex flex-col ${
                  message.role === "user" ? "items-end" : "items-start"
                }`}
              >
                {message.kind === "steps-context" ? (
                  <div className="max-w-[95%] rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-950 ring-1 ring-amber-200">
                    <p className="mb-1 font-semibold text-amber-900">
                      Step 1–2 · 輸入摘要
                    </p>
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                ) : (
                  <div
                    className={`max-w-[95%] rounded-2xl px-4 py-3 text-sm ${
                      message.role === "user"
                        ? "bg-teal-700 text-white"
                        : "bg-zinc-100 text-zinc-900"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <AssistantChatMessage
                        content={
                          scope === "student" && message.kind === "chat"
                            ? formatPedagogyRefineAssistantContent(
                                message.content,
                                {
                                  streaming:
                                    streamingAssistantId === message.id,
                                },
                              )
                            : message.content
                        }
                        isStreaming={streamingAssistantId === message.id}
                        skipFollowUpExtraction={
                          scope === "student" && message.kind === "chat"
                        }
                        useMarkdown={message.kind === "chat"}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                )}
              </li>
            ))}
            <div ref={bottomRef} />
          </ul>

          {error ? (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              {error}
            </p>
          ) : null}
        </div>

        <form
          className="shrink-0 border-t border-zinc-100 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submitQuery(input);
          }}
        >
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              disabled={busy || disabled}
              onChange={(event) => setInput(event.target.value)}
              placeholder="輸入追問… · Follow-up message"
              className="min-w-0 flex-1 rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
            />
            <button
              type="submit"
              disabled={busy || disabled || !input.trim()}
              className="shrink-0 rounded-full bg-teal-ink px-4 py-2.5 text-sm font-semibold text-white disabled:bg-zinc-300"
            >
              送出
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
