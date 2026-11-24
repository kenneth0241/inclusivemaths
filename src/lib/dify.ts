import { type CorpusId, isCorpusId } from "./corpus";

/** Ensure requests hit the REST API (…/v1), not the browser console URL. */
export function normalizeDifyApiBase(raw: string | undefined): string {
  const fallback = "https://api.dify.ai/v1";
  const trimmed = raw?.trim().replace(/\/$/, "") ?? "";
  if (!trimmed) {
    return fallback;
  }
  try {
    const url = new URL(
      trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
    );
    let path = url.pathname.replace(/\/$/, "") || "";
    path = path.replace(/\/(chat-messages|workflows\/run)$/i, "");
    const studioHosts = new Set([
      "cloud.dify.ai",
      "udify.app",
      "www.dify.ai",
      "dify.ai",
    ]);
    if (studioHosts.has(url.hostname)) {
      return "https://api.dify.ai/v1";
    }
    if (path === "" || path === "/") {
      return `${url.origin}/v1`;
    }
    if (url.hostname === "api.dify.ai" && !path.endsWith("/v1")) {
      return `${url.origin}/v1`;
    }
    const resolved = path ? `${url.origin}${path}` : url.origin;
    if (!/^https?:\/\//i.test(resolved)) {
      return fallback;
    }
    return resolved;
  } catch {
    const cleaned = trimmed.replace(/\/(chat-messages|workflows\/run)$/i, "");
    const withV1 = cleaned.endsWith("/v1") ? cleaned : `${cleaned}/v1`;
    return /^https?:\/\//i.test(withV1) ? withV1 : fallback;
  }
}

export function isCloudflareBlockResponse(status: number, text: string): boolean {
  return (
    (status === 403 || status === 429 || status === 503) &&
    (text.trimStart().startsWith("<!") ||
      text.includes("<html") ||
      /cloudflare/i.test(text))
  );
}

export function difyServiceHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey.trim()}`,
    "Content-Type": "application/json",
    Accept: "text/event-stream, application/json",
    "User-Agent": "InclusiveMaths-TeacherApp/1.0",
  };
}

/** Absolute URL for a Dify REST path (e.g. `/chat-messages`). */
export function buildDifyApiUrl(apiBase: string, endpoint: string): string {
  const base = normalizeDifyApiBase(apiBase);
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (!/^https?:\/\//i.test(base)) {
    throw new Error(
      `Dify API base must be an absolute https URL (e.g. https://api.dify.ai/v1), not "${base}".`,
    );
  }
  return `${base.replace(/\/$/, "")}${path}`;
}

export type DifyDebugMeta = {
  requestUrl: string;
  apiBase: string;
  credential: string;
  appMode: string;
  refineScope?: string;
  status: number;
  contentType: string | null;
  bodyPreview: string;
};

/** App endpoints need app- keys from API Access, not dataset- knowledge keys. */
export function validateDifyAppApiKey(
  apiKey: string,
  envName: string,
): string | null {
  const trimmed = apiKey.trim();
  if (trimmed.startsWith("dataset-")) {
    return `${envName} looks like a knowledge/dataset key (dataset-…). Use an app- key from your Dify app → API Access.`;
  }
  return null;
}

export function buildDifyHttpHint(options: {
  status: number;
  apiBase: string;
  endpoint: string;
  appMode?: string;
}): string {
  if (options.status !== 403 && options.status !== 401) {
    return "";
  }
  const lines = [
    `Endpoint: ${options.apiBase}${options.endpoint}${options.appMode ? ` (${options.appMode})` : ""}.`,
    "Use an app API key from Dify → your app → API Access (starts with app-, not dataset-).",
    "Set DIFY_API_BASE or DIFY_APP_PEDAGOGY_INDIVIDUAL_API_BASE to https://api.dify.ai/v1 — not https://cloud.dify.ai (studio UI returns HTML errors).",
    "Publish the Chatflow app; draft-only keys sometimes return 403.",
  ];
  if (options.appMode === "workflow" && options.endpoint.includes("chat-messages")) {
    lines.push(
      "This call uses /chat-messages — set DIFY_APP_PEDAGOGY_INDIVIDUAL_APP_MODE=chatflow, or switch the Dify app type.",
    );
  }
  if (options.appMode === "chatflow" && options.endpoint.includes("workflows")) {
    lines.push(
      "This call uses /workflows/run — set DIFY_APP_PEDAGOGY_INDIVIDUAL_APP_MODE=workflow, or use a Chatflow app.",
    );
  }
  return lines.join(" ");
}

