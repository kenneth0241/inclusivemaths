import Link from "next/link";
import { CORPUS_IDS, CORPUS_META, type CorpusId } from "@/lib/corpus";

type CorpusStatus = {
  corpus: CorpusId;
  configured: boolean;
  documentCount: number;
  error?: string;
};

type CorpusStatusCardsProps = {
  corpora: CorpusStatus[];
};

export default function CorpusStatusCards({ corpora }: CorpusStatusCardsProps) {
  return (
    <div className="mx-auto grid w-full max-w-layout-form gap-4">
      {CORPUS_IDS.map((corpusId) => {
        const meta = CORPUS_META[corpusId];
        const status = corpora.find((item) => item.corpus === corpusId);
        const configured = status?.configured ?? false;
        const count = status?.documentCount ?? 0;

        return (
          <article
            key={corpusId}
            className="rounded-3xl bg-white p-6 ring-1 ring-zinc-200"
          >
            <p className="text-sm font-semibold text-emerald-700">
              {meta.difyName}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-zinc-900">
              {meta.shortTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {meta.description}
            </p>
            <p className="mt-4 text-sm text-zinc-500">
              {configured
                ? `${count} file${count === 1 ? "" : "s"} indexed`
                : "Not configured — set dataset ID in environment variables"}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={`/knowledge/${corpusId}`}
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                Upload & manage
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
