import {
  formatChatDisplayText,
  splitChatThinkContent,
} from "@/lib/chat-think";
import type { ContentFootprint } from "@/lib/workflow-draft";
import {
  EMPTY_IEP_DOMAINS,
  isSenStudent,
  type CurrentPerformance,
  type IepDomains,
  type StudentRecord,
} from "@/lib/student-record";

export type ProfileSynthesizerInput = {
  classId: string;
  studentIds: string[];
  classProfile: string;
  footprint: Pick<
    ContentFootprint,
    "topicSummary" | "scope" | "visualModels"
  >;
  students: StudentRecord[];
};

/** Dify Profile Synthesizer structured output (JSON schema). */
export type ProfileCognitiveBottleneck = {
  student_name: string;
  bottleneck_description: string;
};

export type ProfileTier2Accommodation = {
  student_name: string;
  cognitive_challenge: string;
  solution_context: string;
};

export type ProfileIndividualManagement = {
  student_name: string;
  management_strategies: string;
};

export type ProfileInstructionalAccommodations = {
  tier_1_whole_class: string;
  tier_2_targeted: ProfileTier2Accommodation[];
};

export type ProfileBehavioralEnvironmentalManagement = {
  whole_class_environment: string;
  individual_management: ProfileIndividualManagement[];
};

export type ProfileSynthesisStructured = {
  class_profile_summary: string;
  goal_alignment: string;
  specific_cognitive_bottlenecks: ProfileCognitiveBottleneck[];
  instructional_accommodations: ProfileInstructionalAccommodations;
  behavioral_environmental_management: ProfileBehavioralEnvironmentalManagement;
};