export function getDifyConfig() {
  const apiKey = process.env.DIFY_API_KEY?.trim();
  const apiBase = normalizeDifyApiBase(process.env.DIFY_API_BASE);
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
  const apiBase = normalizeDifyApiBase(
    process.env.DIFY_APP_CHAT_API_BASE ?? process.env.DIFY_API_BASE,
  );

  if (!apiKey || apiKey.includes("xxxxxxxx")) {
    throw new Error("DIFY_APP_CHAT_API_KEY is not set");
  }

  return { apiKey, apiBase };
}

/** Workflow app API key for lesson plan generation (POST /workflows/run). */
export function getLessonPlanConfig() {
  const apiKey = process.env.DIFY_APP_LESSON_API_KEY?.trim();
  const apiBase = normalizeDifyApiBase(
    process.env.DIFY_APP_LESSON_API_BASE ?? process.env.DIFY_API_BASE,
  );

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
  const apiBase = normalizeDifyApiBase(
    process.env.DIFY_APP_LESSON_REFINE_API_BASE ??
      process.env.DIFY_APP_LESSON_API_BASE ??
      process.env.DIFY_API_BASE,
  );

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
  const apiBase = normalizeDifyApiBase(
    process.env.DIFY_APP_TOPIC_API_BASE ?? process.env.DIFY_API_BASE,
  );

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
  const apiBase = normalizeDifyApiBase(
    process.env.DIFY_APP_PROFILE_SYNTHESIS_API_BASE ?? process.env.DIFY_API_BASE,
  );

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
  return normalizeDifyApiBase(
    process.env.DIFY_APP_PEDAGOGY_API_BASE ??
      process.env.DIFY_APP_PEDAGOGY_WORKFLOW_API_BASE ??
      process.env.DIFY_API_BASE,
  );
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
  const apiBase = normalizeDifyApiBase(
    process.env.DIFY_APP_PEDAGOGY_CHAT_API_BASE ?? pedagogyApiBase(),
  );

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
  return normalizeDifyApiBase(
    process.env.DIFY_APP_PEDAGOGY_INDIVIDUAL_API_BASE?.trim() ||
      process.env.DIFY_APP_PEDAGOGY_CHAT_API_BASE?.trim() ||
      pedagogyApiBase(),
  );
}

/** Step 3 — per-student individualized refine (name, topic/scope/visual, student_bottleneck_analysis, theory, strategies, applied_modes). */
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

/** Step 4 — per-learner HTML game chatflow (POST /chat-messages). */
export function getGameChatConfig() {
  const apiKey = process.env.DIFY_APP_GAME_API_KEY?.trim();
  const apiBase = normalizeDifyApiBase(
    process.env.DIFY_APP_GAME_API_BASE?.trim() ||
      process.env.DIFY_APP_PEDAGOGY_CHAT_API_BASE?.trim() ||
      pedagogyApiBase(),
  );
  if (!apiKey || apiKey.includes("xxxxxxxx")) {
    throw new Error("DIFY_APP_GAME_API_KEY is not set");
  }
  return { apiKey, apiBase };
}

export function isGameChatConfigured() {
  try {
    getGameChatConfig();
    return true;
  } catch {
    return false;
  }
}

