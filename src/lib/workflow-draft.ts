import {
  CLASS_FOCUS_OPTIONS,
  DEFAULT_LESSON_PLAN_FORM,
  LESSON_PLAN_DRAFT_KEY,
  type LessonPlanFormValues,
} from "@/lib/lesson-plan";
import type { SenTag } from "@/lib/learner-roster";
import {
  parseProfileSynthesisStructured,
  type ProfileSynthesisStructured,
} from "@/lib/profile-synthesizer";
import {
  DEFAULT_GAME_PARAMETERS,
  normalizeGameParameters,
  type GameParameters,
} from "@/lib/game-parameters";
import { normalizeGameTargetStudentIds } from "@/lib/game-targets";
import {
  normalizeLearnerGames,
  type LearnerGamesMap,
} from "@/lib/game-learner-state";
import {
  formatAppliedModesList,
  normalizePedagogyAppliedModes,
  type PedagogyAppliedModeEntry,
} from "@/lib/pedagogy-applied-modes";
import {
  formatIepForWorkflow,
  type StudentRecord,
} from "@/lib/student-record";

export const WORKFLOW_DRAFT_KEY = "inclusive-maths-workflow-draft";

export type ContentFootprint = {
  /** Dify topic_summary — confirmed before Step 2. */
  topicSummary: string;
  scope: string;
  visualModels: string;
  edited: {
    topicSummary: boolean;
    scope: boolean;
    visualModels: boolean;
  };
};

export type LearnerProfile = {
  classId: string;
  studentIds: string[];
  senTags: SenTag[];
  classProfile: string;
  /** Profile Synthesizer (Dify) — pedagogical constraints summary. */
  pedagogicalSynthesis: string;
  /** Step 2 — Dify structured JSON when the workflow returns schema output. */
  profileSynthesisStructured: ProfileSynthesisStructured | null;
};

export type WorkflowLesson = LessonPlanFormValues & {
  markdown: string;
};

export type WorkflowAssets = {
  worksheetMarkdown: string;
  /** Legacy single-game HTML; mirrored from first target when present. */
  gameHtml: string;
  gameParameters: GameParameters;
  /** Subset of Step 2 `learner.studentIds` targeted by the Step 4 game. */
  gameTargetStudentIds: string[];
  /** Per-student game HTML, Dify chat, and preview state. */
  learnerGames: LearnerGamesMap;
};

export type { GameLearnerSlot, GameChatMessage, LearnerGamesMap } from "@/lib/game-learner-state";

export type { GameParameters };

/** Step 3 — Dify `part_1_udl` (class-wide UDL). */
export type PedagogyUdlPart = {
  educationalTheoryZh: string;
  educationalTheoryEn: string;
  learningStrategiesZh: string;
  learningStrategiesEn: string;
};

export type { PedagogyAppliedModeEntry };

/** Step 3 — one row from `part_2_individualized`. */
export type PedagogyIndividualizedRow = {
  studentProfile: string;
  educationalTheoryZh: string;
  educationalTheoryEn: string;
  learningStrategiesZh: string;
  learningStrategiesEn: string;
  appliedModes: PedagogyAppliedModeEntry[];
};

/** Step 3 — pedagogical strategy chat outputs. */
export type PedagogicalStrategyState = {
  conversationId: string;
  /** Flattened UDL theory (zh + en) for lesson prefill / legacy. */
  educationalTheory: string;
  /** Class-wide UDL strategies (part_1), not per-student rows. */
  learningStrategies: string;
  udl: PedagogyUdlPart | null;
  individualized: PedagogyIndividualizedRow[];
  /** Skips re-running Dify workflow when Step 1–2 inputs are unchanged. */
  lastInputFingerprint: string;
};

export type WorkflowDraft = {
  footprint: ContentFootprint;
  learner: LearnerProfile;
  pedagogy: PedagogicalStrategyState;
  lesson: WorkflowLesson;
  assets: WorkflowAssets;
};

const EXAMPLE_FOOTPRINT_VALUES: Record<FootprintField, string> = {
  scope: "單元 2 · 20以內 · 數的分和合",
};

function normalizeFootprintValue(field: FootprintField, value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === EXAMPLE_FOOTPRINT_VALUES[field]) {
    return "";
  }
  return value;
}

export const DEFAULT_CONTENT_FOOTPRINT: ContentFootprint = {
  topicSummary: "",
  scope: "",
  visualModels: "",
  edited: {
    topicSummary: false,
    scope: false,
    visualModels: false,
  },
};

export const DEFAULT_LEARNER_PROFILE: LearnerProfile = {
  classId: "",
  studentIds: [],
  senTags: [],
  classProfile: "",
  pedagogicalSynthesis: "",
  profileSynthesisStructured: null,
};

