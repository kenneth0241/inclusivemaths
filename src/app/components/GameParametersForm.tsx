"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import {
  templateToGameParameters,
  type GameParameterTemplate,
} from "@/lib/game-parameter-template";
import {
  GAME_RULE_PRESETS,
  GAME_SCORING_PRESETS,
  GAME_UI_STYLE_PRESETS,
  gameRulePresetBody,
  gameScoringPresetBody,
  gameUiStylePresetBody,
  hasGameParametersContent,
  type GameParameters,
  type GameRulePresetId,
  type GameScoringPresetId,
  type GameUiStylePresetId,
} from "@/lib/game-parameters";
import { BilingualStack } from "./Bilingual";
import GameGenerationPromptSettingsDialog from "./GameGenerationPromptSettingsDialog";
import GameSampleHtmlPreviewDialog from "./GameSampleHtmlPreviewDialog";

type GameParametersFormProps = {
  value: GameParameters;
  disabled?: boolean;
  onChange: (next: GameParameters) => void;
  onGenerationPromptChange?: (prompt: string) => void;
};

type ParameterTabId = "rules" | "scoring" | "ui";

const PARAMETER_TABS: {
  id: ParameterTabId;
  zh: string;
  en: string;
}[] = [
  { id: "rules", zh: "遊戲規則", en: "Rules" },
  { id: "scoring", zh: "計分方式", en: "Scoring" },
  { id: "ui", zh: "介面風格", en: "UI style" },
];

function tabHasContent(value: GameParameters, tab: ParameterTabId): boolean {
  if (tab === "rules") {
    return value.gameRules.trim().length > 0;
  }
  if (tab === "scoring") {
    return value.scoringMethod.trim().length > 0;
  }
  return value.uiStyle.trim().length > 0;
}

