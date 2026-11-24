import type { PedagogyIndividualizedRow } from "@/lib/workflow-draft";
import type { WorkflowDraft } from "@/lib/workflow-draft";
import type { StudentRecord } from "@/lib/student-record";
import {
  pedagogyStrategiesForGame,
  pedagogyTheoryForGame,
} from "@/lib/game-pedagogy-match";
import { formatIepForWorkflow } from "@/lib/student-record";
import {
  DEFAULT_WORKSHEET_PARAMETERS,
  worksheetResponseFormatLabel,
  type WorksheetResponseFormatId,
} from "@/lib/worksheet-parameters";
import { UDL_GAME_TAB_LABEL } from "@/lib/game-udl-target";

function topicLabel(draft: WorkflowDraft) {
  return draft.lesson.topic.trim() || draft.footprint.scope.split("·")[0]?.trim() || "一年級數學";
}

function isBondsTopic(text: string) {
  return /分和合|number bond|合成|分解/.test(text);
}

function isAdditionTopic(text: string) {
  return /加減|加法|減法|addition|subtraction|20\s*以內/.test(text);
}

export type BuildWorksheetOptions = {
  questionCount: number;
  responseFormat: WorksheetResponseFormatId;
  isUdl?: boolean;
  student?: StudentRecord | null;
  pedagogyRow?: PedagogyIndividualizedRow | null;
};

function worksheetFormatForIndex(
  format: WorksheetResponseFormatId,
  index: number,
): WorksheetResponseFormatId {
  if (format !== "mixed") {
    return format;
  }
  const cycle: WorksheetResponseFormatId[] = [
    "mcq_4",
    "large_grid",
    "matching",
    "mcq_4",
  ];
  return cycle[index % cycle.length]!;
}

function bondNumbers(scopeText: string, index: number) {
  const base = (index % 9) + 1;
  const partner = 10 - base;
  if (/分和合|number bond|合成|分解/.test(scopeText) && base < 10) {
    return { a: base, b: partner, sum: 10 };
  }
  const a = base;
  const b = ((index + 2) % 8) + 1;
  return { a, b, sum: a + b };
}

function renderWorksheetItem(
  scope: string,
  index: number,
  format: WorksheetResponseFormatId,
): string {
  const n = index + 1;
  const { a, b, sum } = bondNumbers(scope, index);
  if (format === "mcq_4") {
    const wrong = [sum - 1, sum + 1, sum + 2].filter((v) => v >= 0 && v !== sum);
    const opts = [sum, wrong[0] ?? sum + 3, wrong[1] ?? sum + 4, wrong[2] ?? sum + 5];
    return `${n}. ${a} + ${b} = ?\n\n    A) ${opts[0]}　 B) ${opts[1]}　 C) ${opts[2]}　 D) ${opts[3]}\n\n    答案：（圈選）_______`;
  }
  if (format === "matching") {
    const left = String.fromCharCode(65 + (index % 4));
    return `${n}. 配對：${a} + ${b} → ______\n\n    ${left}) ${sum}　　${String.fromCharCode(66 + (index % 3))}) ${sum + 1}\n\n    答案：_______`;
  }
  if (format === "large_grid") {
    return `${n}. ${a} + ${b} = ?\n\n\n　┌──────────────────────────────┐\n　│                              │\n　│                              │\n　│                              │\n　└──────────────────────────────┘\n`;
  }
  return `${n}. ${a} + ${b} = ______`;
}

