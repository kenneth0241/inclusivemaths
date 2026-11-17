/** Default Dify query for batch generate + suggested chat on Step 4. */
export const DEFAULT_GAME_GENERATION_PROMPT =
  "請依該學習者的檔案、教育理論與支援策略，以及左側遊戲參數，產生可離線運行的 HTML5 小學數學遊戲（單檔、無外部 CDN）。";

export function normalizeGameGenerationPrompt(raw: unknown): string {
  return typeof raw === "string" && raw.trim()
    ? raw.trim()
    : DEFAULT_GAME_GENERATION_PROMPT;
}