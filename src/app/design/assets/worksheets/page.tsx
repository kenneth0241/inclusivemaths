import type { Metadata } from "next";
import Step4MaterialsSubNav from "../../../components/Step4MaterialsSubNav";
import WorksheetMaterialsStudio from "../../../components/WorksheetMaterialsStudio";
import WorkflowShell from "../../../components/WorkflowShell";

export const metadata: Metadata = {
  title: "Step 4.2 · Worksheets · Inclusive Maths",
  description:
    "Generate SpLD-friendly practice worksheets from Steps 1–3 context.",
};

export default function AssetsWorksheetsPage() {
  return (
    <WorkflowShell
      step={4}
      wide
      kicker="Step 4.2 · 工作紙"
      kickerEn="Worksheets"
      title="工作紙工作室"
      titleEn="Worksheet materials studio"
      description="依內容足跡、學習者檔案與教學策略產生可列印的練習工作紙。"
      descriptionEn="Printable practice worksheets from footprint, learner profile, and pedagogical strategy."
      belowTitle={<Step4MaterialsSubNav />}
    >
      <WorksheetMaterialsStudio />
    </WorkflowShell>
  );
}