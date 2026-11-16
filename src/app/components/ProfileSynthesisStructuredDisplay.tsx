"use client";

import {
  PROFILE_SYNTHESIS_SECTION_TITLES,
  type ProfileSynthesisStructured,
} from "@/lib/profile-synthesizer";
import { BilingualStack } from "./Bilingual";
import MarkdownRichText from "./MarkdownRichText";

type ProfileSynthesisStructuredDisplayProps = {
  data: ProfileSynthesisStructured;
  className?: string;
};

function SectionShell({
  number,
  children,
}: {
  number: number;
  children: React.ReactNode;
}) {
  const fixedTitle = PROFILE_SYNTHESIS_SECTION_TITLES[number];
  return (
    <article className="rounded-xl border border-teal-100/90 bg-white/90 p-4 shadow-sm ring-1 ring-zinc-100/80">
      <div className="flex items-start gap-3">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white tabular-nums"
          aria-hidden
        >
          {number}
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          {fixedTitle ? (
            <h4 className="text-sm font-semibold leading-snug text-zinc-900">
              <BilingualStack
                zh={fixedTitle.zh}
                en={fixedTitle.en}
                layout="stack"
                zhClassName="text-sm font-semibold text-zinc-900"
                enClassName="text-xs font-medium text-zinc-500"
              />
            </h4>
          ) : null}
          {children}
        </div>
      </div>
    </article>
  );
}

function StudentFieldCard({
  studentName,
  fields,
}: {
  studentName: string;
  fields: Array<{ labelZh: string; labelEn: string; value: string }>;
}) {
  if (!studentName.trim() && fields.every((f) => !f.value.trim())) {
    return null;
  }
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3">
      {studentName.trim() ? (
        <p className="text-sm font-semibold text-teal-900">{studentName}</p>
      ) : null}
      <div className="mt-2 space-y-2">
        {fields.map((field) =>
          field.value.trim() ? (
            <div key={`${field.labelEn}-${field.labelZh}`}>
              <p className="text-xs font-medium text-zinc-500">
                <BilingualStack
                  layout="inline"
                  zh={field.labelZh}
                  en={field.labelEn}
                  enClassName="text-zinc-400"
                />
              </p>
              <div className="mt-1 text-sm text-zinc-800">
                <MarkdownRichText content={field.value} />
              </div>
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}

/** Renders Dify Profile Synthesizer structured JSON (sections 1–5). */
export default function ProfileSynthesisStructuredDisplay({
  data,
  className = "",
}: ProfileSynthesisStructuredDisplayProps) {
  const tier2 = data.instructional_accommodations.tier_2_targeted;
  const individuals =
    data.behavioral_environmental_management.individual_management;

  return (
    <div className={`space-y-3 ${className}`.trim()}>
      <SectionShell number={1}>
        <MarkdownRichText content={data.class_profile_summary} />
      </SectionShell>

      <SectionShell number={2}>
        <MarkdownRichText content={data.goal_alignment} />
      </SectionShell>

      <SectionShell number={3}>
        {data.specific_cognitive_bottlenecks.length === 0 ? (
          <p className="text-sm text-zinc-400">—</p>
        ) : (
          <div className="space-y-3">
            {data.specific_cognitive_bottlenecks.map((row, index) => (
              <StudentFieldCard
                key={`bottleneck-${index}-${row.student_name}`}
                studentName={row.student_name}
                fields={[
                  {
                    labelZh: "認知瓶頸",
                    labelEn: "Bottleneck",
                    value: row.bottleneck_description,
                  },
                ]}
              />
            ))}
          </div>
        )}
      </SectionShell>

      <SectionShell number={4}>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-zinc-500">
              <BilingualStack
                layout="inline"
                zh="第一層：全班"
                en="Tier 1 — whole class"
                enClassName="text-zinc-400"
              />
            </p>
            <div className="mt-1">
              <MarkdownRichText
                content={data.instructional_accommodations.tier_1_whole_class}
              />
            </div>
          </div>
          {tier2.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-zinc-500">
                <BilingualStack
                  layout="inline"
                  zh="第二層：個別"
                  en="Tier 2 — targeted"
                  enClassName="text-zinc-400"
                />
              </p>
              <div className="mt-2 space-y-3">
                {tier2.map((row, index) => (
                  <StudentFieldCard
                    key={`tier2-${index}-${row.student_name}`}
                    studentName={row.student_name}
                    fields={[
                      {
                        labelZh: "認知挑戰",
                        labelEn: "Cognitive challenge",
                        value: row.cognitive_challenge,
                      },
                      {
                        labelZh: "調適方案",
                        labelEn: "Solution",
                        value: row.solution_context,
                      },
                    ]}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </SectionShell>

      <SectionShell number={5}>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-zinc-500">
              <BilingualStack
                layout="inline"
                zh="全班環境"
                en="Whole-class environment"
                enClassName="text-zinc-400"
              />
            </p>
            <div className="mt-1">
              <MarkdownRichText
                content={
                  data.behavioral_environmental_management.whole_class_environment
                }
              />
            </div>
          </div>
          {individuals.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-zinc-500">
                <BilingualStack
                  layout="inline"
                  zh="個別管理"
                  en="Individual management"
                  enClassName="text-zinc-400"
                />
              </p>
              <div className="mt-2 space-y-3">
                {individuals.map((row, index) => (
                  <StudentFieldCard
                    key={`mgmt-${index}-${row.student_name}`}
                    studentName={row.student_name}
                    fields={[
                      {
                        labelZh: "策略",
                        labelEn: "Strategies",
                        value: row.management_strategies,
                      },
                    ]}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </SectionShell>
    </div>
  );
}
