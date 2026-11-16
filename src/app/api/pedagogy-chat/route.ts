import { NextResponse } from "next/server";
import { createPedagogyIndividualChatflowTransform } from "@/lib/pedagogy-individual-chatflow";
import {
  buildPedagogyIndividualRefineInputs,
  buildPedagogyStrategyPayload,
  combinePedagogyWorkflowAnswer,
  formatPedagogyChatHistory,
  parsePedagogyWorkflowOutputs,
  toPedagogyStructuredPayload,
  tryParsePedagogyStructuredAnswerText,
} from "@/lib/pedagogy-strategy";
import {
  buildDifyApiUrl,
  buildDifyHttpHint,
  describeDifyResponse,
  difyServiceHeaders,
  isCloudflareBlockResponse,
  normalizeDifyApiBase,
  getPedagogyAppMode,
  getPedagogyConfigForMode,
  getPedagogyIndividualRefineAppMode,
  getPedagogyIndividualRefineConfigForMode,
  readDifyError,
  validateDifyAppApiKey,
} from "@/lib/dify";
import type { PedagogyIndividualRefineDifyInputs } from "@/lib/pedagogy-strategy";
import { normalizePedagogyAppliedModes } from "@/lib/pedagogy-applied-modes";
import type { PedagogyIndividualizedRow } from "@/lib/workflow-draft";
import { readStudentsFile } from "@/lib/students-store";
import {
  isStudioContextReady,
  type ContentFootprint,
  type LearnerProfile,
} from "@/lib/workflow-draft";

export const maxDuration = 120;

type PedagogyTranscriptItem = {
  role?: string;
  content?: string;
};

type PedagogyChatBody = {
  query?: string;
  conversation_id?: string;
  transcript?: PedagogyTranscriptItem[];
  footprint?: Partial<ContentFootprint>;
  learner?: Partial<LearnerProfile>;
  refine_scope?: "udl" | "student";
  student_index?: number;
  student_id?: string;
  student_profile?: string;
  individualized_row?: PedagogyIndividualizedRow;
};

function sseFromPedagogyWorkflow(
  answer: string,
  structured: ReturnType<typeof toPedagogyStructuredPayload>,
  meta: { refine_scope?: string; student_index?: number; chat_reply?: string },
) {
  const structuredEvent = JSON.stringify({
    event: "pedagogy_structured",
    refine_scope: meta.refine_scope,
    student_index: meta.student_index,
    ...(meta.chat_reply ? { chat_reply: meta.chat_reply } : {}),
    ...structured,
  });
  const payload = JSON.stringify({ event: "message", answer });
  const end = JSON.stringify({ event: "message_end" });
  return `data: ${structuredEvent}\n\ndata: ${payload}\n\ndata: ${end}\n\n`;
}

function sseFromAnswer(answer: string) {
  const payload = JSON.stringify({ event: "message", answer });
  const end = JSON.stringify({ event: "message_end" });
  return `data: ${payload}\n\ndata: ${end}\n\n`;
}

