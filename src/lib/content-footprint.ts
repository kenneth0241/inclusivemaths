import type { ContentFootprint } from "@/lib/workflow-draft";

type TranscriptMessage = {
  role: "user" | "assistant" | string;
  content: string;
};

const SCOPE_PATTERNS: RegExp[] = [
  /單元\s*\d+[A-Za-z]?[^。\n]{0,24}/g,
  /(?:1上|1下)\s*[AB]冊/g,
  /數的分和合/g,
  /20\s*以內(?:的加減|加減)?/g,
  /加減法/g,
  /認識數字/g,
  /不超過\s*\d+/g,
  /以內/g,
];

const SCOPE_KEYWORDS = [
  "數的分和合",
  "20以內",
  "加減",
  "認識數字",
  "圖形",
  "時間",
  "長度",
  "比較",
  "分類",
  "單元",
  "課題",
  "不超過",
  "不進位",
  "進位",
];

const VISUAL_KEYWORDS = [
  "十格陣",
  "十格",
  "數線",
  "實物",
  "積木",
  "手指",
  "圓點",
  "圖畫",
  "CPA",
  "具體",
  "圖像",
  "符號",
  "ten-frame",
  "ten frame",
  "number line",
  "manipulative",
];

function uniquePhrases(items: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const text = item.replace(/\s+/g, " ").trim();
    if (!text || text.length > 80 || seen.has(text)) {
      continue;
    }
    seen.add(text);
    result.push(text);
    if (result.length >= 8) {
      break;
    }
  }
  return result;
}

function collectKeywordHits(text: string, keywords: string[]) {
  const hits: string[] = [];
  const lower = text.toLowerCase();
  for (const keyword of keywords) {
    if (lower.includes(keyword.toLowerCase())) {
      hits.push(keyword);
    }
  }
  return hits;
}

function collectPatternHits(text: string, patterns: RegExp[]) {
  const hits: string[] = [];
  for (const pattern of patterns) {
    const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
    const copy = new RegExp(pattern.source, flags);
    let match: RegExpExecArray | null;
    while ((match = copy.exec(text)) !== null) {
      hits.push(match[0]);
      if (hits.length >= 12) {
        break;
      }
    }
  }
  return hits;
}

function recentTranscript(messages: TranscriptMessage[]) {
  return messages
    .slice(-8)
    .map((message) => message.content)
    .filter((content) => content.trim().length > 0)
    .join("\n");
}

export function extractContentFootprint(
  messages: TranscriptMessage[],
): Pick<ContentFootprint, "scope" | "visualModels"> {
  const text = recentTranscript(messages);
  if (!text.trim()) {
    return { scope: "", visualModels: "" };
  }

  const scope = uniquePhrases([
    ...collectPatternHits(text, SCOPE_PATTERNS),
    ...collectKeywordHits(text, SCOPE_KEYWORDS),
  ]);
  const visualModels = uniquePhrases(collectKeywordHits(text, VISUAL_KEYWORDS));

  return {
    scope: scope.join(" · "),
    visualModels: visualModels.join(" · "),
  };
}
