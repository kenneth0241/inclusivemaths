import { buildGameHtmlForStudent } from "@/lib/asset-generators";
import { formatAppliedModesList } from "@/lib/pedagogy-applied-modes";
import {
  findPedagogyRowForStudent,
  pedagogyStrategiesForGame,
  pedagogyTheoryForGame,
} from "@/lib/game-pedagogy-match";
import {
  type GameLearnerSlot,
  type LearnerGamesMap,
  EMPTY_GAME_LEARNER_SLOT,
} from "@/lib/game-learner-state";
import { UDL_GAME_TAB_LABEL } from "@/lib/game-udl-target";
import { resolveStudentBottleneckForRefine } from "@/lib/pedagogy-strategy";
import type { StudentRecord } from "@/lib/student-record";
import type {
  ContentFootprint,
  GameParameters,
  LearnerProfile,
  PedagogicalStrategyState,
  PedagogyIndividualizedRow,
  WorkflowDraft,
} from "@/lib/workflow-draft";

/** Dify Step 4 game chatflow — Start node inputs (exact keys). */
export type GameDifyStartInputs = {
  student_name: string;
  topic_summary: string;
  scope_and_constraints: string;
  student_bottleneck: string;
  educational_theory: string;
  learning_strategies: string;
  applied_modes: string;
  game_rules: string;
  scoring_method: string;
  ui_style: string;
  /** Empty on first run; full HTML from preview / code editor on follow-ups. */
  current_code: string;
};

/** UDL whole-class game chatflow — uses Step 3 UDL field names (not per-learner theory keys). */
export type GameUdlDifyStartInputs = Omit<
  GameDifyStartInputs,
  "educational_theory" | "learning_strategies" | "applied_modes"
> & {
  educational_theory_udl: string;
  learning_strategies_udl: string;
};

export function gameScopeAndConstraints(footprint: ContentFootprint): string {
  return footprint.scope.trim();
}

export function buildGameUdlDifyInputs(input: {
  footprint: ContentFootprint;
  learner: LearnerProfile;
  parameters: GameParameters;
  pedagogy: PedagogicalStrategyState;
  currentCode: string;
}): GameUdlDifyStartInputs {
  const classNote = input.learner.classProfile.trim();
  const theory = pedagogyTheoryForGame(null, input.pedagogy);
  const strategies = pedagogyStrategiesForGame(null, input.pedagogy);
  return {
    student_name: UDL_GAME_TAB_LABEL,
    topic_summary: input.footprint.topicSummary.trim(),
    scope_and_constraints: gameScopeAndConstraints(input.footprint),
    student_bottleneck: classNote
      ? `Class profile · 班級概況:\n${classNote}`
      : "全班通用 UDL · Whole-class Universal Design for Learning (no individual bottleneck).",
    educational_theory_udl: theory,
    learning_strategies_udl: strategies,
    game_rules: input.parameters.gameRules.trim(),
    scoring_method: input.parameters.scoringMethod.trim(),
    ui_style: input.parameters.uiStyle.trim(),
    current_code: input.currentCode.trim(),
  };
}

export function buildGameDifyInputs(input: {
  footprint: ContentFootprint;
  learner: LearnerProfile;
  parameters: GameParameters;
  student: StudentRecord;
  pedagogy: PedagogicalStrategyState;
  pedagogyRow: PedagogyIndividualizedRow | null;
  currentCode: string;
}): GameDifyStartInputs {
  const row = input.pedagogyRow;
  return {
    student_name: input.student.name.trim(),
    topic_summary: input.footprint.topicSummary.trim(),
    scope_and_constraints: gameScopeAndConstraints(input.footprint),
    student_bottleneck: row
      ? resolveStudentBottleneckForRefine(
          input.learner,
          input.student,
          row,
        )
      : "",
    educational_theory: pedagogyTheoryForGame(row, input.pedagogy),
    learning_strategies: pedagogyStrategiesForGame(row, input.pedagogy),
    applied_modes: row ? formatAppliedModesList(row.appliedModes) : "",
    game_rules: input.parameters.gameRules.trim(),
    scoring_method: input.parameters.scoringMethod.trim(),
    ui_style: input.parameters.uiStyle.trim(),
    current_code: input.currentCode.trim(),
  };
}

export function generateLearnerGameSlot(
  draft: WorkflowDraft,
  student: StudentRecord,
  pedagogyRow: PedagogyIndividualizedRow | null,
  existing?: GameLearnerSlot,
): GameLearnerSlot {
  const html = buildGameHtmlForStudent(draft, student, pedagogyRow);
  return {
    html,
    conversationId: existing?.conversationId ?? "",
    messages: existing?.messages ?? [],
  };
}

export function generateAllLearnerGames(
  draft: WorkflowDraft,
  targetStudents: StudentRecord[],
  existing: LearnerGamesMap,
): LearnerGamesMap {
  const next: LearnerGamesMap = { ...existing };
  targetStudents.forEach((student, targetIndex) => {
    const row = findPedagogyRowForStudent(
      draft.pedagogy,
      student,
      targetIndex,
    );
    next[student.id] = generateLearnerGameSlot(
      draft,
      student,
      row,
      next[student.id],
    );
  });
  return next;
}

export function patchLearnerGameSlot(
  map: LearnerGamesMap,
  studentId: string,
  patch: Partial<GameLearnerSlot>,
): LearnerGamesMap {
  const current = map[studentId] ?? { ...EMPTY_GAME_LEARNER_SLOT };
  return {
    ...map,
    [studentId]: {
      ...current,
      ...patch,
    },
  };
}