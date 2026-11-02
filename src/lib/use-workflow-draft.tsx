"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_WORKFLOW_DRAFT,
  loadWorkflowDraft,
  saveWorkflowDraft,
  type WorkflowDraft,
} from "@/lib/workflow-draft";

type WorkflowDraftContextValue = {
  draft: WorkflowDraft;
  setDraft: (
    updater: WorkflowDraft | ((current: WorkflowDraft) => WorkflowDraft),
  ) => void;
  hydrated: boolean;
};

const WorkflowDraftContext = createContext<WorkflowDraftContextValue | null>(
  null,
);

export function WorkflowDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraftState] = useState<WorkflowDraft>(DEFAULT_WORKFLOW_DRAFT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate session draft after mount
    setDraftState(loadWorkflowDraft());
    setHydrated(true);
  }, []);

  const setDraft = useCallback(
    (updater: WorkflowDraft | ((current: WorkflowDraft) => WorkflowDraft)) => {
      setDraftState((current) => {
        const next =
          typeof updater === "function" ? updater(current) : updater;
        saveWorkflowDraft(next);
        return next;
      });
    },
    [],
  );

  const value = useMemo(
    () => ({ draft, setDraft, hydrated }),
    [draft, setDraft, hydrated],
  );

  return (
    <WorkflowDraftContext.Provider value={value}>
      {children}
    </WorkflowDraftContext.Provider>
  );
}

export function useWorkflowDraft() {
  const context = useContext(WorkflowDraftContext);
  if (!context) {
    throw new Error("useWorkflowDraft must be used within WorkflowDraftProvider");
  }
  return context;
}
