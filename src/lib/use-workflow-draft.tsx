"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  // Same initial state on server and client — load sessionStorage only after mount.
  const [draft, setDraftState] = useState(DEFAULT_WORKFLOW_DRAFT);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(hydrated);
  hydratedRef.current = hydrated;

  useEffect(() => {
    // Re-read after mount (e.g. another tab) without ever starting from empty on client.
    const loaded = loadWorkflowDraft();
    setDraftState(loaded);
    setHydrated(true);
    hydratedRef.current = true;
  }, []);

  const setDraft = useCallback(
    (updater: WorkflowDraft | ((current: WorkflowDraft) => WorkflowDraft)) => {
      setDraftState((current) => {
        const next =
          typeof updater === "function" ? updater(current) : updater;
        if (hydratedRef.current) {
          saveWorkflowDraft(next);
        }
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
