import { NextResponse } from "next/server";
import {
  formatConversationTranscript,
  parseTopicWorkflowOutputs,
  stripVisibleChatContent,
  type ChatTurnForAnalysis,
} from "@/lib/chat-topic-analysis";
import { getTopicAnalysisConfig, readDifyError } from "@/lib/dify";

export const maxDuration = 60;

type TopicAnalysisBody = {
  messages?: ChatTurnForAnalysis[];
  conversation_id?: string;
};

export async function POST(request: Request) {
  try {
    const { apiKey, apiBase } = getTopicAnalysisConfig();
    const body = (await request.json()) as TopicAnalysisBody;

    const messages = Array.isArray(body.messages) ? body.messages : [];
    const validMessages = messages.filter(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim(),
    );

    if (validMessages.length === 0) {
      return NextResponse.json(
        { error: "No conversation messages to analyze." },
        { status: 400 },
      );
    }

    const transcript = formatConversationTranscript(validMessages);
    const chatHistoryJson = JSON.stringify(
      validMessages.map((message) => ({
        role: message.role,
        content: stripVisibleChatContent(message.content),
      })),
    );
    const chatConversationId = body.conversation_id?.trim() ?? "";

    const difyResponse = await fetch(`${apiBase}/workflows/run`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {
          grade: "1",
          subject: "maths",
          /** Common Dify start variable names for the same transcript */
          chat_history: transcript,
          conversation_transcript: transcript,
          chat_history_json: chatHistoryJson,
          chat_conversation_id: chatConversationId,
        },
        response_mode: "blocking",
        user: "inclusive-maths-teacher",
      }),
      cache: "no-store",
    });

    if (!difyResponse.ok) {
      return NextResponse.json(
        { error: await readDifyError(difyResponse) },
        { status: difyResponse.status || 500 },
      );
    }

    const payload = (await difyResponse.json()) as {
      data?: {
        status?: string;
        error?: string;
        outputs?: Record<string, unknown>;
      };
    };

    const status = payload.data?.status;
    if (status === "failed") {
      return NextResponse.json(
        {
          error:
            payload.data?.error ||
            "Topic analysis workflow failed in Dify.",
        },
        { status: 502 },
      );
    }

    const outputs = payload.data?.outputs ?? {};
    const parsed = parseTopicWorkflowOutputs(outputs);

    return NextResponse.json({
      source: "dify" as const,
      summary: parsed.summary,
      topic: parsed.topic,
      footprint: parsed.footprint,
      quality: parsed.quality,
      scopeQualityReason: parsed.scopeQualityReason,
      visualModelsQualityReason: parsed.visualModelsQualityReason,
      scopeFeedback: parsed.scopeFeedback,
      visualFeedback: parsed.visualFeedback,
      ready: parsed.ready,
      suggestedQuestion: parsed.suggestedQuestion,
      reason: parsed.reason,
      confidence: parsed.quality.scope,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Topic analysis failed.";
    const status = message.includes("DIFY_APP_TOPIC_API_KEY") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
