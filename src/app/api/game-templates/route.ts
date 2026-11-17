import { connection } from "next/server";
import { NextResponse } from "next/server";
import {
  normalizeTemplateForSave,
  parseGameParameterTemplates,
  validateGameParameterTemplates,
  type GameParameterTemplate,
  type GameParameterTemplateInput,
} from "@/lib/game-parameter-template";
import { normalizeGameGenerationPrompt } from "@/lib/game-generation-settings";
import {
  readGameSettingsFile,
  writeGameSettingsFile,
} from "@/lib/game-templates-store";

export async function GET() {
  await connection();
  try {
    const { templates, generationPrompt } = await readGameSettingsFile();
    return NextResponse.json({ templates, generationPrompt });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load game templates.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  await connection();
  try {
    const body = (await request.json()) as {
      templates?: unknown;
      generation_prompt?: string;
      generationPrompt?: string;
    };
    const parsed = parseGameParameterTemplates(body.templates);
    if (
      parsed.length === 0 &&
      Array.isArray(body.templates) &&
      body.templates.length > 0
    ) {
      return NextResponse.json(
        { error: "No valid game templates in payload." },
        { status: 400 },
      );
    }
    const normalized: GameParameterTemplate[] = [];
    const ids = new Set<string>();
    for (const template of parsed) {
      const input: GameParameterTemplateInput = {
        id: template.id,
        name: template.name,
        game_rules: template.game_rules,
        scoring_method: template.scoring_method,
        ui_style: template.ui_style,
        sample_html: template.sample_html,
      };
      normalized.push(normalizeTemplateForSave(input, ids));
    }
    const validationError = validateGameParameterTemplates(normalized);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
    const current = await readGameSettingsFile();
    const generationPrompt = normalizeGameGenerationPrompt(
      body.generation_prompt ?? body.generationPrompt ?? current.generationPrompt,
    );
    await writeGameSettingsFile({
      generationPrompt,
      templates: normalized,
    });
    return NextResponse.json({
      templates: normalized,
      generationPrompt,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save game templates.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}