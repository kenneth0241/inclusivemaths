"use client";

import { useEffect, useRef, useState } from "react";
import { cleanMergedAssistantAnswer } from "@/lib/chat-follow-ups";
import {
  type PedagogyStructuredPayload,
  parsePedagogyAssistantReply,
} from "@/lib/pedagogy-strategy";
import type { ContentFootprint, LearnerProfile } from "@/lib/workflow-draft";
import AssistantChatMessage from "./AssistantChatMessage";
import { BilingualStack } from "./Bilingual";
import EnvConfigBanner from "./EnvConfigBanner";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type PedagogyStrategyChatPanelProps = {
  footprint: ContentFootprint;
  learner: LearnerProfile;
  disabled?: boolean;
  fillHeight?: boolean;
  conversationId: string;
  inputFingerprint: string;
  onConversationId: (id: string) => void;
  onAssistantReply: (theory: string, strategies: string) => void;
  onStructuredResult?: (payload: PedagogyStructuredPayload) => void;
  onAnalysisBusy?: (busy: boolean) => void;
  onContextReset?: () => void;
};

const CONVERSATION_KEY = "inclusive-maths-pedagogy-conversation-id";
const MESSAGES_KEY = "inclusive-maths-pedagogy-messages";
const INPUT_FP_KEY = "inclusive-maths-pedagogy-input-fp";

const SUGGESTED_PROMPT =
  "請根據右側已鎖定的教學主題與學習者檔案，分兩部分回覆：（1）教育理論 Education Theory (The Why)，例如是否採用 UDL；（2）支援策略 Learning Strategies (The How)，例如簡化、拆解、視覺模式。";

