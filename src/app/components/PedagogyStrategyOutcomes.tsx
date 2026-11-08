import type { PedagogicalStrategyState } from "@/lib/workflow-draft";
import { BilingualStack } from "./Bilingual";
import MarkdownRichText from "./MarkdownRichText";

type PedagogyStrategyOutcomesProps = {
  pedagogy: PedagogicalStrategyState;
};

export default function PedagogyStrategyOutcomes({
  pedagogy,
}: PedagogyStrategyOutcomesProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <OutcomeCard
        titleZh="教育理論"
        titleEn='Educational Theory (The "Why")'
        body={pedagogy.educationalTheory}
        emptyZh="與策略助手對話後，理論建議會顯示於此。"
        emptyEn="Theory recommendations appear here after you chat with the strategy assistant."
      />
      <OutcomeCard
        titleZh="支援策略"
        titleEn='Learning Strategies (The "How")'
        body={pedagogy.learningStrategies}
        emptyZh="具體調適與鷹架策略會顯示於此。"
        emptyEn="Actionable scaffolding modes appear here after analysis."
      />
    </div>
  );
}

function OutcomeCard({
  titleZh,
  titleEn,
  body,
  emptyZh,
  emptyEn,
}: {
  titleZh: string;
  titleEn: string;
  body: string;
  emptyZh: string;
  emptyEn: string;
}) {
  const hasBody = body.trim().length > 0;
  return (
    <section className="flex min-h-[10rem] flex-col rounded-3xl bg-zinc-50/80 p-4 ring-1 ring-zinc-200/90 sm:p-5">
      <h3 className="text-sm font-semibold text-zinc-900">
        <BilingualStack
          zh={titleZh}
          en={titleEn}
          layout="stack"
          enClassName="text-xs font-normal text-zinc-500"
        />
      </h3>
      <div className="mt-3 min-h-0 flex-1 text-sm leading-6 text-zinc-800">
        {hasBody ? (
          <MarkdownRichText content={body} />
        ) : (
          <p className="text-zinc-500">
            <BilingualStack
              layout="stack"
              zh={emptyZh}
              en={emptyEn}
              enClassName="text-xs text-zinc-400"
            />
          </p>
        )}
      </div>
    </section>
  );
}
