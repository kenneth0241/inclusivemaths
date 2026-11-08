import { type CorpusId, isCorpusId } from "./corpus";

export function getDifyConfig() {
  const apiKey = process.env.DIFY_API_KEY?.trim();
  const apiBase = (process.env.DIFY_API_BASE ?? "https://api.dify.ai/v1").replace(
    /\/$/,
    "",
  );
  const lockedDatasetId = process.env.DIFY_DATASET_ID?.trim() || null;

  if (!apiKey) {
    throw new Error("DIFY_API_KEY is not set");
  }

  return { apiKey, apiBase, lockedDatasetId };
}

const DATASET_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertDatasetUuid(id: string, envKey: string) {
  if (id.startsWith("dataset-")) {
    throw new Error(
      `${envKey} must be the knowledge base UUID from the Dify URL, not a dataset- API key. Open Knowledge → your base → copy the UUID from the browser address bar.`,
    );
  }
  if (!DATASET_UUID.test(id)) {
    throw new Error(
      `${envKey} must be a UUID (e.g. 4632e6f5-be9d-4086-a783-28dccb80f9aa).`,
    );
  }
}

export function resolveCorpusDatasetId(corpus: CorpusId) {
  if (corpus !== "textbook") {
    throw new Error(`Unknown corpus: ${corpus}`);
  }
  const id = process.env.DIFY_DATASET_TEXTBOOK?.trim();
  if (!id) {
    throw new Error("DIFY_DATASET_TEXTBOOK is not set");
  }
  assertDatasetUuid(id, "DIFY_DATASET_TEXTBOOK");
  return id;
}

export function resolveDatasetId(requested: string | null | undefined) {
  const { lockedDatasetId } = getDifyConfig();
  return lockedDatasetId || String(requested ?? "").trim();
}

export function resolveDatasetFromRequest(options: {
  corpus?: string | null;
  datasetId?: string | null;
}) {
  const corpus = options.corpus?.trim() ?? "";
  if (corpus && isCorpusId(corpus)) {
    return resolveCorpusDatasetId(corpus);
  }
  return resolveDatasetId(options.datasetId);
}

export function getChatConfig() {
  const apiKey = process.env.DIFY_APP_CHAT_API_KEY?.trim();
  const apiBase = (
    process.env.DIFY_APP_CHAT_API_BASE ??
    process.env.DIFY_API_BASE ??
    "https://api.dify.ai/v1"
  ).replace(/\/$/, "");

  if (!apiKey || apiKey.includes("xxxxxxxx")) {
    throw new Error("DIFY_APP_CHAT_API_KEY is not set");
  }

  return { apiKey, apiBase };
}

/** Workflow app API key for lesson plan generation (POST /workflows/run). */
export function getLessonPlanConfig() {
  const apiKey = process.env.DIFY_APP_LESSON_API_KEY?.trim();
  const apiBase = (
    process.env.DIFY_APP_LESSON_API_BASE ??
    process.env.DIFY_API_BASE ??
    "https://api.dify.ai/v1"
  ).replace(/\/$/, "");

  if (!apiKey || apiKey.includes("xxxxxxxx")) {
    throw new Error("DIFY_APP_LESSON_API_KEY is not set");
  }

  return { apiKey, apiBase };
}

/**
 * Optional Chatflow app for multi-turn refinement (POST /chat-messages).
 * When set, refine requests can pass conversation_id for follow-ups.
 */
export function getLessonPlanRefineConfig() {
  const apiKey = process.env.DIFY_APP_LESSON_REFINE_API_KEY?.trim();
  if (!apiKey || apiKey.includes("xxxxxxxx")) {
    throw new Error("DIFY_APP_LESSON_REFINE_API_KEY is not set");
  }
  const apiBase = (
    process.env.DIFY_APP_LESSON_REFINE_API_BASE ??
    process.env.DIFY_APP_LESSON_API_BASE ??
    process.env.DIFY_API_BASE ??
    "https://api.dify.ai/v1"
  ).replace(/\/$/, "");

  return { apiKey, apiBase };
}

