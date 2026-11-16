import { formatChatDisplayText, splitChatThinkContent } from "@/lib/chat-think";
import {
  formatAppliedModesList,
  formatAppliedModesMarkdown,
  normalizePedagogyAppliedModes,
} from "@/lib/pedagogy-applied-modes";
import {
  parseProfileSynthesisStructuredFromText,
  type ProfileSynthesisStructured,
} from "@/lib/profile-synthesizer";
import type { StudentRecord } from "@/lib/student-record";
import type {
  ContentFootprint,
  LearnerProfile,
  PedagogicalStrategyState,
  PedagogyIndividualizedRow,
  PedagogyUdlPart,
} from "@/lib/workflow-draft";

export type { PedagogyIndividualizedRow, PedagogyUdlPart };

export type PedagogyStructuredPayload = {
  educationalTheory: string;
  learningStrategies: string;
  udl: PedagogyUdlPart | null;
  individualized: PedagogyIndividualizedRow[];
};

export type PedagogyRefineScope = "udl" | "student";

export const PEDAGOGY_BASELINE_QUERY =
  "請根據教學主題與學習者檔案，產生全班 UDL（part_1_udl）與個別調適（part_2_individualized）的結構化教學策略。";

/** Dify individualized refine chatflow — Start node (required). */
export type PedagogyIndividualRefineDifyInputs = {
  name: string;
  topic_summary: string;
  scope_and_constraints: string;
  visual_models: string;
  /** Matches Dify Start variable `student_bottleneck_analysis`. */
  student_bottleneck_analysis: string;
  educational_theory: string;
  learning_strategies: string;
  /** e.g. `Chunking (High), Visual Mode (Medium)` */
  applied_modes: string;
};

