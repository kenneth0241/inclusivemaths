import { connection } from "next/server";
import { NextResponse } from "next/server";
import { buildGameUdlDifyInputs } from "@/lib/game-generation";
import {
  buildDifyApiUrl,
  difyServiceHeaders,
  getGameUdlChatConfig,
  isGameUdlChatConfigured,
  normalizeDifyApiBase,
} from "@/lib/dify";
import { DEFAULT_GAME_PARAMETERS } from "@/lib/game-parameters";
import { DEFAULT_CONTENT_FOOTPRINT } from "@/lib/workflow-draft";

export async function GET() {
  await connection();
  if (!isGameUdlChatConfigured()) {
    return NextResponse.json({
      ok: false,
      error: "DIFY_APP_GAME_UDL_API_KEY is not set.",
    });
  }

  const { apiKey, apiBase } = getGameUdlChatConfig();
  const inputs = buildGameUdlDifyInputs({
    footprint: {
      ...DEFAULT_CONTENT_FOOTPRINT,
      topicSummary: "probe",
      scope: "probe",
    },
    learner: {
      classId: "probe",
      studentIds: [],
      senTags: [],
      classProfile: "",
      pedagogicalSynthesis: "",
      profileSynthesisStructured: null,
    },
    parameters: DEFAULT_GAME_PARAMETERS,
    pedagogy: {
      conversationId: "",
      educationalTheory: "UDL theory probe",
      learningStrategies: "UDL strategies probe",
      udl: null,
      individualized: [],
      lastInputFingerprint: "",
    },
    currentCode: "",
  });

  const url = buildDifyApiUrl(normalizeDifyApiBase(apiBase), "/chat-messages");
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: difyServiceHeaders(apiKey),
      body: JSON.stringify({
        inputs,
        query: "health-check",
        response_mode: "blocking",
        user: "game-udl-health-probe",
      }),
      cache: "no-store",
    });
    const text = await response.text();
    return NextResponse.json({
      ok: response.ok,
      status: response.status,
      inputKeys: Object.keys(inputs),
      bodyPreview: text.slice(0, 400),
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Probe failed",
      inputKeys: Object.keys(inputs),
    });
  }
}