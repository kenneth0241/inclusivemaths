import { splitChatThinkContent } from "@/lib/chat-think";

const FOLLOW_UP_OUTPUT_KEYS = [
  "suggested_questions",
  "suggested_follow_ups",
  "follow_up_questions",
  "follow_ups",
  "followups",
] as const;

const QUESTION_ITEM_TEXT_KEYS = [
  "question",
  "suggested_question",
  "query",
  "message",
] as const;

const MAX_FOLLOW_UP_LENGTH = 120;

const QUESTION_SHAPE =
  /(?:[？?]|(?:如何|怎樣|點樣|什麼|哪些|哪個|哪一|你會|揀|想|可否|能否|應否|可以|SpLD|特殊學習|教案|調適|難點|設計|教學|評估))/;

function isCitationLikeObject(record: Record<string, unknown>) {
  return (
    "document_name" in record ||
    "dataset_name" in record ||
    "segment_id" in record ||
    "retriever_resources" in record
  );
}

function isCatalogBlob(text: string) {
  if (text.length >= 90 && /完整目錄|單元大綱|單元列表|這是一年級完整/.test(text)) {
    return true;
  }
  if ((text.match(/單元\d/g)?.length ?? 0) >= 3) {
    return true;
  }
  if (text.length >= 60 && (text.match(/ - /g)?.length ?? 0) >= 2) {
    return true;
  }
  if (/1上A冊|1上B冊|1下A冊|1下B冊/.test(text) && !/[？?]/.test(text)) {
    return true;
  }
  return false;
}

/** Teacher follow-up line (LLM2), not LLM1 unit list lines. */
export function isValidFollowUpQuestion(text: string) {
  const trimmed = text.trim();
  if (trimmed.length < 6 || trimmed.length > MAX_FOLLOW_UP_LENGTH) {
    return false;
  }
  if (trimmed === "[object Object]") {
    return false;
  }
  if (isCatalogBlob(trimmed)) {
    return false;
  }
  if (/^[🍎⭐️🚗💡✨]/u.test(trimmed)) {
    return false;
  }
  return QUESTION_SHAPE.test(trimmed);
}

function coerceQuestionItem(item: unknown): string | null {
  if (typeof item === "string") {
    const text = item.trim();
    return isValidFollowUpQuestion(text) ? text : null;
  }

  if (item && typeof item === "object" && !Array.isArray(item)) {
    const record = item as Record<string, unknown>;
    if (isCitationLikeObject(record)) {
      return null;
    }
    for (const key of QUESTION_ITEM_TEXT_KEYS) {
      const value = record[key];
      if (typeof value === "string" && isValidFollowUpQuestion(value.trim())) {
        return value.trim();
      }
    }
    return null;
  }

  return null;
}

function normalizeQuestionList(items: unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const text = coerceQuestionItem(item);
    if (!text || seen.has(text)) {
      continue;
    }
    seen.add(text);
    result.push(text);
    if (result.length >= 6) {
      break;
    }
  }
  return result;
}

function tailAfterLastThink(raw: string) {
  const thinkCloseTag = /<\s*\/\s*think\s*>/gi;
  let tailStart = 0;
  let closeMatch: RegExpExecArray | null;
  let lastClose: RegExpExecArray | null = null;
  while ((closeMatch = thinkCloseTag.exec(raw)) !== null) {
    lastClose = closeMatch;
  }
  if (lastClose) {
    tailStart = lastClose.index + lastClose[0].length;
  }
  return raw.slice(tailStart).trim();
}

function arraysFromExplicitObject(record: Record<string, unknown>): string[] {
  if (isCitationLikeObject(record)) {
    return [];
  }

  for (const key of FOLLOW_UP_OUTPUT_KEYS) {
    const value = record[key];
    if (Array.isArray(value)) {
      const list = normalizeQuestionList(value);
      if (list.length > 0) {
        return list;
      }
    }
  }
  return [];
}

function parseStructuredOutputOnly(raw: unknown): string[] {
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parseStructuredOutputOnly(parsed);
    } catch {
      return extractLlm2TailFollowUps(raw);
    }
  }

  if (Array.isArray(raw)) {
    return normalizeQuestionList(raw);
  }

  if (!raw || typeof raw !== "object") {
    return [];
  }

  const record = raw as Record<string, unknown>;
  const direct = arraysFromExplicitObject(record);
  if (direct.length > 0) {
    return direct;
  }

  if (record.structured_output != null) {
    return parseStructuredOutputOnly(record.structured_output);
  }

  return [];
}

/** Node outputs: structured fields only (never parse LLM1 `text`). */
function extractLlm2FromNodeOutputs(record: Record<string, unknown>): string[] {
  const fromStructured = parseStructuredOutputOnly(record.structured_output);
  if (fromStructured.length > 0) {
    return fromStructured;
  }

  return arraysFromExplicitObject(record);
}

/** LLM2 node_finished / workflow_finished outputs only. */
export function extractLlm2FromNodeEventData(data: unknown): string[] {
  if (!data || typeof data !== "object") {
    return [];
  }
  const record = data as Record<string, unknown>;

  if (record.outputs && typeof record.outputs === "object") {
    return extractLlm2FromNodeOutputs(record.outputs as Record<string, unknown>);
  }

  return extractLlm2FromNodeOutputs(record);
}

