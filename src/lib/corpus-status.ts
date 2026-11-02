import { CORPUS_IDS } from "./corpus";
import { fetchCorpusDocumentTotal, getDifyConfig } from "./dify";

export async function getCorporaStatusForLanding() {
  try {
    getDifyConfig();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "DIFY_API_KEY is not set";
    return CORPUS_IDS.map((corpus) => ({
      corpus,
      configured: false,
      documentCount: 0,
      error: message,
    }));
  }

  return Promise.all(
    CORPUS_IDS.map(async (corpus) => {
      try {
        const stats = await fetchCorpusDocumentTotal(corpus);
        return {
          corpus,
          configured: true,
          documentCount: stats.documentCount,
        };
      } catch (error) {
        return {
          corpus,
          configured: false,
          documentCount: 0,
          error:
            error instanceof Error ? error.message : "Corpus not configured",
        };
      }
    }),
  );
}
