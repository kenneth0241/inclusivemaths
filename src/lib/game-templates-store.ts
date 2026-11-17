import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_GAME_GENERATION_PROMPT } from "@/lib/game-generation-settings";
import {
  defaultGameParameterTemplates,
  parseGameParameterTemplates,
  validateGameParameterTemplates,
  type GameParameterTemplate,
} from "@/lib/game-parameter-template";

function templatesFilePath() {
  return path.join(process.cwd(), "data", "game-parameter-templates.json");
}

export type GameSettingsFile = {
  generationPrompt: string;
  templates: GameParameterTemplate[];
};

type TemplatesFilePayload = {
  generation_prompt?: string;
  templates: GameParameterTemplate[];
};

function parseGameSettingsFile(raw: string): GameSettingsFile {
  const data = JSON.parse(raw) as unknown;
  let generationPrompt = DEFAULT_GAME_GENERATION_PROMPT;
  let templates: GameParameterTemplate[] = [];

  if (Array.isArray(data)) {
    templates = parseGameParameterTemplates(data);
  } else if (data && typeof data === "object" && !Array.isArray(data)) {
    const record = data as TemplatesFilePayload & Record<string, unknown>;
    templates = parseGameParameterTemplates(record.templates);
    const promptRaw = record.generation_prompt;
    if (typeof promptRaw === "string" && promptRaw.trim()) {
      generationPrompt = promptRaw.trim();
    }
  }

  return { generationPrompt, templates };
}

export async function readGameSettingsFile(): Promise<GameSettingsFile> {
  try {
    const raw = await readFile(templatesFilePath(), "utf8");
    const parsed = parseGameSettingsFile(raw);
    if (parsed.templates.length === 0) {
      const defaults = defaultGameParameterTemplates();
      const bundle: GameSettingsFile = {
        generationPrompt: DEFAULT_GAME_GENERATION_PROMPT,
        templates: defaults,
      };
      await writeGameSettingsFile(bundle);
      return bundle;
    }
    return parsed;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as NodeJS.ErrnoException).code)
        : "";
    if (code === "ENOENT") {
      const defaults = defaultGameParameterTemplates();
      const bundle: GameSettingsFile = {
        generationPrompt: DEFAULT_GAME_GENERATION_PROMPT,
        templates: defaults,
      };
      await writeGameSettingsFile(bundle);
      return bundle;
    }
    throw error;
  }
}

/** @deprecated Prefer readGameSettingsFile */
export async function readGameTemplatesFile(): Promise<GameParameterTemplate[]> {
  const { templates } = await readGameSettingsFile();
  return templates;
}

export async function writeGameSettingsFile(bundle: GameSettingsFile) {
  const error = validateGameParameterTemplates(bundle.templates);
  if (error) {
    throw new Error(error);
  }
  const payload: TemplatesFilePayload = {
    generation_prompt: bundle.generationPrompt.trim() || DEFAULT_GAME_GENERATION_PROMPT,
    templates: bundle.templates,
  };
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  await writeFile(templatesFilePath(), json, "utf8");
}

export async function writeGameTemplatesFile(
  templates: GameParameterTemplate[],
) {
  const current = await readGameSettingsFile();
  await writeGameSettingsFile({
    generationPrompt: current.generationPrompt,
    templates,
  });
}