import { splitChatThinkContent } from "@/lib/chat-think";

export type ChatTurnForAnalysis = {
  role: "user" | "assistant";
  content: string;
};

/** Minimum rubric rating (1–5) treated as “good” on footprint quality meters. */
export const FOOTPRINT_QUALITY_THRESHOLD = 4;
export const TOPIC_ANALYSIS_THRESHOLD = 50;

/** @deprecated Use StudioAnalysisView */
export type TopicAnalysisView = StudioAnalysisView;

export type StudioAnalysisView = {
  /** Multi-sentence discussion summary (Dify) or short topic (local/legacy). */
  summary: string | null;
  /** One-line topic for lesson title fallback. */
  topic: string | null;
  footprint: {
    scope: string;
    visualModels: string;
  };
  quality: {
    scope: number;
    visualModels: number;
    threshold: number;
  };
  scopeQualityReason: string | null;
  visualModelsQualityReason: string | null;
  scopeFeedback: string | null;
  visualFeedback: string | null;
  ready: boolean;
  suggestedQuestion: string | null;
  reason: string | null;
  source: "dify" | "local";
  signals: { label: string; score: number }[];
  /** Legacy single meter */
  confidence: number;
  threshold: number;
};

export type StudioWorkflowParsed = {
  summary: string | null;
  topic: string | null;
  footprint: {
    scope: string;
    visualModels: string;
  };
  quality: {
    scope: number;
    visualModels: number;
  };
  scopeQualityReason: string | null;
  visualModelsQualityReason: string | null;
  scopeFeedback: string | null;
  visualFeedback: string | null;
  ready: boolean;
  suggestedQuestion: string | null;
  reason: string | null;
};

export function stripVisibleChatContent(content: string) {
  const { think, answer } = splitChatThinkContent(content);
  return (answer || content.replace(think, "")).trim();
}

export function formatConversationTranscript(
  messages: ChatTurnForAnalysis[],
  maxMessages = 14,
) {
  return messages
    .slice(-maxMessages)
    .map((message) => {
      const label = message.role === "user" ? "Teacher" : "Assistant";
      const body = stripVisibleChatContent(message.content);
      return `${label}:\n${body}`;
    })
    .join("\n\n---\n\n");
}

function clampScore(value: unknown) {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;
  if (Number.isNaN(number)) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round(number)));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function parseJsonObjectFromText(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return asRecord(JSON.parse(trimmed));
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return asRecord(JSON.parse(trimmed.slice(start, end + 1)));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Dify Textbook_Chat_Analysis: integer rubric 1–5 (stored as-is for UI). */
function rubricRatingOneToFive(value: unknown): number | null {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;
  if (Number.isNaN(number) || number < 1 || number > 5) {
    return null;
  }
  return number;
}

/** Legacy 0–100 scores → 1–5 for a unified meter scale. */
function legacyHundredToFive(value: unknown): number {
  const clamped = clampScore(value);
  if (clamped <= 0) {
    return 0;
  }
  if (clamped <= 5) {
    return clamped;
  }
  return Math.max(1, Math.min(5, Math.round(clamped / 20)));
}

function rubricReasonFromFive(
  labelZh: string,
  ratingRaw: unknown,
): string | null {
  const number =
    typeof ratingRaw === "number"
      ? ratingRaw
      : typeof ratingRaw === "string"
        ? Number.parseInt(ratingRaw, 10)
        : Number.NaN;
  if (Number.isNaN(number) || number < 1 || number > 5) {
    return null;
  }
  return `${labelZh}完整度：${number}/5（Textbook_Chat_Analysis）`;
}

function flattenWorkflowOutputs(
  outputs: Record<string, unknown>,
): Record<string, unknown> {
  let fields: Record<string, unknown> = { ...outputs };

  const structured = asRecord(outputs.structured_output);
  if (structured) {
    fields = { ...fields, ...structured };
  }

  for (const key of ["analysis", "result", "text", "output"]) {
    const raw = outputs[key];
    if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
      fields = { ...fields, ...(raw as Record<string, unknown>) };
      continue;
    }
    if (typeof raw === "string") {
      const parsed = parseJsonObjectFromText(raw);
      if (parsed) {
        fields = { ...fields, ...parsed };
      }
    }
  }

  return fields;
}

