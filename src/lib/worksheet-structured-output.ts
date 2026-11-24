export const WORKSHEET_STATUS_VALUES = [
  "verified",
  "provisional",
  "needs_review",
] as const;

export type WorksheetStatus = (typeof WORKSHEET_STATUS_VALUES)[number];

export type WorksheetDocxLayout = {
  font_size_pt: number;
  enlarge_operators: boolean;
  include_worked_example: boolean;
};

export type WorksheetTenFrameData = {
  group_a: number;
  group_b: number;
};

export type WorksheetWordSupport = {
  word: string;
  reason: string;
};

export type WorksheetTeacherReview = {
  answer: string;
  unit: string;
  marking_criterion: string;
  applied_adaptation: string;
  words_needing_support: WorksheetWordSupport[];
};

export type WorksheetStructuredItem = {
  number: number;
  page_break_before: boolean;
  objective: string;
  student_text: string;
  highlight_keywords: string[];
  step_breakdown: string[];
  ten_frame_data: WorksheetTenFrameData;
  visual_asset: string;
  svg_code: string;
  options: string[];
  teacher_review: WorksheetTeacherReview;
};

export type WorksheetStructuredOutput = {
  student_name: string;
  worksheet_title: string;
  topic_summary: string;
  /** Dify output — human-readable mode summary string. */
  applied_modes: string;
  response_format: string;
  header_image_prompt: string;
  docx_layout: WorksheetDocxLayout;
  status: WorksheetStatus;
  teacher_note: string;
  items: WorksheetStructuredItem[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string");
}

function normalizeAppliedModesString(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return "";
}

function normalizeTenFrameData(raw: unknown): WorksheetTenFrameData {
  const record = asRecord(raw);
  return {
    group_a: asNumber(record?.group_a),
    group_b: asNumber(record?.group_b),
  };
}

function normalizeTeacherReview(raw: unknown): WorksheetTeacherReview {
  const record = asRecord(raw);
  const words: WorksheetWordSupport[] = [];
  if (Array.isArray(record?.words_needing_support)) {
    for (const entry of record.words_needing_support) {
      const row = asRecord(entry);
      if (!row) {
        continue;
      }
      const word = asString(row.word).trim();
      if (!word) {
        continue;
      }
      words.push({ word, reason: asString(row.reason).trim() });
    }
  }
  return {
    answer: asString(record?.answer).trim(),
    unit: asString(record?.unit).trim(),
    marking_criterion: asString(record?.marking_criterion).trim(),
    applied_adaptation: asString(record?.applied_adaptation).trim(),
    words_needing_support: words,
  };
}

function normalizeWorksheetItem(raw: unknown, index: number): WorksheetStructuredItem | null {
  const record = asRecord(raw);
  if (!record) {
    return null;
  }
  const studentText = asString(record.student_text).trim();
  const objective = asString(record.objective).trim();
  if (!studentText && !objective) {
    return null;
  }
  return {
    number: asNumber(record.number, index + 1),
    page_break_before: asBool(record.page_break_before),
    objective,
    student_text: studentText,
    highlight_keywords: asStringArray(record.highlight_keywords),
    step_breakdown: asStringArray(record.step_breakdown),
    ten_frame_data: normalizeTenFrameData(record.ten_frame_data),
    visual_asset: asString(record.visual_asset).trim(),
    svg_code: asString(record.svg_code).trim(),
    options: asStringArray(record.options),
    teacher_review: normalizeTeacherReview(record.teacher_review),
  };
}

function normalizeDocxLayout(raw: unknown): WorksheetDocxLayout {
  const record = asRecord(raw);
  return {
    font_size_pt: asNumber(record?.font_size_pt, 18),
    enlarge_operators: asBool(record?.enlarge_operators, true),
    include_worked_example: asBool(record?.include_worked_example, true),
  };
}

function normalizeWorksheetStatus(raw: unknown): WorksheetStatus {
  const value = asString(raw).trim();
  if ((WORKSHEET_STATUS_VALUES as readonly string[]).includes(value)) {
    return value as WorksheetStatus;
  }
  return "provisional";
}

function parseJsonObjectFromText(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return asRecord(JSON.parse(unfenced));
  } catch {
    const start = unfenced.indexOf("{");
    const end = unfenced.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return asRecord(JSON.parse(unfenced.slice(start, end + 1)));
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function isWorksheetStructuredOutput(
  record: Record<string, unknown>,
): boolean {
  return Array.isArray(record.items) && record.items.length > 0;
}

export function normalizeWorksheetStructuredOutput(
  raw: Record<string, unknown>,
): WorksheetStructuredOutput | null {
  if (!isWorksheetStructuredOutput(raw)) {
    return null;
  }
  const rawItems = raw.items as unknown[];
  const items: WorksheetStructuredItem[] = [];
  for (let i = 0; i < rawItems.length; i += 1) {
    const item = normalizeWorksheetItem(rawItems[i], i);
    if (item) {
      items.push(item);
    }
  }
  if (items.length === 0) {
    return null;
  }
  return {
    student_name: asString(raw.student_name).trim(),
    worksheet_title: asString(raw.worksheet_title).trim(),
    topic_summary: asString(raw.topic_summary).trim(),
    applied_modes: normalizeAppliedModesString(raw.applied_modes),
    response_format: asString(raw.response_format).trim(),
    header_image_prompt: asString(raw.header_image_prompt).trim(),
    docx_layout: normalizeDocxLayout(raw.docx_layout),
    status: normalizeWorksheetStatus(raw.status),
    teacher_note: asString(raw.teacher_note).trim(),
    items,
  };
}

export function parseWorksheetStructuredOutputs(
  value: Record<string, unknown>,
): WorksheetStructuredOutput | null {
  return normalizeWorksheetStructuredOutput(value);
}

export function tryParseWorksheetStructuredAnswerText(
  text: string,
): WorksheetStructuredOutput | null {
  const record = parseJsonObjectFromText(text);
  if (!record) {
    return null;
  }
  return parseWorksheetStructuredOutputs(record);
}

export function worksheetStructuredToJson(
  output: WorksheetStructuredOutput,
): string {
  return JSON.stringify(output, null, 2);
}

export function renderWorksheetStructuredMarkdown(
  output: WorksheetStructuredOutput,
): string {
  const title =
    output.worksheet_title.trim() ||
    output.topic_summary.trim() ||
    "Inclusive Maths Worksheet";
  const lines: string[] = [`# ${title}`, ""];

  if (output.student_name.trim()) {
    lines.push(`**Student / 學生：** ${output.student_name.trim()}`, "");
  }
  if (output.topic_summary.trim()) {
    lines.push(`**Topic：** ${output.topic_summary.trim()}`, "");
  }
  if (output.response_format.trim()) {
    lines.push(`**Format：** ${output.response_format.trim()}`, "");
  }
  if (output.applied_modes.trim()) {
    lines.push(`**Applied modes：** ${output.applied_modes.trim()}`, "");
  }
  if (output.status) {
    lines.push(`**Status：** ${output.status}`, "");
  }
  if (output.header_image_prompt.trim()) {
    lines.push(
      `**Header image (docx builder)：** ${output.header_image_prompt.trim()}`,
      "",
    );
  }
  if (output.teacher_note.trim()) {
    lines.push(`> **Teacher note：** ${output.teacher_note.trim()}`, "", "---", "");
  }

  const layout = output.docx_layout;
  lines.push(
    `**Layout：** ${layout.font_size_pt}pt · enlarge operators: ${layout.enlarge_operators ? "yes" : "no"} · worked example: ${layout.include_worked_example ? "yes" : "no"}`,
    "",
    "---",
    "",
  );

  for (const item of output.items) {
    if (item.page_break_before) {
      lines.push("", "---", "", "*[page break]*", "", "");
    }
    lines.push(`## Question ${item.number}`, "");
    if (item.objective.trim()) {
      lines.push(`*${item.objective.trim()}*`, "");
    }
    if (item.student_text.trim()) {
      for (const line of item.student_text.split("\n")) {
        lines.push(line);
      }
      lines.push("");
    }
    if (item.highlight_keywords.length) {
      lines.push(`**Keywords:** ${item.highlight_keywords.join(", ")}`, "");
    }
    if (item.step_breakdown.length) {
      lines.push("**Steps:**");
      for (const step of item.step_breakdown) {
        lines.push(`- ${step}`);
      }
      lines.push("");
    }
    if (item.ten_frame_data.group_a || item.ten_frame_data.group_b) {
      lines.push(
        `**Ten-frame:** A=${item.ten_frame_data.group_a}, B=${item.ten_frame_data.group_b}`,
        "",
      );
    }
    if (item.visual_asset.trim()) {
      lines.push(`**Visual:** ${item.visual_asset.trim()}`, "");
    }
    if (item.svg_code.trim()) {
      lines.push("**SVG (embedded for docx):**", "", "```svg", item.svg_code.trim(), "```", "");
    }
    if (item.options.length) {
      lines.push(
        `**Options:** ${item.options.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join("　")}`,
        "",
      );
    }
    const r = item.teacher_review;
    if (
      r.answer ||
      r.marking_criterion ||
      r.applied_adaptation ||
      r.words_needing_support.length
    ) {
      lines.push("---", "", "**Teacher review (do not show pupil)**", "");
      if (r.answer) {
        lines.push(`- Answer: ${r.answer}${r.unit ? ` ${r.unit}` : ""}`);
      }
      if (r.marking_criterion) {
        lines.push(`- Marking: ${r.marking_criterion}`);
      }
      if (r.applied_adaptation) {
        lines.push(`- Adaptation: ${r.applied_adaptation}`);
      }
      if (r.words_needing_support.length) {
        lines.push("- Words needing support:");
        for (const w of r.words_needing_support) {
          lines.push(`  - ${w.word}: ${w.reason}`);
        }
      }
    }
    lines.push("", "---", "");
  }

  return lines.join("\n").trim();
}