export function isLessonPlanRefineConfigured() {
  try {
    getLessonPlanRefineConfig();
    return true;
  } catch {
    return false;
  }
}

/** Workflow that analyzes chat transcript for teaching topic (POST /workflows/run, blocking). */
export function getTopicAnalysisConfig() {
  const apiKey = process.env.DIFY_APP_TOPIC_API_KEY?.trim();
  const apiBase = (
    process.env.DIFY_APP_TOPIC_API_BASE ??
    process.env.DIFY_API_BASE ??
    "https://api.dify.ai/v1"
  ).replace(/\/$/, "");

  if (!apiKey || apiKey.includes("xxxxxxxx")) {
    throw new Error("DIFY_APP_TOPIC_API_KEY is not set");
  }

  return { apiKey, apiBase };
}

export function isTopicAnalysisConfigured() {
  try {
    getTopicAnalysisConfig();
    return true;
  } catch {
    return false;
  }
}

/** Profile Synthesizer workflow — Step 2 learner + footprint analysis (blocking). */
export function getProfileSynthesizerConfig() {
  const apiKey = process.env.DIFY_APP_PROFILE_SYNTHESIS_API_KEY?.trim();
  const apiBase = (
    process.env.DIFY_APP_PROFILE_SYNTHESIS_API_BASE ??
    process.env.DIFY_API_BASE ??
    "https://api.dify.ai/v1"
  ).replace(/\/$/, "");

  if (!apiKey || apiKey.includes("xxxxxxxx")) {
    throw new Error("DIFY_APP_PROFILE_SYNTHESIS_API_KEY is not set");
  }

  return { apiKey, apiBase };
}

export function isProfileSynthesizerConfigured() {
  try {
    getProfileSynthesizerConfig();
    return true;
  } catch {
    return false;
  }
}

function pedagogyApiBase() {
  return (
    process.env.DIFY_APP_PEDAGOGY_API_BASE ??
    process.env.DIFY_APP_PEDAGOGY_WORKFLOW_API_BASE ??
    process.env.DIFY_API_BASE ??
    "https://api.dify.ai/v1"
  ).replace(/\/$/, "");
}

/** Pedagogical Strategy workflow — Step 3 page load (POST /workflows/run). */
export function getPedagogyWorkflowConfig() {
  const apiKey =
    process.env.DIFY_APP_PEDAGOGY_WORKFLOW_API_KEY?.trim() ||
    process.env.DIFY_APP_PEDAGOGY_API_KEY?.trim();

  if (!apiKey || apiKey.includes("xxxxxxxx")) {
    throw new Error(
      "DIFY_APP_PEDAGOGY_WORKFLOW_API_KEY or DIFY_APP_PEDAGOGY_API_KEY is not set",
    );
  }

  return { apiKey, apiBase: pedagogyApiBase() };
}

export function isPedagogyWorkflowConfigured() {
  try {
    getPedagogyWorkflowConfig();
    return true;
  } catch {
    return false;
  }
}

/** Pedagogical Strategy chat — Step 3 follow-up (POST /chat-messages, streaming). */
export function getPedagogyChatConfig() {
  const apiKey =
    process.env.DIFY_APP_PEDAGOGY_CHAT_API_KEY?.trim() ||
    process.env.DIFY_APP_PEDAGOGY_API_KEY?.trim();
  const apiBase = (
    process.env.DIFY_APP_PEDAGOGY_CHAT_API_BASE ??
    pedagogyApiBase()
  ).replace(/\/$/, "");

  if (!apiKey || apiKey.includes("xxxxxxxx")) {
    throw new Error(
      "DIFY_APP_PEDAGOGY_CHAT_API_KEY or DIFY_APP_PEDAGOGY_API_KEY is not set",
    );
  }

  return { apiKey, apiBase };
}

