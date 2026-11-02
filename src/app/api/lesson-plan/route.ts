import { NextResponse } from "next/server";
import {
  getLessonPlanConfig,
  getLessonPlanRefineConfig,
  readDifyError,
} from "@/lib/dify";
import {
  formValuesToDifyInputs,
  type LessonPlanDifyExtras,
  type LessonPlanFormValues,
} from "@/lib/lesson-plan";

export const maxDuration = 120;

type LessonPlanRequestBody = {
  mode?: "generate" | "refine";
  topic?: string;
  classFocus?: string;
  learnerNotes?: string;
  durationMinutes?: string;
  requirements?: string;
  previousPlan?: string;
  refinement?: string;
  conversation_id?: string;
  contentScope?: string;
  visualModels?: string;
  exerciseFormats?: string;
  classId?: string;
  audience?: string;
  learnerProfileTag?: string;
  classProfile?: string;
};

function parseFormBody(body: LessonPlanRequestBody): LessonPlanFormValues | null {
  const topic = String(body.topic ?? "").trim();
  const requirements = String(body.requirements ?? "").trim();

  if (!topic || !requirements) {
    return null;
  }

  return {
    topic,
    classFocus: String(body.classFocus ?? "whole_class").trim(),
    learnerNotes: String(body.learnerNotes ?? "").trim(),
    durationMinutes: String(body.durationMinutes ?? "40").trim(),
    requirements,
  };
}

function extrasFromBody(body: LessonPlanRequestBody): LessonPlanDifyExtras {
  return {
    contentScope: body.contentScope,
    visualModels: body.visualModels,
    exerciseFormats: body.exerciseFormats,
    classId: body.classId,
    audience: body.audience,
    learnerProfileTag: body.learnerProfileTag,
    classProfile: body.classProfile,
  };
}

function buildWorkflowInputs(
  values: LessonPlanFormValues,
  options: {
    previousPlan?: string;
    refinement?: string;
    extras?: LessonPlanDifyExtras;
  },
) {
  const inputs = formValuesToDifyInputs(values, options.extras) as Record<
    string,
    string
  >;

  if (options.previousPlan?.trim()) {
    inputs.previous_plan = options.previousPlan.trim();
  }
  if (options.refinement?.trim()) {
    inputs.refinement = options.refinement.trim();
  }

  return inputs;
}

async function runWorkflowStream(inputs: Record<string, string>) {
  const { apiKey, apiBase } = getLessonPlanConfig();

  const difyResponse = await fetch(`${apiBase}/workflows/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs,
      response_mode: "streaming",
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

  // Workflow SSE: text_chunk events carry data.text (see Dify Run Workflow docs).
  return new Response(difyResponse.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

async function runRefineChatStream(options: {
  values: LessonPlanFormValues;
  extras?: LessonPlanDifyExtras;
  refinement: string;
  previousPlan: string;
  conversationId?: string;
}) {
  const { apiKey, apiBase } = getLessonPlanRefineConfig();
  const inputs = formValuesToDifyInputs(options.values, options.extras);

  const query = [
    "Please refine the lesson plan below based on the teacher's feedback.",
    "",
    "Teacher feedback:",
    options.refinement,
    "",
    "Current lesson plan:",
    options.previousPlan,
  ].join("\n");

  const difyResponse = await fetch(`${apiBase}/chat-messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs,
      query,
      response_mode: "streaming",
      conversation_id: options.conversationId,
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
      "X-Lesson-Plan-Stream": "chatflow-refine",
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LessonPlanRequestBody;
    const mode = body.mode === "refine" ? "refine" : "generate";
    const values = parseFormBody(body);

    if (!values) {
      return NextResponse.json(
        { error: "Topic and requirements are required." },
        { status: 400 },
      );
    }

    if (mode === "refine") {
      const refinement = String(body.refinement ?? "").trim();
      const previousPlan = String(body.previousPlan ?? "").trim();

      if (!refinement || !previousPlan) {
        return NextResponse.json(
          { error: "Refinement text and a previous plan are required." },
          { status: 400 },
        );
      }

      try {
        getLessonPlanRefineConfig();
        return runRefineChatStream({
          values,
          extras: extrasFromBody(body),
          refinement,
          previousPlan,
          conversationId: body.conversation_id?.trim() || undefined,
        });
      } catch {
        const inputs = buildWorkflowInputs(values, {
          previousPlan,
          refinement,
          extras: extrasFromBody(body),
        });
        return runWorkflowStream(inputs);
      }
    }

    const inputs = buildWorkflowInputs(values, { extras: extrasFromBody(body) });
    return runWorkflowStream(inputs);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lesson plan request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
