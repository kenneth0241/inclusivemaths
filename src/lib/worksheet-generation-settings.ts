/** Default Dify query on Step 4.2 generate. */
export const DEFAULT_WORKSHEET_GENERATION_PROMPT =
  "請依學習者檔案、教學理論與調適模式，產生符合範圍的工作紙 JSON（含 items 與 teacher_review）。";

export function normalizeWorksheetGenerationPrompt(raw: unknown): string {
  return typeof raw === "string" && raw.trim()
    ? raw.trim()
    : DEFAULT_WORKSHEET_GENERATION_PROMPT;
}