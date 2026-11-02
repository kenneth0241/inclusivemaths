import type { Metadata } from "next";
import LessonPlanPanel from "../../components/LessonPlanPanel";
import WorkflowShell from "../../components/WorkflowShell";

export const metadata: Metadata = {
  title: "Lesson plan · Inclusive Maths",
  description:
    "Generate Primary Grade 1 lesson plans from the Content Footprint and learner profile.",
};

export default function LessonPlanPage() {
  return (
    <WorkflowShell
      step={3}
      kicker="Step 3 · 教案"
      title="Pedagogical lesson plan"
      description="The form is prefilled from Steps 1 and 2. Generate a structured plan, edit each section, then continue to worksheets and games."
      proceedLabel="Proceed to worksheets & games"
    >
      <LessonPlanPanel />
    </WorkflowShell>
  );
}
