import type { Metadata } from "next";
import AssetHub from "../../components/AssetHub";
import WorkflowShell from "../../components/WorkflowShell";

export const metadata: Metadata = {
  title: "Worksheets & games · Inclusive Maths",
  description:
    "Generate SpLD-friendly worksheets and HTML5 maths games from the lesson plan.",
};

export default function AssetsPage() {
  return (
    <WorkflowShell
      step={4}
      wide
      kicker="Step 4 · 教材"
      title="Worksheets and games"
      description="Use the finalized lesson plan as the source. Preview a spaced worksheet (print to PDF) and a self-contained HTML5 game."
    >
      <AssetHub />
    </WorkflowShell>
  );
}
