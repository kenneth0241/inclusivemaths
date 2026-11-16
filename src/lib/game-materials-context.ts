import type { PedagogicalStrategyState } from "@/lib/workflow-draft";

export function formatStep3ContextMarkdown(
  pedagogy: PedagogicalStrategyState,
): string {
  const sections: string[] = [];

  if (pedagogy.udl) {
    sections.push(
      "## 全班 UDL · Class-wide UDL",
      "### 教育理論 · Education theory",
      pedagogy.udl.educationalTheoryZh,
      pedagogy.udl.educationalTheoryEn,
      "### 支援策略 · Learning strategies",
      pedagogy.udl.learningStrategiesZh,
      pedagogy.udl.learningStrategiesEn,
    );
  } else if (pedagogy.educationalTheory.trim() || pedagogy.learningStrategies.trim()) {
    sections.push(
      "## 教學策略 · Pedagogy",
      pedagogy.educationalTheory.trim(),
      pedagogy.learningStrategies.trim(),
    );
  }

  if (pedagogy.individualized.length > 0) {
    sections.push("## 個別調適 · Individualized");
    for (const row of pedagogy.individualized) {
      sections.push(
        `### ${row.studentProfile}`,
        row.educationalTheoryZh,
        row.educationalTheoryEn,
        row.learningStrategiesZh,
        row.learningStrategiesEn,
      );
    }
  }

  return sections.filter((line) => line.trim().length > 0).join("\n\n");
}

export function step3BriefPreview(pedagogy: PedagogicalStrategyState): string {
  const headline =
    pedagogy.udl?.educationalTheoryZh.trim() ||
    pedagogy.educationalTheory.trim() ||
    pedagogy.learningStrategies.trim() ||
    (pedagogy.individualized[0]?.studentProfile ?? "");
  return headline;
}
