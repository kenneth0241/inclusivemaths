import type { WorksheetResponseFormatId } from "@/lib/worksheet-parameters";

/** Values expected by the Dify Step 4.2 worksheet chatflow. */
export type WorksheetDifyResponseFormat =
  | "circle_mcq_3_options"
  | "circle_mcq_4_options"
  | "matching"
  | "large_grid_boxes"
  | "mixed";

const UI_TO_DIFY: Record<WorksheetResponseFormatId, WorksheetDifyResponseFormat> =
  {
    mcq_4: "circle_mcq_4_options",
    matching: "matching",
    large_grid: "large_grid_boxes",
    mixed: "mixed",
  };

export function worksheetResponseFormatForDify(
  id: WorksheetResponseFormatId,
): WorksheetDifyResponseFormat {
  return UI_TO_DIFY[id] ?? "mixed";
}