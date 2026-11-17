import type { FootprintField } from "@/lib/workflow-draft";

export type FootprintGuideBlock = {
  headingZh: string;
  headingEn: string;
  bodyZh: string;
  bodyEn: string;
  /** Each string is one example line (may include ❌/✅ prefix in text). */
  examplesZh?: string[];
  examplesEn?: string[];
};

export type FootprintFieldGuideContent = {
  titleZh: string;
  titleEn: string;
  blocks: FootprintGuideBlock[];
};

const SCOPE_GUIDE: FootprintFieldGuideContent = {
  titleZh: "具體範圍與限制",
  titleEn: "Specific Scope & Constraints",
  blocks: [
    {
      headingZh: "❓ 為什麼我們需要這個？",
      headingEn: "❓ Why do we need this?",
      bodyZh:
        "對於 SpLD（如讀寫障礙、AD/HD）的學生來說，他們的「工作記憶（Working Memory）」和注意力資源非常有限。如果教學內容的跨度太大，會極易造成認知超載（Cognitive Overload）。釐清課本的「具體範圍與限制」，能幫助我們將教學目標精確切割，確保教材與遊戲的難度完全對齊課本的要求，避免加入超出該階段的複雜運算。",
      bodyEn:
        'For students with SpLD (such as Dyslexia or AD/HD), working memory and attentional resources are highly limited. If the teaching scope is too broad, it easily leads to cognitive overload. Clarifying the "Specific Scope & Constraints" helps us precisely slice the learning objectives, ensuring that our worksheets and games perfectly align with the textbook\'s exact difficulty level, avoiding any overly complex calculations for that stage.',
    },
    {
      headingZh: "💡 我們期望老師填寫什麼？",
      headingEn: "💡 What should you enter?",
      bodyZh:
        "我們不需要籠統的課題名稱（如「加法」），而是需要具體的數學邊界條件：",
      bodyEn:
        'We do not need broad topic names (like "Addition"). We need the specific mathematical boundaries:',
      examplesZh: [
        "❌ 太籠統：教學生加法。",
        "✅ 好例子：10 以內的加法，不涉及進位。",
        "❌ 太籠統：學習看時鐘。",
        "✅ 好例子：只涵蓋「整點（時）」和「半點（半時）」，不涉及分鐘的推算。",
        "✅ 好例子：認識立體圖形，只需分辨「柱體」和「錐體」，未需要計算面、稜、頂點的數量。",
      ],
      examplesEn: [
        "❌ Too broad: Teaching students addition.",
        "✅ Good example: Addition up to 10, without carrying over.",
        "❌ Too broad: Learning to read a clock.",
        '✅ Good example: Covers "o\'clock" and "half past" only, without calculating minutes.',
        "✅ Good example: Recognizing 3D shapes (prisms and pyramids), without calculating the number of faces, edges, or vertices.",
      ],
    },
  ],
};

export const FOOTPRINT_FIELD_GUIDES: Record<
  FootprintField,
  FootprintFieldGuideContent
> = {
  scope: SCOPE_GUIDE,
};