function resolveRefineStudentDisplayName(
  student: StudentRecord | null,
  row: PedagogyIndividualizedRow,
): string {
  if (student?.name.trim()) {
    return student.name.trim();
  }
  const profile = row.studentProfile.trim();
  if (!profile) {
    return "";
  }
  const beforeParen = profile.split(/[(/（]/)[0]?.trim();
  return beforeParen || profile;
}

function profileSynthesisForRefine(
  learner: Pick<
    LearnerProfile,
    "profileSynthesisStructured" | "pedagogicalSynthesis"
  >,
): ProfileSynthesisStructured | null {
  return (
    learner.profileSynthesisStructured ??
    parseProfileSynthesisStructuredFromText(learner.pedagogicalSynthesis)
  );
}

/** Step 2 cognitive bottleneck text for the refine chatflow `student_bottleneck_analysis` input. */
export function resolveStudentBottleneckForRefine(
  learner: Pick<
    LearnerProfile,
    "profileSynthesisStructured" | "pedagogicalSynthesis"
  >,
  student: StudentRecord | null,
  row: PedagogyIndividualizedRow,
): string {
  const structured = profileSynthesisForRefine(learner);
  if (!structured) {
    return "";
  }
  const haystack = [student?.name ?? "", row.studentProfile, student?.id ?? ""]
    .join(" ")
    .toLowerCase();

  for (const entry of structured.specific_cognitive_bottlenecks) {
    const entryName = entry.student_name.trim();
    if (!entryName) {
      continue;
    }
    const entryLower = entryName.toLowerCase();
    if (haystack.includes(entryLower)) {
      return `${entryName}: ${entry.bottleneck_description.trim()}`;
    }
    const tokens = entryLower.split(/[\s,()（）/·]+/).filter((t) => t.length > 2);
    if (tokens.some((token) => haystack.includes(token))) {
      return `${entryName}: ${entry.bottleneck_description.trim()}`;
    }
  }
  return "";
}

export function buildPedagogyIndividualRefineInputs(input: {
  footprint: Pick<
    ContentFootprint,
    "topicSummary" | "scope" | "visualModels"
  >;
  row: PedagogyIndividualizedRow;
  student: StudentRecord | null;
  learner: Pick<
    LearnerProfile,
    "profileSynthesisStructured" | "pedagogicalSynthesis"
  >;
}): PedagogyIndividualRefineDifyInputs {
  const educational_theory = [
    input.row.educationalTheoryZh,
    input.row.educationalTheoryEn,
  ]
    .filter((value) => value.trim().length > 0)
    .join("\n\n");
  const learning_strategies = [
    input.row.learningStrategiesZh,
    input.row.learningStrategiesEn,
  ]
    .filter((value) => value.trim().length > 0)
    .join("\n\n");

  return {
    name: resolveRefineStudentDisplayName(input.student, input.row),
    topic_summary: input.footprint.topicSummary.trim(),
    scope_and_constraints: input.footprint.scope.trim(),
    visual_models: input.footprint.visualModels.trim(),
    student_bottleneck_analysis: resolveStudentBottleneckForRefine(
      input.learner,
      input.student,
      input.row,
    ),
    educational_theory,
    learning_strategies,
    applied_modes: formatAppliedModesList(input.row.appliedModes),
  };
}

export function pedagogyThreadKey(scope: PedagogyRefineScope, studentIndex?: number) {
  return scope === "udl" ? "udl" : `student:${studentIndex ?? 0}`;
}

export function hasPedagogyBaseline(
  pedagogy: {
    lastInputFingerprint: string;
    udl: PedagogyUdlPart | null;
    educationalTheory: string;
    individualized: PedagogyIndividualizedRow[];
  },
  inputFingerprint: string,
) {
  if (pedagogy.lastInputFingerprint !== inputFingerprint) {
    return false;
  }
  return (
    pedagogy.udl !== null ||
    pedagogy.educationalTheory.trim().length > 0 ||
    pedagogy.individualized.length > 0
  );
}

export function mergePedagogyStructuredRefine(
  current: PedagogyStructuredPayload,
  incoming: PedagogyStructuredPayload,
  scope: PedagogyRefineScope,
  studentIndex?: number,
): PedagogyStructuredPayload {
  if (scope === "udl") {
    return {
      educationalTheory:
        incoming.educationalTheory.trim() || current.educationalTheory,
      learningStrategies:
        incoming.learningStrategies.trim() || current.learningStrategies,
      udl: incoming.udl ?? current.udl,
      individualized:
        incoming.individualized.length > 0
          ? incoming.individualized
          : current.individualized,
    };
  }

  const individualized = [...current.individualized];
  const incomingRow =
    studentIndex !== undefined && incoming.individualized[studentIndex]
      ? incoming.individualized[studentIndex]
      : incoming.individualized[0];

  if (incomingRow) {
    const existing =
      studentIndex !== undefined && studentIndex >= 0
        ? individualized[studentIndex]
        : individualized.find(
            (row) =>
              row.studentProfile.trim() === incomingRow.studentProfile.trim(),
          );

    const mergedRow: PedagogyIndividualizedRow = {
      studentProfile:
        incomingRow.studentProfile.trim() ||
        existing?.studentProfile.trim() ||
        "",
      educationalTheoryZh:
        incomingRow.educationalTheoryZh.trim() ||
        existing?.educationalTheoryZh ||
        "",
      educationalTheoryEn:
        incomingRow.educationalTheoryEn.trim() ||
        existing?.educationalTheoryEn ||
        "",
      learningStrategiesZh:
        incomingRow.learningStrategiesZh.trim() ||
        existing?.learningStrategiesZh ||
        "",
      learningStrategiesEn:
        incomingRow.learningStrategiesEn.trim() ||
        existing?.learningStrategiesEn ||
        "",
      appliedModes:
        incomingRow.appliedModes.length > 0
          ? incomingRow.appliedModes
          : (existing?.appliedModes ?? []),
    };

    if (studentIndex !== undefined && studentIndex >= 0) {
      if (studentIndex < individualized.length) {
        individualized[studentIndex] = mergedRow;
      } else {
        individualized.push(mergedRow);
      }
    } else {
      const matchIndex = individualized.findIndex(
        (row) =>
          row.studentProfile.trim() === mergedRow.studentProfile.trim() &&
          mergedRow.studentProfile.trim().length > 0,
      );
      if (matchIndex >= 0) {
        individualized[matchIndex] = mergedRow;
      } else {
        individualized.push(mergedRow);
      }
    }
  }

  return {
    ...current,
    udl: incoming.udl ?? current.udl,
    educationalTheory:
      incoming.educationalTheory.trim() || current.educationalTheory,
    learningStrategies:
      incoming.learningStrategies.trim() || current.learningStrategies,
    individualized,
  };
}

/** Dify Step 3 baseline workflow start variables (string inputs). */
export type PedagogyStrategyDifyInputs = {
  topic_summary: string;
  scope_and_constraints: string;
  visual_models: string;
  /** JSON text of Step 2 `ProfileSynthesisStructured` (see profile synthesizer schema). */
  learner_profile_analysis: string;
};

const EMPTY_PROFILE_SYNTHESIS: ProfileSynthesisStructured = {
  class_profile_summary: "",
  goal_alignment: "",
  specific_cognitive_bottlenecks: [],
  instructional_accommodations: {
    tier_1_whole_class: "",
    tier_2_targeted: [],
  },
  behavioral_environmental_management: {
    whole_class_environment: "",
    individual_management: [],
  },
};

/** Step 2 output as a JSON string for Dify `learner_profile_analysis`. */
export function buildLearnerProfileAnalysisString(
  learner: LearnerProfile,
): string {
  if (learner.profileSynthesisStructured) {
    return JSON.stringify(learner.profileSynthesisStructured);
  }
  const parsed = parseProfileSynthesisStructuredFromText(
    learner.pedagogicalSynthesis,
  );
  if (parsed) {
    return JSON.stringify(parsed);
  }
  const legacyText = learner.pedagogicalSynthesis.trim();
  if (!legacyText) {
    return "";
  }
  return JSON.stringify({
    ...EMPTY_PROFILE_SYNTHESIS,
    class_profile_summary: legacyText,
  });
}

export function learnerProfileAnalysisReady(learner: LearnerProfile): boolean {
  return buildLearnerProfileAnalysisString(learner).length > 0;
}

export type PedagogyStrategyRunInput = {
  footprint: Pick<
    ContentFootprint,
    "topicSummary" | "scope" | "visualModels"
  >;
  learner: LearnerProfile;
  students: StudentRecord[];
};

export function buildPedagogyStrategyPayload(
  input: PedagogyStrategyRunInput,
): PedagogyStrategyDifyInputs {
  return {
    topic_summary: input.footprint.topicSummary.trim(),
    scope_and_constraints: input.footprint.scope.trim(),
    visual_models: input.footprint.visualModels.trim(),
    learner_profile_analysis: buildLearnerProfileAnalysisString(input.learner),
  };
}

export function formatPedagogyChatHistory(
  transcript: { role: string; content: string }[],
) {
  return transcript
    .filter((message) => message.content.trim().length > 0)
    .map((message) =>
      `${message.role === "user" ? "Teacher" : "Assistant"}: ${message.content.trim()}`,
    )
    .join("\n\n");
}

export function combinePedagogyWorkflowAnswer(
  parsed: PedagogyStrategyWorkflowResult,
): string {
  if (parsed.chatReply.trim()) {
    return parsed.chatReply.trim();
  }
  return formatPedagogyChatMarkdown(parsed);
}

function stripJsonCodeFence(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1].trim() : text;
}

