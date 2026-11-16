export function sortStudentIds(ids: string[]): string[] {
  return [...ids].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/** Step 4 game audience — subset of `learner.studentIds`. Empty array is allowed. */
export function normalizeGameTargetStudentIds(
  raw: unknown,
  learnerStudentIds: string[],
): string[] {
  const allowed = new Set(learnerStudentIds);
  if (!Array.isArray(raw)) {
    return sortStudentIds(learnerStudentIds);
  }
  return sortStudentIds(
    raw.filter((id): id is string => typeof id === "string" && allowed.has(id)),
  );
}

export function gameTargetIdsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}
