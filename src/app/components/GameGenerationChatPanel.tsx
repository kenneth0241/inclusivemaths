"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_GAME_GENERATION_PROMPT } from "@/lib/game-generation-settings";
import { runGameChatTurn, runGameUdlChatTurn } from "@/lib/game-chat-client";
import { UDL_GAME_TAB_LABEL } from "@/lib/game-udl-target";
import type { GameChatMessage } from "@/lib/game-learner-state";
import { findPedagogyRowForStudent } from "@/lib/game-pedagogy-match";
import type { PedagogyIndividualizedRow } from "@/lib/workflow-draft";
import type { StudentRecord } from "@/lib/student-record";
import type {
  ContentFootprint,
  GameParameters,
  LearnerProfile,
  PedagogicalStrategyState,
} from "@/lib/workflow-draft";
import { hasGameParametersContent } from "@/lib/game-parameters";
import AssistantChatMessage from "./AssistantChatMessage";
import { BilingualStack } from "./Bilingual";
import GameLearnerTabBar, { type GameLearnerTab } from "./GameLearnerTabBar";

type GameGenerationChatPanelProps = {
  tabs: GameLearnerTab[];
  activeStudentId: string;
  onActiveStudentId: (id: string) => void;
  activeIsUdl?: boolean;
  student: StudentRecord | null;
  pedagogyRow: PedagogyIndividualizedRow | null;
  parameters: GameParameters;
  footprint: ContentFootprint;
  learner: LearnerProfile;
  pedagogy: PedagogicalStrategyState;
  messages: GameChatMessage[];
  conversationId: string;
  currentHtml: string;
  disabled?: boolean;
  generationPrompt?: string;
  onSlotChange: (patch: {
    messages: GameChatMessage[];
    conversationId: string;
    html?: string;
  }) => void;
};

