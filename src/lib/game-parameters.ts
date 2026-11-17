/** Step 4 — offline HTML game generation inputs (Dify contract TBD). */
export type GameRulePresetId =
  | "story-quest"
  | "sandbox-matching"
  | "step-unlock";

export type GameScoringPresetId =
  | "positive-stars"
  | "decaying-score"
  | "effort-accuracy-dual";

export type GameUiStylePresetId =
  | "emoji-vibrant"
  | "clean-high-contrast"
  | "pixel-retro";

export type GameParameters = {
  /** Full template from `data/game-parameter-templates.json` (system settings). */
  gameTemplateId: string;
  /** Selected default rules template; `gameRules` holds the template body (+ optional notes). */
  gameRulePreset: GameRulePresetId | "";
  gameRules: string;
  /** Selected default scoring template; `scoringMethod` holds the template body (+ optional notes). */
  scoringMethodPreset: GameScoringPresetId | "";
  scoringMethod: string;
  /** Selected default UI template; `uiStyle` holds the template body (+ optional notes). */
  uiStylePreset: GameUiStylePresetId | "";
  uiStyle: string;
};

export const DEFAULT_GAME_PARAMETERS: GameParameters = {
  gameTemplateId: "",
  gameRulePreset: "",
  gameRules: "",
  scoringMethodPreset: "",
  scoringMethod: "",
  uiStylePreset: "",
  uiStyle: "",
};

export type GameRulePreset = {
  id: GameRulePresetId;
  titleZh: string;
  titleEn: string;
  summaryZh: string;
  summaryEn: string;
  body: string;
};

export const GAME_RULE_PRESETS: GameRulePreset[] = [
  {
    id: "story-quest",
    titleZh: "故事闖關模式",
    titleEn: "Story-Quest Mode",
    summaryZh: "以故事包裝數學題，答對推進下一關。",
    summaryEn: "Narrative wrapper; correct answers advance the stage.",
    body: [
      "【故事闖關模式 · Story-Quest Mode】",
      "Wrap math problems in a short narrative (e.g. “Help the astronaut fix their spaceship by adding the correct fuel blocks”).",
      "以故事包裝數學題（例：幫太空人配對正確燃料方塊修好太空船）。",
      "Answering correctly advances the character to the next stage; light feedback on each step, no harsh failure states.",
      "答對後角色進入下一關；每步有輕量回饋，避免嚴厲的「Game Over」。",
    ].join("\n"),
  },
  {
    id: "sandbox-matching",
    titleZh: "無壓配對模式",
    titleEn: "Stress-Free Sandbox Matching",
    summaryZh: "拖放／點選配對，錯誤彈回，可無限重試。",
    summaryEn: "Drag or tap to match; wrong pairs bounce back.",
    body: [
      "【無壓配對模式 · Stress-Free Sandbox Matching】",
      "No “Next” button and no “Game Over”.",
      "不設「下一題」強制流程，也沒有 Game Over。",
      "Students drag answers (or tap to connect) to questions.",
      "學生拖動答案（或點選連線）配對題目。",
      "Incorrect matches bounce back with a gentle sound, allowing infinite retries until correct.",
      "錯誤配對輕彈回並有柔和音效，可無限重試直到正確。",
    ].join("\n"),
  },
  {
    id: "step-unlock",
    titleZh: "逐步解鎖模式",
    titleEn: "Step-by-step Unlock (Chunking)",
    summaryZh: "每次一題，連對解鎖小關與驚喜動畫，錯題簿收尾。",
    summaryEn: "One question at a time; mini-levels + error book.",
    body: [
      "【逐步解鎖模式 · Step-by-step Unlock / Chunking】",
      "Display only ONE question at a time.",
      "每次只顯示一題。",
      "After 3 correct answers, play a “Surprise Animation” (e.g. chest opening or animal dancing) and unlock a new mini-level.",
      "連續答對 3 題播放驚喜動畫（如開箱、動物跳舞），解鎖新小關。",
      "Include an “Error Book” (錯題簿) at the end to review mistakes without interrupting play flow.",
      "結束時提供錯題簿回顧，過程中不中斷遊戲節奏。",
    ].join("\n"),
  },
];

export type GameScoringPreset = {
  id: GameScoringPresetId;
  titleZh: string;
  titleEn: string;
  summaryZh: string;
  summaryEn: string;
  body: string;
};

