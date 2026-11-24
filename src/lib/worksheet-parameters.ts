export const WORKSHEET_DEFAULT_QUESTION_COUNT_UDL = 10;
export const WORKSHEET_DEFAULT_QUESTION_COUNT_SEN = 6;
export const WORKSHEET_DEFAULT_QUESTION_COUNT_GENERAL = 10;

export const WORKSHEET_RESPONSE_FORMATS = [
  {
    id: "mcq_4",
    titleZh: "四選一選擇題",
    titleEn: "4-option MCQ",
    summaryZh: "每題四個選項，圈選答案。",
    summaryEn: "Four choices per item; circle the answer.",
  },
  {
    id: "matching",
    titleZh: "配對",
    titleEn: "Matching",
    summaryZh: "左欄與右欄連線或寫配對字母。",
    summaryEn: "Match left column to right (line or letter).",
  },
  {
    id: "large_grid",
    titleZh: "大方格作答",
    titleEn: "Large grid boxes",
    summaryZh: "每題一個大方格，字距寬、減少視覺負荷。",
    summaryEn: "One large answer box per item; wide spacing.",
  },
  {
    id: "mixed",
    titleZh: "混合題型",
    titleEn: "Mixed",
    summaryZh: "輪替使用選擇、配對與方格題。",
    summaryEn: "Rotate MCQ, matching, and grid items.",
  },
] as const;

export type WorksheetResponseFormatId =
  (typeof WORKSHEET_RESPONSE_FORMATS)[number]["id"];

export type WorksheetParameters = {
  questionCount: number;
  responseFormat: WorksheetResponseFormatId;
};

export const DEFAULT_WORKSHEET_PARAMETERS: WorksheetParameters = {
  questionCount: WORKSHEET_DEFAULT_QUESTION_COUNT_UDL,
  responseFormat: "mixed",
};

export function clampQuestionCount(value: number): number {
  if (!Number.isFinite(value)) {
    return WORKSHEET_DEFAULT_QUESTION_COUNT_UDL;
  }
  return Math.min(40, Math.max(1, Math.round(value)));
}

export function defaultQuestionCountForTarget(options: {
  isUdl: boolean;
  isSen: boolean;
}): number {
  if (options.isUdl) {
    return WORKSHEET_DEFAULT_QUESTION_COUNT_UDL;
  }
  if (options.isSen) {
    return WORKSHEET_DEFAULT_QUESTION_COUNT_SEN;
  }
  return WORKSHEET_DEFAULT_QUESTION_COUNT_GENERAL;
}

export function worksheetResponseFormatLabel(id: WorksheetResponseFormatId): string {
  const entry = WORKSHEET_RESPONSE_FORMATS.find((item) => item.id === id);
  if (!entry) {
    return id;
  }
  return `${entry.titleZh} · ${entry.titleEn}`;
}

export function normalizeWorksheetResponseFormat(
  raw: unknown,
): WorksheetResponseFormatId {
  const allowed = new Set(
    WORKSHEET_RESPONSE_FORMATS.map((item) => item.id),
  );
  if (typeof raw === "string" && allowed.has(raw as WorksheetResponseFormatId)) {
    return raw as WorksheetResponseFormatId;
  }
  return DEFAULT_WORKSHEET_PARAMETERS.responseFormat;
}

export function normalizeWorksheetParameters(raw: unknown): WorksheetParameters {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_WORKSHEET_PARAMETERS };
  }
  const record = raw as Record<string, unknown>;
  const questionCount =
  typeof record.questionCount === "number"
    ? clampQuestionCount(record.questionCount)
    : typeof record.questionCount === "string" && record.questionCount.trim()
      ? clampQuestionCount(Number(record.questionCount))
      : DEFAULT_WORKSHEET_PARAMETERS.questionCount;
  return {
    questionCount,
    responseFormat: normalizeWorksheetResponseFormat(record.responseFormat),
  };
}