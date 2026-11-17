import {
  extractGameHtmlFromAssistantText,
  normalizeGameHtmlCode,
  type GameChatMessage,
} from "@/lib/game-learner-state";
import type { PedagogyIndividualizedRow } from "@/lib/workflow-draft";
import type {
  ContentFootprint,
  GameParameters,
  LearnerProfile,
  PedagogicalStrategyState,
} from "@/lib/workflow-draft";
import { DEFAULT_GAME_GENERATION_PROMPT } from "@/lib/game-generation-settings";

/** @deprecated Prefer loaded `generationPrompt` from settings. */
export const INITIAL_GAME_GENERATION_QUERY_ZH = DEFAULT_GAME_GENERATION_PROMPT;

export type GameChatRequestBody = {
  query: string;
  student_id: string;
  footprint: ContentFootprint;
  learner: LearnerProfile;
  pedagogy: PedagogicalStrategyState;
  game_parameters: GameParameters;
  individualized_row: PedagogyIndividualizedRow | null;
  current_code: string;
  conversation_id?: string;
};

export type GameChatStreamHandlers = {
  onConversationId?: (conversationId: string) => void;
  onAssistantChunk?: (text: string, assistantSoFar: string) => void;
  onStructured?: (payload: {
    chatReply: string;
    htmlCode: string | null;
  }) => void;
};

export type GameChatTurnResult = {
  assistantText: string;
  html: string | null;
  conversationId: string;
};

export function gameChatTurnMessages(
  query: string,
  assistantText: string,
  ids?: { userId?: string; assistantId?: string },
): GameChatMessage[] {
  const stamp = Date.now();
  return [
    {
      id: ids?.userId ?? `user-${stamp}`,
      role: "user",
      content: query,
    },
    {
      id: ids?.assistantId ?? `assistant-${stamp}`,
      role: "assistant",
      content: assistantText,
    },
  ];
}

export async function consumeGameChatStream(
  response: Response,
  handlers?: GameChatStreamHandlers,
): Promise<GameChatTurnResult> {
  if (!response.ok) {
    const body = (await response.json()) as { error?: string };
    throw new Error(body.error || "Chat request failed.");
  }
  if (!response.body) {
    throw new Error("No response stream.");
  }

  let assistantText = "";
  let structuredHtml: string | null = null;
  let conversationId = "";

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
          chat_reply?: string;
          html_code?: string;
        };
        if (event.conversation_id) {
          conversationId = String(event.conversation_id);
          handlers?.onConversationId?.(conversationId);
        }
        if (event.event === "game_structured") {
          const reply = event.chat_reply?.trim() ?? "";
          if (reply) {
            assistantText = reply;
          }
          const htmlFromEvent = event.html_code?.trim() ?? "";
          const normalized = htmlFromEvent
            ? normalizeGameHtmlCode(htmlFromEvent)
            : null;
          if (normalized) {
            structuredHtml = normalized;
          }
          handlers?.onStructured?.({
            chatReply: reply,
            htmlCode: structuredHtml,
          });
          if (reply) {
            handlers?.onAssistantChunk?.(reply, assistantText);
          }
          continue;
        }
        if (event.event === "message" || event.event === "agent_message") {
          const chunk = event.answer ?? "";
          if (chunk) {
            assistantText += chunk;
            handlers?.onAssistantChunk?.(chunk, assistantText);
          }
        }
      } catch {
        // ignore malformed chunks
      }
    }
  }

  const html =
    structuredHtml ?? extractGameHtmlFromAssistantText(assistantText);

  return {
    assistantText,
    html,
    conversationId,
  };
}

export async function runGameChatTurn(
  body: GameChatRequestBody,
  handlers?: GameChatStreamHandlers,
  init?: RequestInit,
): Promise<GameChatTurnResult> {
  const response = await fetch("/api/game-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...body,
      conversation_id: body.conversation_id || undefined,
    }),
    ...init,
  });
  return consumeGameChatStream(response, handlers);
}

export type GameUdlChatRequestBody = {
  query: string;
  footprint: ContentFootprint;
  learner: LearnerProfile;
  pedagogy: PedagogicalStrategyState;
  game_parameters: GameParameters;
  current_code: string;
  conversation_id?: string;
};

export async function runGameUdlChatTurn(
  body: GameUdlChatRequestBody,
  handlers?: GameChatStreamHandlers,
  init?: RequestInit,
): Promise<GameChatTurnResult> {
  const response = await fetch("/api/game-chat-udl", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...body,
      conversation_id: body.conversation_id || undefined,
    }),
    ...init,
  });
  return consumeGameChatStream(response, handlers);
}