function findLastObjectWithSuggestedQuestions(text: string): string[] {
  let best: string[] = [];

  for (let start = 0; start < text.length; start += 1) {
    if (text[start] !== "{") {
      continue;
    }
    for (let end = text.length - 1; end > start; end -= 1) {
      if (text[end] !== "}") {
        continue;
      }
      const slice = text.slice(start, end + 1);
      try {
        const parsed = JSON.parse(slice) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          continue;
        }
        const list = arraysFromExplicitObject(parsed as Record<string, unknown>);
        if (list.length > 0) {
          best = list;
        }
      } catch {
        continue;
      }
    }
  }

  return best;
}

function findLastQuestionArray(text: string): string[] {
  let best: string[] = [];
  const tail = text.trim();

  for (let start = 0; start < tail.length; start += 1) {
    if (tail[start] !== "[") {
      continue;
    }
    for (let end = tail.length - 1; end > start; end -= 1) {
      if (tail[end] !== "]") {
        continue;
      }
      const slice = tail.slice(start, end + 1);
      try {
        const parsed = JSON.parse(slice) as unknown;
        if (!Array.isArray(parsed)) {
          continue;
        }
        const list = normalizeQuestionList(parsed);
        if (list.length >= 2) {
          best = list;
        }
      } catch {
        continue;
      }
    }
  }

  return best;
}

/**
 * LLM2 payload after the last `` — explicit JSON object or trailing question array.
 */
export function extractLlm2TailFollowUps(raw: string): string[] {
  const tail = tailAfterLastThink(raw);
  if (!tail) {
    return [];
  }

  const fromObject = findLastObjectWithSuggestedQuestions(tail);
  if (fromObject.length > 0) {
    return fromObject;
  }

  return findLastQuestionArray(tail);
}

export function mergeSuggestedFollowUps(_current: string[], incoming: string[]) {
  return normalizeQuestionList(incoming);
}

/** Chat SSE: LLM2 node events + merged-answer tail only (not metadata / LLM1). */
export function extractSuggestedFollowUpsFromChatEvent(
  event: Record<string, unknown>,
): string[] {
  const eventName = typeof event.event === "string" ? event.event : "";

  if (eventName === "node_finished" || eventName === "workflow_finished") {
    return extractLlm2FromNodeEventData(event.data);
  }

  if (typeof event.answer === "string") {
    return extractLlm2TailFollowUps(event.answer);
  }

  return [];
}

export function extractAllFollowUpsFromRaw(raw: string) {
  return extractLlm2TailFollowUps(raw);
}

/** @deprecated Use extractLlm2TailFollowUps */
export function extractFollowUpsFromMergedAnswer(raw: string) {
  return extractLlm2TailFollowUps(raw);
}

export function extractLastFollowUpPayload(text: string) {
  const tail = text.trimEnd();
  let best: { start: number; end: number; items: string[] } | null = null;

  for (let start = 0; start < tail.length; start += 1) {
    if (tail[start] !== "{") {
      continue;
    }
    for (let end = tail.length - 1; end > start; end -= 1) {
      if (tail[end] !== "}") {
        continue;
      }
      const slice = tail.slice(start, end + 1);
      try {
        const parsed = JSON.parse(slice) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          continue;
        }
        const list = arraysFromExplicitObject(parsed as Record<string, unknown>);
        if (list.length > 0) {
          best = { start, end: end + 1, items: list };
        }
      } catch {
        continue;
      }
    }
  }

  for (let start = 0; start < tail.length; start += 1) {
    if (tail[start] !== "[") {
      continue;
    }
    for (let end = tail.length - 1; end > start; end -= 1) {
      if (tail[end] !== "]") {
        continue;
      }
      const slice = tail.slice(start, end + 1);
      try {
        const parsed = JSON.parse(slice) as unknown;
        if (!Array.isArray(parsed)) {
          continue;
        }
        const list = normalizeQuestionList(parsed);
        if (list.length > 0) {
          best = { start, end: end + 1, items: list };
        }
      } catch {
        continue;
      }
    }
  }

  if (!best) {
    return { textWithout: tail, extracted: [] as string[] };
  }

  return {
    textWithout: (tail.slice(0, best.start) + tail.slice(best.end)).trimEnd(),
    extracted: best.items,
  };
}

export function cleanMergedAssistantAnswer(raw: string) {
  const tail = tailAfterLastThink(raw);
  const { textWithout, extracted } = extractLastFollowUpPayload(tail);
  if (extracted.length === 0) {
    return { content: raw.trimEnd(), extracted: [] as string[] };
  }

  const thinkCloseTag = /<\s*\/\s*think\s*>/gi;
  let prefixEnd = 0;
  let closeMatch: RegExpExecArray | null;
  let lastClose: RegExpExecArray | null = null;
  while ((closeMatch = thinkCloseTag.exec(raw)) !== null) {
    lastClose = closeMatch;
  }
  if (lastClose) {
    prefixEnd = lastClose.index + lastClose[0].length;
  }

  return {
    content: (raw.slice(0, prefixEnd) + textWithout).trimEnd(),
    extracted,
  };
}

/** @deprecated */
export function parseSuggestedFollowUps(raw: unknown): string[] {
  return parseStructuredOutputOnly(raw);
}