/** Brace-aware slice for LLM JSON blobs (avoids broken `lastIndexOf("}")`). */
function extractBalancedJsonArray(text: string, fromIndex = 0): string | null {
  const start = text.indexOf("[", fromIndex);
  if (start < 0) {
    return null;
  }
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let index = start; index < text.length; index += 1) {
    const ch = text[index];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "[") {
      depth += 1;
    } else if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }
  return null;
}

function extractBalancedJsonObject(text: string, fromIndex = 0): string | null {
  const start = text.indexOf("{", fromIndex);
  if (start < 0) {
    return null;
  }
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let index = start; index < text.length; index += 1) {
    const ch = text[index];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }
  return null;
}

function extractQuotedJsonStringField(
  text: string,
  fieldName: string,
): string | null {
  const pattern = new RegExp(`"${fieldName}"\\s*:\\s*"`);
  const match = pattern.exec(text);
  if (!match) {
    return null;
  }
  let index = match.index + match[0].length;
  let value = "";
  while (index < text.length) {
    const ch = text[index];
    if (ch === "\\") {
      const next = text[index + 1];
      if (next === "n") {
        value += "\n";
      } else if (next === "t") {
        value += "\t";
      } else if (next === "r") {
        value += "\r";
      } else if (next === '"') {
        value += '"';
      } else if (next === "\\") {
        value += "\\";
      } else if (next !== undefined) {
        value += next;
      }
      index += 2;
      continue;
    }
    if (ch === '"') {
      break;
    }
    value += ch;
    index += 1;
  }
  return value.trim() ? value : null;
}

function extractJsonFieldValue(
  text: string,
  fieldName: string,
): unknown | null {
  const pattern = new RegExp(`"${fieldName}"\\s*:\\s*`);
  const match = pattern.exec(text);
  if (!match) {
    return null;
  }
  const rest = text.slice(match.index + match[0].length).trimStart();
  if (rest.startsWith("{")) {
    const slice = extractBalancedJsonObject(rest, 0);
    if (!slice) {
      return null;
    }
    try {
      return JSON.parse(slice) as unknown;
    } catch {
      return null;
    }
  }
  if (rest.startsWith("[")) {
    const slice = extractBalancedJsonArray(rest, 0);
    if (slice) {
      try {
        return JSON.parse(slice) as unknown;
      } catch {
        return null;
      }
    }
  }
  if (rest.startsWith('"')) {
    return extractQuotedJsonStringField(text, fieldName);
  }
  return null;
}

function parseJsonObjectFromAnswerText(
  text: string,
): Record<string, unknown> | null {
  const normalized = stripJsonCodeFence(text.trim());
  const candidates = [
    normalized,
    extractBalancedJsonObject(normalized) ?? "",
    normalized.slice(normalized.indexOf("{")),
  ].filter((value) => value.trim().length > 0);

  for (const candidate of candidates) {
    try {
      const value = JSON.parse(candidate) as unknown;
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        continue;
      }
      return value as Record<string, unknown>;
    } catch {
      // try next strategy
    }
  }
  return null;
}

