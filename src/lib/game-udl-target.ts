import type { PedagogicalStrategyState } from "@/lib/workflow-draft";

/** Reserved `learnerGames` key — not a roster student id. */
export const UDL_GAME_TARGET_ID = "__udl__";

export const UDL_GAME_TAB_LABEL = "UDL · 全班";

export function isUdlGameTargetId(id: string): boolean {
  return id.trim() === UDL_GAME_TARGET_ID;
}

/** Step 3 class-wide UDL / general learning strategies (not individualized rows). */
export function hasClassUdlForGames(
  pedagogy: PedagogicalStrategyState,
): boolean {
  if (pedagogy.udl) {
    const hasTheory =
      pedagogy.udl.educationalTheoryZh.trim().length > 0 ||
      pedagogy.udl.educationalTheoryEn.trim().length > 0;
    const hasStrategies =
      pedagogy.udl.learningStrategiesZh.trim().length > 0 ||
      pedagogy.udl.learningStrategiesEn.trim().length > 0;
    if (hasTheory || hasStrategies) {
      return true;
    }
  }
  return (
    pedagogy.educationalTheory.trim().length > 0 ||
    pedagogy.learningStrategies.trim().length > 0
  );
}