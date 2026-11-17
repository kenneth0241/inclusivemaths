import { NextResponse } from "next/server";
import { buildGameUdlDifyInputs } from "@/lib/game-generation";
import {
  buildDifyApiUrl,
  describeDifyResponse,
  difyServiceHeaders,
  getGameUdlChatConfig,
  isGameUdlChatConfigured,
  normalizeDifyApiBase,
  validateDifyAppApiKey,
} from "@/lib/dify";
import { createGameChatflowTransform } from "@/lib/game-chatflow";
import { normalizeGameParameters } from "@/lib/game-parameters";
import { hasClassUdlForGames } from "@/lib/game-udl-target";
import {
  isStudioContextReady,
  type ContentFootprint,
  type LearnerProfile,
  type PedagogicalStrategyState,
} from "@/lib/workflow-draft";

export const maxDuration = 120;

type GameUdlChatBody = {
  query?: string;
  conversation_id?: string;
  footprint?: Partial<ContentFootprint>;
  learner?: Partial<LearnerProfile>;
  game_parameters?: unknown;
  pedagogy?: Partial<PedagogicalStrategyState>;
  current_code?: string;
  current_html?: string;
};

function sseFromAnswer(answer: string, conversationId?: string) {
  const payload = JSON.stringify({
    event: "message",
    answer,
    ...(conversationId ? { conversation_id: conversationId } : {}),
  });
  const end = JSON.stringify({ event: "message_end" });
  return `data: ${payload}\n\ndata: ${end}\n\n`;
}

export async function POST(request: Request) {
  const body = (await request.json()) as GameUdlChatBody;
  const query = body.query?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const footprint: ContentFootprint = {
    topicSummary: body.footprint?.topicSummary?.trim() ?? "",
    scope: body.footprint?.scope?.trim() ?? "",
    visualModels: body.footprint?.visualModels?.trim() ?? "",
    edited: { topicSummary: false, scope: false, visualModels: false },
  };
  if (!isStudioContextReady(footprint)) {
    return NextResponse.json(
      { error: "Complete Step 1 content footprint first." },
      { status: 400 },
    );
  }

  const learner: LearnerProfile = {
    classId: body.learner?.classId?.trim() ?? "",
    studentIds: Array.isArray(body.learner?.studentIds)
      ? body.learner.studentIds.filter(
          (id): id is string => typeof id === "string" && id.trim().length > 0,
        )
      : [],
    senTags: [],
    classProfile: body.learner?.classProfile?.trim() ?? "",
    pedagogicalSynthesis: body.learner?.pedagogicalSynthesis?.trim() ?? "",
    profileSynthesisStructured: body.learner?.profileSynthesisStructured ?? null,
  };

  const parameters = normalizeGameParameters(body.game_parameters);
  const pedagogy: PedagogicalStrategyState = {
    conversationId: body.pedagogy?.conversationId?.trim() ?? "",
    educationalTheory: body.pedagogy?.educationalTheory?.trim() ?? "",
    learningStrategies: body.pedagogy?.learningStrategies?.trim() ?? "",
    udl: body.pedagogy?.udl ?? null,
    individualized: Array.isArray(body.pedagogy?.individualized)
      ? body.pedagogy.individualized
      : [],
    lastInputFingerprint: body.pedagogy?.lastInputFingerprint?.trim() ?? "",
  };

  if (!hasClassUdlForGames(pedagogy)) {
    return NextResponse.json(
      { error: "Complete Step 3 UDL / class learning strategies first." },
      { status: 400 },
    );
  }

  const currentCode =
    body.current_code?.trim() ?? body.current_html?.trim() ?? "";

  if (!isGameUdlChatConfigured()) {
    return new Response(
      sseFromAnswer(
        "（預留）尚未設定 DIFY_APP_GAME_UDL_API_KEY。對話已記錄；接上 UDL game chatflow 後可串流 HTML。\n\n(Placeholder) Set DIFY_APP_GAME_UDL_API_KEY to wire whole-class UDL game generation.",
        body.conversation_id,
      ),
      {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache",
        },
      },
    );
  }

  const { apiKey, apiBase } = getGameUdlChatConfig();
  validateDifyAppApiKey(apiKey, "DIFY_APP_GAME_UDL_API_KEY");
  const inputs = buildGameUdlDifyInputs({
    footprint,
    learner,
    parameters,
    pedagogy,
    currentCode,
  });

  const url = buildDifyApiUrl(normalizeDifyApiBase(apiBase), "/chat-messages");
  const response = await fetch(url, {
    method: "POST",
    headers: difyServiceHeaders(apiKey),
    body: JSON.stringify({
      inputs,
      query,
      response_mode: "streaming",
      conversation_id: body.conversation_id?.trim() || undefined,
      user: "game-udl",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const { message } = await describeDifyResponse(response, {
      requestUrl: url,
      apiBase: normalizeDifyApiBase(apiBase),
      credential: "DIFY_APP_GAME_UDL_API_KEY",
      appMode: "chatflow",
    });
    return NextResponse.json({ error: message }, { status: response.status });
  }

  if (!response.body) {
    return NextResponse.json({ error: "No response stream." }, { status: 502 });
  }

  const stream = response.body.pipeThrough(createGameChatflowTransform());

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}