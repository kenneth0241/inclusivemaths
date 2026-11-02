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

const VISUAL_GUIDE: FootprintFieldGuideContent = {
  titleZh: "視覺圖解與表達",
  titleEn: "Visual Models & Representations",
  blocks: [
    {
      headingZh: "❓ 為什麼我們需要這個？",
      headingEn: "❓ Why do we need this?",
      bodyZh:
        "SpLD 學生通常難以直接理解抽象的數字符號（如 3 + 2 = 5）。他們高度依賴「具體－圖像－抽象（CPA, Concrete-Pictorial-Abstract）」的學習歷程。了解課本採用了哪種視覺圖解，我們才能在設計工作紙和互動遊戲時，採用與課本完全一致的視覺提示。如果課本用「十格陣」，而我們的工作紙卻用了「數線」，這種視覺不一致會讓 SpLD 學生感到混淆並產生挫敗感。",
      bodyEn:
        'Students with SpLD often struggle to process abstract numerical symbols directly (e.g., 3 + 2 = 5). They rely heavily on the Concrete-Pictorial-Abstract (CPA) learning progression. By understanding which visual models the textbook uses, we can ensure our generated worksheets and interactive games use the exact same visual cues. If the textbook uses "Ten-frames" but our worksheet uses a "Number Line," this visual inconsistency will cause confusion and frustration for SpLD students.',
    },
    {
      headingZh: "💡 我們期望老師填寫什麼？",
      headingEn: "💡 What should you enter?",
      bodyZh: "請告訴我們課本是「畫什麼圖」來解釋這個數學概念的：",
      bodyEn:
        "Please tell us what kind of graphics or models the textbook draws to explain the concept:",
      examplesZh: [
        "✅ 好例子（加減法）：課本使用了「分和合圖（Number Bonds）」來展示數字的拆解。",
        "✅ 好例子（數數與進位）：課本主要使用「十格陣（Ten-frames）」和「積木數粒（Base-10 blocks）」來表達十位和個位。",
        "✅ 好例子（數列或排序）：課本畫了一條有箭頭的「數線（Number Line）」，並以青蛙跳躍的圖示來代表加法前進。",
        "✅ 好例子（分數）：課本使用了「被等分的圓形披薩圖」，而不是長條圖。",
      ],
      examplesEn: [
        '✅ Good example (addition/subtraction): The textbook uses "Number Bonds" to demonstrate splitting numbers.',
        '✅ Good example (counting/place value): The textbook primarily uses "Ten-frames" and "Base-10 blocks" to represent tens and units.',
        '✅ Good example (number sequences): The textbook draws a "Number Line" with arrows and frog jumps to represent moving forward in addition.',
        '✅ Good example (fractions): The textbook uses "Equally divided circular pizzas" instead of rectangular bar models.',
      ],
    },
  ],
};

export const FOOTPRINT_FIELD_GUIDES: Record<
  FootprintField,
  FootprintFieldGuideContent
> = {
  scope: SCOPE_GUIDE,
  visualModels: VISUAL_GUIDE,
};