/** Step 4 — UDL / whole-class HTML game chatflow (separate Dify app). */
export function getGameUdlChatConfig() {
  const apiKey = process.env.DIFY_APP_GAME_UDL_API_KEY?.trim();
  const apiBase = normalizeDifyApiBase(
    process.env.DIFY_APP_GAME_UDL_API_BASE?.trim() ||
      process.env.DIFY_APP_GAME_API_BASE?.trim() ||
      process.env.DIFY_APP_PEDAGOGY_CHAT_API_BASE?.trim() ||
      pedagogyApiBase(),
  );
  if (!apiKey || apiKey.includes("xxxxxxxx")) {
    throw new Error("DIFY_APP_GAME_UDL_API_KEY is not set");
  }
  return { apiKey, apiBase };
}

export function isGameUdlChatConfigured() {
  try {
    getGameUdlChatConfig();
    return true;
  } catch {
    return false;
  }
}

/** Step 4.2 — SEN worksheet chatflow (POST /chat-messages). */
export function getWorksheetChatConfig() {
  const apiKey = process.env.DIFY_APP_WORKSHEET_API_KEY?.trim();
  const apiBase = normalizeDifyApiBase(
    process.env.DIFY_APP_WORKSHEET_API_BASE?.trim() ||
      process.env.DIFY_APP_GAME_API_BASE?.trim() ||
      process.env.DIFY_APP_PEDAGOGY_CHAT_API_BASE?.trim() ||
      pedagogyApiBase(),
  );
  if (!apiKey || apiKey.includes("xxxxxxxx")) {
    throw new Error("DIFY_APP_WORKSHEET_API_KEY is not set");
  }
  return { apiKey, apiBase };
}

export function isWorksheetChatConfigured() {
  try {
    getWorksheetChatConfig();
    return true;
  } catch {
    return false;
  }
}

/** Step 4.2 — UDL / whole-class worksheet chatflow (separate Dify app). */
export function getWorksheetUdlChatConfig() {
  const apiKey =
    process.env.DIFY_APP_WORKSHEET_UDL_API_KEY?.trim() ||
    process.env.DIFY_APP_WORKSHEET_UDI_API_KEY?.trim();
  const apiBase = normalizeDifyApiBase(
    process.env.DIFY_APP_WORKSHEET_UDL_API_BASE?.trim() ||
      process.env.DIFY_APP_WORKSHEET_UDI_API_BASE?.trim() ||
      process.env.DIFY_APP_WORKSHEET_API_BASE?.trim() ||
      process.env.DIFY_APP_GAME_API_BASE?.trim() ||
      process.env.DIFY_APP_PEDAGOGY_CHAT_API_BASE?.trim() ||
      pedagogyApiBase(),
  );
  if (!apiKey || apiKey.includes("xxxxxxxx")) {
    throw new Error(
      "DIFY_APP_WORKSHEET_UDL_API_KEY is not set (alias: DIFY_APP_WORKSHEET_UDI_API_KEY)",
    );
  }
  return { apiKey, apiBase };
}

export function isWorksheetUdlChatConfigured() {
  try {
    getWorksheetUdlChatConfig();
    return true;
  } catch {
    return false;
  }
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
    if (response.status === 403 || response.status === 401) {
      if (/cloudflare/i.test(text)) {
        return `Dify error ${response.status} (Cloudflare blocked the request — often a duplicate rapid call). Retry once; the message may still appear in Dify.`;
      }
      return `Dify error ${response.status} (HTML response — wrong API URL or app key). Use …/v1 and an app- key from API Access, not the console login URL.`;
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

export async function describeDifyResponse(
  response: Response,
  meta: Omit<DifyDebugMeta, "status" | "contentType" | "bodyPreview">,
): Promise<{ message: string; debug: DifyDebugMeta }> {
  const text = await response.text();
  const fake = new Response(text, {
    status: response.status,
    headers: response.headers,
  });
  const message = await readDifyError(fake);
  return {
    message,
    debug: {
      ...meta,
      status: response.status,
      contentType: response.headers.get("content-type"),
      bodyPreview: text.replace(/\s+/g, " ").trim().slice(0, 160),
    },
  };
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
