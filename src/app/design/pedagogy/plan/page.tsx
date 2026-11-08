import type { Metadata } from "next";
import LessonPlanPanel from "../../../components/LessonPlanPanel";
import WorkflowShell from "../../../components/WorkflowShell";

export const metadata: Metadata = {
  title: "Lesson plan · Inclusive Maths",
  description:
    "Generate Primary Grade 1 lesson plans from the Content Footprint and learner profile.",
};

export default function LessonPlanBuildPage() {
  return (
    <WorkflowShell
      step={3}
      wide
      kicker="Step 3 · 教案"
      kickerEn="Lesson plan"
      title="Pedagogical lesson plan"
      titleEn="制定共融教案"
      description="The form is prefilled from Steps 1 and 2. Generate a structured plan, edit each section, then continue to worksheets and games."
      descriptionEn="表單已從前三步脈絡預填。生成後可編輯各段，再前往教材。"
      proceedLabel="前往教材"
      proceedLabelEn="Proceed to worksheets & games"
    >
      <LessonPlanPanel />
    </WorkflowShell>
  );
}
