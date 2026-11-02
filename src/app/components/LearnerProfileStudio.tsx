"use client";

import { useWorkflowDraft } from "@/lib/use-workflow-draft";
import LearnerProfileForm from "./LearnerProfileForm";

export default function LearnerProfileStudio() {
  const { draft, setDraft } = useWorkflowDraft();

  return (
    <LearnerProfileForm
      draft={draft}
      onChange={(learner) =>
        setDraft((current) => ({
          ...current,
          learner,
        }))
      }
    />
  );
}
