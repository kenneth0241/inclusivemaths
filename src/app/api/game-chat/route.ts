import { NextResponse } from "next/server";
import { buildGameDifyInputs } from "@/lib/game-generation";
import {
  buildDifyApiUrl,
  describeDifyResponse,
  difyServiceHeaders,
  getGameChatConfig,
  isGameChatConfigured,
  normalizeDifyApiBase,
  validateDifyAppApiKey,
} from "@/lib/dify";
import { readStudentsFile } from "@/lib/students-store";
import type { PedagogyIndividualizedRow } from "@/lib/workflow-draft";
import {
  isStudioContextReady,
  type ContentFootprint,
  type GameParameters,
  type LearnerProfile,
  type PedagogicalStrategyState,
} from "@/lib/workflow-draft";
import { createGameChatflowTransform } from "@/lib/game-chatflow";
import { normalizeGameParameters } from "@/lib/game-parameters";

export const maxDuration = 120;

type GameChatBody = {
  query?: string;
  conversation_id?: string;
  student_id?: string;
  footprint?: Partial<ContentFootprint>;
  learner?: Partial<LearnerProfile>;
  game_parameters?: unknown;
  individualized_row?: PedagogyIndividualizedRow;
  pedagogy?: Partial<PedagogicalStrategyState>;
  /** Full HTML for follow-up turns (code editor / preview). */
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
  const body = (await request.json()) as GameChatBody;
  const query = body.query?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }
  const studentId = body.student_id?.trim() ?? "";
  if (!studentId) {
    return NextResponse.json({ error: "student_id is required." }, { status: 400 });
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

  const classId = body.learner?.classId?.trim() ?? "";
  const learner: LearnerProfile = {
    classId,
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

  const roster = await readStudentsFile();
  const student =
    roster.find((row) => row.class === classId && row.id === studentId) ?? null;
  if (!student) {
    return NextResponse.json({ error: "Student not found in roster." }, { status: 400 });
  }

  const parameters: GameParameters = normalizeGameParameters(
    body.game_parameters,
  );
  const pedagogyRow = body.individualized_row ?? null;
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
  const currentCode =
    body.current_code?.trim() ?? body.current_html?.trim() ?? "";

  if (!isGameChatConfigured()) {
    return new Response(
      sseFromAnswer(
        "（預留）尚未設定 DIFY_APP_GAME_API_KEY。對話已記錄；接上 Dify game chatflow 後可串流 HTML。\n\n(Placeholder) Set DIFY_APP_GAME_API_KEY to wire per-learner game generation.",
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

  const { apiKey, apiBase } = getGameChatConfig();
  validateDifyAppApiKey(apiKey, "DIFY_APP_GAME_API_KEY");
  const inputs = buildGameDifyInputs({
    footprint,
    learner,
    parameters,
    student,
    pedagogy,
    pedagogyRow,
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
      user: `game-${studentId}`,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const { message } = await describeDifyResponse(response, {
      requestUrl: url,
      apiBase: normalizeDifyApiBase(apiBase),
      credential: "DIFY_APP_GAME_API_KEY",
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