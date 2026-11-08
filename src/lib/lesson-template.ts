import {
  deriveLearnerProfileTag,
  type StudentLookup,
  type WorkflowDraft,
} from "@/lib/workflow-draft";

export type LessonSection = {
  title: string;
  body: string;
};

const SECTION_ALIASES: Record<string, string> = {
  topic: "Topic",
  課題: "Topic",
  主題: "Topic",
  "learning objectives": "Learning Objectives",
  學習目標: "Learning Objectives",
  目標: "Learning Objectives",
  "spld / ad/hd accommodations": "SpLD / AD/HD Accommodations",
  "spld accommodations": "SpLD / AD/HD Accommodations",
  調適: "SpLD / AD/HD Accommodations",
  "step-by-step activities": "Step-by-Step Activities",
  activities: "Step-by-Step Activities",
  活動: "Step-by-Step Activities",
  assessment: "Assessment",
  評估: "Assessment",
};

export function normalizeSectionTitle(title: string) {
  const key = title.trim().toLowerCase();
  return SECTION_ALIASES[key] ?? title.trim();
}

export function parseLessonSections(markdown: string): LessonSection[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const sections: LessonSection[] = [];
  let current: LessonSection | null = null;

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      if (current) {
        current.body = current.body.trim();
        sections.push(current);
      }
      current = {
        title: normalizeSectionTitle(heading[1] ?? ""),
        body: "",
      };
      continue;
    }
    if (!current) {
      current = { title: "Lesson plan", body: "" };
    }
    current.body += `${line}\n`;
  }

  if (current) {
    current.body = current.body.trim();
    sections.push(current);
  }

  return sections.filter((section) => section.title || section.body);
}

export function serializeLessonSections(sections: LessonSection[]) {
  return sections
    .map((section) => `## ${section.title}\n\n${section.body.trim()}`.trim())
    .join("\n\n");
}

export function buildLocalLessonPlan(
  draft: WorkflowDraft,
  findStudent: StudentLookup = () => null,
) {
  const tag = deriveLearnerProfileTag(draft.learner);
  const selected = draft.learner.studentIds
    .map((id) => findStudent(draft.learner.classId, id))
    .filter((student) => student !== null);
  const audience =
    selected.length === 1
      ? selected[0]!.name
      : selected.length > 1
        ? `Class ${draft.learner.classId || "1"} · ${selected.length} students`
        : `Class ${draft.learner.classId || "1"}`;
  const topic = draft.lesson.topic.trim() || "Primary 1 maths";
  const duration = draft.lesson.durationMinutes || "40";
  const scope = draft.footprint.scope.trim() || topic;
  const visuals =
    draft.footprint.visualModels.trim() || "Concrete objects → pictures → symbols (CPA)";
  const formats =
    "Oral rehearsal, matching, short written items (refine in Step 4 worksheets)";
  const notes =
    draft.learner.classProfile.trim() ||
    draft.lesson.learnerNotes.trim() ||
    "Keep language short; one instruction at a time.";

  return `## Topic

${topic} · Primary 1 · ${duration} minutes
Audience: ${audience}
Focus tag: ${tag}

## Learning Objectives

- Name and work with the scoped content: ${scope}
- Move from concrete materials to pictorial models, then to written symbols
- Complete short, low-language practice in these formats: ${formats}

## SpLD / AD/HD Accommodations

- Large, uncluttered layout; extra white space between items
- Pair every numeral with a visual model (${visuals})
- Give one-step instructions and a visible routine
- Allow oral responses before writing
- Learner notes: ${notes}

## Step-by-Step Activities

### Concrete
Use manipulatives (counters, ten-frames, or classroom objects) to act out the scoped idea. Keep groups small and model once, then invite the target learner to try.

### Pictorial
Draw or display the same idea with ${visuals}. Students point, match, or colour rather than copy long sentences.

### Abstract
Record 3–4 short number sentences or fill-in items. Read them aloud first. Stop after each item.

## Assessment

- Observe whether the learner can show the idea with objects, then a picture
- One oral check and two written items using ${formats}
- Note fatigue, impulsivity, and which representation helped most
`;
}
