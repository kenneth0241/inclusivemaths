import type { GameParameters } from "@/lib/game-parameters";
import { hasGameParametersContent } from "@/lib/game-parameters";
import {
  hasClassUdlForGames,
  UDL_GAME_TARGET_ID,
} from "@/lib/game-udl-target";
import type { PedagogicalStrategyState } from "@/lib/workflow-draft";

export type GameChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type GameLearnerSlot = {
  html: string;
  conversationId: string;
  messages: GameChatMessage[];
};

export type LearnerGamesMap = Record<string, GameLearnerSlot>;

export const EMPTY_GAME_LEARNER_SLOT: GameLearnerSlot = {
  html: "",
  conversationId: "",
  messages: [],
};

export function normalizeGameChatMessages(raw: unknown): GameChatMessage[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }
      const record = item as Record<string, unknown>;
      const role = record.role === "user" || record.role === "assistant"
        ? record.role
        : null;
      const content =
        typeof record.content === "string" ? record.content : "";
      const id =
        typeof record.id === "string" && record.id.trim()
          ? record.id
          : `msg-${index}`;
      if (!role || !content.trim()) {
        return null;
      }
      return { id, role, content };
    })
    .filter((message): message is GameChatMessage => message !== null);
}

export function normalizeLearnerSlot(raw: unknown): GameLearnerSlot {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...EMPTY_GAME_LEARNER_SLOT };
  }
  const record = raw as Record<string, unknown>;
  return {
    html: typeof record.html === "string" ? record.html : "",
    conversationId:
      typeof record.conversationId === "string" ? record.conversationId : "",
    messages: normalizeGameChatMessages(record.messages),
  };
}

export function normalizeLearnerGames(
  raw: unknown,
  targetStudentIds: string[],
  legacyGameHtml: string,
): LearnerGamesMap {
  const map: LearnerGamesMap = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const record = raw as Record<string, unknown>;
    for (const [key, value] of Object.entries(record)) {
      map[key] = normalizeLearnerSlot(value);
    }
  }
  const allowed = new Set(targetStudentIds);
  for (const key of Object.keys(map)) {
    if (key === UDL_GAME_TARGET_ID) {
      continue;
    }
    if (!allowed.has(key)) {
      delete map[key];
    }
  }
  for (const id of targetStudentIds) {
    if (!map[id]) {
      map[id] = { ...EMPTY_GAME_LEARNER_SLOT };
    }
  }
  if (
    legacyGameHtml.trim() &&
    targetStudentIds.length === 1 &&
    !map[targetStudentIds[0]!]?.html.trim()
  ) {
    map[targetStudentIds[0]!] = {
      ...map[targetStudentIds[0]!]!,
      html: legacyGameHtml,
    };
  }
  return map;
}

export function pruneLearnerGames(
  map: LearnerGamesMap,
  targetStudentIds: string[],
): LearnerGamesMap {
  const allowed = new Set(targetStudentIds);
  const next: LearnerGamesMap = {};
  for (const id of targetStudentIds) {
    next[id] = map[id] ?? { ...EMPTY_GAME_LEARNER_SLOT };
  }
  for (const key of Object.keys(map)) {
    if (!allowed.has(key)) {
      continue;
    }
    if (!next[key]) {
      next[key] = map[key]!;
    }
  }
  if (map[UDL_GAME_TARGET_ID]) {
    next[UDL_GAME_TARGET_ID] = map[UDL_GAME_TARGET_ID]!;
  }
  return next;
}

export function ensureUdlGameSlot(
  map: LearnerGamesMap,
  pedagogy: PedagogicalStrategyState,
): LearnerGamesMap {
  if (!hasClassUdlForGames(pedagogy)) {
    if (!map[UDL_GAME_TARGET_ID]) {
      return map;
    }
    const next = { ...map };
    delete next[UDL_GAME_TARGET_ID];
    return next;
  }
  if (map[UDL_GAME_TARGET_ID]) {
    return map;
  }
  return {
    ...map,
    [UDL_GAME_TARGET_ID]: { ...EMPTY_GAME_LEARNER_SLOT },
  };
}

export function canAutoGenerateLearnerGames(
  parameters: GameParameters,
  targetStudentIds: string[],
): boolean {
  return (
    targetStudentIds.length > 0 && hasGameParametersContent(parameters)
  );
}

export function learnerGameGenerationFingerprint(
  targetStudentIds: string[],
  parameters: GameParameters,
  pedagogyFingerprint: string,
): string {
  return JSON.stringify({
    targets: [...targetStudentIds].sort(),
    parameters,
    pedagogyFingerprint,
  });
}

function parseJsonObjectFromAssistantText(
  text: string,
): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(trimmed.slice(start, end + 1)) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        return null;
      }
    }
  }
  return null;
}

export type GameStructuredOutput = {
  chatReply: string;
  htmlCode: string;
};

export function parseGameStructuredOutputs(
  value: Record<string, unknown>,
): GameStructuredOutput | null {
  const chatReply =
    typeof value.chat_reply === "string" ? value.chat_reply.trim() : "";
  const htmlCode =
    typeof value.html_code === "string" ? value.html_code.trim() : "";
  if (!chatReply && !htmlCode) {
    return null;
  }
  return { chatReply, htmlCode };
}

export function tryParseGameStructuredAnswerText(
  text: string,
): GameStructuredOutput | null {
  const record = parseJsonObjectFromAssistantText(text);
  if (!record) {
    return null;
  }
  return parseGameStructuredOutputs(record);
}

export function normalizeGameHtmlCode(htmlCode: string): string | null {
  const trimmed = htmlCode.trim();
  if (!trimmed) {
    return null;
  }
  if (
    trimmed.includes("<!DOCTYPE") ||
    trimmed.includes("<html") ||
    trimmed.includes("</html>")
  ) {
    return trimmed;
  }
  return null;
}

export function extractGameHtmlFromAssistantText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const structured = tryParseGameStructuredAnswerText(trimmed);
  if (structured?.htmlCode) {
    const fromStructured = normalizeGameHtmlCode(structured.htmlCode);
    if (fromStructured) {
      return fromStructured;
    }
  }
  const fenced = trimmed.match(/```html\s*([\s\S]*?)```/i);
  if (fenced?.[1]?.includes("<")) {
    return fenced[1].trim();
  }
  const docStart = trimmed.indexOf("<!DOCTYPE");
  const htmlStart = trimmed.indexOf("<html");
  const start =
    docStart >= 0 ? docStart : htmlStart >= 0 ? htmlStart : -1;
  if (start < 0) {
    return null;
  }
  const end = trimmed.lastIndexOf("</html>");
  if (end > start) {
    return trimmed.slice(start, end + "</html>".length).trim();
  }
  return trimmed.slice(start).trim();
}