export const DEFAULT_PEDAGOGY_STRATEGY: PedagogicalStrategyState = {
  conversationId: "",
  educationalTheory: "",
  learningStrategies: "",
  udl: null,
  individualized: [],
  lastInputFingerprint: "",
};

export const DEFAULT_WORKFLOW_DRAFT: WorkflowDraft = {
  footprint: DEFAULT_CONTENT_FOOTPRINT,
  learner: DEFAULT_LEARNER_PROFILE,
  pedagogy: DEFAULT_PEDAGOGY_STRATEGY,
  lesson: {
    ...DEFAULT_LESSON_PLAN_FORM,
    markdown: "",
  },
  assets: {
    worksheetMarkdown: "",
    gameHtml: "",
    gameParameters: { ...DEFAULT_GAME_PARAMETERS },
    gameTargetStudentIds: [],
    learnerGames: {},
  },
};

/** Step 1 footprint fields teachers can lock (visual models live in Step 4). */
export type FootprintField = "scope";

export function isFootprintReady(footprint: ContentFootprint) {
  return footprint.scope.trim().length > 0;
}

export function isStudioContextReady(footprint: ContentFootprint) {
  return (
    footprint.topicSummary.trim().length > 0 &&
    isFootprintReady(footprint)
  );
}

export type StudioContextConfirmValues = Pick<
  ContentFootprint,
  "topicSummary" | "scope"
>;

export function isLearnerReady(learner: LearnerProfile) {
  return (
    learner.classId.trim().length > 0 && learner.studentIds.length > 0
  );
}

export function isProfileSynthesisReady(learner: LearnerProfile) {
  return learner.pedagogicalSynthesis.trim().length > 0;
}

/** Step 2 complete: class + students + Profile Synthesizer run. */
export function isLearnerStepComplete(learner: LearnerProfile) {
  return isLearnerReady(learner) && isProfileSynthesisReady(learner);
}

export function learnerAudienceLabel(
  learner: LearnerProfile,
  classSize: number,
) {
  if (learner.studentIds.length === 0) {
    return "";
  }
  if (classSize > 0 && learner.studentIds.length === classSize) {
    return "whole_class";
  }
  return learner.studentIds.join(",");
}

export function isLessonReady(lesson: WorkflowLesson) {
  return lesson.markdown.trim().length > 0;
}

export function deriveLearnerProfileTag(learner: LearnerProfile) {
  const tags = new Set(learner.senTags);
  if (tags.has("mixed") || (tags.has("spld") && tags.has("adhd"))) {
    return "mixed";
  }
  if (tags.has("adhd")) {
    return "adhd";
  }
  if (tags.has("spld")) {
    return "spld";
  }
  return "whole_class";
}

export function classFocusFromTag(tag: string) {
  if (tag === "spld") {
    return "spld_dyslexia_reading";
  }
  if (tag === "adhd") {
    return "spld_other";
  }
  if (tag === "mixed") {
    return "small_group";
  }
  return CLASS_FOCUS_OPTIONS[0].value;
}

function summarizeScope(scope: string) {
  const first = scope
    .split(/\n|·/)
    .map((part) => part.trim())
    .find(Boolean);
  return first ?? "";
}

export type StudentLookup = (
  classId?: string,
  studentId?: string,
) => StudentRecord | null;

