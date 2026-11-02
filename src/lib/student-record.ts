import type { SenTag } from "@/lib/learner-roster";

export type IepTierSupport = {
  tier_1_support: string;
  tier_2_and_3_support: string;
};

export type IepDomains = {
  learning_adjustment: IepTierSupport;
  social_behavioral_adjustment: IepTierSupport;
};

export type CurrentPerformance = {
  strengths_and_interests: string;
  weaknesses: string;
};

export type StudentRecord = {
  id: string;
  name: string;
  class: string;
  sen_type?: string;
  current_performance?: CurrentPerformance;
  domains?: IepDomains;
};

export type RosterClass = {
  id: string;
  label: string;
  students: StudentRecord[];
};

const EMPTY_TIER: IepTierSupport = {
  tier_1_support: "",
  tier_2_and_3_support: "",
};

export const EMPTY_IEP_DOMAINS: IepDomains = {
  learning_adjustment: { ...EMPTY_TIER },
  social_behavioral_adjustment: { ...EMPTY_TIER },
};

export const EMPTY_CURRENT_PERFORMANCE: CurrentPerformance = {
  strengths_and_interests: "",
  weaknesses: "",
};

export function isSenStudent(student: StudentRecord) {
  return Boolean(student.sen_type?.trim());
}

export function inferSenTags(student: StudentRecord): SenTag[] {
  const text = (student.sen_type ?? "").toLowerCase();
  if (!text.trim()) {
    return [];
  }
  const hasAdhd =
    text.includes("adhd") ||
    text.includes("hyperactivity") ||
    text.includes("專注");
  const hasSpld =
    text.includes("spld") ||
    text.includes("learning difficult") ||
    text.includes("讀寫");
  const hasAsd =
    text.includes("autism") || text.includes("asd") || text.includes("自閉");

  if (hasAdhd && hasSpld) {
    return ["mixed"];
  }
  if (hasAsd && (hasAdhd || hasSpld)) {
    return ["mixed"];
  }
  if (hasAdhd) {
    return ["adhd"];
  }
  if (hasSpld) {
    return ["spld"];
  }
  if (hasAsd) {
    return ["mixed"];
  }
  return ["mixed"];
}

export function studentListLine(student: StudentRecord) {
  if (!isSenStudent(student)) {
    return student.name;
  }
  const perf = student.current_performance;
  if (perf?.weaknesses?.trim()) {
    const short = perf.weaknesses.split("/")[0]?.trim() ?? perf.weaknesses;
    return short.length > 120 ? `${short.slice(0, 117)}…` : short;
  }
  return student.sen_type ?? "SEN support plan on file";
}

export function formatIepForWorkflow(student: StudentRecord) {
  if (!isSenStudent(student)) {
    return student.name;
  }
  const blocks: string[] = [`${student.name}`, `SEN: ${student.sen_type?.trim() ?? ""}`];
  const perf = student.current_performance;
  if (perf) {
    blocks.push(
      `Strengths & interests: ${perf.strengths_and_interests.trim()}`,
      `Weaknesses: ${perf.weaknesses.trim()}`,
    );
  }
  const domains = student.domains;
  if (domains) {
    blocks.push(
      `Learning adjustment (Tier 1): ${domains.learning_adjustment.tier_1_support.trim()}`,
      `Learning adjustment (Tier 2–3): ${domains.learning_adjustment.tier_2_and_3_support.trim()}`,
      `Social / behavioural (Tier 1): ${domains.social_behavioral_adjustment.tier_1_support.trim()}`,
      `Social / behavioural (Tier 2–3): ${domains.social_behavioral_adjustment.tier_2_and_3_support.trim()}`,
    );
  }
  return blocks.filter((line) => line.replace(/^[^:]+:\s*$/, "").trim()).join("\n");
}

export function groupStudentsByClass(students: StudentRecord[]): RosterClass[] {
  const byClass = new Map<string, StudentRecord[]>();
  for (const student of students) {
    const classId = student.class.trim();
    if (!classId) {
      continue;
    }
    const list = byClass.get(classId) ?? [];
    list.push(student);
    byClass.set(classId, list);
  }
  return [...byClass.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, classStudents]) => ({
      id,
      label: id,
      students: classStudents.sort(
        (a, b) =>
          a.id.localeCompare(b.id, undefined, { numeric: true }) ||
          a.name.localeCompare(b.name),
      ),
    }));
}

