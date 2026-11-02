import {
  CLASS_FOCUS_OPTIONS,
  DEFAULT_LESSON_PLAN_FORM,
  LESSON_PLAN_DRAFT_KEY,
  type LessonPlanFormValues,
} from "@/lib/lesson-plan";
import type { SenTag } from "@/lib/learner-roster";
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

export type LearnerAudience = "whole_class" | "student";

export type LearnerProfile = {
  classId: string;
  audience: LearnerAudience;
  studentId?: string;
  senTags: SenTag[];
  classProfile: string;
};

export type WorkflowLesson = LessonPlanFormValues & {
  markdown: string;
};

export type WorkflowAssets = {
  worksheetMarkdown: string;
  gameHtml: string;
};

export type WorkflowDraft = {
  footprint: ContentFootprint;
  learner: LearnerProfile;
  lesson: WorkflowLesson;
  assets: WorkflowAssets;
};

const EXAMPLE_FOOTPRINT_VALUES: Record<FootprintField, string> = {
  scope: "單元 2 · 20以內 · 數的分和合",
  visualModels: "十格陣 · 數線 · 實物",
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
  audience: "whole_class",
  studentId: undefined,
  senTags: [],
  classProfile: "",
};

export const DEFAULT_WORKFLOW_DRAFT: WorkflowDraft = {
  footprint: DEFAULT_CONTENT_FOOTPRINT,
  learner: DEFAULT_LEARNER_PROFILE,
  lesson: {
    ...DEFAULT_LESSON_PLAN_FORM,
    markdown: "",
  },
  assets: {
    worksheetMarkdown: "",
    gameHtml: "",
  },
};

export type FootprintField = "scope" | "visualModels";

export function isFootprintReady(footprint: ContentFootprint) {
  return (
    footprint.scope.trim().length > 0 &&
    footprint.visualModels.trim().length > 0
  );
}

export function isStudioContextReady(footprint: ContentFootprint) {
  return (
    footprint.topicSummary.trim().length > 0 &&
    isFootprintReady(footprint)
  );
}

export type StudioContextConfirmValues = Pick<
  ContentFootprint,
  "topicSummary" | "scope" | "visualModels"
>;

export function isLearnerReady(learner: LearnerProfile) {
  if (!learner.classId.trim()) {
    return false;
  }
  if (learner.audience === "student") {
    return Boolean(learner.studentId?.trim());
  }
  return true;
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
  const student = findStudent(draft.learner.classId, draft.learner.studentId);
  const topic =
    draft.lesson.topic.trim() ||
    draft.footprint.topicSummary.trim() ||
    summarizeScope(draft.footprint.scope);
  const learnerNotes = [
    student
      ? formatIepForWorkflow(student)
      : `Whole class ${draft.learner.classId || ""}`.trim(),
    draft.learner.classProfile.trim(),
  ]
    .filter(Boolean)
    .join("\n\n");
  const requirements = [
    draft.footprint.topicSummary.trim()
      ? `Topic summary:\n${draft.footprint.topicSummary.trim()}`
      : "",
    `Scope & constraints:\n${draft.footprint.scope.trim()}`,
    `Visual models:\n${draft.footprint.visualModels.trim()}`,
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
    visualModels: normalizeFootprintValue(
      "visualModels",
      asString(raw.visualModels),
    ),
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
  const visualModels = values.visualModels.trim();
  return {
    ...draft,
    footprint: {
      topicSummary,
      scope,
      visualModels,
      edited: {
        topicSummary: topicSummary.length > 0,
        scope: scope.length > 0,
        visualModels: visualModels.length > 0,
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
  const audience: LearnerAudience =
    raw.audience === "student" ? "student" : "whole_class";
  return {
    classId: asString(raw.classId),
    audience,
    studentId: asString(raw.studentId) || undefined,
    senTags,
    classProfile: asString(raw.classProfile),
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
  return {
    footprint: parseFootprint(raw.footprint),
    learner: parseLearner(raw.learner),
    lesson: parseLesson(raw.lesson),
    assets: {
      worksheetMarkdown: asString(assets.worksheetMarkdown),
      gameHtml: asString(assets.gameHtml),
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

export function mergeExtractedFootprint(
  current: ContentFootprint,
  incoming: Pick<ContentFootprint, FootprintField>,
) {
  const next: ContentFootprint = {
    ...current,
    edited: { ...current.edited },
  };

  (["scope", "visualModels"] as const).forEach((field) => {
    if (current.edited[field]) {
      return;
    }
    const extracted = incoming[field].trim();
    if (!extracted) {
      return;
    }
    next[field] = extracted;
  });

  return next;
}
