import type { Metadata } from "next";
import GameMaterialsStudio from "../../components/GameMaterialsStudio";
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
      title="HTML practice games"
      description="Set game parameters and chat to generate offline HTML5 games. Steps 1–3 stay on the right for full context."
    >
      <GameMaterialsStudio />
    </WorkflowShell>
  );
}
