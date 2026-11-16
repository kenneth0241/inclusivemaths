import { NextResponse } from "next/server";
import {
  buildPedagogyStrategyPayload,
  learnerProfileAnalysisReady,
  parsePedagogyWorkflowOutputs,
  PEDAGOGY_BASELINE_QUERY,
  toPedagogyStructuredPayload,
} from "@/lib/pedagogy-strategy";
import { getPedagogyAppMode, getPedagogyConfigForMode, readDifyError } from "@/lib/dify";
import { readStudentsFile } from "@/lib/students-store";
import {
  parseProfileSynthesisStructured,
  type ProfileSynthesisStructured,
} from "@/lib/profile-synthesizer";
import {
  isStudioContextReady,
  type ContentFootprint,
  type LearnerProfile,
} from "@/lib/workflow-draft";

export const maxDuration = 120;

type PedagogyStrategyBody = {
  classId?: string;
  studentIds?: string[];
  classProfile?: string;
  pedagogicalSynthesis?: string;
  profileSynthesisStructured?: ProfileSynthesisStructured | null;
  footprint?: Partial<ContentFootprint>;
};

export async function POST(request: Request) {
  try {
    const mode = getPedagogyAppMode();
    if (mode !== "workflow") {
      return NextResponse.json(
        {
          error:
            "Baseline analysis requires DIFY_APP_PEDAGOGY_APP_MODE=workflow.",
        },
        { status: 503 },
      );
    }
    const { apiKey, apiBase } = getPedagogyConfigForMode("workflow");
    const body = (await request.json()) as PedagogyStrategyBody;

    const classId = body.classId?.trim() ?? "";
    const studentIds = Array.isArray(body.studentIds)
      ? body.studentIds.filter((id) => typeof id === "string" && id.trim())
      : [];
    const classProfile = body.classProfile?.trim() ?? "";
    const pedagogicalSynthesis = body.pedagogicalSynthesis?.trim() ?? "";
    const profileSynthesisStructured = parseProfileSynthesisStructured(
      body.profileSynthesisStructured,
    );
    const footprint = body.footprint ?? {};

    if (!classId || studentIds.length === 0) {
      return NextResponse.json(
        { error: "Complete Step 2 learner selection first." },
        { status: 400 },
      );
    }

    const normalizedFootprint = {
      topicSummary: footprint.topicSummary?.trim() ?? "",
      scope: footprint.scope?.trim() ?? "",
      visualModels: footprint.visualModels?.trim() ?? "",
    };

    if (!isStudioContextReady(normalizedFootprint as ContentFootprint)) {
      return NextResponse.json(
        { error: "Complete Step 1 content footprint confirmation first." },
        { status: 400 },
      );
    }

    const learnerForPayload: LearnerProfile = {
      classId,
      studentIds,
      senTags: [],
      classProfile,
      pedagogicalSynthesis,
      profileSynthesisStructured,
    };

    if (!learnerProfileAnalysisReady(learnerForPayload)) {
      return NextResponse.json(
        { error: "Run Profile Synthesizer in Step 2 before strategy analysis." },
        { status: 400 },
      );
    }

    const roster = await readStudentsFile();
    const students = studentIds
      .map((id) =>
        roster.find((student) => student.class === classId && student.id === id),
      )
      .filter((student): student is NonNullable<typeof student> => student != null);

    if (students.length === 0) {
      return NextResponse.json(
        { error: "No matching students found in roster for this class." },
        { status: 400 },
      );
    }

    const inputs = buildPedagogyStrategyPayload({
      footprint: normalizedFootprint,
      learner: learnerForPayload,
      students,
    });

    const difyResponse = await fetch(`${apiBase}/workflows/run`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {
          ...inputs,
          query: PEDAGOGY_BASELINE_QUERY,
          refine_scope: "baseline",
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

    if (payload.data?.status === "failed") {
      return NextResponse.json(
        {
          error:
            payload.data.error ||
            "Pedagogical strategy workflow failed in Dify.",
        },
        { status: 502 },
      );
    }

    const outputs = payload.data?.outputs ?? {};
    const parsed = parsePedagogyWorkflowOutputs(outputs);

    const structured = toPedagogyStructuredPayload(parsed);
    if (
      !structured.educationalTheory &&
      !structured.learningStrategies &&
      structured.individualized.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Workflow returned no structured pedagogy output (UDL or individualized).",
          raw: outputs,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(structured);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Pedagogy strategy failed.";
    const status =
      message.includes("DIFY_APP_PEDAGOGY") || message.includes("PEDAGOGY")
        ? 503
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
