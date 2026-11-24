import { gameScopeAndConstraints } from "@/lib/game-generation";
import {
  pedagogyStrategiesForGame,
  pedagogyTheoryForGame,
} from "@/lib/game-pedagogy-match";
import {
  formatAppliedModesList,
  formatAppliedModesWorksheetObject,
} from "@/lib/pedagogy-applied-modes";
import { resolveStudentBottleneckForRefine } from "@/lib/pedagogy-strategy";
import type { StudentRecord } from "@/lib/student-record";
import { worksheetResponseFormatForDify } from "@/lib/worksheet-response-format-dify";
import type { WorksheetParameters } from "@/lib/worksheet-parameters";
import type {
  ContentFootprint,
  LearnerProfile,
  PedagogicalStrategyState,
  PedagogyIndividualizedRow,
} from "@/lib/workflow-draft";

/** Dify Step 4.2 worksheet chatflow — Start node inputs (align keys with your app). */
export type WorksheetDifyStartInputs = {
  student_name: string;
  topic_summary: string;
  scope_and_constraints: string;
  student_bottleneck: string;
  /** User-listed key (same content as `educational_theory` in prompts). */
  education_theory: string;
  educational_theory: string;
  learning_strategies: string;
  applied_modes: string;
  question_count: string;
  response_format: string;
  /** Prior worksheet JSON for refine turns. */
  current_response: string;
  current_code: string;
};

/** UDL whole-class worksheet chatflow — Start node keys (separate Dify app). */
export type WorksheetUdlDifyStartInputs = {
  topic_summary: string;
  scope_and_constraints: string;
  educational_theory: string;
  learning_strategies: string;
  applied_modes: string;
  question_count: string;
  response_format: string;
  current_code: string;
};

export function buildWorksheetUdlDifyInputs(input: {
  footprint: ContentFootprint;
  learner: LearnerProfile;
  parameters: WorksheetParameters;
  pedagogy: PedagogicalStrategyState;
  currentResponse: string;
}): WorksheetUdlDifyStartInputs {
  const theory = pedagogyTheoryForGame(null, input.pedagogy);
  const strategies = pedagogyStrategiesForGame(null, input.pedagogy);
  const appliedModes = JSON.stringify(
    formatAppliedModesWorksheetObject([]),
  );
  const current = input.currentResponse.trim();

  return {
    topic_summary: input.footprint.topicSummary.trim(),
    scope_and_constraints: gameScopeAndConstraints(input.footprint),
    educational_theory: theory,
    learning_strategies: strategies,
    applied_modes: appliedModes,
    question_count: String(input.parameters.questionCount),
    response_format: worksheetResponseFormatForDify(
      input.parameters.responseFormat,
    ),
    current_code: current,
  };
}

export function buildWorksheetDifyInputs(input: {
  footprint: ContentFootprint;
  learner: LearnerProfile;
  parameters: WorksheetParameters;
  student: StudentRecord;
  pedagogy: PedagogicalStrategyState;
  pedagogyRow: PedagogyIndividualizedRow | null;
  currentResponse: string;
}): WorksheetDifyStartInputs {
  const row = input.pedagogyRow;
  const theory = pedagogyTheoryForGame(row, input.pedagogy);
  const strategies = pedagogyStrategiesForGame(row, input.pedagogy);
  const appliedModes = row
    ? formatAppliedModesList(row.appliedModes)
    : "";
  const current = input.currentResponse.trim();
  const bottleneck = row
    ? resolveStudentBottleneckForRefine(input.learner, input.student, row)
    : "";

  return {
    student_name: input.student.name.trim(),
    topic_summary: input.footprint.topicSummary.trim(),
    scope_and_constraints: gameScopeAndConstraints(input.footprint),
    student_bottleneck: bottleneck,
    education_theory: theory,
    educational_theory: theory,
    learning_strategies: strategies,
    applied_modes: appliedModes,
    question_count: String(input.parameters.questionCount),
    response_format: worksheetResponseFormatForDify(
      input.parameters.responseFormat,
    ),
    current_response: current,
    current_code: current,
  };
}