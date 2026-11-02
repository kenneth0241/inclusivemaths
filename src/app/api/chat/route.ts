import { NextResponse } from "next/server";
import { getChatConfig, readDifyError } from "@/lib/dify";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const { apiKey, apiBase } = getChatConfig();
    const body = (await request.json()) as {
      query?: string;
      conversation_id?: string;
      grade?: number | string;
    };

    const query = body.query?.trim() ?? "";
    if (!query) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const grade = "1";
    const conversationId = body.conversation_id?.trim() || undefined;

    const difyResponse = await fetch(`${apiBase}/chat-messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {
          grade,
          subject: "maths",
        },
        query,
        response_mode: "streaming",
        conversation_id: conversationId,
        user: "inclusive-maths-teacher",
      }),
      cache: "no-store",
    });

    if (!difyResponse.ok || !difyResponse.body) {
      return NextResponse.json(
        { error: await readDifyError(difyResponse) },
        { status: difyResponse.status || 500 },
      );
    }

    return new Response(difyResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Chat request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