export type PedagogyAppMode = "chatflow" | "workflow";

/** Dify app type for Step 3 — must match the API route (chat-messages vs workflows/run). */
export function getPedagogyAppMode(): PedagogyAppMode {
  const raw = process.env.DIFY_APP_PEDAGOGY_APP_MODE?.trim().toLowerCase();
  if (raw === "workflow" || raw === "chatflow") {
    return raw;
  }
  return "chatflow";
}

export function getPedagogyConfigForMode(mode: PedagogyAppMode = getPedagogyAppMode()) {
  return mode === "workflow" ? getPedagogyWorkflowConfig() : getPedagogyChatConfig();
}

export function isPedagogyChatConfigured() {
  try {
    getPedagogyConfigForMode();
    return true;
  } catch {
    return false;
  }
}

function pedagogyIndividualApiBase() {
  return (
    process.env.DIFY_APP_PEDAGOGY_INDIVIDUAL_API_BASE?.trim() ||
    pedagogyApiBase()
  ).replace(/\/$/, "");
}

/** Step 3 — per-student individualized refine (Dify User Input: topic/scope/visual + current_* + learner_profile). */
export function getPedagogyIndividualRefineConfig() {
  const apiKey =
    process.env.DIFY_APP_PEDAGOGY_INDIVIDUAL_API_KEY?.trim() ||
    process.env.DIFY_APP_PEDAGOGY_API_KEY?.trim();

  if (!apiKey || apiKey.includes("xxxxxxxx")) {
    throw new Error(
      "DIFY_APP_PEDAGOGY_INDIVIDUAL_API_KEY or DIFY_APP_PEDAGOGY_API_KEY is not set",
    );
  }

  return { apiKey, apiBase: pedagogyIndividualApiBase() };
}

export function isPedagogyIndividualRefineConfigured() {
  try {
    getPedagogyIndividualRefineConfig();
    return true;
  } catch {
    return false;
  }
}

export type PedagogyIndividualAppMode = "chatflow" | "workflow";

export function getPedagogyIndividualRefineAppMode(): PedagogyIndividualAppMode {
  const raw = process.env.DIFY_APP_PEDAGOGY_INDIVIDUAL_APP_MODE?.trim().toLowerCase();
  if (raw === "workflow" || raw === "chatflow") {
    return raw;
  }
  return "chatflow";
}

export function getPedagogyIndividualRefineConfigForMode(
  mode: PedagogyIndividualAppMode = getPedagogyIndividualRefineAppMode(),
) {
  const base = getPedagogyIndividualRefineConfig();
  return mode === "workflow" ? base : { ...base, apiBase: pedagogyIndividualApiBase() };
}

export async function difyFetch(path: string, init?: RequestInit) {
  const { apiKey, apiBase } = getDifyConfig();
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  return response;
}

export async function readDifyError(response: Response) {
  const text = await response.text();
  if (text.trimStart().startsWith("<!") || text.includes("<html")) {
    if (response.status === 404) {
      return "Dify returned 404. Check DIFY_API_BASE and that dataset IDs are UUIDs from Knowledge → your base → URL, not API keys.";
    }
    return `Dify error ${response.status} (unexpected HTML response).`;
  }
  try {
    const json = JSON.parse(text) as { message?: string; code?: string };
    return json.message || json.code || text || `Dify error ${response.status}`;
  } catch {
    return text || `Dify error ${response.status}`;
  }
}

export async function fetchCorpusDocumentTotal(corpus: CorpusId) {
  const datasetId = resolveCorpusDatasetId(corpus);
  const response = await difyFetch(
    `/datasets/${datasetId}/documents?page=1&limit=1`,
  );

  if (!response.ok) {
    throw new Error(await readDifyError(response));
  }

  const payload = (await response.json()) as { total?: number };
  return {
    corpus,
    datasetId,
    documentCount: payload.total ?? 0,
  };
}
