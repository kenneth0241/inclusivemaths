import {
  defaultQuestionCountForTarget,
  normalizeWorksheetParameters,
  type WorksheetParameters,
} from "@/lib/worksheet-parameters";
import {
  hasClassUdlForGames,
  UDL_GAME_TARGET_ID,
} from "@/lib/game-udl-target";
import type { PedagogicalStrategyState } from "@/lib/workflow-draft";
import type { StudentRecord } from "@/lib/student-record";
import { isSenStudent } from "@/lib/student-record";
import type { WorksheetChatMessage } from "@/lib/worksheet-chat-client";

export type WorksheetLearnerSlot = {
  markdown: string;
  /** Raw Dify worksheet JSON for refine (`current_response`). */
  structuredJson: string;
  parameters: WorksheetParameters;
  conversationId: string;
  messages: WorksheetChatMessage[];
  status: string;
  teacherNote: string;
};

export type LearnerWorksheetsMap = Record<string, WorksheetLearnerSlot>;

export function emptyWorksheetLearnerSlot(options: {
  student: StudentRecord | null;
  isUdl?: boolean;
}): WorksheetLearnerSlot {
  const questionCount = defaultQuestionCountForTarget({
    isUdl: options.isUdl ?? false,
    isSen: options.student ? isSenStudent(options.student) : false,
  });
  return {
    markdown: "",
    structuredJson: "",
    parameters: {
      questionCount,
      responseFormat: "mixed",
    },
    conversationId: "",
    messages: [],
    status: "",
    teacherNote: "",
  };
}

function normalizeWorksheetChatMessages(raw: unknown): WorksheetChatMessage[] {
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
    .filter((message): message is WorksheetChatMessage => message !== null);
}

export function normalizeWorksheetLearnerSlot(
  raw: unknown,
  fallback: WorksheetLearnerSlot,
): WorksheetLearnerSlot {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...fallback };
  }
  const record = raw as Record<string, unknown>;
  return {
    markdown: typeof record.markdown === "string" ? record.markdown : "",
    structuredJson:
      typeof record.structuredJson === "string" ? record.structuredJson : "",
    parameters: normalizeWorksheetParameters(record.parameters ?? fallback.parameters),
    conversationId:
      typeof record.conversationId === "string" ? record.conversationId : "",
    messages: normalizeWorksheetChatMessages(record.messages),
    status: typeof record.status === "string" ? record.status : "",
    teacherNote: typeof record.teacherNote === "string" ? record.teacherNote : "",
  };
}

export function normalizeLearnerWorksheets(
  raw: unknown,
  targetStudentIds: string[],
  legacyMarkdown: string,
  rosterById: Map<string, StudentRecord>,
): LearnerWorksheetsMap {
  const map: LearnerWorksheetsMap = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const record = raw as Record<string, unknown>;
    for (const [key, value] of Object.entries(record)) {
      const student = rosterById.get(key) ?? null;
      const fallback = emptyWorksheetLearnerSlot({ student });
      map[key] = normalizeWorksheetLearnerSlot(value, fallback);
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
      map[id] = emptyWorksheetLearnerSlot({
        student: rosterById.get(id) ?? null,
      });
    }
  }
  if (
    legacyMarkdown.trim() &&
    targetStudentIds.length === 1 &&
    !map[targetStudentIds[0]!]?.markdown.trim()
  ) {
    map[targetStudentIds[0]!] = {
      ...map[targetStudentIds[0]!]!,
      markdown: legacyMarkdown,
    };
  }
  return map;
}

export function pruneLearnerWorksheets(
  map: LearnerWorksheetsMap,
  targetStudentIds: string[],
  rosterById: Map<string, StudentRecord>,
): LearnerWorksheetsMap {
  const allowed = new Set(targetStudentIds);
  const next: LearnerWorksheetsMap = {};
  for (const id of targetStudentIds) {
    next[id] =
      map[id] ??
      emptyWorksheetLearnerSlot({
        student: rosterById.get(id) ?? null,
      });
  }
  if (map[UDL_GAME_TARGET_ID]) {
    next[UDL_GAME_TARGET_ID] = map[UDL_GAME_TARGET_ID]!;
  }
  return next;
}

export function ensureUdlWorksheetSlot(
  map: LearnerWorksheetsMap,
  pedagogy: PedagogicalStrategyState,
): LearnerWorksheetsMap {
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
    [UDL_GAME_TARGET_ID]: emptyWorksheetLearnerSlot({
      student: null,
      isUdl: true,
    }),
  };
}

export function patchWorksheetLearnerSlot(
  map: LearnerWorksheetsMap,
  slotId: string,
  patch: Partial<WorksheetLearnerSlot>,
  fallback: WorksheetLearnerSlot,
): LearnerWorksheetsMap {
  const current = map[slotId] ?? fallback;
  return {
    ...map,
    [slotId]: {
      ...current,
      ...patch,
      parameters: patch.parameters
        ? { ...current.parameters, ...patch.parameters }
        : current.parameters,
    },
  };
}

export function legacyWorksheetMarkdownFromMap(
  map: LearnerWorksheetsMap,
  targetIds: string[],
): string {
  const first = targetIds[0];
  return first ? map[first]?.markdown?.trim() ?? "" : "";
}