function buildPedagogyRecordFromLooseJson(text: string): Record<string, unknown> | null {
  const hasStudentRefineMarker =
    text.includes('"educational_theory_zh"') ||
    text.includes('"learning_strategies_zh"');
  if (!text.includes('"chat_reply"') && !hasStudentRefineMarker) {
    return null;
  }
  const chatReply = extractQuotedJsonStringField(text, "chat_reply");
  const part1 = extractJsonFieldValue(text, "part_1_udl");
  const part2 = extractJsonFieldValue(text, "part_2_individualized");
  const appliedModes = extractJsonFieldValue(text, "applied_modes");
  const theoryZh = extractQuotedJsonStringField(text, "educational_theory_zh");
  const theoryEn = extractQuotedJsonStringField(text, "educational_theory_en");
  const stratZh = extractQuotedJsonStringField(text, "learning_strategies_zh");
  const stratEn = extractQuotedJsonStringField(text, "learning_strategies_en");
  const name = extractQuotedJsonStringField(text, "name");
  if (
    !chatReply &&
    part1 == null &&
    part2 == null &&
    !theoryZh &&
    !stratZh &&
    appliedModes == null
  ) {
    return null;
  }
  return {
    ...(chatReply ? { chat_reply: chatReply } : {}),
    ...(part1 != null ? { part_1_udl: part1 } : {}),
    ...(part2 != null ? { part_2_individualized: part2 } : {}),
    ...(theoryZh ? { educational_theory_zh: theoryZh } : {}),
    ...(theoryEn ? { educational_theory_en: theoryEn } : {}),
    ...(stratZh ? { learning_strategies_zh: stratZh } : {}),
    ...(stratEn ? { learning_strategies_en: stratEn } : {}),
    ...(appliedModes != null ? { applied_modes: appliedModes } : {}),
    ...(name ? { name } : {}),
  };
}

