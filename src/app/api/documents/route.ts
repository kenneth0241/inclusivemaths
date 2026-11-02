import { NextResponse } from "next/server";
import {
  difyFetch,
  readDifyError,
  resolveDatasetFromRequest,
} from "@/lib/dify";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const datasetId = resolveDatasetFromRequest({
      corpus: searchParams.get("corpus"),
      datasetId: searchParams.get("datasetId"),
    });
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit") ?? "20") || 20),
    );
    const keyword = searchParams.get("keyword")?.trim() ?? "";

    if (!datasetId) {
      return NextResponse.json(
        { error: "Select a knowledge base first." },
        { status: 400 },
      );
    }

    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (keyword) {
      query.set("keyword", keyword);
    }

    const response = await difyFetch(
      `/datasets/${datasetId}/documents?${query.toString()}`,
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: await readDifyError(response) },
        { status: response.status },
      );
    }

    const payload = await response.json();
    return NextResponse.json({ ...payload, datasetId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load documents";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const datasetId = resolveDatasetFromRequest({
      corpus: searchParams.get("corpus"),
      datasetId: searchParams.get("datasetId"),
    });
    const documentId = searchParams.get("documentId")?.trim() ?? "";

    if (!datasetId || !documentId) {
      return NextResponse.json(
        { error: "datasetId and documentId are required." },
        { status: 400 },
      );
    }

    const response = await difyFetch(
      `/datasets/${datasetId}/documents/${documentId}`,
      { method: "DELETE" },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: await readDifyError(response) },
        { status: response.status },
      );
    }

    return NextResponse.json({ ok: true, documentId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
