import { clearPedagogyRefineSession } from "@/lib/pedagogy-refine-session";
import { pedagogyInputFingerprint } from "@/lib/pedagogy-strategy";
import type {
  ContentFootprint,
  LearnerProfile,
  PedagogicalStrategyState,
  PedagogyIndividualizedRow,
  WorkflowDraft,
} from "@/lib/workflow-draft";

export function clearPedagogyChatSession() {
  clearPedagogyRefineSession();
}

const DEMO_FOOTPRINT: ContentFootprint = {
  topicSummary:
    "一年級「20以內加減法」單元：透過分合與十格陣理解加減互逆，重點在不進位、以具體圖像建立數感。\nGrade 1 addition and subtraction within 20 using number bonds and ten-frames; no carrying; CPA emphasis.",
  scope:
    "數值範圍：和與差均不超過 20；不含進位與借位。題型：圖示填空、分合圖配對、簡短口算。\nBounds: sums and differences ≤20; no regrouping. Item types: pictorial fill-in, bonds matching, brief mental math.",
  visualModels:
    "十格陣（由左至右填滿）；分合圖（part–whole）；數線 0–20；實物籌碼／積木。\nTen-frames (left-to-right filling); number bonds; number line 0–20; concrete counters.",
  edited: {
    topicSummary: false,
    scope: false,
    visualModels: false,
  },
};

const DEMO_LEARNER: LearnerProfile = {
  classId: "1A",
  studentIds: ["07", "08"],
  senTags: ["spld"],
  classProfile:
    "1A 班共約 30 人；本課聚焦兩位 SpLD（閱讀／工作記憶）學與全班視覺化策略。課堂節奏短段落、高比例操弄材料。\nClass 1A ~30 pupils; focal group includes two SpLD profiles; short instructional chunks and hands-on materials for all.",
  pedagogicalSynthesis: `## 班級教學重點 · Class focus
- 應用題採「一句一卡」與關鍵數字高亮，減少工作記憶負荷。
- 全班統一使用十格陣由左填滿，避免對稱混淆（6/9、12/21）。

## 個別學生 · Individuals
### 07 · Lam Wing Yan (林穎欣) — SpLD Dyslexia (mild)
- 強項：口算與口語推理。
- 調適：題目字放大、關鍵詞標色；額外 15% 作答時間。

### 08 · Lau Chun Hei (劉晉熙) — SpLD Dyslexia (moderate)
- 弱項：多步驟應用題工作記憶。
- 調適：CPA 拆解；逐步揭示題幹；口頭複述後再運算。`,
  profileSynthesisStructured: null,
};

/** Sample Step 3 output (matches Dify structured_output shape) — skips live baseline. */
export function buildPedagogyDemoPedagogyState(
  footprint: ContentFootprint,
  learner: LearnerProfile,
): PedagogicalStrategyState {
  const inputFingerprint = pedagogyInputFingerprint(footprint, learner);

  const udl = {
    educationalTheoryZh:
      "根據通用設計學習（UDL），本科透過提供多元表徵及多元參與表達，減少單一文字或抽象數字對初小學生的障礙，讓所有學生均能以視覺、操作與口語方式進入相同數學概念。",
    educationalTheoryEn:
      "Aligned with Universal Design for Learning (UDL), the lesson provides multiple means of representation and multiple means of action/expression, reducing barriers caused by text-heavy or purely abstract number tasks so all learners can access the same mathematical concept.",
    learningStrategiesZh:
      "全班同步展示具體教具（十格框、數字骰、圓點卡），以視覺圖像引入加法；教師用顏色標示「加數」與「被加數」，並以手勢、口訣和圖卡支持理解。學生可選擇以口頭作答、圈出圖像、操作數粒或書寫數字表達答案。",
    learningStrategiesEn:
      "Use concrete models such as ten frames, counters, dot cards and colour-coded addends for whole-class input; pair every abstract number sentence with a visual model and gesture. Offer flexible response options such as oral answering, circling pictures, manipulating counters, or writing numerals.",
  };

  const individualized: PedagogyIndividualizedRow[] = [
    {
      studentProfile: "林穎欣 (讀寫障礙 / Dyslexia)",
      educationalTheoryZh:
        "根據認知負荷理論及CPA模式，先以圖像與操作減低文字解碼額外負荷，讓有限的工作記憶聚焦於10以內的加法邏輯；再以直接教學法逐步過渡至抽象數字。",
      educationalTheoryEn:
        "Grounded in Cognitive Load Theory and the CPA approach, reduce extraneous language decoding load so working memory focuses on the intrinsic addition logic within 10; use explicit, step-by-step instruction to move from pictorial to abstract numerals.",
      learningStrategiesZh:
        "將題目改為簡短指令，並以圖示代替文字；使用十格框和數字卡，每次只呈現一步算式，讓學生先以圓點數數，再配對數字卡，最後才書寫答案。避免朗讀複雜題幹，容許圈畫或指認作答。",
      learningStrategiesEn:
        "Simplify word problems into short instructions with icons; present one step at a time using ten frames and number cards. Let the student count dots, match numeral cards, and then write the answer. Avoid reading complex stems aloud; allow circling or pointing responses.",
      appliedModes: [
        { mode: "Simplify Mode", intensityLevel: "High" },
        { mode: "Chunking", intensityLevel: "Medium" },
        { mode: "Visual Mode", intensityLevel: "Medium" },
      ],
    },
    {
      studentProfile: "劉晉熙 (專注力不足/過度活躍症 / ADHD)",
      educationalTheoryZh:
        "根據近側發展區與鷹架理論及認知負荷理論，透過短時、清晰的結構化步驟提供暫時性支持，並將問題切成可完成的小段，以維持專注並減少衝動答題。",
      educationalTheoryEn:
        "Using ZPD and scaffolding alongside Cognitive Load Theory, provide short, clearly structured temporary supports and chunked steps to maintain attention and reduce impulsive responding.",
      learningStrategiesZh:
        "把任務分為「看圖、圈數、寫式、檢查」四步完成；每步只給一個指令，完成後立即回饋。運用十格框和圖卡進行操作，容許站起來拿取教具或短暫活動後再繼續，並以視覺計時提示。",
      learningStrategiesEn:
        "Chunk tasks into 'look, circle, write, check' micro-steps with one instruction at a time and immediate feedback. Use ten frames and picture cards for hands-on engagement; allow brief movement or standing to access materials, and use a visual timer.",
      appliedModes: [
        { mode: "Chunking", intensityLevel: "High" },
        { mode: "Visual Mode", intensityLevel: "Low" },
      ],
    },
  ];

  const educationalTheory = `${udl.educationalTheoryZh}\n\n${udl.educationalTheoryEn}`;
  const learningStrategies = `${udl.learningStrategiesZh}\n\n${udl.learningStrategiesEn}`;

  return {
    conversationId: "",
    educationalTheory,
    learningStrategies,
    udl,
    individualized,
    lastInputFingerprint: inputFingerprint,
  };
}

/** Step 1–2 only — Step 3 baseline runs automatically (same as real Steps 1–2 complete). */
export function buildPedagogyDemoDraft(current: WorkflowDraft): WorkflowDraft {
  return {
    ...current,
    footprint: { ...DEMO_FOOTPRINT },
    learner: { ...DEMO_LEARNER },
    pedagogy: {
      conversationId: "",
      educationalTheory: "",
      learningStrategies: "",
      udl: null,
      individualized: [],
      lastInputFingerprint: "",
    },
  };
}

export function shouldAutoLoadPedagogyDemo(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get("demo") === "1" || params.get("fixture") === "1";
}