function pedagogyStructuredParseCandidates(text: string): string[] {
  const { answer, think } = splitChatThinkContent(text);
  const candidates = [answer, text, think].filter(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
  return [...new Set(candidates)];
}

/** When Dify streams raw structured JSON in the chat answer, split chat vs panels. */
export function tryParsePedagogyStructuredAnswerText(
  text: string,
): PedagogyStrategyWorkflowResult | null {
  for (const candidate of pedagogyStructuredParseCandidates(text)) {
    const record =
      parseJsonObjectFromAnswerText(candidate) ??
      buildPedagogyRecordFromLooseJson(candidate);
    if (!record) {
      continue;
    }
    const hasStructured =
      typeof record.chat_reply === "string" ||
      record.part_1_udl != null ||
      record.part_2_individualized != null ||
      typeof record.educational_theory_zh === "string" ||
      typeof record.learning_strategies_zh === "string" ||
      Array.isArray(record.applied_modes);
    if (!hasStructured) {
      continue;
    }
    return parsePedagogyWorkflowOutputs(record);
  }
  return null;
}

export function pedagogyStudentStreamBody(text: string): string {
  const { answer } = splitChatThinkContent(text);
  return (answer || text).trim();
}

/** Student refine: show markdown chat_reply instead of raw JSON when possible. */
export function resolvePedagogyStudentChatDisplay(text: string): {
  display: string;
  parsed: PedagogyStrategyWorkflowResult | null;
} {
  const parsed = tryParsePedagogyStructuredAnswerText(text);
  if (parsed?.chatReply.trim()) {
    return { display: parsed.chatReply.trim(), parsed };
  }
  const loose = extractQuotedJsonStringField(text, "chat_reply");
  if (loose?.trim()) {
    return {
      display: loose.trim(),
      parsed: parsePedagogyWorkflowOutputs({ chat_reply: loose }),
    };
  }
  if (isUnparsedPedagogyStructuredJson(text)) {
    return { display: "", parsed: null };
  }
  return { display: text, parsed: null };
}

export function looksLikePedagogyStructuredJsonAnswer(text: string): boolean {
  const trimmed = pedagogyStudentStreamBody(text).trimStart();
  if (trimmed.startsWith("{")) {
    return true;
  }
  return (
    trimmed.includes('"chat_reply"') ||
    trimmed.includes('"part_1_udl"') ||
    trimmed.includes('"part_2_individualized"') ||
    trimmed.includes('"educational_theory_zh"') ||
    trimmed.includes('"learning_strategies_zh"')
  );
}

/** Buffered stream is JSON, but not parseable yet (or broken) — never show as chat. */
export function isUnparsedPedagogyStructuredJson(text: string): boolean {
  const body = pedagogyStudentStreamBody(text);
  if (!body) {
    return false;
  }
  if (tryParsePedagogyStructuredAnswerText(text)?.chatReply.trim()) {
    return false;
  }
  return looksLikePedagogyStructuredJsonAnswer(text);
}

export function formatPedagogyRefineAssistantContent(
  raw: string,
  options: { streaming?: boolean } = {},
): string {
  const body = pedagogyStudentStreamBody(raw);
  if (!body) {
    return "";
  }
  const resolved = resolvePedagogyStudentChatDisplay(body);
  if (resolved.display.trim()) {
    return resolved.display;
  }
  if (isUnparsedPedagogyStructuredJson(raw)) {
    return options.streaming
      ? "正在整理回覆… · Preparing reply…"
      : "";
  }
  return formatChatDisplayText(body);
}

export function formatUdlTheoryMarkdown(udl: PedagogyUdlPart | null): string {
  if (!udl) {
    return "";
  }
  const parts = [udl.educationalTheoryZh, udl.educationalTheoryEn].filter(
    (value) => value.trim().length > 0,
  );
  return parts.join("\n\n");
}

export function formatUdlStrategiesMarkdown(udl: PedagogyUdlPart | null): string {
  if (!udl) {
    return "";
  }
  const parts = [udl.learningStrategiesZh, udl.learningStrategiesEn].filter(
    (value) => value.trim().length > 0,
  );
  return parts.join("\n\n");
}

export function formatIndividualizedRowMarkdown(
  row: PedagogyIndividualizedRow,
): string {
  const blocks: string[] = [];
  if (row.educationalTheoryZh || row.educationalTheoryEn) {
    blocks.push(
      `#### 教育理論 · Educational Theory\n\n${[row.educationalTheoryZh, row.educationalTheoryEn].filter(Boolean).join("\n\n")}`,
    );
  }
  if (row.learningStrategiesZh || row.learningStrategiesEn) {
    blocks.push(
      `#### 支援策略 · Learning Strategies\n\n${[row.learningStrategiesZh, row.learningStrategiesEn].filter(Boolean).join("\n\n")}`,
    );
  }
  if (row.appliedModes.length > 0) {
    blocks.push(
      `#### 調適模式 · Applied modes\n\n${formatAppliedModesMarkdown(row.appliedModes)}`,
    );
  }
  return blocks.join("\n\n");
}

export function formatPedagogyStepsContext(
  footprint: ContentFootprint,
  learner: LearnerProfile,
): string {
  const blocks: string[] = [
    "以下為 Step 1–2 已鎖定內容，請據此產生／細化教學策略。\nLocked Step 1–2 context for strategy analysis:",
  ];
  if (footprint.topicSummary.trim()) {
    blocks.push(`**教學主題 · Topic**\n${footprint.topicSummary.trim()}`);
  }
  if (footprint.scope.trim()) {
    blocks.push(`**範圍與限制 · Scope**\n${footprint.scope.trim()}`);
  }
  if (footprint.visualModels.trim()) {
    blocks.push(`**視覺模型 · Visual models**\n${footprint.visualModels.trim()}`);
  }
  if (learner.classProfile.trim()) {
    blocks.push(`**班級備註 · Class profile**\n${learner.classProfile.trim()}`);
  }
  if (learner.pedagogicalSynthesis.trim()) {
    blocks.push(
      `**Profile Synthesizer**\n${learner.pedagogicalSynthesis.trim()}`,
    );
  }
  return blocks.join("\n\n");
}

export function formatUdlRefineSeedMarkdown(
  pedagogy: Pick<
    PedagogicalStrategyState,
    "udl" | "educationalTheory" | "learningStrategies"
  >,
): string {
  const theory =
    formatUdlTheoryMarkdown(pedagogy.udl) || pedagogy.educationalTheory.trim();
  const strategies =
    formatUdlStrategiesMarkdown(pedagogy.udl) ||
    pedagogy.learningStrategies.trim();
  if (!theory && !strategies) {
    return "";
  }
  const parts: string[] = ["## 首次分析 · Initial analysis (UDL)"];
  if (theory) {
    parts.push(`### 教育理論 · Educational Theory\n\n${theory}`);
  }
  if (strategies) {
    parts.push(`### 支援策略 · Learning Strategies\n\n${strategies}`);
  }
  return parts.join("\n\n");
}

export function formatStudentRefineSeedMarkdown(
  row: PedagogyIndividualizedRow,
): string {
  const title = row.studentProfile.trim() || "Student";
  return `## 首次分析 · Initial analysis\n\n### ${title}\n\n${formatIndividualizedRowMarkdown(row)}`;
}

/** Chat bubble text when Dify omits or embeds `chat_reply` in structured JSON. */
export function resolvePedagogyRefineChatReply(
  parsed: Pick<
    PedagogyStrategyWorkflowResult,
    | "chatReply"
    | "educationalTheory"
    | "learningStrategies"
    | "udl"
    | "individualized"
  >,
): string {
  if (parsed.chatReply.trim()) {
    return parsed.chatReply.trim();
  }
  const markdown = formatPedagogyChatMarkdown(parsed as PedagogyStrategyWorkflowResult);
  if (markdown.trim()) {
    return markdown;
  }
  if (parsed.individualized.length > 0 || parsed.udl) {
    return "已更新教學策略 · Strategy panels updated.";
  }
  if (parsed.educationalTheory.trim() || parsed.learningStrategies.trim()) {
    return parsed.educationalTheory.trim() || parsed.learningStrategies.trim();
  }
  return "";
}

export function formatPedagogyChatMarkdown(
  parsed: PedagogyStrategyWorkflowResult,
): string {
  const blocks: string[] = [];

  if (parsed.udl || parsed.educationalTheory || parsed.learningStrategies) {
    blocks.push(`## 通用設計學習 (UDL) · Class-wide design`);
    const theory =
      formatUdlTheoryMarkdown(parsed.udl) || parsed.educationalTheory.trim();
    const strategies =
      formatUdlStrategiesMarkdown(parsed.udl) ||
      parsed.learningStrategies.trim();
    if (theory) {
      blocks.push(`### 教育理論 · Educational Theory\n\n${theory}`);
    }
    if (strategies) {
      blocks.push(`### 支援策略 · Learning Strategies\n\n${strategies}`);
    }
  }

  if (parsed.individualized.length > 0) {
    blocks.push(`## 個別調適 · Individualized support`);
    for (const row of parsed.individualized) {
      const title = row.studentProfile.trim() || "Student";
      blocks.push(`### ${title}\n\n${formatIndividualizedRowMarkdown(row)}`);
    }
  }

  return blocks.join("\n\n");
}

export function pedagogyInputFingerprint(
  footprint: ContentFootprint,
  learner: LearnerProfile,
) {
  return JSON.stringify({
    topic: footprint.topicSummary.trim(),
    scope: footprint.scope.trim(),
    visual: footprint.visualModels.trim(),
    classId: learner.classId,
    studentIds: learner.studentIds,
    classProfile: learner.classProfile.trim(),
    learnerProfileAnalysis: buildLearnerProfileAnalysisString(learner),
  });
}

function pickString(...candidates: unknown[]) {
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function formatBilingualFields(
  record: Record<string, unknown>,
  zhKeys: string[],
  enKeys: string[],
): string {
  const zh = pickString(...zhKeys.map((key) => record[key]));
  const en = pickString(...enKeys.map((key) => record[key]));
  if (zh && en) {
    return `${zh}\n\n${en}`;
  }
  return zh || en;
}

function parsePart1UdlRecord(value: unknown): PedagogyUdlPart | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }
  const part: PedagogyUdlPart = {
    educationalTheoryZh: pickString(record.educational_theory_zh, record.theory_zh),
    educationalTheoryEn: pickString(record.educational_theory_en, record.theory_en),
    learningStrategiesZh: pickString(
      record.learning_strategies_zh,
      record.strategies_zh,
    ),
    learningStrategiesEn: pickString(
      record.learning_strategies_en,
      record.strategies_en,
    ),
  };
  const hasContent = Object.values(part).some((field) => field.trim().length > 0);
  return hasContent ? part : null;
}

