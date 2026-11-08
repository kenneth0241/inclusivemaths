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

export type ProfileSynthesizerResult = {
  pedagogicalConstraints: string;
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
    } else if (parsed.body.trim()) {
      body = parsed.body.trim();
    }
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

  return {
    pedagogicalConstraints: formatProfileAnalysisText(text),
    raw: outputs,
  };
}
