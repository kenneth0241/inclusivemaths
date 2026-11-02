export const LESSON_PLAN_DRAFT_KEY = "inclusive-maths-lesson-plan-draft";
export const LESSON_PLAN_CONVERSATION_KEY =
  "inclusive-maths-lesson-plan-conversation-id";

/** Pilot scope: Primary 1 only. Still sent to Dify as `inputs.grade`. */
export const LESSON_GRADE = "1" as const;

export const CLASS_FOCUS_OPTIONS = [
  { value: "whole_class", label: "Whole class" },
  {
    value: "spld_dyslexia_reading",
    label: "SpLD — dyslexia / reading difficulties",
  },
  { value: "spld_other", label: "SpLD — other" },
  { value: "small_group", label: "Small group remediation" },
] as const;

export const DURATION_OPTIONS = [
  { value: "30", label: "30 minutes" },
  { value: "40", label: "40 minutes" },
  { value: "60", label: "60 minutes" },
] as const;

export type LessonPlanFormValues = {
  topic: string;
  classFocus: string;
  learnerNotes: string;
  durationMinutes: string;
  requirements: string;
};

export const DEFAULT_LESSON_PLAN_FORM: LessonPlanFormValues = {
  topic: "",
  classFocus: CLASS_FOCUS_OPTIONS[0].value,
  learnerNotes: "",
  durationMinutes: DURATION_OPTIONS[1].value,
  requirements: "",
};

export type LessonPlanDifyExtras = {
  contentScope?: string;
  visualModels?: string;
  exerciseFormats?: string;
  classId?: string;
  audience?: string;
  learnerProfileTag?: string;
  classProfile?: string;
};

export function formValuesToDifyInputs(
  values: LessonPlanFormValues,
  extras: LessonPlanDifyExtras = {},
) {
  return {
    grade: LESSON_GRADE,
    topic: values.topic.trim(),
    class_focus: values.classFocus,
    learner_notes: values.learnerNotes.trim(),
    duration_minutes: values.durationMinutes,
    requirements: values.requirements.trim(),
    subject: "maths",
    content_scope: extras.contentScope?.trim() ?? "",
    visual_models: extras.visualModels?.trim() ?? "",
    exercise_formats: extras.exerciseFormats?.trim() ?? "",
    class_id: extras.classId?.trim() ?? "",
    audience: extras.audience?.trim() ?? "",
    learner_profile_tag: extras.learnerProfileTag?.trim() ?? "",
    class_profile: extras.classProfile?.trim() ?? "",
  };
}

export type LessonPlanCitation = {
  document_name?: string;
  dataset_name?: string;
  content?: string;
};