function parsePart1Udl(value: unknown): {
  udl: PedagogyUdlPart | null;
  educationalTheory: string;
  classLearningStrategies: string;
} {
  if (typeof value === "string" && value.trim()) {
    return {
      udl: null,
      educationalTheory: formatChatDisplayText(value.trim()),
      classLearningStrategies: "",
    };
  }

  const record = asRecord(value);
  const structuredUdl = parsePart1UdlRecord(value);
  if (!record) {
    return {
      udl: structuredUdl,
      educationalTheory: "",
      classLearningStrategies: "",
    };
  }

  const educationalTheory = formatChatDisplayText(
    formatBilingualFields(
      record,
      ["educational_theory_zh", "theory_zh", "theory_zh_hant"],
      ["educational_theory_en", "theory_en"],
    ) ||
      pickString(
        record.markdown,
        record.text,
        record.summary,
        record.theory,
        record.udl_rationale,
        record.educational_theory,
      ),
  );

  const classLearningStrategies = formatChatDisplayText(
    formatBilingualFields(
      record,
      [
        "learning_strategies_zh",
        "support_strategies_zh",
        "strategies_zh",
        "class_strategies_zh",
      ],
      [
        "learning_strategies_en",
        "support_strategies_en",
        "strategies_en",
        "class_strategies_en",
      ],
    ),
  );

  return {
    udl: structuredUdl,
    educationalTheory,
    classLearningStrategies,
  };
}

