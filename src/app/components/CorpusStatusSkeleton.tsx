import { CORPUS_IDS, CORPUS_META } from "@/lib/corpus";

export default function CorpusStatusSkeleton() {
  return (
    <div className="grid w-full max-w-layout-medium gap-4 sm:grid-cols-2">
      {CORPUS_IDS.map((corpusId) => {
        const meta = CORPUS_META[corpusId];
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
            <p className="mt-4 text-sm text-zinc-400">Loading file counts…</p>
            <div className="mt-5 h-9 w-36 animate-pulse rounded-full bg-zinc-100" />
          </article>
        );
      })}
    </div>
  );
}
