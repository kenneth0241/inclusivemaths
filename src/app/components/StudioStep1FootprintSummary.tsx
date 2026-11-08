import {
  isStudioContextReady,
  type ContentFootprint,
} from "@/lib/workflow-draft";
import { BilingualStack } from "./Bilingual";

export function StudioStep1FootprintSummary({
  footprint,
}: {
  footprint: ContentFootprint;
}) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-sky-lock uppercase">
        第一步 · Step 1
      </p>
      <h3 className="mt-1 text-sm font-semibold text-zinc-900">
        <BilingualStack
          zh="已確認的內容足跡"
          en="Confirmed content footprint"
          layout="inline"
          enClassName="font-normal text-zinc-500"
        />
      </h3>
      {isStudioContextReady(footprint) ? (
        <dl className="mt-3 space-y-3 text-sm">
          <div>
            <dt className="text-zinc-500">
              <BilingualStack
                zh="主題摘要"
                en="Topic summary"
                layout="inline"
                enClassName="text-zinc-400"
              />
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-zinc-800">
              {footprint.topicSummary}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">
              <BilingualStack
                zh="具體範圍與限制"
                en="Scope & constraints"
                layout="inline"
                enClassName="text-zinc-400"
              />
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-zinc-800">
              {footprint.scope}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">
              <BilingualStack
                zh="視覺圖解與表達"
                en="Visual models"
                layout="inline"
                enClassName="text-zinc-400"
              />
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-zinc-800">
              {footprint.visualModels}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-2 text-sm text-zinc-500">
          <BilingualStack
            layout="stack"
            zh="請在第一步完成對話，並按「前往學習者檔案」確認三項內容。"
            en="Finish Step 1 chat and use Proceed to learner profile to confirm all three items."
            enClassName="text-zinc-400"
          />
        </p>
      )}
    </div>
  );
}