function briefLine(text: string, max = 72) {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return "";
  }
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max).trim()}…`;
}

export default function GameParametersForm({
  value,
  disabled = false,
  onChange,
  onGenerationPromptChange,
}: GameParametersFormProps) {
  const panelId = useId();
  const tabListId = useId();
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<ParameterTabId>("rules");
  const [templates, setTemplates] = useState<GameParameterTemplate[]>([]);
  const [templatesError, setTemplatesError] = useState("");
  const [samplePreview, setSamplePreview] = useState<GameParameterTemplate | null>(
    null,
  );
  const [promptSettingsOpen, setPromptSettingsOpen] = useState(false);
  const hasContent = hasGameParametersContent(value);

  useEffect(() => {
    if (!hasContent) {
      setExpanded(true);
    }
  }, [hasContent]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/game-templates", { cache: "no-store" });
        const body = (await response.json()) as {
          templates?: GameParameterTemplate[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(body.error || "Could not load templates.");
        }
        if (!cancelled) {
          setTemplates(body.templates ?? []);
          setTemplatesError("");
        }
      } catch (err) {
        if (!cancelled) {
          setTemplatesError(
            err instanceof Error ? err.message : "Could not load templates.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function applyFullTemplate(template: GameParameterTemplate) {
    onChange({
      ...value,
      ...templateToGameParameters(template),
    });
  }

  function clearTemplateSelection(patch: Partial<GameParameters>) {
    onChange({
      ...value,
      gameTemplateId: "",
      ...patch,
    });
  }

  function applyRulesPreset(id: GameRulePresetId) {
    clearTemplateSelection({
      gameRulePreset: "",
      gameRules: gameRulePresetBody(id),
    });
  }

  function applyScoringPreset(id: GameScoringPresetId) {
    clearTemplateSelection({
      scoringMethodPreset: "",
      scoringMethod: gameScoringPresetBody(id),
    });
  }

  function applyUiPreset(id: GameUiStylePresetId) {
    clearTemplateSelection({
      uiStylePreset: "",
      uiStyle: gameUiStylePresetBody(id),
    });
  }

  return (
    <section className="rounded-3xl bg-white ring-1 ring-teal-100">
      <header className="relative z-20 flex flex-wrap items-start justify-between gap-3 p-5 pb-0 sm:p-6 sm:pb-0">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-teal-ink uppercase">
            <BilingualStack
              zh="遊戲參數"
              en="Game parameters"
              layout="inline"
              enClassName="text-teal-700/80"
            />
          </p>
          {expanded ? (
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              <BilingualStack
                zh="先選套裝模板（一次套用規則／計分／介面），或於分頁內逐項微調。"
                en="Pick a full template first, or adjust Rules / Scoring / UI per tab."
                layout="stack"
                enClassName="text-zinc-400"
              />
            </p>
          ) : (
            <ul className="mt-2 space-y-1 text-xs leading-5 text-zinc-600">
              {briefLine(value.gameRules) ? (
                <li>
                  <span className="font-medium text-zinc-700">遊戲規則 · </span>
                  {briefLine(value.gameRules)}
                </li>
              ) : null}
              {briefLine(value.scoringMethod) ? (
                <li>
                  <span className="font-medium text-zinc-700">計分方式 · </span>
                  {briefLine(value.scoringMethod)}
                </li>
              ) : null}
              {briefLine(value.uiStyle) ? (
                <li>
                  <span className="font-medium text-zinc-700">介面風格 · </span>
                  {briefLine(value.uiStyle)}
                </li>
              ) : null}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="shrink-0 rounded-full bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100"
        >
          <BilingualStack
            zh={expanded ? "收合" : "展開"}
            en={expanded ? "Collapse" : "Expand"}
            layout="inline"
          />
        </button>
      </header>

      <div
        id={panelId}
        hidden={!expanded}
        className="space-y-4 p-5 pt-4 sm:p-6 sm:pt-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold text-zinc-800">
            <BilingualStack
              zh="套裝模板"
              en="Full templates"
              layout="inline"
              enClassName="text-zinc-500"
            />
          </h3>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setPromptSettingsOpen(true)}
            className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-teal-900 ring-1 ring-zinc-200 hover:bg-teal-50 disabled:opacity-50"
          >
            <BilingualStack
              zh="提示設定"
              en="Prompt settings"
              layout="inline"
            />
          </button>
        </div>
        {templatesError ? (
          <p className="text-xs text-amber-900">{templatesError}</p>
        ) : null}
        {templates.length === 0 && !templatesError ? (
          <p className="text-xs text-zinc-500">
            <BilingualStack
              layout="inline"
              zh="尚無模板。"
              en="No templates yet."
            />{" "}
            <Link
              href="/manage/game-templates"
              className="font-medium text-teal-800 underline"
            >
              <BilingualStack
                layout="inline"
                zh="於系統設定新增"
                en="Add in system settings"
              />
            </Link>
          </p>
        ) : null}
        <ul className="grid gap-2 sm:grid-cols-1">
          {templates.map((template) => {
            const selected = value.gameTemplateId === template.id;
            const hasSample = template.sample_html.trim().length > 0;
            return (
              <li key={template.id}>
                <div
                  className={`flex flex-wrap items-center gap-2 rounded-2xl border p-3 text-left transition ${
                    selected
                      ? "border-teal-300 bg-teal-50/80 ring-1 ring-teal-200"
                      : "border-zinc-200 bg-zinc-50/50 hover:border-teal-200"
                  }`}
                >
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => applyFullTemplate(template)}
                    className="min-w-0 flex-1 text-left disabled:opacity-50"
                  >
                    <span className="block text-sm font-medium text-zinc-900">
                      {template.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-zinc-500">
                      {selected ? (
                        <BilingualStack
                          layout="inline"
                          zh="已選用"
                          en="Selected"
                        />
                      ) : (
                        <BilingualStack
                          layout="inline"
                          zh="點選套用規則、計分、介面"
                          en="Apply rules, scoring, and UI"
                        />
                      )}
                    </span>
                  </button>
                  {hasSample ? (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => setSamplePreview(template)}
                      className="shrink-0 rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-teal-900 ring-1 ring-teal-200 hover:bg-teal-50 disabled:opacity-50"
                    >
                      <BilingualStack
                        layout="inline"
                        zh="範例"
                        en="Sample"
                      />
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>

        <div
          id={tabListId}
          role="tablist"
          aria-label="遊戲參數分頁 · Game parameter tabs"
          className="flex flex-wrap gap-1 rounded-2xl bg-zinc-50/90 p-1 ring-1 ring-zinc-200"
        >
          {PARAMETER_TABS.map((item) => {
            const isActive = activeTab === item.id;
            const filled = tabHasContent(value, item.id);
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`${tabListId}-${item.id}`}
                aria-selected={isActive}
                aria-controls={`${panelId}-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition sm:text-sm ${
                  isActive
                    ? "bg-white text-teal-900 shadow-sm ring-1 ring-teal-200"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <BilingualStack
                  zh={item.zh}
                  en={item.en}
                  layout="inline"
                  enClassName={isActive ? "text-teal-700/80" : "text-zinc-400"}
                />
                {filled ? (
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${
                      isActive ? "bg-teal-500" : "bg-teal-400/80"
                    }`}
                    aria-hidden
                  />
                ) : null}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`${panelId}-rules`}
          aria-labelledby={`${tabListId}-rules`}
          hidden={activeTab !== "rules"}
          className={activeTab !== "rules" ? "hidden" : undefined}
        >
          <PresetFieldset
            hideLegend
            legendZh="遊戲規則"
            legendEn="Game rules"
            hintZh="點選預設會整段填入下方文字框（會取代現有內容）。"
            hintEn="Tap a preset to fill the box below (replaces current text)."
            fieldLegendZh="遊戲規則說明"
            fieldLegendEn="Game rules"
            placeholder="直接描述遊戲規則，或點上方預設帶入…"
            presets={GAME_RULE_PRESETS}
            body={value.gameRules}
            disabled={disabled}
            onApplyPreset={(id) => applyRulesPreset(id as GameRulePresetId)}
            onBodyChange={(nextBody) =>
              clearTemplateSelection({
                gameRulePreset: "",
                gameRules: nextBody,
              })
            }
          />
        </div>

        <div
          role="tabpanel"
          id={`${panelId}-scoring`}
          aria-labelledby={`${tabListId}-scoring`}
          hidden={activeTab !== "scoring"}
          className={activeTab !== "scoring" ? "hidden" : undefined}
        >
          <PresetFieldset
            hideLegend
            legendZh="計分方式"
            legendEn="Scoring method"
            hintZh="點選預設會整段填入下方文字框（會取代現有內容）。"
            hintEn="Tap a preset to fill the box below (replaces current text)."
            fieldLegendZh="計分說明"
            fieldLegendEn="Scoring method"
            placeholder="直接描述計分方式…"
            presets={GAME_SCORING_PRESETS}
            body={value.scoringMethod}
            disabled={disabled}
            onApplyPreset={(id) => applyScoringPreset(id as GameScoringPresetId)}
            onBodyChange={(nextBody) =>
              clearTemplateSelection({
                scoringMethodPreset: "",
                scoringMethod: nextBody,
              })
            }
          />
        </div>

        <div
          role="tabpanel"
          id={`${panelId}-ui`}
          aria-labelledby={`${tabListId}-ui`}
          hidden={activeTab !== "ui"}
          className={activeTab !== "ui" ? "hidden" : undefined}
        >
          <PresetFieldset
            hideLegend
            legendZh="介面風格"
            legendEn="UI style"
            hintZh="點選預設會整段填入下方文字框（會取代現有內容）。"
            hintEn="Tap a preset to fill the box below (replaces current text)."
            fieldLegendZh="介面風格說明"
            fieldLegendEn="UI style"
            placeholder="直接描述介面與視覺風格…"
            presets={GAME_UI_STYLE_PRESETS}
            body={value.uiStyle}
            disabled={disabled}
            onApplyPreset={(id) => applyUiPreset(id as GameUiStylePresetId)}
            onBodyChange={(nextBody) =>
              clearTemplateSelection({
                uiStylePreset: "",
                uiStyle: nextBody,
              })
            }
          />
        </div>
      </div>

      <GameSampleHtmlPreviewDialog
        template={samplePreview}
        onClose={() => setSamplePreview(null)}
      />
      <GameGenerationPromptSettingsDialog
        open={promptSettingsOpen}
        onClose={() => setPromptSettingsOpen(false)}
        onSaved={(prompt) => onGenerationPromptChange?.(prompt)}
      />
    </section>
  );
}

type PresetCard = {
  id: string;
  titleZh: string;
  titleEn: string;
  summaryZh: string;
  summaryEn: string;
};

function PresetFieldset({
  legendZh,
  legendEn,
  hideLegend = false,
  hintZh,
  hintEn,
  fieldLegendZh,
  fieldLegendEn,
  placeholder,
  presets,
  body,
  disabled,
  onApplyPreset,
  onBodyChange,
}: {
  legendZh?: string;
  legendEn?: string;
  hideLegend?: boolean;
  hintZh: string;
  hintEn: string;
  fieldLegendZh: string;
  fieldLegendEn: string;
  placeholder: string;
  presets: PresetCard[];
  body: string;
  disabled: boolean;
  onApplyPreset: (id: string) => void;
  onBodyChange: (body: string) => void;
}) {
  return (
    <fieldset className="space-y-3">
      {hideLegend ? (
        <legend className="sr-only">
          {legendZh ?? ""} · {legendEn ?? ""}
        </legend>
      ) : (
        <legend className="text-sm font-semibold text-zinc-900">
          <BilingualStack
            zh={legendZh ?? ""}
            en={legendEn ?? ""}
            layout="inline"
            enClassName="font-normal text-zinc-500"
          />
        </legend>
      )}
      <p className="text-xs text-zinc-500">
        <BilingualStack
          zh={hintZh}
          en={hintEn}
          layout="stack"
          enClassName="text-zinc-400"
        />
      </p>
      <GamePresetCardList
        presets={presets}
        disabled={disabled}
        onApplyPreset={onApplyPreset}
      />
      <label className="block">
        <span className="text-xs font-medium text-zinc-600">
          <BilingualStack
            zh={fieldLegendZh}
            en={fieldLegendEn}
            layout="inline"
          />
        </span>
        <textarea
          value={body}
          disabled={disabled}
          rows={5}
          placeholder={placeholder}
          onChange={(event) => onBodyChange(event.target.value)}
          className="mt-2 w-full resize-y rounded-2xl border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 text-sm leading-6 text-zinc-900 placeholder:text-zinc-400 focus:border-teal-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 disabled:opacity-60"
        />
      </label>
    </fieldset>
  );
}

function GamePresetCardList({
  presets,
  disabled,
  onApplyPreset,
}: {
  presets: PresetCard[];
  disabled: boolean;
  onApplyPreset: (id: string) => void;
}) {
  return (
    <ul className="grid gap-2 sm:grid-cols-1">
      {presets.map((preset) => (
        <li key={preset.id}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onApplyPreset(preset.id)}
            title="填入文字框 · Fill text box"
            className="w-full rounded-2xl bg-zinc-50/80 px-4 py-3 text-left ring-1 ring-zinc-200 transition hover:bg-teal-50/40 hover:ring-teal-200 disabled:opacity-60"
          >
            <p className="text-sm font-semibold text-zinc-900">
              <BilingualStack
                zh={preset.titleZh}
                en={preset.titleEn}
                layout="inline"
                enClassName="font-normal text-zinc-500"
              />
            </p>
            <p className="mt-1 text-xs leading-5 text-zinc-600">
              <BilingualStack
                zh={preset.summaryZh}
                en={preset.summaryEn}
                layout="stack"
                enClassName="text-zinc-500"
              />
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}