export const GAME_SCORING_PRESETS: GameScoringPreset[] = [
  {
    id: "positive-stars",
    titleZh: "正向星星收集",
    titleEn: "Positive Star Collection (Untimed)",
    summaryZh: "無倒數；提示可得星，答錯不扣分。",
    summaryEn: "No timers; hints award stars; wrong answers never deduct.",
    body: [
      "【正向星星收集 · Positive Star Collection (Untimed)】",
      "No countdown timers.",
      "不設倒數計時。",
      "If they use a hint, they earn 2 stars.",
      "使用提示可獲得 2 顆星。",
      "Wrong answers do not deduct points.",
      "答錯不扣分。",
    ].join("\n"),
  },
  {
    id: "decaying-score",
    titleZh: "遞減挑戰積分",
    titleEn: "Decaying Challenge Score",
    summaryZh: "題目起始高分，20–30 秒後遞減至最低保底。",
    summaryEn: "Starts at 1,000 pts; decays to a 100 pt floor by 60–90s.",
    body: [
      "【遞減挑戰積分 · Decaying Challenge Score】",
      "Each question starts at 1,000 points, held steady for the first 20–30 seconds.",
      "每題起始 1,000 分，前 20–30 秒維持滿分。",
      "Score then gradually decreases until a guaranteed minimum of 100 points by 60–90 seconds.",
      "之後分數逐步遞減，至 60–90 秒時保底 100 分。",
    ].join("\n"),
  },
  {
    id: "effort-accuracy-dual",
    titleZh: "努力與準確度雙軌制",
    titleEn: "Effort & Accuracy Dual Track",
    summaryZh: "作答得能量滴；首次答對加連擊徽章。",
    summaryEn: "Energy Drops for attempts; Combo Badge on first-try correct.",
    body: [
      "【努力與準確度雙軌制 · Effort & Accuracy Dual Track】",
      "Students earn “Energy Drops” (base points) just for attempting a question.",
      "學生只要嘗試作答即可獲得「能量滴」（基礎分）。",
      "They earn a “Combo Badge” (bonus points) if they get it right on the first try.",
      "首次答對可獲「連擊徽章」（加分）。",
    ].join("\n"),
  },
];

export type GameUiStylePreset = {
  id: GameUiStylePresetId;
  titleZh: string;
  titleEn: string;
  summaryZh: string;
  summaryEn: string;
  body: string;
};

export const GAME_UI_STYLE_PRESETS: GameUiStylePreset[] = [
  {
    id: "emoji-vibrant",
    titleZh: "Emoji 世界",
    titleEn: "Emoji-Rich Vibrant World",
    summaryZh: "粉彩背景、emoji 教具與氣泡按鈕；回饋全用 emoji。",
    summaryEn: "Pastels, emoji manipulatives, bubble buttons, emoji feedback.",
    body: [
      "【Emoji 世界 · Emoji-Rich Vibrant World】",
      "Bright pastel backgrounds with gentle floating emoji animations.",
      "明亮粉彩背景，emoji 輕飄動畫。",
      "Heavy use of emojis as functional math manipulatives (e.g. counting 🍎, 🚗, or 🧸 instead of abstract dots).",
      "以 emoji 作數學教具（例：數 🍎、🚗、🧸 取代抽象點）。",
      "3D “bubble” buttons for answers.",
      "答案採立體氣泡按鈕。",
      "Feedback is entirely emoji-driven (e.g. 🎉🌟 for correct answers, gentle 🤔💡 for hints).",
      "回饋全用 emoji（答對 🎉🌟，提示 🤔💡）。",
    ].join("\n"),
  },
  {
    id: "clean-high-contrast",
    titleZh: "簡約高對比",
    titleEn: "Clean & High-Contrast (SEN Optimized)",
    summaryZh: "低眩光底色、大字與厚框；十位個位分色。",
    summaryEn: "Low-glare cream/green, large type, thick borders, colour-coded digits.",
    body: [
      "【簡約高對比 · Clean & High-Contrast (SEN Optimized)】",
      "Soft cream or pale green background to reduce glare (dyslexia-friendly).",
      "米白或淡綠底，降低眩光（適合讀寫困難）。",
      "Dark navy text, large non-mirror fonts (e.g. Arial or Comic Sans), thick borders around interactive elements.",
      "深藍字、大字非鏡像字型（如 Arial／Comic Sans），互動元素厚邊框。",
      "Use colour-coded digits to separate tens and ones.",
      "十位與個位以不同顏色區分。",
    ].join("\n"),
  },
  {
    id: "pixel-retro",
    titleZh: "像素遊戲風",
    titleEn: "Pixel Art Retro",
    summaryZh: "8/16-bit 方塊美術、街機音效。",
    summaryEn: "8-bit / 16-bit blocky UI with arcade-style SFX.",
    body: [
      "【像素遊戲風 · Pixel Art Retro】",
      "8-bit / 16-bit retro graphics (similar to Minecraft or classic RPGs).",
      "8-bit／16-bit 復古畫面（類 Minecraft 或經典 RPG）。",
      "Blocky buttons and arcade-style sound effects.",
      "方塊按鈕與街機風音效。",
    ].join("\n"),
  },
];