function pickPedagogyWorkflowText(record: Record<string, unknown>): string {
  for (const key of ["text", "answer", "output", "result"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function validateIndividualRefineInputs(
  inputs: PedagogyIndividualRefineDifyInputs,
): string | null {
  if (!inputs.name.trim()) {
    return "Individual refine needs a student name (check roster match).";
  }
  if (!inputs.topic_summary.trim()) {
    return "Individual refine needs Step 1 topic summary.";
  }
  if (
    !inputs.educational_theory.trim() &&
    !inputs.learning_strategies.trim()
  ) {
    return "Individual refine needs current theory or strategies on the student row (run Step 3 baseline first).";
  }
  return null;
}

function blockingChatResponseToSse(text: string): string {
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return `data: ${JSON.stringify({ event: "error", message: text.slice(0, 200) })}\n\n`;
  }
  const answer = typeof payload.answer === "string" ? payload.answer : "";
  const conversationId = payload.conversation_id;
  const lines = [
    `data: ${JSON.stringify({
      event: "message",
      answer,
      conversation_id: conversationId,
    })}\n\n`,
    `data: ${JSON.stringify({
      event: "message_end",
      answer,
      conversation_id: conversationId,
    })}\n\n`,
  ];
  return lines.join("");
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function postDifyChatMessage(options: {
  apiBase: string;
  apiKey: string;
  inputs: Record<string, string>;
  query: string;
  conversationId?: string;
  retryWithoutConversationOnAuthError?: boolean;
}): Promise<Response> {
  const requestUrl = buildDifyApiUrl(options.apiBase, "/chat-messages");
  const headers = difyServiceHeaders(options.apiKey);

  const buildBody = (
    conversationId: string | undefined,
    responseMode: "streaming" | "blocking",
  ) =>
    JSON.stringify({
      inputs: options.inputs,
      query: options.query,
      response_mode: responseMode,
      conversation_id: conversationId,
      user: "inclusive-maths-teacher",
    });

  let conversationId = options.conversationId;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(requestUrl, {
      method: "POST",
      headers,
      body: buildBody(conversationId, "streaming"),
      cache: "no-store",
    });

    if (response.ok && response.body) {
      return response;
    }

    const text = await response.text();

    if (
      options.retryWithoutConversationOnAuthError &&
      conversationId &&
      (response.status === 404 ||
        isCloudflareBlockResponse(response.status, text)) &&
      /conversation/i.test(text)
    ) {
      conversationId = undefined;
      continue;
    }

    if (isCloudflareBlockResponse(response.status, text) && attempt < 3) {
      await delay(200 * (attempt + 1));
      continue;
    }

    if (isCloudflareBlockResponse(response.status, text)) {
      const blocking = await fetch(requestUrl, {
        method: "POST",
        headers,
        body: buildBody(conversationId, "blocking"),
        cache: "no-store",
      });
      if (blocking.ok) {
        const blockingText = await blocking.text();
        return new Response(blockingChatResponseToSse(blockingText), {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
          },
        });
      }
    }

    return new Response(text, {
      status: response.status,
      headers: response.headers,
    });
  }

  return new Response("Dify chat request failed after retries.", { status: 502 });
}

function difyCredentialLabel(isStudentRefine: boolean, mode: string): string {
  if (isStudentRefine) {
    return "DIFY_APP_PEDAGOGY_INDIVIDUAL_API_KEY";
  }
  return mode === "workflow"
    ? "DIFY_APP_PEDAGOGY_API_KEY"
    : "DIFY_APP_PEDAGOGY_CHAT_API_KEY";
}

function resolveIndividualRow(
  body: PedagogyChatBody,
): PedagogyIndividualizedRow | null {
  const raw = body.individualized_row;
  if (!raw || typeof raw !== "object") {
    return null;
  }
  return {
    studentProfile: typeof raw.studentProfile === "string" ? raw.studentProfile : "",
    educationalTheoryZh:
      typeof raw.educationalTheoryZh === "string" ? raw.educationalTheoryZh : "",
    educationalTheoryEn:
      typeof raw.educationalTheoryEn === "string" ? raw.educationalTheoryEn : "",
    learningStrategiesZh:
      typeof raw.learningStrategiesZh === "string" ? raw.learningStrategiesZh : "",
    learningStrategiesEn:
      typeof raw.learningStrategiesEn === "string" ? raw.learningStrategiesEn : "",
    appliedModes: normalizePedagogyAppliedModes(raw.appliedModes),
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PedagogyChatBody;
    const isStudentRefine = body.refine_scope === "student";
    const studentMode = getPedagogyIndividualRefineAppMode();
    const mode = isStudentRefine ? studentMode : getPedagogyAppMode();
    const { apiKey, apiBase } = isStudentRefine
      ? getPedagogyIndividualRefineConfigForMode(studentMode)
      : getPedagogyConfigForMode(mode);

    const appKeyEnv = isStudentRefine
      ? "DIFY_APP_PEDAGOGY_INDIVIDUAL_API_KEY"
      : mode === "workflow"
        ? "DIFY_APP_PEDAGOGY_API_KEY"
        : "DIFY_APP_PEDAGOGY_CHAT_API_KEY";
    const appKeyProblem = validateDifyAppApiKey(apiKey, appKeyEnv);
    if (appKeyProblem) {
      return NextResponse.json({ error: appKeyProblem, pedagogyAppMode: mode }, { status: 400 });
    }

    const query = body.query?.trim() ?? "";
    if (!query) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const footprint: ContentFootprint = {
      topicSummary: body.footprint?.topicSummary?.trim() ?? "",
      scope: body.footprint?.scope?.trim() ?? "",
      visualModels: body.footprint?.visualModels?.trim() ?? "",
      edited: {
        topicSummary: false,
        scope: false,
        visualModels: false,
      },
    };
    const classId = body.learner?.classId?.trim() ?? "";
    const studentIds = Array.isArray(body.learner?.studentIds)
      ? body.learner.studentIds.filter(
          (id): id is string => typeof id === "string" && id.trim().length > 0,
        )
      : [];

    if (
      !isStudioContextReady({
        ...footprint,
        edited: { topicSummary: false, scope: false, visualModels: false },
      })
    ) {
      return NextResponse.json(
        { error: "Complete Step 1 content footprint first." },
        { status: 400 },
      );
    }

    const roster = await readStudentsFile();
    const students = studentIds
      .map((id) =>
        roster.find((student) => student.class === classId && student.id === id),
      )
      .filter((student): student is NonNullable<typeof student> => student != null);

    const individualizedRow = resolveIndividualRow(body);
    const studentIndex =
      typeof body.student_index === "number" ? body.student_index : undefined;
    const targetStudentId =
      body.student_id?.trim() ||
      (studentIndex !== undefined ? studentIds[studentIndex] : "");
    const matchedStudent = targetStudentId
      ? (roster.find(
          (student) => student.class === classId && student.id === targetStudentId,
        ) ?? null)
      : students.find(
          (student) =>
            individualizedRow?.studentProfile.includes(student.name) ||
            body.student_profile?.includes(student.name),
        ) ?? null;

    const baseInputs = buildPedagogyStrategyPayload({
      footprint,
      learner: {
        classId,
        studentIds,
        senTags: [],
        classProfile: body.learner?.classProfile?.trim() ?? "",
        pedagogicalSynthesis: body.learner?.pedagogicalSynthesis?.trim() ?? "",
        profileSynthesisStructured:
          body.learner?.profileSynthesisStructured ?? null,
      },
      students,
    });

    const individualInputs =
      isStudentRefine && individualizedRow
        ? buildPedagogyIndividualRefineInputs({
            footprint,
            row: individualizedRow,
            student: matchedStudent,
            learner: {
              profileSynthesisStructured:
                body.learner?.profileSynthesisStructured ?? null,
              pedagogicalSynthesis:
                body.learner?.pedagogicalSynthesis?.trim() ?? "",
            },
          })
        : null;

    const transcript = Array.isArray(body.transcript)
      ? body.transcript.filter(
          (item): item is { role: string; content: string } =>
            typeof item?.role === "string" && typeof item?.content === "string",
        )
      : [];

    if (mode === "workflow") {
      const chatHistory = formatPedagogyChatHistory(transcript);
      const workflowInputs = individualInputs
        ? {
            ...individualInputs,
            query,
            ...(chatHistory ? { chat_history: chatHistory } : {}),
          }
        : {
            ...baseInputs,
            query,
            ...(chatHistory ? { chat_history: chatHistory } : {}),
            ...(body.refine_scope ? { refine_scope: body.refine_scope } : {}),
            ...(body.student_profile?.trim()
              ? { student_profile: body.student_profile.trim() }
              : {}),
          };

      if (isStudentRefine && !individualInputs) {
        return NextResponse.json(
          {
            error:
              "Individualized refine requires individualized_row (current student strategy).",
          },
          { status: 400 },
        );
      }

      const difyResponse = await fetch(`${apiBase}/workflows/run`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: workflowInputs,
          response_mode: "blocking",
          user: "inclusive-maths-teacher",
        }),
        cache: "no-store",
      });

      if (!difyResponse.ok) {
        const message = await readDifyError(difyResponse);
        const hint = buildDifyHttpHint({
          status: difyResponse.status,
          apiBase,
          endpoint: "/workflows/run",
          appMode: mode,
        });
        return NextResponse.json(
          {
            error: hint ? `${message} ${hint}` : message,
            pedagogyAppMode: mode,
          },
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

      if (payload.data?.status === "failed") {
        return NextResponse.json(
          {
            error:
              payload.data.error ||
              "Pedagogical strategy workflow failed in Dify.",
            pedagogyAppMode: mode,
          },
          { status: 502 },
        );
      }

      const outputs = payload.data?.outputs ?? {};
      const parsed = parsePedagogyWorkflowOutputs(outputs);
      const rawText = pickPedagogyWorkflowText(outputs);
      const reparsed = rawText
        ? tryParsePedagogyStructuredAnswerText(rawText)
        : null;
      const structuredParsed = reparsed ?? parsed;
      const answer =
        (reparsed?.chatReply.trim()
          ? reparsed.chatReply.trim()
          : combinePedagogyWorkflowAnswer(parsed)) ||
        rawText ||
        "";

      if (!answer) {
        return NextResponse.json(
          {
            error:
              "Workflow returned no text. Add output fields (e.g. educational_theory, learning_strategies) or text.",
            raw: outputs,
            pedagogyAppMode: mode,
          },
          { status: 502 },
        );
      }

      return new Response(
        sseFromPedagogyWorkflow(
          answer,
          toPedagogyStructuredPayload(structuredParsed),
          {
            refine_scope: body.refine_scope,
            student_index: body.student_index,
            chat_reply: structuredParsed.chatReply.trim() || answer,
          },
        ),
        {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        },
      );
    }

    const conversationId = body.conversation_id?.trim() || undefined;

    const chatInputs = individualInputs ?? baseInputs;

    if (isStudentRefine && !individualInputs) {
      return NextResponse.json(
        {
          error:
            "Individualized refine requires individualized_row (current student strategy).",
        },
        { status: 400 },
      );
    }

    if (isStudentRefine && individualInputs) {
      const inputProblem = validateIndividualRefineInputs(individualInputs);
      if (inputProblem) {
        return NextResponse.json({ error: inputProblem }, { status: 400 });
      }
    }

    const difyResponse = await postDifyChatMessage({
      apiBase,
      apiKey,
      inputs: chatInputs as Record<string, string>,
      query,
      conversationId,
      retryWithoutConversationOnAuthError: isStudentRefine,
    });

    if (!difyResponse.ok || !difyResponse.body) {
      const requestUrl = buildDifyApiUrl(apiBase, "/chat-messages");
      const { message, debug } = await describeDifyResponse(difyResponse, {
        requestUrl,
        apiBase: normalizeDifyApiBase(apiBase),
        credential: difyCredentialLabel(isStudentRefine, mode),
        appMode: mode,
        refineScope: body.refine_scope,
      });
      console.error("[pedagogy-chat] Dify request failed", debug);
      const routeHint =
        message.includes("app mode matches the right API route")
          ? ' Your key is likely a Workflow app — set DIFY_APP_PEDAGOGY_APP_MODE=workflow in .env.local, or use a Chatflow app key with DIFY_APP_PEDAGOGY_APP_MODE=chatflow.'
          : "";
      const httpHint = buildDifyHttpHint({
        status: difyResponse.status,
        apiBase,
        endpoint: "/chat-messages",
        appMode: mode,
      });
      const parts = [message, routeHint, httpHint].filter(Boolean);
      return NextResponse.json(
        {
          error: parts.join(" "),
          pedagogyAppMode: mode,
          difyDebug: debug,
        },
        { status: difyResponse.status || 500 },
      );
    }

    const streamBody =
      isStudentRefine && mode === "chatflow"
        ? difyResponse.body.pipeThrough(
            createPedagogyIndividualChatflowTransform({
              refine_scope: "student",
              student_index: body.student_index,
            }),
          )
        : difyResponse.body;

    return new Response(streamBody, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Pedagogy chat request failed";
    return NextResponse.json(
      { error: message, pedagogyAppMode: getPedagogyAppMode() },
      { status: 500 },
    );
  }
}
