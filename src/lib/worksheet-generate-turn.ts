import { findPedagogyRowForStudent } from "@/lib/game-pedagogy-match";
import { isUdlGameTargetId } from "@/lib/game-udl-target";
import {
  defaultWorksheetGenerationQuery,
  runWorksheetChatTurn,
  runWorksheetUdlChatTurn,
  worksheetChatTurnMessages,
} from "@/lib/worksheet-chat-client";
import type { WorksheetParameters } from "@/lib/worksheet-parameters";
import type { WorksheetLearnerSlot } from "@/lib/worksheet-learner-state";
import type { StudentRecord } from "@/lib/student-record";
import type {
  ContentFootprint,
  LearnerProfile,
  PedagogicalStrategyState,
  PedagogyIndividualizedRow,
} from "@/lib/workflow-draft";

export type WorksheetGenerateTurnInput = {
  targetId: string;
  student: StudentRecord | null;
  targetIndex: number;
  slot: WorksheetLearnerSlot | undefined;
  parameters: WorksheetParameters;
  footprint: ContentFootprint;
  learner: LearnerProfile;
  pedagogy: PedagogicalStrategyState;
  pedagogyRow: PedagogyIndividualizedRow | null;
  query?: string;
};

export type WorksheetGenerateTurnResult = {
  patch: Partial<WorksheetLearnerSlot>;
};

export async function runWorksheetGenerateTurn(
  input: WorksheetGenerateTurnInput,
): Promise<WorksheetGenerateTurnResult> {
  const query = input.query?.trim() || defaultWorksheetGenerationQuery();
  const isUdl = isUdlGameTargetId(input.targetId);

  const result = isUdl
    ? await runWorksheetUdlChatTurn({
        query,
        footprint: input.footprint,
        learner: input.learner,
        pedagogy: input.pedagogy,
        worksheet_parameters: input.parameters,
        current_response: input.slot?.structuredJson?.trim() ?? "",
        conversation_id: input.slot?.conversationId || undefined,
      })
    : await (async () => {
        if (!input.student) {
          throw new Error("Student is required for individualized worksheets.");
        }
        const row =
          input.pedagogyRow ??
          findPedagogyRowForStudent(
            input.pedagogy,
            input.student,
            input.targetIndex,
          );
        return runWorksheetChatTurn({
          query,
          target_id: input.student.id,
          footprint: input.footprint,
          learner: input.learner,
          pedagogy: input.pedagogy,
          worksheet_parameters: input.parameters,
          individualized_row: row,
          current_response: input.slot?.structuredJson?.trim() ?? "",
          conversation_id: input.slot?.conversationId || undefined,
        });
      })();

  if (!result.worksheet) {
    throw new Error(
      result.assistantText.trim() ||
        "Dify did not return worksheet JSON (expected items[]).",
    );
  }

  const assistantText =
    result.assistantText.trim() ||
    result.worksheet.teacher_note?.trim() ||
    "Worksheet generated.";

  return {
    patch: {
      markdown: result.markdown,
      structuredJson: result.worksheetJson,
      conversationId: result.conversationId,
      status: result.worksheet.status ?? "",
      teacherNote: result.worksheet.teacher_note?.trim() ?? "",
      messages: worksheetChatTurnMessages(query, assistantText),
    },
  };
}