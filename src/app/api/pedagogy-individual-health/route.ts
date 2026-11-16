import { connection } from "next/server";
import { NextResponse } from "next/server";
import {
  buildDifyApiUrl,
  getPedagogyIndividualRefineAppMode,
  getPedagogyIndividualRefineConfig,
  normalizeDifyApiBase,
  readDifyError,
  validateDifyAppApiKey,
} from "@/lib/dify";

export async function GET() {
  await connection();
  try {
    const mode = getPedagogyIndividualRefineAppMode();
    const { apiKey, apiBase } = getPedagogyIndividualRefineConfig();
    const keyProblem = validateDifyAppApiKey(
      apiKey,
      "DIFY_APP_PEDAGOGY_INDIVIDUAL_API_KEY",
    );
    if (keyProblem) {
      return NextResponse.json({ ok: false, error: keyProblem }, { status: 400 });
    }

    const parametersUrl = buildDifyApiUrl(apiBase, "/parameters");
    const parametersResponse = await fetch(parametersUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    if (!parametersResponse.ok) {
      const error = await readDifyError(parametersResponse);
      return NextResponse.json(
        {
          ok: false,
          step: "parameters",
          apiBase: normalizeDifyApiBase(apiBase),
          requestUrl: parametersUrl,
          status: parametersResponse.status,
          contentType: parametersResponse.headers.get("content-type"),
          error,
        },
        { status: 502 },
      );
    }

    const chatUrl = buildDifyApiUrl(apiBase, "/chat-messages");
    const chatResponse = await fetch(chatUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {
          name: "health-check",
          topic_summary: "probe",
          scope_and_constraints: "probe",
          visual_models: "probe",
          student_bottleneck_analysis: "probe",
          educational_theory: "probe",
          learning_strategies: "probe",
          applied_modes: "Chunking (Low)",
        },
        query: "ping",
        response_mode: "blocking",
        user: "inclusive-maths-health",
      }),
      cache: "no-store",
    });

    if (!chatResponse.ok) {
      const error = await readDifyError(chatResponse);
      return NextResponse.json(
        {
          ok: false,
          step: "chat-messages",
          appMode: mode,
          apiBase: normalizeDifyApiBase(apiBase),
          requestUrl: chatUrl,
          status: chatResponse.status,
          contentType: chatResponse.headers.get("content-type"),
          error,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      appMode: mode,
      apiBase: normalizeDifyApiBase(apiBase),
      keyKind: apiKey.startsWith("app-") ? "app" : "other",
      chatUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Health check failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
