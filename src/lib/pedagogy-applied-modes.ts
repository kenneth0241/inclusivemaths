export const PEDAGOGY_ACCOMMODATION_MODES = [
  "Simplify Mode",
  "Chunking",
  "Visual Mode",
] as const;

export type PedagogyAccommodationMode =
  (typeof PEDAGOGY_ACCOMMODATION_MODES)[number];

export const PEDAGOGY_INTENSITY_LEVELS = ["High", "Medium", "Low"] as const;

export type PedagogyIntensityLevel = (typeof PEDAGOGY_INTENSITY_LEVELS)[number];

export type PedagogyAppliedModeEntry = {
  mode: PedagogyAccommodationMode;
  intensityLevel: PedagogyIntensityLevel;
};

const MODE_SET = new Set<string>(PEDAGOGY_ACCOMMODATION_MODES);

function normalizeAccommodationMode(value: unknown): PedagogyAccommodationMode | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (MODE_SET.has(trimmed)) {
    return trimmed as PedagogyAccommodationMode;
  }
  const lower = trimmed.toLowerCase();
  if (lower === "simplify mode" || lower === "simplify") {
    return "Simplify Mode";
  }
  if (lower === "chunking") {
    return "Chunking";
  }
  if (lower === "visual mode" || lower === "visual") {
    return "Visual Mode";
  }
  return null;
}

export function normalizeIntensityLevel(
  value: unknown,
  fallback: PedagogyIntensityLevel = "Medium",
): PedagogyIntensityLevel {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "high") {
    return "High";
  }
  if (trimmed === "low") {
    return "Low";
  }
  if (trimmed === "medium") {
    return "Medium";
  }
  return fallback;
}

/** Parse Dify `applied_modes` (objects or legacy string[]). */
export function normalizePedagogyAppliedModes(
  raw: unknown,
): PedagogyAppliedModeEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: PedagogyAppliedModeEntry[] = [];
  const seen = new Set<string>();

  for (const entry of raw) {
    if (typeof entry === "string") {
      const mode = normalizeAccommodationMode(entry);
      if (!mode || seen.has(mode)) {
        continue;
      }
      seen.add(mode);
      out.push({ mode, intensityLevel: "Medium" });
      continue;
    }
    const record =
      entry && typeof entry === "object" && !Array.isArray(entry)
        ? (entry as Record<string, unknown>)
        : null;
    if (!record) {
      continue;
    }
    const mode = normalizeAccommodationMode(record.mode ?? record.name);
    if (!mode) {
      continue;
    }
    if (seen.has(mode)) {
      continue;
    }
    seen.add(mode);
    out.push({
      mode,
      intensityLevel: normalizeIntensityLevel(
        record.intensity_level ?? record.intensityLevel,
      ),
    });
  }
  return out;
}

/** Short chip label (full name remains in `title` / exports). */
export function appliedModeChipLabel(mode: PedagogyAccommodationMode): string {
  switch (mode) {
    case "Simplify Mode":
      return "Simplify";
    case "Visual Mode":
      return "Visual";
    default:
      return mode;
  }
}

export function formatAppliedModeSummary(
  entry: PedagogyAppliedModeEntry,
): string {
  return `${entry.mode} (${entry.intensityLevel})`;
}

export function formatAppliedModesList(
  entries: PedagogyAppliedModeEntry[],
): string {
  return entries.map(formatAppliedModeSummary).join(", ");
}

export function formatAppliedModesMarkdown(
  entries: PedagogyAppliedModeEntry[],
): string {
  return entries
    .map((entry) => `- **${entry.mode}** · ${entry.intensityLevel}`)
    .join("\n");
}

/** Tailwind classes for intensity color: High green, Medium yellow, Low red. */
export function appliedModeIntensityChipClass(
  level: PedagogyIntensityLevel,
): string {
  switch (level) {
    case "High":
      return "bg-emerald-100 text-emerald-950 ring-emerald-300/90";
    case "Low":
      return "bg-red-100 text-red-950 ring-red-300/90";
    default:
      return "bg-amber-100 text-amber-950 ring-amber-300/90";
  }
}