export function parseTopicWorkflowOutputs(
  outputs: Record<string, unknown>,
): StudioWorkflowParsed {
  const fields = flattenWorkflowOutputs(outputs);

  const summaryRaw =
    fields.topic_summary ??
    fields.discussion_summary ??
    fields.discussionSummary ??
    fields.summary;
  let summary = asTrimmedString(summaryRaw) || null;

  const topicRaw = fields.topic ?? fields.teaching_topic ?? fields.unit;
  const topic = asTrimmedString(topicRaw) || null;

  if (!summary && topic) {
    summary = topic;
  }

  const scope = asTrimmedString(
    fields.scope_and_constraints ??
      fields.scope ??
      fields.content_scope ??
      fields.specific_scope,
  );
  const visualModels = asTrimmedString(
    fields.visual_models ??
      fields.visualModels ??
      fields.visual_models_representations,
  );

  const scopeRatingRaw =
    fields.scope_quality_rating ?? fields.scopeQualityRating;
  const visualRatingRaw =
    fields.visual_quality_rating ?? fields.visualQualityRating;

  const scopeFromRubric = rubricRatingOneToFive(scopeRatingRaw);
  const visualFromRubric = rubricRatingOneToFive(visualRatingRaw);

  let scopeQuality = scopeFromRubric ?? 0;
  let visualModelsQuality = visualFromRubric ?? 0;

  if (scopeFromRubric == null && fields.scope_quality != null) {
    scopeQuality = legacyHundredToFive(
      fields.scope_quality ?? fields.scopeQuality,
    );
  }
  if (visualFromRubric == null && fields.visual_models_quality != null) {
    visualModelsQuality = legacyHundredToFive(
      fields.visual_models_quality ?? fields.visualModelsQuality,
    );
  }

  const legacyConfidence = legacyHundredToFive(
    fields.confidence ?? fields.score ?? fields.probability,
  );
  const hasExplicitQuality =
    scopeFromRubric != null ||
    visualFromRubric != null ||
    fields.scope_quality != null ||
    fields.scopeQuality != null ||
    fields.visual_models_quality != null ||
    fields.visualModelsQuality != null;

  if (!hasExplicitQuality && legacyConfidence > 0) {
    scopeQuality = legacyConfidence;
    visualModelsQuality = legacyConfidence;
  }

  let scopeQualityReason =
    asTrimmedString(
      fields.scope_quality_reason ?? fields.scopeQualityReason,
    ) || null;
  let visualModelsQualityReason =
    asTrimmedString(
      fields.visual_models_quality_reason ??
        fields.visualModelsQualityReason,
    ) || null;

  if (!scopeQualityReason && scopeRatingRaw != null) {
    scopeQualityReason = rubricReasonFromFive(
      "具體範圍與限制",
      scopeRatingRaw,
    );
  }
  if (!visualModelsQualityReason && visualRatingRaw != null) {
    visualModelsQualityReason = rubricReasonFromFive(
      "視覺圖解與表達",
      visualRatingRaw,
    );
  }

  const scopeFeedback =
    asTrimmedString(
      fields.scope_feedback ??
        fields.scopeFeedback ??
        fields.scope_feedback_placeholder,
    ) || null;
  const visualFeedback =
    asTrimmedString(
      fields.visual_feedback ??
        fields.visualFeedback ??
        fields.visual_feedback_placeholder,
    ) || null;

  const suggestedRaw =
    fields.suggested_question ??
    fields.suggestedQuestion ??
    fields.follow_up_question;
  const suggestedQuestion =
    asTrimmedString(suggestedRaw) || null;

  const reasonRaw = fields.reason ?? fields.rationale ?? fields.explanation;
  const reason = asTrimmedString(reasonRaw) || null;

  const readyExplicit = fields.ready ?? fields.topic_ready ?? fields.is_ready;
  const ready =
    typeof readyExplicit === "boolean"
      ? readyExplicit
      : Boolean(
          summary &&
            (scopeQuality >= FOOTPRINT_QUALITY_THRESHOLD ||
              visualModelsQuality >= FOOTPRINT_QUALITY_THRESHOLD ||
              legacyConfidence >= 3),
        );

  return {
    summary,
    topic,
    footprint: { scope, visualModels },
    quality: { scope: scopeQuality, visualModels: visualModelsQuality },
    scopeQualityReason,
    visualModelsQualityReason,
    scopeFeedback,
    visualFeedback,
    ready,
    suggestedQuestion,
    reason,
  };
}