function parseIndividualizedRows(value: unknown): PedagogyIndividualizedRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): PedagogyIndividualizedRow | null => {
      if (typeof item === "string" && item.trim()) {
        return {
          studentProfile: item.trim(),
          educationalTheoryZh: "",
          educationalTheoryEn: "",
          learningStrategiesZh: "",
          learningStrategiesEn: "",
          appliedModes: [],
        };
      }
      const record = asRecord(item);
      if (!record) {
        return null;
      }
      const appliedModes = normalizePedagogyAppliedModes(
        record.applied_modes ?? record.appliedModes,
      );
      const row: PedagogyIndividualizedRow = {
        studentProfile: pickString(
          record.student_profile,
          record.studentProfile,
          record.student_name,
          record.name,
        ),
        educationalTheoryZh: pickString(record.educational_theory_zh),
        educationalTheoryEn: pickString(record.educational_theory_en),
        learningStrategiesZh: pickString(
          record.learning_strategies_zh,
          record.strategies_zh,
        ),
        learningStrategiesEn: pickString(
          record.learning_strategies_en,
          record.strategies_en,
        ),
        appliedModes,
      };
      const hasContent =
        row.studentProfile.length > 0 ||
        row.educationalTheoryZh.length > 0 ||
        row.educationalTheoryEn.length > 0 ||
        row.learningStrategiesZh.length > 0 ||
        row.learningStrategiesEn.length > 0 ||
        row.appliedModes.length > 0;
      return hasContent ? row : null;
    })
    .filter((row): row is PedagogyIndividualizedRow => row !== null);
}

export type PedagogyStrategyWorkflowResult = PedagogyStructuredPayload & {
  chatReply: string;
  raw: Record<string, unknown>;
};

function resolveStructuredRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string") {
    return parseJsonObjectFromAnswerText(value);
  }
  return asRecord(value);
}

function structuredPayloadMarkers(record: Record<string, unknown>): boolean {
  return (
    record.chat_reply != null ||
    record.part_1_udl != null ||
    record.part_2_individualized != null ||
    record.educational_theory_zh != null ||
    record.learning_strategies_zh != null ||
    Array.isArray(record.applied_modes)
  );
}

function isIndividualStudentRefineShape(
  record: Record<string, unknown>,
): boolean {
  if (record.part_1_udl != null || record.part_2_individualized != null) {
    return false;
  }
  return (
    typeof record.educational_theory_zh === "string" ||
    typeof record.educational_theory_en === "string" ||
    typeof record.learning_strategies_zh === "string" ||
    typeof record.learning_strategies_en === "string" ||
    Array.isArray(record.applied_modes)
  );
}

function parseIndividualStudentRefineRecord(
  record: Record<string, unknown>,
): PedagogyStrategyWorkflowResult {
  const chatReply = formatChatDisplayText(pickString(record.chat_reply));
  const row: PedagogyIndividualizedRow = {
    studentProfile: pickString(record.name, record.student_profile),
    educationalTheoryZh: pickString(record.educational_theory_zh),
    educationalTheoryEn: pickString(record.educational_theory_en),
    learningStrategiesZh: pickString(record.learning_strategies_zh),
    learningStrategiesEn: pickString(record.learning_strategies_en),
    appliedModes: normalizePedagogyAppliedModes(record.applied_modes),
  };
  const hasRow =
    row.studentProfile.length > 0 ||
    row.educationalTheoryZh.length > 0 ||
    row.educationalTheoryEn.length > 0 ||
    row.learningStrategiesZh.length > 0 ||
    row.learningStrategiesEn.length > 0 ||
    row.appliedModes.length > 0;

  return {
    educationalTheory: "",
    learningStrategies: "",
    udl: null,
    individualized: hasRow ? [row] : [],
    chatReply,
    raw: record,
  };
}

function pickEmbeddedStructuredPayload(
  outputs: Record<string, unknown>,
): Record<string, unknown> | null {
  const structured = resolveStructuredRecord(outputs.structured_output);
  if (structured && structuredPayloadMarkers(structured)) {
    return structured;
  }
  for (const key of ["text", "answer", "output", "result"]) {
    const value = outputs[key];
    if (typeof value !== "string") {
      continue;
    }
    const parsed = parseJsonObjectFromAnswerText(value);
    if (parsed && structuredPayloadMarkers(parsed)) {
      return parsed;
    }
  }
  return null;
}

/** True when Dify returned the student-refine schema (not incidental node text). */
export function pedagogyStructuredResultReady(
  parsed: PedagogyStrategyWorkflowResult,
): boolean {
  return (
    parsed.chatReply.trim().length > 0 ||
    parsed.individualized.length > 0 ||
    parsed.udl !== null
  );
}