export default function GameGenerationChatPanel({
  tabs,
  activeStudentId,
  onActiveStudentId,
  activeIsUdl = false,
  student,
  pedagogyRow,
  parameters,
  footprint,
  learner,
  pedagogy,
  messages,
  conversationId,
  currentHtml,
  disabled = false,
  generationPrompt = DEFAULT_GAME_GENERATION_PROMPT,
  onSlotChange,
}: GameGenerationChatPanelProps) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const paramsFilled = hasGameParametersContent(parameters);

  useEffect(() => {
    setError("");
  }, [activeStudentId]);

  const chatReady = activeIsUdl || Boolean(student);

  async function submitQuery(raw: string) {
    const query = raw.trim();
    if (!query || busy || disabled || !chatReady) {
      return;
    }

    const userMessage: GameChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query,
    };
    const assistantId = `assistant-${Date.now()}`;
    const nextMessages: GameChatMessage[] = [
      ...messages,
      userMessage,
      { id: assistantId, role: "assistant", content: "" },
    ];
    onSlotChange({ messages: nextMessages, conversationId });
    setInput("");
    setBusy(true);
    setError("");

    let nextConversationId = conversationId;

    try {
      const streamHandlers = {
        onConversationId: (id: string) => {
          nextConversationId = id;
        },
        onAssistantChunk: (_chunk: string, assistantSoFar: string) => {
          onSlotChange({
            messages: nextMessages.map((message) =>
              message.id === assistantId
                ? { ...message, content: assistantSoFar }
                : message,
            ),
            conversationId: nextConversationId,
          });
        },
      };

      const result = activeIsUdl
        ? await runGameUdlChatTurn(
            {
              query,
              footprint,
              learner,
              pedagogy,
              game_parameters: parameters,
              current_code: currentHtml,
              conversation_id: conversationId || undefined,
            },
            streamHandlers,
          )
        : await runGameChatTurn(
            {
              query,
              student_id: student!.id,
              footprint,
              learner,
              pedagogy,
              game_parameters: parameters,
              individualized_row:
                pedagogyRow ??
                findPedagogyRowForStudent(pedagogy, student!, 0),
              current_code: currentHtml,
              conversation_id: conversationId || undefined,
            },
            streamHandlers,
          );

      nextConversationId = result.conversationId || nextConversationId;

      onSlotChange({
        messages: nextMessages.map((message) =>
          message.id === assistantId
            ? { ...message, content: result.assistantText }
            : message,
        ),
        conversationId: nextConversationId,
        ...(result.html ? { html: result.html } : {}),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed.");
      onSlotChange({
        messages: nextMessages.filter((message) => message.id !== assistantId),
        conversationId: nextConversationId,
      });
    } finally {
      setBusy(false);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }

  const displayName = activeIsUdl
    ? UDL_GAME_TAB_LABEL
    : (student?.name ?? "—");

  return (
    <section className="flex min-h-[22rem] flex-col rounded-3xl bg-white ring-1 ring-teal-100 sm:min-h-[26rem]">
      <div className="space-y-3 border-b border-zinc-100 px-4 py-3">
        <div>
          <BilingualStack
            zh="遊戲生成對話"
            en="Game generation chat"
            zhClassName="text-sm font-semibold text-zinc-900"
            enClassName="text-zinc-500"
          />
          <p className="mt-1 text-xs text-zinc-500">
            <BilingualStack
              zh={
                activeIsUdl
                  ? `目前：${displayName} · 依 Step 3 全班 UDL 與學習策略細化遊戲`
                  : `目前：${displayName} · 依其檔案與教學策略細化遊戲`
              }
              en={
                activeIsUdl
                  ? `Active: ${displayName} · Refine using Step 3 class UDL & strategies`
                  : `Active: ${displayName} · Refine this learner's game`
              }
              layout="inline"
              enClassName="text-zinc-400"
            />
          </p>
        </div>
        <GameLearnerTabBar
          tabs={tabs}
          activeStudentId={activeStudentId}
          onChange={onActiveStudentId}
        />
        {!paramsFilled ? (
          <p className="text-xs text-amber-900">
            <BilingualStack
              zh="建議先填寫遊戲參數。"
              en="Fill in game parameters first."
              layout="inline"
            />
          </p>
        ) : null}
        {error ? (
          <p className="text-xs text-red-800">{error}</p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <span className="block px-1 py-4">
            <p className="text-sm leading-6 text-zinc-500">
              <BilingualStack
                layout="stack"
                zh="UDL 全班版與每位學習者各有獨立對話，可請 Dify 修改 HTML 遊戲。"
                en="Separate chats for the UDL whole-class game and each learner."
                enClassName="text-zinc-400"
              />
            </p>
            <button
              type="button"
              disabled={disabled || busy || !chatReady}
              onClick={() => void submitQuery(generationPrompt)}
              className="mt-4 w-full rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/30 px-4 py-3 text-left transition hover:border-teal-300 disabled:opacity-50"
            >
              <span className="block text-[11px] font-semibold tracking-wide text-teal-ink uppercase">
                建議提示 · Suggested
              </span>
              <span className="mt-1 block text-sm leading-6 text-zinc-800">
                {generationPrompt}
              </span>
            </button>
          </span>
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
                      isStreaming={busy && !message.content.trim()}
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
        className="border-t border-zinc-100 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submitQuery(input);
        }}
      >
        <label className="sr-only" htmlFor="game-gen-input">
          Message
        </label>
        <p className="flex gap-2">
          <input
            id="game-gen-input"
            value={input}
            disabled={disabled || busy || !chatReady}
            onChange={(event) => setInput(event.target.value)}
            placeholder={
              activeIsUdl
                ? "描述想為全班 UDL 版調整的玩法…"
                : "描述想為此學習者調整的玩法…"
            }
            className="min-w-0 flex-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-teal-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={disabled || busy || !input.trim() || !chatReady}
            className="shrink-0 rounded-2xl bg-teal-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            <BilingualStack zh="送出" en="Send" layout="inline" />
          </button>
        </p>
      </form>
    </section>
  );
}