export function studioParsedToView(
  parsed: StudioWorkflowParsed,
  source: "dify" | "local",
): StudioAnalysisView {
  const threshold = FOOTPRINT_QUALITY_THRESHOLD;
  const signals: { label: string; score: number }[] = [];

  if (source === "dify") {
    signals.push({
      label: "具體範圍與限制",
      score: parsed.quality.scope,
    });
    const scopeNote = parsed.scopeFeedback ?? parsed.scopeQualityReason;
    if (scopeNote) {
      signals.push({ label: scopeNote, score: 0 });
    }
    signals.push({
      label: "視覺圖解與表達",
      score: parsed.quality.visualModels,
    });
    const visualNote = parsed.visualFeedback ?? parsed.visualModelsQualityReason;
    if (visualNote) {
      signals.push({ label: visualNote, score: 0 });
    }
  }

  const avgConfidence = Math.round(
    (parsed.quality.scope + parsed.quality.visualModels) / 2,
  );

  return {
    summary: parsed.summary,
    topic: parsed.topic ?? parsed.summary,
    footprint: parsed.footprint,
    quality: {
      scope: parsed.quality.scope,
      visualModels: parsed.quality.visualModels,
      threshold,
    },
    scopeQualityReason: parsed.scopeQualityReason,
    visualModelsQualityReason: parsed.visualModelsQualityReason,
    scopeFeedback: parsed.scopeFeedback,
    visualFeedback: parsed.visualFeedback,
    ready: parsed.ready,
    suggestedQuestion: parsed.suggestedQuestion,
    reason: parsed.reason,
    source,
    signals,
    confidence: avgConfidence,
    threshold: TOPIC_ANALYSIS_THRESHOLD,
  };
}

export function difyResultToView(
  parsed: StudioWorkflowParsed,
): StudioAnalysisView {
  return studioParsedToView(parsed, "dify");
}

export function emptyLocalStudioView(): StudioAnalysisView {
  return studioParsedToView(
    {
      summary: null,
      topic: null,
      footprint: { scope: "", visualModels: "" },
      quality: { scope: 0, visualModels: 0 },
      scopeQualityReason: null,
      visualModelsQualityReason: null,
      scopeFeedback: null,
      visualFeedback: null,
      ready: false,
      suggestedQuestion: null,
      reason: null,
    },
    "local",
  );
}

export function localDetectionToView(local: {
  topic: string | null;
  confidence: number;
  ready: boolean;
  threshold: number;
  signals: { label: string; score: number }[];
  matchReason: string | null;
  suggestedQuestion: string | null;
}): StudioAnalysisView {
  return studioParsedToView(
    {
      summary: local.topic,
      topic: local.topic,
      footprint: { scope: "", visualModels: "" },
      quality: { scope: 0, visualModels: 0 },
      scopeQualityReason: null,
      visualModelsQualityReason: null,
      scopeFeedback: null,
      visualFeedback: null,
      ready: local.ready,
      suggestedQuestion: local.suggestedQuestion,
      reason: local.matchReason,
    },
    "local",
  );
}

/** @deprecated */
export function toTopicAnalysisView(
  parsed: StudioWorkflowParsed,
  source: "dify" | "local",
): StudioAnalysisView {
  return studioParsedToView(parsed, source);
}
