import type { Metadata } from "next";
import LearnerProfileStudio from "../../components/LearnerProfileStudio";
import WorkflowShell from "../../components/WorkflowShell";

export const metadata: Metadata = {
  title: "Learner profile · Inclusive Maths",
  description:
    "Select a Primary 1 class or student and add class-profile notes for inclusive lesson design.",
};

export default function LearnerProfilePage() {
  return (
    <WorkflowShell
      step={2}
      wide
      kicker="Step 2 · 學習者檔案"
      title="Who is this lesson for?"
      description="Choose a class, then whole class or a specific student. Your notes become a routing tag and context for the lesson workflow."
      proceedLabel="Proceed to lesson plan"
    >
      <LearnerProfileStudio />
    </WorkflowShell>
  );
}
