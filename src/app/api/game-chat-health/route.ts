import { connection } from "next/server";
import { NextResponse } from "next/server";
import { buildGameDifyInputs } from "@/lib/game-generation";
import {
  buildDifyApiUrl,
  difyServiceHeaders,
  getGameChatConfig,
  isGameChatConfigured,
  normalizeDifyApiBase,
} from "@/lib/dify";
import { DEFAULT_GAME_PARAMETERS } from "@/lib/game-parameters";
import { DEFAULT_CONTENT_FOOTPRINT } from "@/lib/workflow-draft";

export async function GET() {
  await connection();
  if (!isGameChatConfigured()) {
    return NextResponse.json({
      ok: false,
      error: "DIFY_APP_GAME_API_KEY is not set.",
    });
  }

  const { apiKey, apiBase } = getGameChatConfig();
  const inputs = buildGameDifyInputs({
    footprint: {
      ...DEFAULT_CONTENT_FOOTPRINT,
      topicSummary: "probe",
      scope: "probe",
      visualModels: "ten-frame",
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
    student: { id: "00", name: "Probe", class: "probe" },
    pedagogy: {
      conversationId: "",
      educationalTheory: "",
      learningStrategies: "",
      udl: null,
      individualized: [],
      lastInputFingerprint: "",
    },
    pedagogyRow: null,
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
        user: "game-health-probe",
      }),
      cache: "no-store",
    });
    const text = await response.text();
    return NextResponse.json({
      ok: response.ok,
      status: response.status,
      inputKeys: Object.keys(inputs),
      bodyPreview: text.slice(0, 240),
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Probe failed",
      inputKeys: Object.keys(inputs),
    });
  }
}