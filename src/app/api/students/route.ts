import { connection } from "next/server";
import { NextResponse } from "next/server";
import {
  normalizeStudentForSave,
  parseStudentRecords,
  validateStudentRecords,
} from "@/lib/student-record";
import { readStudentsFile, writeStudentsFile } from "@/lib/students-store";

export async function GET() {
  await connection();
  try {
    const students = await readStudentsFile();
    return NextResponse.json({ students });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load students.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  await connection();
  try {
    const body = (await request.json()) as { students?: unknown };
    const parsed = parseStudentRecords(body.students);
    if (parsed.length === 0 && Array.isArray(body.students) && body.students.length > 0) {
      return NextResponse.json(
        { error: "No valid student records in payload." },
        { status: 400 },
      );
    }
    const normalized = parsed.map((student) => normalizeStudentForSave(student));
    const validationError = validateStudentRecords(normalized);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
    await writeStudentsFile(normalized);
    return NextResponse.json({ students: normalized });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save students.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
