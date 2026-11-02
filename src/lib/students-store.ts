import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  parseStudentRecords,
  validateStudentRecords,
  type StudentRecord,
} from "@/lib/student-record";

function studentsFilePath() {
  return path.join(process.cwd(), "data", "students.json");
}

export async function readStudentsFile(): Promise<StudentRecord[]> {
  const raw = await readFile(studentsFilePath(), "utf8");
  const parsed = parseStudentRecords(JSON.parse(raw) as unknown);
  return parsed;
}

export async function writeStudentsFile(students: StudentRecord[]) {
  const error = validateStudentRecords(students);
  if (error) {
    throw new Error(error);
  }
  const json = `${JSON.stringify(students, null, 2)}\n`;
  await writeFile(studentsFilePath(), json, "utf8");
}
