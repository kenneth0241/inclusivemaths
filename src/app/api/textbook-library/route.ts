import { connection } from "next/server";
import { NextResponse } from "next/server";
import { difyFetch, readDifyError, resolveCorpusDatasetId } from "@/lib/dify";
import {
  getTextbookDriveFolderId,
  listTextbookDriveFiles,
  textbookDriveFolderUrl,
} from "@/lib/google-drive";
import {
  difyDocsToMarkdownItems,
  driveFilesToPdfItems,
  type DifyDocRow,
} from "@/lib/textbook-library";

async function fetchAllDifyDocuments(datasetId: string) {
  const docs: DifyDocRow[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 20) {
    const query = new URLSearchParams({
      page: String(page),
      limit: "100",
    });
    const response = await difyFetch(
      `/datasets/${datasetId}/documents?${query.toString()}`,
    );
    if (!response.ok) {
      throw new Error(await readDifyError(response));
    }
    const payload = (await response.json()) as {
      data?: DifyDocRow[];
      has_more?: boolean;
    };
    docs.push(...(payload.data ?? []));
    hasMore = Boolean(payload.has_more);
    page += 1;
  }

  return docs;
}

export async function GET() {
  await connection();
  try {
    const datasetId = resolveCorpusDatasetId("textbook");
    const difyDocs = await fetchAllDifyDocuments(datasetId);
    const markdown = difyDocsToMarkdownItems(difyDocs);

    const folderId = getTextbookDriveFolderId();
    const folderUrl = textbookDriveFolderUrl(folderId);

    try {
      const driveFiles = await listTextbookDriveFiles();
      const pdfs = driveFilesToPdfItems(driveFiles);
      return NextResponse.json({
        markdown,
        pdfs,
        folderUrl,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not load PDF list.";
      return NextResponse.json({
        markdown,
        pdfs: [],
        folderUrl,
        pdfError: message,
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load library.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