export function buildWorksheetMarkdownForTarget(
  draft: WorkflowDraft,
  options: BuildWorksheetOptions,
) {
  const topic = topicLabel(draft);
  const scope = draft.footprint.scope.trim() || topic;
  const count = Math.max(1, Math.min(40, Math.round(options.questionCount)));
  const formatLabel = worksheetResponseFormatLabel(options.responseFormat);
  const audience = options.isUdl
    ? UDL_GAME_TAB_LABEL
    : options.student
      ? `${options.student.name} (${options.student.id})`
      : "學習者";

  const pedagogy = draft.pedagogy;
  const theory = options.isUdl
    ? [pedagogy.udl?.educationalTheoryZh, pedagogy.udl?.educationalTheoryEn]
        .filter(Boolean)
        .join(" ")
        .trim() || pedagogy.educationalTheory.trim()
    : pedagogyTheoryForGame(options.pedagogyRow ?? null, pedagogy).trim();
  const strategies = options.isUdl
    ? [pedagogy.udl?.learningStrategiesZh, pedagogy.udl?.learningStrategiesEn]
        .filter(Boolean)
        .join(" ")
        .trim() || pedagogy.learningStrategies.trim()
    : pedagogyStrategiesForGame(options.pedagogyRow ?? null, pedagogy).trim();

  const supportNote = [theory, strategies]
    .map((line) => line.split("\n")[0]?.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(" · ");

  const lines: string[] = [
    `# ${topic}`,
    "",
    `**對象 / For:** ${audience}`,
    `**年級：** 小一　　**時間：** ${draft.lesson.durationMinutes || "40"} 分鐘`,
    `**題數 / Items:** ${count}　　**作答形式 / Format:** ${formatLabel}`,
    "",
    supportNote
      ? `**調適提示 / Adaptations:** ${supportNote}`
      : "請用鉛筆。每題之間已留空位。",
    "",
    `**範圍 / Scope:** ${scope}`,
    "",
    "---",
    "",
    "## 練習題",
    "",
  ];

  for (let i = 0; i < count; i += 1) {
    const itemFormat = worksheetFormatForIndex(options.responseFormat, i);
    lines.push(renderWorksheetItem(scope, i, itemFormat));
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  lines.push(
    "## 教師備註",
    "",
    "口頭說說：用一句短句子說出自己的做法（可代寫）。",
  );

  return lines.join("\n");
}

export function buildWorksheetMarkdown(draft: WorkflowDraft) {
  return buildWorksheetMarkdownForTarget(draft, {
    questionCount: DEFAULT_WORKSHEET_PARAMETERS.questionCount,
    responseFormat: DEFAULT_WORKSHEET_PARAMETERS.responseFormat,
    isUdl: true,
  });
}

export function buildGameHtmlForStudent(
  draft: WorkflowDraft,
  student: StudentRecord,
  pedagogyRow: PedagogyIndividualizedRow | null,
) {
  const base = buildGameHtml(draft);
  const learnerProfile = formatIepForWorkflow(student).trim();
  const theory = pedagogyTheoryForGame(pedagogyRow, draft.pedagogy).trim();
  const strategies = pedagogyStrategiesForGame(pedagogyRow, draft.pedagogy).trim();
  const params = draft.assets.gameParameters;
  const contextBlock = [
    `<!-- Inclusive Maths · learner: ${escapeHtml(student.name)} (${escapeHtml(student.id)}) -->`,
    learnerProfile ? `Profile: ${learnerProfile.slice(0, 400)}` : "",
    theory ? `Theory: ${theory.slice(0, 400)}` : "",
    strategies ? `Strategies: ${strategies.slice(0, 400)}` : "",
    params.gameRules.trim() ? `Rules: ${params.gameRules.slice(0, 300)}` : "",
    params.scoringMethod.trim()
      ? `Scoring: ${params.scoringMethod.slice(0, 200)}`
      : "",
    params.uiStyle.trim() ? `UI: ${params.uiStyle.slice(0, 200)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const personalizedNote = [
    theory ? theory.split("\n")[0]?.trim() : "",
    strategies ? strategies.split("\n")[0]?.trim() : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const noteHtml = personalizedNote
    ? `<p class="learner-note" style="font-size:0.85rem;color:#5b6f69;margin:0 0 12px">${escapeHtml(personalizedNote)}</p><p style="font-size:0.8rem;color:#7a8f88;margin:0 0 16px">為 ${escapeHtml(student.name)} 調適 · Personalized for ${escapeHtml(student.name)}</p>`
    : `<p style="font-size:0.8rem;color:#7a8f88;margin:0 0 16px">為 ${escapeHtml(student.name)} · For ${escapeHtml(student.name)}</p>`;

  const commentSafe = contextBlock.replace(/\*\//g, "").replace(/-->/g, "");

  const withTitle = base.replace(
    "</title>",
    ` · ${escapeHtml(student.name)}</title>`,
  );

  return withTitle
    .replace("<body>", `<body>\n  <!-- ${commentSafe} -->\n`)
    .replace("<h1>", `${noteHtml}\n    <h1>`);
}

export function buildGameHtml(draft: WorkflowDraft) {
  const topic = topicLabel(draft);
  const combined = `${draft.lesson.topic} ${draft.footprint.scope}`;
  const mode = isBondsTopic(combined)
    ? "bonds"
    : isAdditionTopic(combined)
      ? "add"
      : "count";

  const title =
    mode === "bonds"
      ? "數的分和合"
      : mode === "add"
        ? "20 以內加減"
        : "數一數";

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} · ${escapeHtml(topic)}</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Noto Sans TC", "PingFang TC", sans-serif;
      background: #f4f7f5;
      color: #16302b;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    main {
      width: min(520px, 92vw);
      background: #fff;
      border-radius: 24px;
      padding: 28px 24px 32px;
      box-shadow: 0 8px 32px rgb(15 118 110 / 0.08);
    }
    h1 { font-size: 1.4rem; margin: 0 0 8px; }
    p { margin: 0 0 20px; line-height: 1.5; color: #3f5b55; }
    .prompt {
      font-size: 1.7rem;
      font-weight: 700;
      text-align: center;
      margin: 16px 0 24px;
    }
    .choices {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    button.choice {
      min-height: 72px;
      font-size: 1.6rem;
      font-weight: 700;
      border: 2px solid #99f6e4;
      border-radius: 18px;
      background: #f0fdfa;
      cursor: pointer;
    }
    button.choice:focus { outline: 4px solid #5eead4; }
    .bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 20px;
      color: #0f766e;
      font-weight: 600;
    }
    .ok { color: #0f766e; }
    .bad { color: #b45309; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    <p>點選正確答案。大按鈕、少文字。${escapeHtml(topic)}</p>
    <div class="prompt" id="prompt">準備</div>
    <div class="choices" id="choices"></div>
    <div class="bar">
      <span id="status" class="ok">開始吧</span>
      <span id="score">0 分</span>
    </div>
  </main>
  <script>
    const mode = ${JSON.stringify(mode)};
    let score = 0;
    const promptEl = document.getElementById("prompt");
    const choicesEl = document.getElementById("choices");
    const statusEl = document.getElementById("status");
    const scoreEl = document.getElementById("score");

    function rand(max) { return Math.floor(Math.random() * max); }
    function shuffle(list) {
      return list.map((v) => [Math.random(), v]).sort((a,b) => a[0]-b[0]).map((x) => x[1]);
    }

    function next() {
      let question = "";
      let answer = 0;
      if (mode === "bonds") {
        const a = rand(9) + 1;
        answer = 10 - a;
        question = a + " 和 □ 合成 10";
      } else if (mode === "add") {
        const a = rand(9) + 1;
        const b = rand(10 - a) + 1;
        answer = a + b;
        question = a + " + " + b + " = □";
      } else {
        answer = rand(8) + 2;
        question = "這裏有 " + "● ".repeat(answer).trim() + "　共幾多？";
      }
      const distractors = new Set([answer]);
      while (distractors.size < 4) {
        distractors.add(Math.max(1, answer + rand(7) - 3));
      }
      promptEl.textContent = question;
      choicesEl.innerHTML = "";
      shuffle(Array.from(distractors)).forEach((n) => {
        const btn = document.createElement("button");
        btn.className = "choice";
        btn.type = "button";
        btn.textContent = String(n);
        btn.addEventListener("click", () => {
          if (n === answer) {
            score += 1;
            statusEl.className = "ok";
            statusEl.textContent = "做得好";
          } else {
            statusEl.className = "bad";
            statusEl.textContent = "再試一次";
          }
          scoreEl.textContent = score + " 分";
          next();
        });
        choicesEl.appendChild(btn);
      });
    }
    next();
  </script>
</body>
</html>
`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
