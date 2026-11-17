import type { PedagogicalStrategyState, PedagogyIndividualizedRow } from "@/lib/workflow-draft";
import type { StudentRecord } from "@/lib/student-record";

export function findPedagogyRowForStudent(
  pedagogy: PedagogicalStrategyState,
  student: StudentRecord,
  targetIndex: number,
): PedagogyIndividualizedRow | null {
  const { individualized } = pedagogy;
  if (individualized.length === 0) {
    return null;
  }
  if (targetIndex >= 0 && targetIndex < individualized.length) {
    return individualized[targetIndex];
  }
  const nameLower = student.name.trim().toLowerCase();
  const idLower = student.id.trim().toLowerCase();
  const byProfile = individualized.find((row) => {
    const profile = row.studentProfile.trim().toLowerCase();
    if (!profile) {
      return false;
    }
    return (
      profile.includes(nameLower) ||
      (idLower && profile.includes(idLower))
    );
  });
  return byProfile ?? null;
}

export function pedagogyTheoryForGame(
  row: PedagogyIndividualizedRow | null,
  pedagogy: PedagogicalStrategyState,
): string {
  if (row) {
    return [row.educationalTheoryZh, row.educationalTheoryEn]
      .filter((value) => value.trim())
      .join("\n\n");
  }
  if (pedagogy.udl) {
    return [pedagogy.udl.educationalTheoryZh, pedagogy.udl.educationalTheoryEn]
      .filter((value) => value.trim())
      .join("\n\n");
  }
  return pedagogy.educationalTheory.trim();
}

export function pedagogyStrategiesForGame(
  row: PedagogyIndividualizedRow | null,
  pedagogy: PedagogicalStrategyState,
): string {
  if (row) {
    return [row.learningStrategiesZh, row.learningStrategiesEn]
      .filter((value) => value.trim())
      .join("\n\n");
  }
  if (pedagogy.udl) {
    return [pedagogy.udl.learningStrategiesZh, pedagogy.udl.learningStrategiesEn]
      .filter((value) => value.trim())
      .join("\n\n");
  }
  return pedagogy.learningStrategies.trim();
}