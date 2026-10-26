import { NextResponse } from "next/server";
import { difyFetch, getDifyConfig, readDifyError } from "@/lib/dify";

export async function GET(request: Request) {
  try {
    const { lockedDatasetId } = getDifyConfig();
    const { searchParams } = new URL(request.url);
    const datasetId = lockedDatasetId || searchParams.get("datasetId") || "";
    const batch = searchParams.get("batch") || "";

    if (!datasetId || !batch) {
      return NextResponse.json(
        { error: "datasetId and batch are required." },
        { status: 400 },
      );
    }

    const response = await difyFetch(
      `/datasets/${datasetId}/documents/${batch}/indexing-status`,
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: await readDifyError(response) },
        { status: response.status },
      );
    }

    const payload = await response.json();
    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load indexing status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