export function gameRulePresetBody(id: GameRulePresetId): string {
  return GAME_RULE_PRESETS.find((preset) => preset.id === id)?.body ?? "";
}

export function gameScoringPresetBody(id: GameScoringPresetId): string {
  return GAME_SCORING_PRESETS.find((preset) => preset.id === id)?.body ?? "";
}

export function gameUiStylePresetBody(id: GameUiStylePresetId): string {
  return GAME_UI_STYLE_PRESETS.find((preset) => preset.id === id)?.body ?? "";
}

export function resolveGameRulePresetFromRules(rules: string): GameRulePresetId | "" {
  const trimmed = rules.trim();
  if (!trimmed) {
    return "";
  }
  for (const preset of GAME_RULE_PRESETS) {
    if (trimmed.startsWith(preset.body.split("\n")[0] ?? "")) {
      return preset.id;
    }
    if (trimmed.includes(preset.titleZh) || trimmed.includes(preset.titleEn)) {
      return preset.id;
    }
  }
  return "";
}

export function resolveScoringPresetFromMethod(method: string): GameScoringPresetId | "" {
  const trimmed = method.trim();
  if (!trimmed) {
    return "";
  }
  for (const preset of GAME_SCORING_PRESETS) {
    if (trimmed.startsWith(preset.body.split("\n")[0] ?? "")) {
      return preset.id;
    }
    if (trimmed.includes(preset.titleZh) || trimmed.includes(preset.titleEn)) {
      return preset.id;
    }
  }
  return "";
}

export function resolveUiStylePresetFromStyle(style: string): GameUiStylePresetId | "" {
  const trimmed = style.trim();
  if (!trimmed) {
    return "";
  }
  for (const preset of GAME_UI_STYLE_PRESETS) {
    if (trimmed.startsWith(preset.body.split("\n")[0] ?? "")) {
      return preset.id;
    }
    if (trimmed.includes(preset.titleZh) || trimmed.includes(preset.titleEn)) {
      return preset.id;
    }
  }
  return "";
}

export function hasGameParametersContent(parameters: GameParameters): boolean {
  return (
    parameters.gameRules.trim().length > 0 ||
    parameters.scoringMethod.trim().length > 0 ||
    parameters.uiStyle.trim().length > 0
  );
}

export function normalizeGameParameters(raw: unknown): GameParameters {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_GAME_PARAMETERS };
  }
  const record = raw as Record<string, unknown>;
  const gameRules = typeof record.gameRules === "string" ? record.gameRules : "";
  const presetRaw = typeof record.gameRulePreset === "string" ? record.gameRulePreset : "";
  const gameRulePreset: GameRulePresetId | "" =
    presetRaw === "story-quest" ||
    presetRaw === "sandbox-matching" ||
    presetRaw === "step-unlock"
      ? presetRaw
      : "";
  const scoringMethod =
    typeof record.scoringMethod === "string" ? record.scoringMethod : "";
  const scoringPresetRaw =
    typeof record.scoringMethodPreset === "string"
      ? record.scoringMethodPreset
      : "";
  const scoringMethodPreset: GameScoringPresetId | "" =
    scoringPresetRaw === "positive-stars" ||
    scoringPresetRaw === "decaying-score" ||
    scoringPresetRaw === "effort-accuracy-dual"
      ? scoringPresetRaw
      : "";
  const uiStyle = typeof record.uiStyle === "string" ? record.uiStyle : "";
  const uiStylePresetRaw =
    typeof record.uiStylePreset === "string" ? record.uiStylePreset : "";
  const uiStylePreset: GameUiStylePresetId | "" =
    uiStylePresetRaw === "emoji-vibrant" ||
    uiStylePresetRaw === "clean-high-contrast" ||
    uiStylePresetRaw === "pixel-retro"
      ? uiStylePresetRaw
      : "";
  const gameTemplateId =
    typeof record.gameTemplateId === "string" ? record.gameTemplateId.trim() : "";
  return {
    gameTemplateId,
    gameRulePreset,
    gameRules,
    scoringMethodPreset,
    scoringMethod,
    uiStylePreset,
    uiStyle,
  };
}