export function parsePedagogyWorkflowOutputs(
  outputs: Record<string, unknown>,
): PedagogyStrategyWorkflowResult {
  const embedded = pickEmbeddedStructuredPayload(outputs);
  const source = embedded ? { ...outputs, ...embedded } : outputs;

  const structured = resolveStructuredRecord(source.structured_output);
  const nested =
    structured ??
    asRecord(source.result) ??
    asRecord(source.output);

  for (const candidate of [source, nested, structured]) {
    const record = candidate ? asRecord(candidate) : null;
    if (record && isIndividualStudentRefineShape(record)) {
      return parseIndividualStudentRefineRecord(record);
    }
  }

  const chatReply = formatChatDisplayText(
    pickString(
      source.chat_reply,
      nested?.chat_reply,
      structured?.chat_reply,
    ),
  );

  const part1Source =
    source.part_1_udl ?? nested?.part_1_udl ?? structured?.part_1_udl;
  const part1 = parsePart1Udl(part1Source);

  const individualizedSource =
    source.part_2_individualized ??
    nested?.part_2_individualized ??
    structured?.part_2_individualized;
  const individualized = parseIndividualizedRows(individualizedSource);

  const educationalTheory = formatChatDisplayText(
    pickString(
      part1.educationalTheory,
      formatUdlTheoryMarkdown(part1.udl),
      source.educational_theory,
      source.education_theory,
      source.theory,
      source.pedagogical_theory,
      nested?.educational_theory,
      nested?.education_theory,
      structured?.educational_theory,
    ),
  );

  const learningStrategies = formatChatDisplayText(
    pickString(
      part1.classLearningStrategies,
      formatUdlStrategiesMarkdown(part1.udl),
      source.learning_strategies,
      source.support_strategies,
      source.strategies,
      source.scaffolding_modes,
      nested?.learning_strategies,
      nested?.support_strategies,
      structured?.learning_strategies,
    ),
  );

  const combined = formatChatDisplayText(
    pickString(
      source.strategy_analysis,
      source.pedagogical_strategy,
      source.summary,
      embedded ? "" : source.text,
      embedded ? "" : source.answer,
      nested?.strategy_analysis,
      nested?.text,
    ),
  );

  if (!educationalTheory && !learningStrategies && !individualized.length && combined) {
    const split = parsePedagogyAssistantReply(combined);
    return {
      educationalTheory: split.educationalTheory || combined,
      learningStrategies: split.learningStrategies,
      udl: null,
      individualized: [],
      chatReply: chatReply || combined,
      raw: source,
    };
  }

  return {
    educationalTheory: educationalTheory || combined,
    learningStrategies,
    udl: part1.udl,
    individualized,
    chatReply,
    raw: source,
  };
}

export function tryParsePedagogyWorkflowOutputs(
  outputs: Record<string, unknown>,
): PedagogyStrategyWorkflowResult | null {
  const parsed = parsePedagogyWorkflowOutputs(outputs);
  return pedagogyStructuredResultReady(parsed) ? parsed : null;
}

export function toPedagogyStructuredPayload(
  parsed: PedagogyStrategyWorkflowResult,
): PedagogyStructuredPayload {
  return {
    educationalTheory: parsed.educationalTheory,
    learningStrategies: parsed.learningStrategies,
    udl: parsed.udl,
    individualized: parsed.individualized,
  };
}

const THEORY_MARKERS =
  /(?:^|\n)#+\s*(?:教育理論|Educational Theory|The "Why")[\s:：]*\n/i;
const STRATEGY_MARKERS =
  /(?:^|\n)#+\s*(?:支援策略|學習策略|Learning Strategies|The "How")[\s:：]*\n/i;

export function parsePedagogyAssistantReply(text: string): {
  educationalTheory: string;
  learningStrategies: string;
} {
  const trimmed = text.trim();
  if (!trimmed) {
    return { educationalTheory: "", learningStrategies: "" };
  }

  const theoryMatch = THEORY_MARKERS.exec(trimmed);
  const strategyMatch = STRATEGY_MARKERS.exec(trimmed);

  if (theoryMatch && strategyMatch) {
    const theoryStart = theoryMatch.index + theoryMatch[0].length;
    const strategyStart = strategyMatch.index;
    if (theoryStart < strategyStart) {
      return {
        educationalTheory: trimmed.slice(theoryStart, strategyStart).trim(),
        learningStrategies: trimmed
          .slice(strategyMatch.index + strategyMatch[0].length)
          .trim(),
      };
    }
  }

  if (theoryMatch) {
    return {
      educationalTheory: trimmed
        .slice(theoryMatch.index + theoryMatch[0].length)
        .trim(),
      learningStrategies: "",
    };
  }

  if (strategyMatch) {
    return {
      educationalTheory: "",
      learningStrategies: trimmed
        .slice(strategyMatch.index + strategyMatch[0].length)
        .trim(),
    };
  }

  return {
    educationalTheory: trimmed,
    learningStrategies: "",
  };
}
