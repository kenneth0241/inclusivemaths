"use client";

import { useEffect, useRef, useState } from "react";
import { findPedagogyRowForStudent } from "@/lib/game-pedagogy-match";
import {
  isUdlGameTargetId,
  UDL_GAME_TAB_LABEL,
} from "@/lib/game-udl-target";
import type { PedagogyIndividualizedRow } from "@/lib/workflow-draft";
import type { StudentRecord } from "@/lib/student-record";
import type {
  ContentFootprint,
  LearnerProfile,
  PedagogicalStrategyState,
} from "@/lib/workflow-draft";
import {
  defaultWorksheetGenerationQuery,
  runWorksheetChatTurn,
  type WorksheetChatMessage,
} from "@/lib/worksheet-chat-client";
import type { WorksheetParameters } from "@/lib/worksheet-parameters";
import AssistantChatMessage from "./AssistantChatMessage";
import { BilingualStack } from "./Bilingual";
import GameLearnerTabBar, { type GameLearnerTab } from "./GameLearnerTabBar";

type WorksheetGenerationChatPanelProps = {
  tabs: GameLearnerTab[];
  activeStudentId: string;
  onActiveStudentId: (id: string) => void;
  student: StudentRecord | null;
  pedagogyRow: PedagogyIndividualizedRow | null;
  parameters: WorksheetParameters;
  footprint: ContentFootprint;
  learner: LearnerProfile;
  pedagogy: PedagogicalStrategyState;
  messages: WorksheetChatMessage[];
  conversationId: string;
  currentStructuredJson: string;
  disabled?: boolean;
  activeTargetId?: string;
  isUdlTarget?: boolean;
  worksheetChatConfigured?: boolean;
  worksheetUdlChatConfigured?: boolean;
  generationQuery?: string;
  onRequestGenerate?: () => void;
  generating?: boolean;
  onSlotChange: (patch: {
    messages: WorksheetChatMessage[];
    conversationId: string;
    structuredJson?: string;
    markdown?: string;
    status?: string;
    teacherNote?: string;
  }) => void;
};

