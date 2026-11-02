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
  findStudentInRoster,
  groupStudentsByClass,
  type RosterClass,
  type StudentRecord,
} from "@/lib/student-record";

type StudentRosterContextValue = {
  students: StudentRecord[];
  classes: RosterClass[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  saveAll: (students: StudentRecord[]) => Promise<void>;
  findStudent: (classId?: string, studentId?: string) => StudentRecord | null;
};

const StudentRosterContext = createContext<StudentRosterContextValue | null>(
  null,
);

export function StudentRosterProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/students");
      const body = (await response.json()) as {
        students?: StudentRecord[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(body.error || "Could not load students.");
      }
      setStudents(body.students ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load students.");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveAll = useCallback(async (next: StudentRecord[]) => {
    setError("");
    const response = await fetch("/api/students", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ students: next }),
    });
    const body = (await response.json()) as {
      students?: StudentRecord[];
      error?: string;
    };
    if (!response.ok) {
      throw new Error(body.error || "Could not save students.");
    }
    setStudents(body.students ?? next);
  }, []);

  const classes = useMemo(() => groupStudentsByClass(students), [students]);

  const findStudent = useCallback(
    (classId?: string, studentId?: string) =>
      findStudentInRoster(students, classId, studentId),
    [students],
  );

  const value = useMemo(
    () => ({
      students,
      classes,
      loading,
      error,
      refresh,
      saveAll,
      findStudent,
    }),
    [students, classes, loading, error, refresh, saveAll, findStudent],
  );

  return (
    <StudentRosterContext.Provider value={value}>
      {children}
    </StudentRosterContext.Provider>
  );
}

export function useStudentRoster() {
  const context = useContext(StudentRosterContext);
  if (!context) {
    throw new Error(
      "useStudentRoster must be used within StudentRosterProvider",
    );
  }
  return context;
}
