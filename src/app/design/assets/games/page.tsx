import type { Metadata } from "next";
import GameMaterialsStudio from "../../../components/GameMaterialsStudio";
import Step4MaterialsSubNav from "../../../components/Step4MaterialsSubNav";
import WorkflowShell from "../../../components/WorkflowShell";

export const metadata: Metadata = {
  title: "Step 4.1 · HTML games · Inclusive Maths",
  description:
    "Generate SpLD-friendly HTML5 maths games from Steps 1–3 context.",
};

export default function AssetsGamesPage() {
  return (
    <WorkflowShell
      step={4}
      wide
      kicker="Step 4.1 · 互動遊戲"
      kickerEn="HTML practice games"
      title="互動遊戲工作室"
      titleEn="Game materials studio"
      description="設定遊戲參數並與 Dify 對話，為每位學習者與全班 UDL 生成 HTML5 遊戲。"
      descriptionEn="Set game parameters and chat with Dify to generate HTML5 games per learner and for class UDL."
      belowTitle={<Step4MaterialsSubNav />}
    >
      <GameMaterialsStudio />
    </WorkflowShell>
  );
}