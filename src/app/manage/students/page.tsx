import type { Metadata } from "next";
import { StudentRosterManageShell } from "@/app/components/StudentRosterManager";
import { StudentRosterProvider } from "@/lib/use-student-roster";

export const metadata: Metadata = {
  title: "Student roster · Inclusive Maths",
  description:
    "View and edit Primary 1 student records and IEP fields stored in data/students.json.",
};

export default function ManageStudentsPage() {
  return (
    <StudentRosterProvider>
      <StudentRosterManageShell />
    </StudentRosterProvider>
  );
}
