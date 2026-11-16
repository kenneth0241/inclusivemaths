"use client";

import { useRef, useState } from "react";
import type { GameParameters } from "@/lib/workflow-draft";
import AssistantChatMessage from "./AssistantChatMessage";
import { BilingualStack } from "./Bilingual";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const SUGGESTED_PROMPT_ZH =
  "請依 Step 1–3 與左側遊戲參數，產生一份可離線運行的 HTML5 小學數學練習遊戲（單檔、無外部 CDN）。";

type GameGenerationChatPanelProps = {
  parameters: GameParameters;
  disabled?: boolean;
  onPlaceholderGenerate?: () => void;
};

export default function GameGenerationChatPanel({
  parameters,
  disabled = false,
  onPlaceholderGenerate,
}: GameGenerationChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const paramsFilled =
    parameters.gameRules.trim() ||
    parameters.scoringMethod.trim() ||
    parameters.uiStyle.trim();

  async function submitQuery(raw: string) {
    const query = raw.trim();
    if (!query || busy || disabled) {
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

    await new Promise((resolve) => setTimeout(resolve, 400));
    setMessages((current) =>
      current.map((message) =>
        message.id === assistantId
          ? {
              ...message,
              content:
                "（預留）遊戲 Chatflow 尚未連接。已記錄你的訊息與參數；接上 Dify 後會在此串流 HTML 與說明。\n\n(Placeholder) Game chatflow not wired yet. Your message and parameters are saved for the next integration.",
            }
          : message,
      ),
    );
    onPlaceholderGenerate?.();
    setBusy(false);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section className="flex min-h-[22rem] flex-col rounded-3xl bg-white ring-1 ring-teal-100 sm:min-h-[26rem]">
      <div className="border-b border-zinc-100 px-4 py-3">
        <BilingualStack
          zh="遊戲生成對話"
          en="Game generation chat"
          zhClassName="text-sm font-semibold text-zinc-900"
          enClassName="text-zinc-500"
        />
        {!paramsFilled ? (
          <p className="mt-1 text-xs text-amber-900">
            <BilingualStack
              zh="建議先填寫遊戲參數。"
              en="Fill in game parameters first."
              layout="inline"
            />
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <span className="block px-1 py-4">
            <p className="text-sm leading-6 text-zinc-500">
              <BilingualStack
                layout="stack"
                zh="與 Dify 對話以產生離線 HTML 遊戲；右側可查 Step 1–3 全文。"
                en="Chat with Dify to produce offline HTML games; open Steps 1–3 on the right for full context."
                enClassName="text-zinc-400"
              />
            </p>
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => void submitQuery(SUGGESTED_PROMPT_ZH)}
              className="mt-4 w-full rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/30 px-4 py-3 text-left transition hover:border-teal-300 disabled:opacity-50"
            >
              <span className="block text-[11px] font-semibold tracking-wide text-teal-ink uppercase">
                建議提示 · Suggested
              </span>
              <span className="mt-1 block text-sm leading-6 text-zinc-800">
                {SUGGESTED_PROMPT_ZH}
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
            disabled={disabled || busy}
            onChange={(event) => setInput(event.target.value)}
            placeholder="描述想要的遊戲玩法… · Describe the game you want"
            className="min-w-0 flex-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-teal-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={disabled || busy || !input.trim()}
            className="shrink-0 rounded-2xl bg-teal-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            <BilingualStack zh="送出" en="Send" layout="inline" />
          </button>
        </p>
      </form>
    </section>
  );
}
