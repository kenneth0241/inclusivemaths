import { isUdlGameTargetId } from "@/lib/game-udl-target";
import { DEFAULT_WORKSHEET_GENERATION_PROMPT } from "@/lib/worksheet-generation-settings";
import type { WorksheetParameters } from "@/lib/worksheet-parameters";
import {
  parseWorksheetStructuredOutputs,
  renderWorksheetStructuredMarkdown,
  tryParseWorksheetStructuredAnswerText,
  worksheetStructuredToJson,
  type WorksheetStructuredOutput,
} from "@/lib/worksheet-structured-output";
import type { PedagogyIndividualizedRow } from "@/lib/workflow-draft";
import type {
  ContentFootprint,
  LearnerProfile,
  PedagogicalStrategyState,
} from "@/lib/workflow-draft";

export type WorksheetChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type WorksheetChatRequestBody = {
  query: string;
  target_id: string;
  footprint: ContentFootprint;
  learner: LearnerProfile;
  pedagogy: PedagogicalStrategyState;
  worksheet_parameters: WorksheetParameters;
  individualized_row: PedagogyIndividualizedRow | null;
  current_response: string;
  conversation_id?: string;
};

export type WorksheetChatStreamHandlers = {
  onConversationId?: (conversationId: string) => void;
  onAssistantChunk?: (text: string, assistantSoFar: string) => void;
  onStructured?: (payload: {
    teacherNote: string;
    worksheet: WorksheetStructuredOutput;
    json: string;
    markdown: string;
  }) => void;
};

export type WorksheetChatTurnResult = {
  assistantText: string;
  worksheet: WorksheetStructuredOutput | null;
  worksheetJson: string;
  markdown: string;
  conversationId: string;
};

export function worksheetChatTurnMessages(
  query: string,
  assistantText: string,
  ids?: { userId?: string; assistantId?: string },
): WorksheetChatMessage[] {
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

export async function consumeWorksheetChatStream(
  response: Response,
  handlers?: WorksheetChatStreamHandlers,
): Promise<WorksheetChatTurnResult> {
  if (!response.ok) {
    const body = (await response.json()) as { error?: string };
    throw new Error(body.error || "Worksheet chat request failed.");
  }
  if (!response.body) {
    throw new Error("No response stream.");
  }

  let assistantText = "";
  let structured: WorksheetStructuredOutput | null = null;
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
          teacher_note?: string;
          worksheet_json?: Record<string, unknown>;
          error?: string;
        };
        if (event.conversation_id) {
          conversationId = String(event.conversation_id);
          handlers?.onConversationId?.(conversationId);
        }
        if (event.event === "workflow_error") {
          const err =
            typeof event.error === "string" && event.error.trim()
              ? event.error.trim()
              : "Dify workflow failed.";
          throw new Error(err);
        }
        if (event.event === "worksheet_structured" && event.worksheet_json) {
          const parsed = parseWorksheetStructuredOutputs(event.worksheet_json);
          if (parsed) {
            structured = parsed;
            const json = worksheetStructuredToJson(parsed);
            const markdown = renderWorksheetStructuredMarkdown(parsed);
            const teacherNote =
              event.teacher_note?.trim() ??
              parsed.teacher_note?.trim() ??
              "";
            if (teacherNote) {
              assistantText = teacherNote;
            }
            handlers?.onStructured?.({
              teacherNote,
              worksheet: parsed,
              json,
              markdown,
            });
            if (teacherNote) {
              handlers?.onAssistantChunk?.(teacherNote, assistantText);
            }
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
      } catch (err) {
        if (err instanceof Error && err.message.includes("Dify workflow")) {
          throw err;
        }
      }
    }
  }

  if (!structured && assistantText.trim()) {
    structured = tryParseWorksheetStructuredAnswerText(assistantText);
  }

  const worksheetJson = structured ? worksheetStructuredToJson(structured) : "";
  const markdown = structured
    ? renderWorksheetStructuredMarkdown(structured)
    : assistantText;

  return {
    assistantText,
    worksheet: structured,
    worksheetJson,
    markdown,
    conversationId,
  };
}

export type WorksheetUdlChatRequestBody = {
  query: string;
  footprint: ContentFootprint;
  learner: LearnerProfile;
  pedagogy: PedagogicalStrategyState;
  worksheet_parameters: WorksheetParameters;
  current_response: string;
  conversation_id?: string;
};

export async function runWorksheetChatTurn(
  body: WorksheetChatRequestBody,
  handlers?: WorksheetChatStreamHandlers,
  init?: RequestInit,
): Promise<WorksheetChatTurnResult> {
  const route = isUdlGameTargetId(body.target_id)
    ? "/api/worksheet-chat-udl"
    : "/api/worksheet-chat";
  const payload = isUdlGameTargetId(body.target_id)
    ? {
        query: body.query,
        footprint: body.footprint,
        learner: body.learner,
        pedagogy: body.pedagogy,
        worksheet_parameters: body.worksheet_parameters,
        current_response: body.current_response,
        conversation_id: body.conversation_id || undefined,
      }
    : {
        ...body,
        conversation_id: body.conversation_id || undefined,
      };
  const response = await fetch(route, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    ...init,
  });
  return consumeWorksheetChatStream(response, handlers);
}

export async function runWorksheetUdlChatTurn(
  body: WorksheetUdlChatRequestBody,
  handlers?: WorksheetChatStreamHandlers,
  init?: RequestInit,
): Promise<WorksheetChatTurnResult> {
  return runWorksheetChatTurn(
    {
      ...body,
      target_id: "__udl__",
      individualized_row: null,
    },
    handlers,
    init,
  );
}

export function defaultWorksheetGenerationQuery(): string {
  return DEFAULT_WORKSHEET_GENERATION_PROMPT;
}

export function worksheetChatUserId(targetId: string): string {
  return isUdlGameTargetId(targetId)
    ? "worksheet-udl"
    : `worksheet-${targetId}`;
}