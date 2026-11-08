"use client";

import {
  isLearnerStepComplete,
  isProfileSynthesisReady,
  type LearnerProfile,
} from "@/lib/workflow-draft";
import { formatProfileAnalysisText } from "@/lib/profile-synthesizer";
import { studentListSubtitle, type StudentRecord } from "@/lib/student-record";
import { BilingualStack } from "./Bilingual";
import ProfileAnalysisDisplay from "./ProfileAnalysisDisplay";

type StudioStep2LearnerSummaryProps = {
  learner: LearnerProfile;
  selectedStudents: StudentRecord[];
};

export function StudioStep2LearnerSummary({
  learner,
  selectedStudents,
}: StudioStep2LearnerSummaryProps) {
  const synthesisText = formatProfileAnalysisText(learner.pedagogicalSynthesis);
  const complete = isLearnerStepComplete(learner);

  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-teal-ink uppercase">
        第二步 · Step 2
      </p>
      <h3 className="mt-1 text-sm font-semibold text-zinc-900">
        <BilingualStack
          zh="學習者檔案與教學整合"
          en="Learner profile & synthesis"
          layout="inline"
          enClassName="font-normal text-zinc-500"
        />
      </h3>
      {!complete ? (
        <p className="mt-2 text-sm text-zinc-500">
          <BilingualStack
            layout="stack"
            zh="請在第二步選擇班級與學生，並完成 Profile Synthesizer 分析。"
            en="Complete Step 2: pick class and students, then run Profile Synthesizer analysis."
            enClassName="text-zinc-400"
          />
        </p>
      ) : (
        <dl className="mt-3 space-y-3 text-sm">
          <div>
            <dt className="text-zinc-500">
              <BilingualStack
                zh="班級"
                en="Class"
                layout="inline"
                enClassName="text-zinc-400"
              />
            </dt>
            <dd className="mt-1 text-zinc-800">{learner.classId}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">
              <BilingualStack
                zh="對象"
                en="Audience"
                layout="inline"
                enClassName="text-zinc-400"
              />
            </dt>
            <dd className="mt-1 text-zinc-800">
              {selectedStudents.length === 0
                ? learner.studentIds.join(", ")
                : selectedStudents
                    .map(
                      (s) =>
                        `${s.name} (${s.id}) — ${studentListSubtitle(s)}`,
                    )
                    .join("\n")}
            </dd>
          </div>
          {learner.classProfile.trim() ? (
            <div>
              <dt className="text-zinc-500">
                <BilingualStack
                  zh="班級概況"
                  en="Class notes"
                  layout="inline"
                  enClassName="text-zinc-400"
                />
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-zinc-800">
                {learner.classProfile}
              </dd>
            </div>
          ) : null}
          {isProfileSynthesisReady(learner) && synthesisText ? (
            <div>
              <dt className="text-zinc-500">
                <BilingualStack
                  zh="教學整合分析"
                  en="Pedagogical synthesis"
                  layout="inline"
                  enClassName="text-zinc-400"
                />
              </dt>
              <dd className="mt-2">
                <ProfileAnalysisDisplay content={learner.pedagogicalSynthesis} />
              </dd>
            </div>
          ) : null}
        </dl>
      )}
    </div>
  );
}
