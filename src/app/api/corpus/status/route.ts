import { connection } from "next/server";
import { NextResponse } from "next/server";
import { CORPUS_IDS } from "@/lib/corpus";
import { fetchCorpusDocumentTotal } from "@/lib/dify";

export async function GET() {
  await connection();
  const corpora = await Promise.all(
    CORPUS_IDS.map(async (corpus) => {
      try {
        const stats = await fetchCorpusDocumentTotal(corpus);
        return {
          corpus,
          configured: true,
          datasetId: stats.datasetId,
          documentCount: stats.documentCount,
        };
      } catch (error) {
        return {
          corpus,
          configured: false,
          datasetId: null,
          documentCount: 0,
          error:
            error instanceof Error ? error.message : "Corpus not configured",
        };
      }
    }),
  );

  return NextResponse.json({ corpora });
}
