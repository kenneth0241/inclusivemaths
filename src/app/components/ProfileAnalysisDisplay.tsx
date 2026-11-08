"use client";

import {
  formatProfileAnalysisText,
  parseProfileAnalysisSections,
  PROFILE_SYNTHESIS_SECTION_TITLES,
} from "@/lib/profile-synthesizer";
import { BilingualStack } from "./Bilingual";
import MarkdownRichText from "./MarkdownRichText";

type ProfileAnalysisDisplayProps = {
  content: string;
  className?: string;
};

export default function ProfileAnalysisDisplay({
  content,
  className = "",
}: ProfileAnalysisDisplayProps) {
  const formatted = formatProfileAnalysisText(content);
  const sections = parseProfileAnalysisSections(formatted);

  if (sections.length >= 1) {
    return (
      <div className={`space-y-3 ${className}`.trim()}>
        {sections.map((section, index) => {
          const fixedTitle = PROFILE_SYNTHESIS_SECTION_TITLES[section.number];
          const showTitle =
            fixedTitle ||
            section.headingZh.trim() ||
            section.heading.trim();

          return (
            <article
              key={`profile-section-${index}-${section.number}`}
              className="rounded-xl border border-teal-100/90 bg-white/90 p-4 shadow-sm ring-1 ring-zinc-100/80"
            >
              <div className="flex items-start gap-3">
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white tabular-nums"
                  aria-hidden
                >
                  {section.number}
                </span>
                <div className="min-w-0 flex-1">
                  {showTitle ? (
                    <h4 className="text-sm font-semibold leading-snug text-zinc-900">
                      {fixedTitle ? (
                        <BilingualStack
                          zh={fixedTitle.zh}
                          en={fixedTitle.en}
                          layout="stack"
                          zhClassName="text-sm font-semibold text-zinc-900"
                          enClassName="text-xs font-medium text-zinc-500"
                        />
                      ) : (
                        section.heading
                      )}
                    </h4>
                  ) : null}
                  {section.body ? (
                    <div className={showTitle ? "mt-2.5" : ""}>
                      <MarkdownRichText content={section.body} />
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  return <MarkdownRichText content={formatted} className={className} />;
}