export function prefillLessonFromStudio(
  draft: WorkflowDraft,
  findStudent: StudentLookup = () => null,
): WorkflowDraft {
  const tag = deriveLearnerProfileTag(draft.learner);
  const selectedStudents = draft.learner.studentIds
    .map((id) => findStudent(draft.learner.classId, id))
    .filter((student): student is StudentRecord => student !== null);
  const topic =
    draft.lesson.topic.trim() ||
    draft.footprint.topicSummary.trim() ||
    summarizeScope(draft.footprint.scope);
  const learnerNotes = [
    draft.learner.pedagogicalSynthesis.trim()
      ? `Pedagogical constraints (Profile Synthesizer):\n${draft.learner.pedagogicalSynthesis.trim()}`
      : "",
    selectedStudents.length > 0
      ? selectedStudents.map((s) => formatIepForWorkflow(s)).join("\n\n---\n\n")
      : `Class ${draft.learner.classId || ""}`.trim(),
    draft.learner.classProfile.trim(),
  ]
    .filter(Boolean)
    .join("\n\n");
  const requirements = [
    draft.footprint.topicSummary.trim()
      ? `Topic summary:\n${draft.footprint.topicSummary.trim()}`
      : "",
    `Scope & constraints:\n${draft.footprint.scope.trim()}`,
    draft.pedagogy.educationalTheory.trim()
      ? `Educational theory (Step 3):\n${draft.pedagogy.educationalTheory.trim()}`
      : "",
    draft.pedagogy.learningStrategies.trim()
      ? `Learning strategies (Step 3 — UDL):\n${draft.pedagogy.learningStrategies.trim()}`
      : "",
    draft.pedagogy.individualized.length
      ? `Individualized adjustments (Step 3):\n${draft.pedagogy.individualized
          .map(
            (row) =>
              `- ${row.studentProfile}: ${formatAppliedModesList(row.appliedModes) || "custom support"}`,
          )
          .join("\n")}`
      : "",
    "Apply Bruner's Concrete–Pictorial–Abstract sequence and SpLD / AD/HD-friendly pacing.",
    "Exercise formats: decide when designing worksheets in Step 4.",
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    ...draft,
    lesson: {
      ...draft.lesson,
      topic,
      classFocus: classFocusFromTag(tag),
      learnerNotes,
      requirements,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function parseFootprint(raw: unknown): ContentFootprint {
  if (!isRecord(raw)) {
    return DEFAULT_CONTENT_FOOTPRINT;
  }
  const edited = isRecord(raw.edited) ? raw.edited : {};
  return {
    topicSummary: asString(raw.topicSummary),
    scope: normalizeFootprintValue("scope", asString(raw.scope)),
    visualModels: "",
    edited: {
      topicSummary: Boolean(edited.topicSummary),
      scope: Boolean(edited.scope),
      visualModels: Boolean(edited.visualModels),
    },
  };
}

export function applyConfirmedStudioContext(
  draft: WorkflowDraft,
  values: StudioContextConfirmValues,
): WorkflowDraft {
  const topicSummary = values.topicSummary.trim();
  const scope = values.scope.trim();
  return {
    ...draft,
    footprint: {
      topicSummary,
      scope,
      visualModels: "",
      edited: {
        topicSummary: topicSummary.length > 0,
        scope: scope.length > 0,
        visualModels: false,
      },
    },
    lesson: {
      ...draft.lesson,
      topic: draft.lesson.topic.trim() || topicSummary || summarizeScope(scope),
    },
  };
}

function parseLearner(raw: unknown): LearnerProfile {
  if (!isRecord(raw)) {
    return DEFAULT_LEARNER_PROFILE;
  }
  const senTags = Array.isArray(raw.senTags)
    ? raw.senTags.filter(
        (tag): tag is SenTag =>
          tag === "spld" || tag === "adhd" || tag === "mixed",
      )
    : [];
  let studentIds: string[] = [];
  if (Array.isArray(raw.studentIds)) {
    studentIds = raw.studentIds.filter(
      (id): id is string => typeof id === "string" && id.trim().length > 0,
    );
  } else if (raw.audience === "student") {
    const legacyId = asString(raw.studentId).trim();
    if (legacyId) {
      studentIds = [legacyId];
    }
  }
  const profileSynthesisStructured = parseProfileSynthesisStructured(
    raw.profileSynthesisStructured,
  );

  return {
    classId: asString(raw.classId),
    studentIds,
    senTags,
    classProfile: asString(raw.classProfile),
    pedagogicalSynthesis: asString(raw.pedagogicalSynthesis),
    profileSynthesisStructured,
  };
}

function parsePedagogyUdl(raw: unknown): PedagogyUdlPart | null {
  if (!isRecord(raw)) {
    return null;
  }
  const part: PedagogyUdlPart = {
    educationalTheoryZh: asString(raw.educationalTheoryZh),
    educationalTheoryEn: asString(raw.educationalTheoryEn),
    learningStrategiesZh: asString(raw.learningStrategiesZh),
    learningStrategiesEn: asString(raw.learningStrategiesEn),
  };
  const hasContent = Object.values(part).some((value) => value.trim().length > 0);
  return hasContent ? part : null;
}

function parsePedagogyIndividualized(raw: unknown): PedagogyIndividualizedRow[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item): PedagogyIndividualizedRow | null => {
      if (!isRecord(item)) {
        return null;
      }
      const appliedModes = normalizePedagogyAppliedModes(item.appliedModes);
      const row: PedagogyIndividualizedRow = {
        studentProfile: asString(item.studentProfile),
        educationalTheoryZh: asString(item.educationalTheoryZh),
        educationalTheoryEn: asString(item.educationalTheoryEn),
        learningStrategiesZh: asString(item.learningStrategiesZh),
        learningStrategiesEn: asString(item.learningStrategiesEn),
        appliedModes,
      };
      const hasContent =
        row.studentProfile.trim().length > 0 ||
        Object.values(row).some(
          (value) =>
            typeof value === "string" && value.trim().length > 0,
        );
      return hasContent ? row : null;
    })
    .filter((row): row is PedagogyIndividualizedRow => row !== null);
}

function parsePedagogy(raw: unknown): PedagogicalStrategyState {
  if (!isRecord(raw)) {
    return DEFAULT_PEDAGOGY_STRATEGY;
  }
  return {
    conversationId: asString(raw.conversationId),
    educationalTheory: asString(raw.educationalTheory),
    learningStrategies: asString(raw.learningStrategies),
    udl: parsePedagogyUdl(raw.udl),
    individualized: parsePedagogyIndividualized(raw.individualized),
    lastInputFingerprint: asString(raw.lastInputFingerprint),
  };
}

function parseLesson(raw: unknown): WorkflowLesson {
  if (!isRecord(raw)) {
    return { ...DEFAULT_LESSON_PLAN_FORM, markdown: "" };
  }
  return {
    topic: asString(raw.topic),
    classFocus: asString(raw.classFocus, DEFAULT_LESSON_PLAN_FORM.classFocus),
    learnerNotes: asString(raw.learnerNotes),
    durationMinutes: asString(
      raw.durationMinutes,
      DEFAULT_LESSON_PLAN_FORM.durationMinutes,
    ),
    requirements: asString(raw.requirements),
    markdown: asString(raw.markdown),
  };
}

export function parseWorkflowDraft(raw: unknown): WorkflowDraft {
  if (!isRecord(raw)) {
    return DEFAULT_WORKFLOW_DRAFT;
  }
  const assets = isRecord(raw.assets) ? raw.assets : {};
  const learner = parseLearner(raw.learner);
  const gameTargetStudentIds = normalizeGameTargetStudentIds(
    "gameTargetStudentIds" in assets
      ? assets.gameTargetStudentIds
      : undefined,
    learner.studentIds,
  );
  const legacyGameHtml = asString(assets.gameHtml);
  const learnerGames = normalizeLearnerGames(
    assets.learnerGames,
    gameTargetStudentIds,
    legacyGameHtml,
  );
  const firstHtml =
    gameTargetStudentIds.length > 0
      ? learnerGames[gameTargetStudentIds[0]!]?.html ?? legacyGameHtml
      : legacyGameHtml;
  return {
    footprint: parseFootprint(raw.footprint),
    learner,
    pedagogy: parsePedagogy(raw.pedagogy),
    lesson: parseLesson(raw.lesson),
    assets: {
      worksheetMarkdown: asString(assets.worksheetMarkdown),
      gameHtml: firstHtml || legacyGameHtml,
      gameParameters: normalizeGameParameters(assets.gameParameters),
      gameTargetStudentIds,
      learnerGames,
    },
  };
}

export function loadWorkflowDraft(): WorkflowDraft {
  if (typeof window === "undefined") {
    return DEFAULT_WORKFLOW_DRAFT;
  }
  try {
    const raw = sessionStorage.getItem(WORKFLOW_DRAFT_KEY);
    if (!raw) {
      return DEFAULT_WORKFLOW_DRAFT;
    }
    return parseWorkflowDraft(JSON.parse(raw) as unknown);
  } catch {
    return DEFAULT_WORKFLOW_DRAFT;
  }
}

export function saveWorkflowDraft(draft: WorkflowDraft) {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(WORKFLOW_DRAFT_KEY, JSON.stringify(draft));
  const lessonForm: LessonPlanFormValues = {
    topic: draft.lesson.topic,
    classFocus: draft.lesson.classFocus,
    learnerNotes: draft.lesson.learnerNotes,
    durationMinutes: draft.lesson.durationMinutes,
    requirements: draft.lesson.requirements,
  };
  sessionStorage.setItem(LESSON_PLAN_DRAFT_KEY, JSON.stringify(lessonForm));
}

/** Empty scope / visual models when opening Step 1 chat (topic summary unchanged). */
export function withClearedChatFootprintFields(draft: WorkflowDraft): WorkflowDraft {
  return {
    ...draft,
    footprint: {
      ...draft.footprint,
      scope: "",
      visualModels: "",
      edited: {
        ...draft.footprint.edited,
        scope: false,
        visualModels: false,
      },
    },
  };
}

export function mergeExtractedFootprint(
  current: ContentFootprint,
  incoming: { scope: string },
) {
  const next: ContentFootprint = {
    ...current,
    edited: { ...current.edited },
  };

  if (!current.edited.scope) {
    const extracted = incoming.scope.trim();
    if (extracted) {
      next.scope = extracted;
    }
  }

  return next;
}
