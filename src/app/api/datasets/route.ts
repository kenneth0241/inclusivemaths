import { NextResponse } from "next/server";
import { difyFetch, getDifyConfig, readDifyError } from "@/lib/dify";

type Dataset = {
  id: string;
  name: string;
  description?: string | null;
  document_count?: number;
};

export async function GET() {
  try {
    const { lockedDatasetId } = getDifyConfig();
    const response = await difyFetch("/datasets?page=1&limit=100");

    if (!response.ok) {
      return NextResponse.json(
        { error: await readDifyError(response) },
        { status: response.status },
      );
    }

    const payload = (await response.json()) as { data?: Dataset[] };
    let datasets = payload.data ?? [];

    if (lockedDatasetId) {
      datasets = datasets.filter((dataset) => dataset.id === lockedDatasetId);
    }

    return NextResponse.json({ datasets });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load knowledge bases";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
