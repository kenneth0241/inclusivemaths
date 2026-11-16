"use client";

import { BilingualStack } from "./Bilingual";

type StudioAnalysisStatusBannerProps = {
  zh: string;
  en?: string;
  subZh?: string;
  subEn?: string;
};

export default function StudioAnalysisStatusBanner({
  zh,
  en = "Analyzing…",
  subZh,
  subEn,
}: StudioAnalysisStatusBannerProps) {
  return (
    <div
      className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 ring-1 ring-sky-100"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-1.5 inline-block size-2.5 shrink-0 animate-pulse rounded-full bg-sky-500"
          aria-hidden
        />
        <div>
          <BilingualStack
            layout="stack"
            zh={zh}
            en={en}
            zhClassName="text-sm font-semibold text-sky-950"
            enClassName="text-xs font-medium text-sky-900/90"
          />
          {subZh || subEn ? (
            <BilingualStack
              layout="stack"
              zh={subZh ?? ""}
              en={subEn ?? ""}
              zhClassName="mt-1 text-xs text-sky-900/80"
              enClassName="text-xs text-sky-800/75"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
