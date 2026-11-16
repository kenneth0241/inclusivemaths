import type { Metadata } from "next";
import PedagogyExecutiveSummaryLauncher from "../../components/PedagogyExecutiveSummaryLauncher";
import PedagogicalStrategyStudio from "../../components/PedagogicalStrategyStudio";
import WorkflowShell from "../../components/WorkflowShell";

export const metadata: Metadata = {
  title: "Pedagogical strategy · Inclusive Maths",
  description:
    "Align educational theory and learning strategies with Step 1 topic and Step 2 learner profiles.",
};

export default function PedagogicalStrategyPage() {
  return (
    <WorkflowShell
      step={3}
      wide
      kicker="Step 3 · 教學策略"
      kickerEn="Pedagogical strategy"
      title="Pedagogical Strategy Selector"
      titleEn="教學策略選擇器"
      proceedLabel="前往教材"
      proceedLabelEn="Proceed to Assets"
      belowTitle={<PedagogyExecutiveSummaryLauncher />}
    >
      <PedagogicalStrategyStudio />
    </WorkflowShell>
  );
}
