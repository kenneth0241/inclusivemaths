import {
  gameRulePresetBody,
  gameScoringPresetBody,
  gameUiStylePresetBody,
} from "@/lib/game-parameters";

const MAX_SAMPLE_HTML_CHARS = 1_500_000;

export type GameParameterTemplate = {
  id: string;
  name: string;
  game_rules: string;
  scoring_method: string;
  ui_style: string;
  sample_html: string;
};

export type GameParameterTemplateInput = Omit<GameParameterTemplate, "id"> & {
  id?: string;
};

export function slugifyTemplateId(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || `template-${Date.now()}`;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseGameParameterTemplates(
  raw: unknown,
): GameParameterTemplate[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const results: GameParameterTemplate[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    const record = item as Record<string, unknown>;
    const id = asString(record.id);
    const name = asString(record.name);
    if (!id || !name) {
      continue;
    }
    const sampleHtml = typeof record.sample_html === "string" ? record.sample_html : "";
    if (sampleHtml.length > MAX_SAMPLE_HTML_CHARS) {
      continue;
    }
    results.push({
      id,
      name,
      game_rules: asString(record.game_rules ?? record.gameRules),
      scoring_method: asString(
        record.scoring_method ?? record.scoringMethod,
      ),
      ui_style: asString(record.ui_style ?? record.uiStyle),
      sample_html: sampleHtml,
    });
  }
  return results;
}

export function validateGameParameterTemplates(
  templates: GameParameterTemplate[],
): string | null {
  const seen = new Set<string>();
  for (const template of templates) {
    if (!template.id.trim()) {
      return "Each template needs an id.";
    }
    if (!template.name.trim()) {
      return `Template "${template.id}" needs a name.`;
    }
    if (seen.has(template.id)) {
      return `Duplicate template id: ${template.id}`;
    }
    seen.add(template.id);
    if (template.sample_html.length > MAX_SAMPLE_HTML_CHARS) {
      return `Sample HTML for "${template.id}" is too large.`;
    }
    if (
      !template.game_rules &&
      !template.scoring_method &&
      !template.ui_style
    ) {
      return `Template "${template.name}" must include at least one of game_rules, scoring_method, or ui_style.`;
    }
  }
  return null;
}

export function normalizeTemplateForSave(
  input: GameParameterTemplateInput,
  existingIds: Set<string>,
): GameParameterTemplate {
  const id =
    asString(input.id) ||
    slugifyTemplateId(input.name) ||
    `template-${Date.now()}`;
  let uniqueId = id;
  let suffix = 2;
  while (existingIds.has(uniqueId)) {
    uniqueId = `${id}-${suffix}`;
    suffix += 1;
  }
  existingIds.add(uniqueId);
  return {
    id: uniqueId,
    name: input.name.trim(),
    game_rules: input.game_rules.trim(),
    scoring_method: input.scoring_method.trim(),
    ui_style: input.ui_style.trim(),
    sample_html: input.sample_html ?? "",
  };
}

/** Shipped defaults when JSON is missing (matches former built-in preset combo). */
export function defaultGameParameterTemplates(): GameParameterTemplate[] {
  return [
    {
      id: "step-unlock-stars-high-contrast",
      name: "逐步解鎖 + 星星 + 高對比 · Step unlock, stars, high contrast",
      game_rules: gameRulePresetBody("step-unlock"),
      scoring_method: gameScoringPresetBody("positive-stars"),
      ui_style: gameUiStylePresetBody("clean-high-contrast"),
      sample_html: "",
    },
    {
      id: "story-quest-effort-emoji",
      name: "故事闖關 + 雙軌積分 + Emoji · Story quest, dual track, emoji UI",
      game_rules: gameRulePresetBody("story-quest"),
      scoring_method: gameScoringPresetBody("effort-accuracy-dual"),
      ui_style: gameUiStylePresetBody("emoji-vibrant"),
      sample_html: "",
    },
    {
      id: "sandbox-stars-pixel",
      name: "無壓配對 + 星星 + 像素風 · Sandbox matching, stars, pixel UI",
      game_rules: gameRulePresetBody("sandbox-matching"),
      scoring_method: gameScoringPresetBody("positive-stars"),
      ui_style: gameUiStylePresetBody("pixel-retro"),
      sample_html: "",
    },
  ];
}

export function templateToGameParameters(
  template: GameParameterTemplate,
): Pick<
  import("@/lib/game-parameters").GameParameters,
  | "gameRules"
  | "scoringMethod"
  | "uiStyle"
  | "gameRulePreset"
  | "scoringMethodPreset"
  | "uiStylePreset"
  | "gameTemplateId"
> {
  return {
    gameTemplateId: template.id,
    gameRulePreset: "",
    gameRules: template.game_rules,
    scoringMethodPreset: "",
    scoringMethod: template.scoring_method,
    uiStylePreset: "",
    uiStyle: template.ui_style,
  };
}