import { NextResponse } from "next/server";
import { getProfileSynthesizerConfig, readDifyError } from "@/lib/dify";
import {
  buildProfileSynthesizerPayload,
  parseProfileSynthesizerOutputs,
  type ProfileSynthesizerInput,
} from "@/lib/profile-synthesizer";
import { readStudentsFile } from "@/lib/students-store";
import { isStudioContextReady, type ContentFootprint } from "@/lib/workflow-draft";

export const maxDuration = 120;

type ProfileSynthesizerBody = {
  classId?: string;
  studentIds?: string[];
  classProfile?: string;
  footprint?: Partial<ContentFootprint>;
};

export async function POST(request: Request) {
  try {
    const { apiKey, apiBase } = getProfileSynthesizerConfig();
    const body = (await request.json()) as ProfileSynthesizerBody;

    const classId = body.classId?.trim() ?? "";
    const studentIds = Array.isArray(body.studentIds)
      ? body.studentIds.filter((id) => typeof id === "string" && id.trim())
      : [];
    const classProfile = body.classProfile?.trim() ?? "";
    const footprint = body.footprint ?? {};

    if (!classId) {
      return NextResponse.json({ error: "classId is required." }, { status: 400 });
    }
    if (studentIds.length === 0) {
      return NextResponse.json(
        { error: "Select at least one student before running analysis." },
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

    const roster = await readStudentsFile();
    const students = studentIds
      .map((id) =>
        roster.find(
          (student) => student.class === classId && student.id === id,
        ),
      )
      .filter((student): student is NonNullable<typeof student> => student != null);

    if (students.length === 0) {
      return NextResponse.json(
        { error: "No matching students found in roster for this class." },
        { status: 400 },
      );
    }

    const input: ProfileSynthesizerInput = {
      classId,
      studentIds,
      classProfile,
      footprint: normalizedFootprint,
      students,
    };

    const difyResponse = await fetch(`${apiBase}/workflows/run`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: buildProfileSynthesizerPayload(input),
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
            "Profile Synthesizer workflow failed in Dify.",
        },
        { status: 502 },
      );
    }

    const outputs = payload.data?.outputs ?? {};
    const parsed = parseProfileSynthesizerOutputs(outputs);

    if (!parsed.pedagogicalConstraints) {
      return NextResponse.json(
        {
          error:
            "Profile Synthesizer returned no profile_analysis output.",
          raw: outputs,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      pedagogicalConstraints: parsed.pedagogicalConstraints,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Profile synthesis failed.";
    const status = message.includes("DIFY_APP_PROFILE_SYNTHESIS_API_KEY")
      ? 503
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
