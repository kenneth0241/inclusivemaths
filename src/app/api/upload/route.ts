import { NextResponse } from "next/server";
import { difyFetch, getDifyConfig, readDifyError } from "@/lib/dify";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { lockedDatasetId } = getDifyConfig();
    const form = await request.formData();
    const file = form.get("file");
    const requestedDatasetId = String(form.get("datasetId") ?? "").trim();
    const datasetId = lockedDatasetId || requestedDatasetId;

    if (!datasetId) {
      return NextResponse.json(
        { error: "Select a knowledge base first." },
        { status: 400 },
      );
    }

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "Please choose a file to upload." },
        { status: 400 },
      );
    }

    const outbound = new FormData();
    outbound.append("file", file, file.name);
    outbound.append(
      "data",
      JSON.stringify({
        indexing_technique: "high_quality",
        process_rule: { mode: "automatic" },
      }),
    );

    const response = await difyFetch(
      `/datasets/${datasetId}/document/create-by-file`,
      {
        method: "POST",
        body: outbound,
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: await readDifyError(response) },
        { status: response.status },
      );
    }

    const payload = (await response.json()) as {
      batch?: string;
      document?: { id?: string; name?: string; indexing_status?: string };
    };

    return NextResponse.json({
      datasetId,
      batch: payload.batch ?? null,
      document: payload.document ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upload to Dify failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