export default function PedagogyStrategyChatPanel({
  footprint,
  learner,
  disabled = false,
  fillHeight = false,
  conversationId,
  inputFingerprint,
  onConversationId,
  onAssistantReply,
  onStructuredResult,
  onAnalysisBusy,
  onContextReset,
}: PedagogyStrategyChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [streamingAssistantId, setStreamingAssistantId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState("");
  const [chatConfigured, setChatConfigured] = useState<boolean | null>(null);
  const [deployHint, setDeployHint] = useState<"local" | "vercel">("local");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoStartedFingerprint = useRef<string | null>(null);
  const restoredMessages = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    onAnalysisBusy?.(busy);
  }, [busy, onAnalysisBusy]);

  useEffect(() => {
    const storedFp = sessionStorage.getItem(INPUT_FP_KEY);
    if (storedFp !== inputFingerprint) {
      sessionStorage.setItem(INPUT_FP_KEY, inputFingerprint);
      sessionStorage.removeItem(CONVERSATION_KEY);
      sessionStorage.removeItem(MESSAGES_KEY);
      autoStartedFingerprint.current = null;
      restoredMessages.current = false;
      setMessages([]);
      onConversationId("");
      onContextReset?.();
      return;
    }

    if (restoredMessages.current) {
      return;
    }
    restoredMessages.current = true;

    const stored = sessionStorage.getItem(CONVERSATION_KEY);
    if (stored && !conversationId) {
      onConversationId(stored);
    }

    try {
      const raw = sessionStorage.getItem(MESSAGES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {
      sessionStorage.removeItem(MESSAGES_KEY);
    }
  }, [
    inputFingerprint,
    conversationId,
    onConversationId,
    onContextReset,
  ]);

  useEffect(() => {
    if (messages.length === 0) {
      sessionStorage.removeItem(MESSAGES_KEY);
      return;
    }
    sessionStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/config");
        const body = (await response.json()) as {
          pedagogyChatConfigured?: boolean;
          deployHint?: "local" | "vercel";
        };
        if (!cancelled) {
          setChatConfigured(Boolean(body.pedagogyChatConfigured));
          setDeployHint(body.deployHint === "vercel" ? "vercel" : "local");
        }
      } catch {
        if (!cancelled) {
          setChatConfigured(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function applyParsedReply(raw: string) {
    const { content } = cleanMergedAssistantAnswer(raw);
    const parsed = parsePedagogyAssistantReply(content);
    onAssistantReply(parsed.educationalTheory, parsed.learningStrategies);
  }

  async function submitQuery(rawQuery: string) {
    const query = rawQuery.trim();
    if (!query || busy || !chatConfigured || disabled) {
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
    setBusy(true);
    setStreamingAssistantId(assistantId);
    setError("");

    let assistantText = "";
    let structuredHandled = false;
    const priorTranscript = messages.filter((message) => message.content.trim());

    try {
      const response = await fetch("/api/pedagogy-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          conversation_id: conversationId || undefined,
          transcript: priorTranscript.map(({ role, content }) => ({ role, content })),
          footprint,
          learner,
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
            const event = JSON.parse(payload) as {
              event?: string;
              answer?: string;
              conversation_id?: string;
              educationalTheory?: string;
              learningStrategies?: string;
              udl?: PedagogyStructuredPayload["udl"];
              individualized?: PedagogyStructuredPayload["individualized"];
            };

            if (event.conversation_id) {
              const id = String(event.conversation_id);
              onConversationId(id);
              sessionStorage.setItem(CONVERSATION_KEY, id);
            }

            if (
              event.event === "message" ||
              event.event === "agent_message"
            ) {
              const chunk = event.answer ?? "";
              if (chunk) {
                assistantText += chunk;
                setMessages((current) =>
                  current.map((message) =>
                    message.id === assistantId
                      ? { ...message, content: message.content + chunk }
                      : message,
                  ),
                );
              }
            }

            if (event.event === "pedagogy_structured" && onStructuredResult) {
              structuredHandled = true;
              onStructuredResult({
                educationalTheory: event.educationalTheory?.trim() ?? "",
                learningStrategies: event.learningStrategies?.trim() ?? "",
                udl: event.udl ?? null,
                individualized: Array.isArray(event.individualized)
                  ? event.individualized
                  : [],
              });
            }

            if (event.event === "message_end") {
              if (!structuredHandled) {
                applyParsedReply(assistantText);
              }
            }
          } catch {
            // Skip malformed SSE chunks.
          }
        }
      }

      if (assistantText.trim() && !structuredHandled) {
        applyParsedReply(assistantText);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Chat failed.";
      setError(message);
      setMessages((current) => current.filter((item) => item.id !== assistantId));
    } finally {
      setBusy(false);
      setStreamingAssistantId(null);
    }
  }

  useEffect(() => {
    if (disabled || !chatConfigured || busy) {
      return;
    }
    if (messages.length > 0) {
      return;
    }
    if (autoStartedFingerprint.current === inputFingerprint) {
      return;
    }
    autoStartedFingerprint.current = inputFingerprint;
    void submitQuery(SUGGESTED_PROMPT);
  }, [disabled, chatConfigured, busy, messages.length, inputFingerprint]);

  function startNewConversation() {
    sessionStorage.removeItem(CONVERSATION_KEY);
    sessionStorage.removeItem(MESSAGES_KEY);
    autoStartedFingerprint.current = null;
    onConversationId("");
    setMessages([]);
    setInput("");
    setError("");
    onContextReset?.();
  }

  return (
    <section
      className={`flex flex-col gap-3 ${fillHeight ? "h-full min-h-0" : ""}`}
    >
      <EnvConfigBanner
        configured={Boolean(chatConfigured)}
        deployHint={deployHint}
        envKey="DIFY_APP_PEDAGOGY_API_KEY"
        bilingual
      />

      {error ? (
        <div className="space-y-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p>{error}</p>
          {error.includes("Structured output validation failed") ||
          error.includes("part_1_udl") ||
          error.includes("part_2_individualized") ? (
            <p className="text-xs leading-relaxed text-red-900/85">
              Dify rejected the LLM JSON before the app could read it. In your
              Step 3 workflow, the structured schema must always include{" "}
              <code className="font-mono">part_1_udl</code> and{" "}
              <code className="font-mono">part_2_individualized</code> (an{" "}
              <strong>array</strong>, use <code className="font-mono">[]</code>{" "}
              when there are no student rows). Tell the model: output JSON only,
              exact key names, no markdown wrapper. See{" "}
              <code className="font-mono">docs/dify-pedagogy-workflow.md</code>.
            </p>
          ) : null}
        </div>
      ) : null}

      <div
        className={`flex flex-col rounded-3xl bg-white ring-1 ring-teal-100 ${
          fillHeight ? "min-h-0 flex-1" : "min-h-[22rem] sm:min-h-[28rem]"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
          <BilingualStack
            zh="教學策略對話"
            en="Strategy chat"
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
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col justify-center gap-4 px-1 py-6">
              <p className="text-sm leading-6 text-zinc-500">
                <BilingualStack
                  layout="stack"
                  zh="載入後會自動開始策略分析；Dify 會保留同一對話的歷史。右側可查看 Step 1–2 與理論／策略摘要。"
                  en="Strategy analysis starts automatically. Dify keeps this conversation’s history. See Steps 1–2 and summaries on the right."
                  enClassName="text-zinc-400"
                />
              </p>
              <button
                type="button"
                disabled={busy || !chatConfigured || disabled}
                onClick={() => void submitQuery(SUGGESTED_PROMPT)}
                className="w-full rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/30 px-4 py-3 text-left transition hover:border-teal-300 disabled:opacity-50"
              >
                <span className="block text-[11px] font-semibold tracking-wide text-teal-ink uppercase">
                  建議提示 · Suggested
                </span>
                <span className="mt-1 block text-sm leading-6 text-zinc-800">
                  {SUGGESTED_PROMPT}
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
                    className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-normal ${
                      message.role === "user"
                        ? "bg-teal-700 text-white"
                        : "bg-zinc-100 text-zinc-900"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <AssistantChatMessage
                        content={message.content}
                        isStreaming={streamingAssistantId === message.id}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap leading-normal">
                        {message.content}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submitQuery(input);
          }}
          className="border-t border-zinc-100 p-3 sm:p-4"
        >
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              disabled={busy || !chatConfigured || disabled}
              onChange={(event) => setInput(event.target.value)}
              placeholder={
                disabled
                  ? "請先完成 Step 1 與 Step 2"
                  : "詢問 UDL、鷹架或調適策略…"
              }
              className="min-w-0 flex-1 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-teal-500/20 placeholder:text-zinc-400 focus:ring-4 disabled:bg-zinc-50"
            />
            <button
              type="submit"
              disabled={busy || !chatConfigured || disabled || !input.trim()}
              className="shrink-0 rounded-2xl bg-teal-ink px-5 py-3 text-sm font-semibold text-white disabled:bg-zinc-300"
            >
              送出
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