export default function WorksheetGenerationChatPanel({
  tabs,
  activeStudentId,
  onActiveStudentId,
  student,
  pedagogyRow,
  parameters,
  footprint,
  learner,
  pedagogy,
  messages,
  conversationId,
  currentStructuredJson,
  disabled = false,
  activeTargetId = "",
  isUdlTarget = false,
  worksheetChatConfigured = true,
  worksheetUdlChatConfigured = true,
  generationQuery = defaultWorksheetGenerationQuery(),
  onRequestGenerate,
  generating = false,
  onSlotChange,
}: WorksheetGenerationChatPanelProps) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setError("");
  }, [activeStudentId]);

  const targetId =
    activeTargetId.trim() || student?.id?.trim() || "";
  const chatReady =
    Boolean(student?.id) ||
    (isUdlTarget && isUdlGameTargetId(targetId));
  const apiConfigured = isUdlTarget
    ? worksheetUdlChatConfigured
    : worksheetChatConfigured;

  async function submitQuery(raw: string) {
    const query = raw.trim();
    if (!query || busy || disabled || !chatReady || !targetId) {
      return;
    }
    if (!isUdlTarget && !student) {
      return;
    }

    const userMessage: WorksheetChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query,
    };
    const assistantId = `assistant-${Date.now()}`;
    const nextMessages: WorksheetChatMessage[] = [
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
      if (!apiConfigured) {
        throw new Error(
          isUdlTarget
            ? "DIFY_APP_WORKSHEET_UDL_API_KEY is not set. Add it to .env.local and restart the dev server."
            : "DIFY_APP_WORKSHEET_API_KEY is not set. Add it to .env.local and restart the dev server.",
        );
      }

      const row =
        !isUdlTarget && student
          ? pedagogyRow ?? findPedagogyRowForStudent(pedagogy, student, 0)
          : null;

      const result = await runWorksheetChatTurn(
        {
          query,
          target_id: targetId,
          footprint,
          learner,
          pedagogy,
          worksheet_parameters: parameters,
          individualized_row: row,
          current_response: currentStructuredJson,
          conversation_id: conversationId || undefined,
        },
        {
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
          onStructured: ({ teacherNote, json, markdown }) => {
            onSlotChange({
              messages: nextMessages.map((message) =>
                message.id === assistantId
                  ? {
                      ...message,
                      content: teacherNote || message.content,
                    }
                  : message,
              ),
              conversationId: nextConversationId,
              structuredJson: json,
              markdown,
              teacherNote,
            });
          },
        },
      );

      nextConversationId = result.conversationId || nextConversationId;

      onSlotChange({
        messages: nextMessages.map((message) =>
          message.id === assistantId
            ? { ...message, content: result.assistantText || message.content }
            : message,
        ),
        conversationId: nextConversationId,
        ...(result.worksheetJson
          ? {
              structuredJson: result.worksheetJson,
              markdown: result.markdown,
              teacherNote: result.worksheet?.teacher_note?.trim() ?? "",
              status: result.worksheet?.status?.trim() ?? "",
            }
          : {}),
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

  const displayName = isUdlTarget
    ? UDL_GAME_TAB_LABEL
    : (student?.name ?? "—");

  return (
    <section className="flex min-h-[22rem] flex-col rounded-3xl bg-white ring-1 ring-teal-100 sm:min-h-[26rem]">
      <div className="space-y-3 border-b border-zinc-100 px-4 py-3">
        <div>
          <BilingualStack
            zh="工作紙生成對話"
            en="Worksheet generation chat"
            zhClassName="text-sm font-semibold text-zinc-900"
            enClassName="text-zinc-500"
          />
          <p className="mt-1 text-xs text-zinc-500">
            <BilingualStack
              zh={
                isUdlTarget
                  ? `目前：${displayName} · 依 Step 3 全班 UDL 與學習策略細化工作紙`
                  : `目前：${displayName} · 個別調適工作紙（Dify JSON，可細化題目）`
              }
              en={
                isUdlTarget
                  ? `Active: ${displayName} · Refine using Step 3 class UDL & strategies`
                  : `Active: ${displayName} · Individual worksheet (refine via chat)`
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
          ariaLabel="工作紙對象分頁 · Worksheet target tabs"
        />
        {!apiConfigured ? (
          <p className="text-xs text-amber-900">
            <BilingualStack
              zh={
                isUdlTarget
                  ? "未設定 DIFY_APP_WORKSHEET_UDL_API_KEY。"
                  : "未設定 DIFY_APP_WORKSHEET_API_KEY。"
              }
              en={
                isUdlTarget
                  ? "Set DIFY_APP_WORKSHEET_UDL_API_KEY."
                  : "Set DIFY_APP_WORKSHEET_API_KEY."
              }
              layout="inline"
            />
          </p>
        ) : null}
        {error ? (
          <p className="text-xs text-red-800">{error}</p>
        ) : null}
        {onRequestGenerate ? (
          <button
            type="button"
            disabled={disabled || busy || generating || !chatReady}
            onClick={onRequestGenerate}
            className="w-full rounded-2xl bg-teal-ink px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-zinc-300 sm:w-auto"
          >
            <BilingualStack
              zh={generating || busy ? "生成中…" : "生成工作紙（目前學習者）"}
              en={generating || busy ? "Generating…" : "Generate worksheet (active)"}
              layout="inline"
            />
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <span className="block px-1 py-4">
            <p className="text-sm leading-6 text-zinc-500">
              <BilingualStack
                layout="stack"
                zh={
                  isUdlTarget
                    ? "UDL 全班版與每位學習者各有獨立對話，可請 Dify 修改題目與版面。"
                    : "每位學習者各有獨立對話。首次生成或請 Dify 修改題目、版面與調適。"
                }
                en={
                  isUdlTarget
                    ? "Separate chats for the UDL whole-class worksheet and each learner."
                    : "Separate chat per learner — first generate or refine items and accommodations."
                }
                enClassName="text-zinc-400"
              />
            </p>
            <button
              type="button"
              disabled={disabled || busy || !chatReady}
              onClick={() => void submitQuery(generationQuery)}
              className="mt-4 w-full rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/30 px-4 py-3 text-left transition hover:border-teal-300 disabled:opacity-50"
            >
              <span className="block text-[11px] font-semibold tracking-wide text-teal-ink uppercase">
                建議提示 · Suggested
              </span>
              <span className="mt-1 block text-sm leading-6 text-zinc-800">
                {generationQuery}
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
        <label className="sr-only" htmlFor="worksheet-gen-input">
          Message
        </label>
        <p className="flex gap-2">
          <input
            id="worksheet-gen-input"
            value={input}
            disabled={disabled || busy || !chatReady}
            onChange={(event) => setInput(event.target.value)}
            placeholder="描述想調整的題目、題數或作答形式…"
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