export type ProfileSynthesizerResult = {
  pedagogicalConstraints: string;
  structured: ProfileSynthesisStructured | null;
  raw: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function pickString(...candidates: unknown[]) {
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

/** Matches Dify start-node JSON schema for `learner_profiles`. */
export type DifyLearnerTierSupport = {
  tier_1_support: string;
  tier_2_and_3_support: string;
};

export type DifyLearnerDomains = {
  learning_adjustment: DifyLearnerTierSupport;
  social_behavioral_adjustment: DifyLearnerTierSupport;
};

export type DifyLearnerCurrentPerformance = {
  strengths_and_interests: string;
  weaknesses: string;
};

export type DifyLearnerProfileStudent = {
  id: string;
  name: string;
  class: string;
  sen_type?: string;
  current_performance?: DifyLearnerCurrentPerformance;
  domains?: DifyLearnerDomains;
};

export type LearnerProfilesDocument = {
  students: DifyLearnerProfileStudent[];
};

function normalizeTierSupport(raw: IepDomains["learning_adjustment"]): DifyLearnerTierSupport {
  return {
    tier_1_support: raw.tier_1_support ?? "",
    tier_2_and_3_support: raw.tier_2_and_3_support ?? "",
  };
}

function normalizeDomainsForDify(raw: IepDomains): DifyLearnerDomains {
  return {
    learning_adjustment: normalizeTierSupport(raw.learning_adjustment),
    social_behavioral_adjustment: normalizeTierSupport(
      raw.social_behavioral_adjustment,
    ),
  };
}

function normalizeCurrentPerformanceForDify(
  raw: CurrentPerformance,
): DifyLearnerCurrentPerformance {
  return {
    strengths_and_interests: raw.strengths_and_interests ?? "",
    weaknesses: raw.weaknesses ?? "",
  };
}

/** One student object inside `learner_profiles.students` (schema-valid keys only). */
export function toLearnerProfileWorkflowItem(
  student: StudentRecord,
): DifyLearnerProfileStudent {
  const base: DifyLearnerProfileStudent = {
    id: String(student.id),
    name: String(student.name),
    class: String(student.class),
  };

  if (!isSenStudent(student)) {
    return base;
  }

  return {
    ...base,
    sen_type: student.sen_type?.trim() ?? "",
    current_performance: normalizeCurrentPerformanceForDify(
      student.current_performance ?? {
        strengths_and_interests: "",
        weaknesses: "",
      },
    ),
    domains: normalizeDomainsForDify(student.domains ?? EMPTY_IEP_DOMAINS),
  };
}

export type LearnerProfileWorkflowStudent = DifyLearnerProfileStudent;

/** Exact JSON document Dify validates: `{ "students": [ … ] }`. */
export function buildLearnerProfilesDocument(
  students: StudentRecord[],
): LearnerProfilesDocument {
  return {
    students: students.map(toLearnerProfileWorkflowItem),
  };
}

export type ProfileSynthesizerDifyInputs = {
  topic_summary: string;
  scope_and_constraints: string;
  visual_models: string;
  /** Dify start variable (string/paragraph): JSON text of `{ students: [ … ] }`. */
  learner_profiles: string;
  custom_profile: string;
};

export function buildProfileSynthesizerPayload(
  input: ProfileSynthesizerInput,
): ProfileSynthesizerDifyInputs {
  const learnerProfiles = buildLearnerProfilesDocument(input.students);

  return {
    topic_summary: input.footprint.topicSummary.trim(),
    scope_and_constraints: input.footprint.scope.trim(),
    visual_models: input.footprint.visualModels.trim(),
    learner_profiles: JSON.stringify(learnerProfiles),
    custom_profile: input.classProfile.trim(),
  };
}

/** Fixed Profile Synthesizer section titles (Dify `profile_analysis` sections 1–5). */
export const PROFILE_SYNTHESIS_SECTION_TITLES: Record<
  number,
  { zh: string; en: string }
> = {
  1: { zh: "班級 SEN 概覽", en: "Class Profile Summary" },
  2: { zh: "教師目標對齊", en: "Goal Alignment" },
  3: { zh: "個別學生的認知瓶頸", en: "Specific Cognitive Bottlenecks" },
  4: { zh: "教學調適", en: "Instructional Accommodations" },
  5: { zh: "課堂行為與環境管理", en: "Behavioral & Environmental Management" },
};

export type ProfileAnalysisSection = {
  number: number;
  /** Display fallback when number is outside 1–5 */
  heading: string;
  headingZh: string;
  headingEn: string;
  body: string;
};

function normalizeTitleToken(value: string) {
  return value
    .replace(/\*\*/g, "")
    .replace(/[：:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function sectionTitleMatchesFixed(
  candidate: string,
  fixed: { zh: string; en: string },
) {
  const normalized = normalizeTitleToken(candidate);
  if (!normalized) {
    return false;
  }
  const zh = normalizeTitleToken(fixed.zh);
  const en = normalizeTitleToken(fixed.en);
  return (
    normalized === zh ||
    normalized === en ||
    normalized.includes(zh) ||
    normalized.includes(en) ||
    (normalized.includes(zh) && normalized.includes(en))
  );
}

function fixedSectionHeadings(number: number) {
  const fixed = PROFILE_SYNTHESIS_SECTION_TITLES[number];
  if (!fixed) {
    return { headingZh: "", headingEn: "", heading: "" };
  }
  return {
    headingZh: fixed.zh,
    headingEn: fixed.en,
    heading: `${fixed.zh} (${fixed.en})`,
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Insert breaks before inline " 2. " / " 3. " (not decimals like 3.14). */
function normalizeNumberedSectionBreaks(text: string) {
  let t = text.replace(/([^\n])\s+(?=(\d+)\.(?!\d)\s+)/g, "$1\n\n");
  t = t.replace(/([^\n])\s+(?=(\d+)[．、]\s*)/g, "$1\n\n");
  return t;
}

function normalizeProfileAnalysisSource(text: string) {
  let t = text.replace(/\r\n/g, "\n").trim();
  t = normalizeNumberedSectionBreaks(t);
  t = t.replace(/^(\d+)[．、]\s*/gm, "$1. ");
  return t;
}

function findSectionMarker(
  text: string,
  number: number,
): { index: number; length: number } | null {
  const fixed = PROFILE_SYNTHESIS_SECTION_TITLES[number];
  if (!fixed) {
    return null;
  }
  const zh = escapeRegExp(fixed.zh);
  const en = escapeRegExp(fixed.en);

  const patterns = [
    new RegExp(`(?:^|\\n)\\s*(?:#{1,4}\\s*)?${number}\\.\\s+`, "m"),
    new RegExp(`(?:^|\\n)\\s*${number}[．、]\\s*`, "m"),
    new RegExp(
      `(?:^|\\n)\\s*\\*\\*\\s*${number}\\.?\\s*${zh}[^\\n*]*\\*\\*\\s*`,
      "m",
    ),
    new RegExp(`(?:^|\\n)\\s*\\*\\*\\s*${zh}[^\\n*]*\\*\\*\\s*`, "m"),
    new RegExp(
      `(?:^|\\n)\\s*${zh}\\s*(?:[（(]\\s*${en}\\s*[）)])?\\s*`,
      "m",
    ),
  ];

  let best: { index: number; length: number } | null = null;
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (!match || match.index === undefined) {
      continue;
    }
    const index = match.index;
    const length = match[0].length;
    if (!best || index < best.index) {
      best = { index, length };
    }
  }
  return best;
}

function locateProfileSectionSlices(text: string): Array<{ number: number; raw: string }> {
  const normalized = normalizeProfileAnalysisSource(text);
  const markers: Array<{ number: number; index: number; length: number }> = [];

  for (let number = 1; number <= 5; number += 1) {
    const found = findSectionMarker(normalized, number);
    if (found) {
      markers.push({ number, ...found });
    }
  }

  if (markers.length === 0) {
    return [];
  }

  markers.sort((a, b) => a.index - b.index);

  const slices: Array<{ number: number; raw: string }> = [];
  for (let i = 0; i < markers.length; i += 1) {
    const start = markers[i].index + markers[i].length;
    const end = i + 1 < markers.length ? markers[i + 1].index : normalized.length;
    slices.push({
      number: markers[i].number,
      raw: normalized.slice(start, end).trim(),
    });
  }
  return slices;
}

function stripLeadingSectionLabel(number: number, text: string): string {
  const fixed = PROFILE_SYNTHESIS_SECTION_TITLES[number];
  if (!fixed || !text.trim()) {
    return text.trim();
  }

  let rest = text.trim();
  const zh = escapeRegExp(fixed.zh);
  const en = escapeRegExp(fixed.en);

  const linePatterns = [
    new RegExp(
      `^\\s*${number}\\.\\s*(?:\\*\\*)?\\s*${zh}[^(\\n]*(?:\\(${en}\\))?[^\\n]*\\n?`,
      "iu",
    ),
    new RegExp(`^\\s*\\*\\*\\s*${zh}[^\\n*]*\\*\\*\\s*\\n?`, "iu"),
    new RegExp(`^\\s*#{1,4}\\s*${number}\\.?\\s*${zh}[^\\n]*\\n?`, "iu"),
  ];

  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of linePatterns) {
      const next = rest.replace(pattern, "").trim();
      if (next !== rest) {
        rest = next;
        changed = true;
      }
    }
    const lines = rest.split("\n");
    const firstLine = lines[0]?.trim() ?? "";
    if (!firstLine) {
      rest = lines.slice(1).join("\n").trim();
      changed = true;
      continue;
    }
    const withoutNumber = firstLine.replace(/^\d+[.．、]\s*/, "");
    if (
      sectionTitleMatchesFixed(firstLine, fixed) ||
      sectionTitleMatchesFixed(withoutNumber, fixed)
    ) {
      rest = lines.slice(1).join("\n").trim();
      changed = true;
    }
  }

  return rest.trim();
}

/**
 * Conservative title detection — avoid splitting on colons inside long sentences.
 * Titles: **bold**, short "label：" / "label:", or a short first line followed by a blank line.
 */
function splitSectionHeading(rest: string): { heading: string; body: string } {
  const trimmed = rest.trim();
  if (!trimmed) {
    return { heading: "", body: "" };
  }

  const bold = trimmed.match(/^\*\*(.+?)\*\*\s*([\s\S]*)$/);
  if (bold) {
    return {
      heading: bold[1].trim(),
      body: (bold[2] ?? "").trim(),
    };
  }

  const lines = trimmed.split("\n");
  const firstLine = lines[0]?.trim() ?? "";

  if (lines.length >= 3 && firstLine.length > 0 && firstLine.length <= 64) {
    const secondLine = lines[1]?.trim() ?? "";
    if (secondLine === "") {
      return {
        heading: firstLine,
        body: lines.slice(2).join("\n").trim(),
      };
    }
  }

  const colonLabel = firstLine.match(/^(.{1,40}?)[：:]\s*(.*)$/u);
  if (colonLabel && colonLabel[1].trim().length <= 40) {
    const label = colonLabel[1].trim();
    const sameLineBody = colonLabel[2]?.trim() ?? "";
    const following = lines.slice(1).join("\n").trim();
    const body = [sameLineBody, following].filter(Boolean).join("\n\n");
    if (body.length > 0 || sameLineBody.length === 0) {
      return { heading: label, body };
    }
  }

  return { heading: "", body: trimmed };
}

function profileSynthesisSectionBody(number: number, rest: string): string {
  const trimmed = rest.trim();
  if (!trimmed) {
    return "";
  }

  const fixed = PROFILE_SYNTHESIS_SECTION_TITLES[number];
  let body = trimmed;

  if (fixed) {
    const parsed = splitSectionHeading(trimmed);
    if (parsed.heading && sectionTitleMatchesFixed(parsed.heading, fixed)) {
      body = parsed.body.trim() || trimmed;
    }
    // Keep full body when a leading **bold** line is a student name, not the section title.
    return stripLeadingSectionLabel(number, body);
  }

  const parsed = splitSectionHeading(trimmed);
  return stripLeadingSectionLabel(number, (parsed.body || trimmed).trim());
}

function parseProfileAnalysisSectionsLegacy(text: string): ProfileAnalysisSection[] {
  const normalized = normalizeProfileAnalysisSource(text);
  const chunks = normalized
    .split(/(?=^\d+\.(?!\d)\s+)/m)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const sections: ProfileAnalysisSection[] = [];

  for (const chunk of chunks) {
    const match = chunk.match(/^(\d+)\.\s+([\s\S]*)$/);
    if (!match) {
      continue;
    }

    const number = Number.parseInt(match[1], 10);
    const body = profileSynthesisSectionBody(number, match[2]);
    const fixedHeadings = fixedSectionHeadings(number);

    if (fixedHeadings.heading) {
      sections.push({
        number,
        ...fixedHeadings,
        body,
      });
      continue;
    }

    const inferred = splitSectionHeading(match[2]);
    sections.push({
      number,
      heading: inferred.heading,
      headingZh: inferred.heading,
      headingEn: "",
      body: body || inferred.body.trim(),
    });
  }

  return sections;
}

/** Split profile analysis; sections 1–5 use fixed bilingual titles. */
export function parseProfileAnalysisSections(text: string): ProfileAnalysisSection[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  const slices = locateProfileSectionSlices(trimmed);
  if (slices.length > 0) {
    return slices.map(({ number, raw }) => {
      const body = profileSynthesisSectionBody(number, raw);
      return {
        number,
        ...fixedSectionHeadings(number),
        body,
      };
    });
  }

  return parseProfileAnalysisSectionsLegacy(trimmed);
}

export function hasStructuredProfileAnalysisSections(text: string) {
  return parseProfileAnalysisSections(text).length >= 2;
}

/** Always five slots (1–5) for per-section editing in the UI. */
export function mergeProfileAnalysisSectionsForEdit(
  text: string,
): ProfileAnalysisSection[] {
  const parsed = parseProfileAnalysisSections(text);
  const byNumber = new Map(parsed.map((section) => [section.number, section]));

  return ([1, 2, 3, 4, 5] as const).map((number) => {
    const existing = byNumber.get(number);
    const headings = fixedSectionHeadings(number);
    if (existing) {
      return { ...existing, ...headings };
    }
    return {
      number,
      ...headings,
      body: "",
    };
  });
}

export function serializeProfileAnalysisSections(
  sections: ProfileAnalysisSection[],
): string {
  return sections
    .filter((section) => section.body.trim())
    .sort((a, b) => a.number - b.number)
    .map((section) => `${section.number}. ${section.body.trim()}`)
    .join("\n\n");
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

function parseJsonObjectLoose(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const slice = extractBalancedJsonObject(trimmed) ?? trimmed;
  try {
    const parsed = JSON.parse(slice) as unknown;
    return asRecord(parsed);
  } catch {
    return null;
  }
}

function asStringField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseBottleneckRow(raw: unknown): ProfileCognitiveBottleneck | null {
  const row = asRecord(raw);
  if (!row) {
    return null;
  }
  const student_name = asStringField(row.student_name);
  const bottleneck_description = asStringField(row.bottleneck_description);
  if (!student_name && !bottleneck_description) {
    return null;
  }
  return { student_name, bottleneck_description };
}

function parseTier2Row(raw: unknown): ProfileTier2Accommodation | null {
  const row = asRecord(raw);
  if (!row) {
    return null;
  }
  const student_name = asStringField(row.student_name);
  const cognitive_challenge = asStringField(row.cognitive_challenge);
  const solution_context = asStringField(row.solution_context);
  if (!student_name && !cognitive_challenge && !solution_context) {
    return null;
  }
  return { student_name, cognitive_challenge, solution_context };
}

function parseIndividualMgmtRow(
  raw: unknown,
): ProfileIndividualManagement | null {
  const row = asRecord(raw);
  if (!row) {
    return null;
  }
  const student_name = asStringField(row.student_name);
  const management_strategies = asStringField(row.management_strategies);
  if (!student_name && !management_strategies) {
    return null;
  }
  return { student_name, management_strategies };
}

export function looksLikeProfileSynthesisStructured(
  record: Record<string, unknown>,
): boolean {
  return (
    typeof record.class_profile_summary === "string" ||
    typeof record.goal_alignment === "string" ||
    Array.isArray(record.specific_cognitive_bottlenecks) ||
    asRecord(record.instructional_accommodations) !== null ||
    asRecord(record.behavioral_environmental_management) !== null
  );
}

/** Normalize arbitrary JSON / Dify object into the profile synthesis schema. */
export function parseProfileSynthesisStructured(
  value: unknown,
): ProfileSynthesisStructured | null {
  const record = asRecord(value);
  if (!record || !looksLikeProfileSynthesisStructured(record)) {
    return null;
  }

  const accommodations = asRecord(record.instructional_accommodations);
  const behavioral = asRecord(record.behavioral_environmental_management);

  const bottlenecks = Array.isArray(record.specific_cognitive_bottlenecks)
    ? record.specific_cognitive_bottlenecks
        .map(parseBottleneckRow)
        .filter((row): row is ProfileCognitiveBottleneck => row !== null)
    : [];

  const tier2 = Array.isArray(accommodations?.tier_2_targeted)
    ? accommodations.tier_2_targeted
        .map(parseTier2Row)
        .filter((row): row is ProfileTier2Accommodation => row !== null)
    : [];

  const individualManagement = Array.isArray(behavioral?.individual_management)
    ? behavioral.individual_management
        .map(parseIndividualMgmtRow)
        .filter((row): row is ProfileIndividualManagement => row !== null)
    : [];

  const structured: ProfileSynthesisStructured = {
    class_profile_summary: asStringField(record.class_profile_summary),
    goal_alignment: asStringField(record.goal_alignment),
    specific_cognitive_bottlenecks: bottlenecks,
    instructional_accommodations: {
      tier_1_whole_class: asStringField(accommodations?.tier_1_whole_class),
      tier_2_targeted: tier2,
    },
    behavioral_environmental_management: {
      whole_class_environment: asStringField(
        behavioral?.whole_class_environment,
      ),
      individual_management: individualManagement,
    },
  };

  const hasContent =
    structured.class_profile_summary.length > 0 ||
    structured.goal_alignment.length > 0 ||
    structured.specific_cognitive_bottlenecks.length > 0 ||
    structured.instructional_accommodations.tier_1_whole_class.length > 0 ||
    structured.instructional_accommodations.tier_2_targeted.length > 0 ||
    structured.behavioral_environmental_management.whole_class_environment
      .length > 0 ||
    structured.behavioral_environmental_management.individual_management
      .length > 0;

  return hasContent ? structured : null;
}

export function parseProfileSynthesisStructuredFromText(
  raw: string,
): ProfileSynthesisStructured | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const { answer } = splitChatThinkContent(trimmed);
  const visible = (answer || trimmed).trim();
  const json = parseJsonObjectLoose(visible);
  if (json) {
    return parseProfileSynthesisStructured(json);
  }
  return null;
}

function formatStudentBlock(
  studentName: string,
  lines: Array<{ label: string; text: string }>,
): string {
  const parts: string[] = [];
  if (studentName.trim()) {
    parts.push(`**${studentName.trim()}**`);
  }
  for (const line of lines) {
    if (!line.text.trim()) {
      continue;
    }
    parts.push(`*${line.label}*\n\n${line.text.trim()}`);
  }
  return parts.join("\n\n");
}

/** Flatten structured JSON into five editable / display sections. */
export function profileSynthesisStructuredToSections(
  data: ProfileSynthesisStructured,
): ProfileAnalysisSection[] {
  const section3 =
    data.specific_cognitive_bottlenecks.length === 0
      ? ""
      : data.specific_cognitive_bottlenecks
          .map((row) =>
            formatStudentBlock(row.student_name, [
              { label: "Bottleneck / 認知瓶頸", text: row.bottleneck_description },
            ]),
          )
          .join("\n\n---\n\n");

  const tier1 = data.instructional_accommodations.tier_1_whole_class;
  const tier2Blocks = data.instructional_accommodations.tier_2_targeted
    .map((row) =>
      formatStudentBlock(row.student_name, [
        {
          label: "Cognitive challenge / 認知挑戰",
          text: row.cognitive_challenge,
        },
        { label: "Solution / 調適方案", text: row.solution_context },
      ]),
    )
    .filter(Boolean)
    .join("\n\n---\n\n");
  const section4 = [
    tier1.trim() ? `*Tier 1 — whole class / 第一層全班*\n\n${tier1.trim()}` : "",
    tier2Blocks.trim()
      ? `*Tier 2 — targeted / 第二層個別*\n\n${tier2Blocks.trim()}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n---\n\n");

  const whole = data.behavioral_environmental_management.whole_class_environment;
  const indBlocks =
    data.behavioral_environmental_management.individual_management
      .map((row) =>
        formatStudentBlock(row.student_name, [
          {
            label: "Strategies / 管理策略",
            text: row.management_strategies,
          },
        ]),
      )
      .filter(Boolean)
      .join("\n\n---\n\n");
  const section5 = [
    whole.trim()
      ? `*Whole-class environment / 全班環境*\n\n${whole.trim()}`
      : "",
    indBlocks.trim()
      ? `*Individual management / 個別管理*\n\n${indBlocks.trim()}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n---\n\n");

  return ([1, 2, 3, 4, 5] as const).map((number) => {
    const bodyByNumber: Record<number, string> = {
      1: data.class_profile_summary,
      2: data.goal_alignment,
      3: section3,
      4: section4,
      5: section5,
    };
    return {
      number,
      ...fixedSectionHeadings(number),
      body: bodyByNumber[number] ?? "",
    };
  });
}

export function profileSynthesisStructuredToDisplayText(
  data: ProfileSynthesisStructured,
): string {
  return serializeProfileAnalysisSections(
    profileSynthesisStructuredToSections(data),
  );
}

function extractStructuredFromOutputs(
  outputs: Record<string, unknown>,
): ProfileSynthesisStructured | null {
  if (looksLikeProfileSynthesisStructured(outputs)) {
    return parseProfileSynthesisStructured(outputs);
  }

  const structuredOutput = asRecord(outputs.structured_output);
  if (structuredOutput) {
    const parsed = parseProfileSynthesisStructured(structuredOutput);
    if (parsed) {
      return parsed;
    }
  }

  for (const key of [
    "result",
    "output",
    "profile_synthesis",
    "profile_analysis",
  ]) {
    const nested = asRecord(outputs[key]);
    if (nested && looksLikeProfileSynthesisStructured(nested)) {
      const parsed = parseProfileSynthesisStructured(nested);
      if (parsed) {
        return parsed;
      }
    }
  }

  const stringCandidates: string[] = [];
  for (const value of Object.values(outputs)) {
    if (typeof value === "string" && value.trim().length > 0) {
      stringCandidates.push(value);
    }
  }
  stringCandidates.sort((a, b) => b.length - a.length);
  for (const candidate of stringCandidates) {
    const parsed = parseProfileSynthesisStructuredFromText(candidate);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

/** Drop model think/reasoning blocks; normalize spacing for UI and lesson prefill. */
export function formatProfileAnalysisText(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }
  const { answer } = splitChatThinkContent(trimmed);
  const visible = (answer || trimmed).trim();
  return formatChatDisplayText(visible);
}

export function parseProfileSynthesizerOutputs(
  outputs: Record<string, unknown>,
): ProfileSynthesizerResult {
  const structured = extractStructuredFromOutputs(outputs);

  const nested = asRecord(outputs.result) ?? asRecord(outputs.output);
  const text =
    pickString(
      outputs.profile_analysis,
      outputs.pedagogical_constraints,
      outputs.pedagogical_constraints_summary,
      outputs.profile_synthesis,
      outputs.synthesis,
      outputs.summary,
      outputs.text,
      outputs.result,
      nested?.profile_analysis,
      nested?.pedagogical_constraints,
      nested?.profile_synthesis,
      nested?.text,
    ) ||
    (() => {
      for (const value of Object.values(outputs)) {
        if (typeof value === "string" && value.trim().length > 80) {
          return value.trim();
        }
      }
      return "";
    })();

  const pedagogicalConstraints = structured
    ? profileSynthesisStructuredToDisplayText(structured)
    : formatProfileAnalysisText(text);

  return {
    pedagogicalConstraints,
    structured,
    raw: outputs,
  };
}