export function findStudentInRoster(
  students: StudentRecord[],
  classId?: string,
  studentId?: string,
) {
  if (!classId?.trim() || !studentId?.trim()) {
    return null;
  }
  return (
    students.find(
      (student) => student.class === classId && student.id === studentId,
    ) ?? null
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function parseTierSupport(raw: unknown): IepTierSupport {
  if (!isRecord(raw)) {
    return { ...EMPTY_TIER };
  }
  return {
    tier_1_support: asString(raw.tier_1_support),
    tier_2_and_3_support: asString(raw.tier_2_and_3_support),
  };
}

function parseDomains(raw: unknown): IepDomains | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }
  return {
    learning_adjustment: parseTierSupport(raw.learning_adjustment),
    social_behavioral_adjustment: parseTierSupport(raw.social_behavioral_adjustment),
  };
}

function parseCurrentPerformance(raw: unknown): CurrentPerformance | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }
  const strengths = asString(raw.strengths_and_interests);
  const weaknesses = asString(raw.weaknesses);
  if (!strengths.trim() && !weaknesses.trim()) {
    return undefined;
  }
  return {
    strengths_and_interests: strengths,
    weaknesses: weaknesses,
  };
}

export function parseStudentRecord(raw: unknown): StudentRecord | null {
  if (!isRecord(raw)) {
    return null;
  }
  const id = asString(raw.id).trim();
  const name = asString(raw.name).trim();
  const classId = asString(raw.class).trim();
  if (!id || !name || !classId) {
    return null;
  }
  const sen_type = asString(raw.sen_type).trim() || undefined;
  const current_performance = parseCurrentPerformance(raw.current_performance);
  const domains = parseDomains(raw.domains);
  const record: StudentRecord = { id, name, class: classId };
  if (sen_type) {
    record.sen_type = sen_type;
  }
  if (current_performance) {
    record.current_performance = current_performance;
  }
  if (domains) {
    record.domains = domains;
  }
  return record;
}

export function parseStudentRecords(raw: unknown): StudentRecord[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const parsed: StudentRecord[] = [];
  for (const item of raw) {
    const student = parseStudentRecord(item);
    if (student) {
      parsed.push(student);
    }
  }
  return parsed;
}

export function validateStudentRecords(students: StudentRecord[]): string | null {
  const classIdKeys = new Set<string>();
  for (const student of students) {
    const composite = `${student.class}\0${student.id}`;
    if (classIdKeys.has(composite)) {
      return `Duplicate student in class ${student.class}: id ${student.id}`;
    }
    classIdKeys.add(composite);
    if (isSenStudent(student)) {
      if (!student.current_performance) {
        return `${student.id}: SEN students need current_performance.`;
      }
      if (
        !student.current_performance.strengths_and_interests.trim() ||
        !student.current_performance.weaknesses.trim()
      ) {
        return `${student.id}: current_performance fields are required for SEN.`;
      }
      if (!student.domains) {
        return `${student.id}: SEN students need domains.`;
      }
      for (const key of [
        "learning_adjustment",
        "social_behavioral_adjustment",
      ] as const) {
        const domain = student.domains[key];
        if (!domain.tier_1_support.trim()) {
          return `${student.id}: ${key}.tier_1_support is required.`;
        }
      }
    }
  }
  return null;
}

export function normalizeStudentForSave(student: StudentRecord): StudentRecord {
  const base: StudentRecord = {
    id: student.id.trim(),
    name: student.name.trim(),
    class: student.class.trim(),
  };
  const senType = student.sen_type?.trim();
  if (!senType) {
    return base;
  }
  base.sen_type = senType;
  base.current_performance = {
    strengths_and_interests:
      student.current_performance?.strengths_and_interests.trim() ?? "",
    weaknesses: student.current_performance?.weaknesses.trim() ?? "",
  };
  base.domains = {
    learning_adjustment: {
      tier_1_support:
        student.domains?.learning_adjustment.tier_1_support.trim() ?? "",
      tier_2_and_3_support:
        student.domains?.learning_adjustment.tier_2_and_3_support.trim() ?? "",
    },
    social_behavioral_adjustment: {
      tier_1_support:
        student.domains?.social_behavioral_adjustment.tier_1_support.trim() ??
        "",
      tier_2_and_3_support:
        student.domains?.social_behavioral_adjustment.tier_2_and_3_support.trim() ??
        "",
    },
  };
  return base;
}
