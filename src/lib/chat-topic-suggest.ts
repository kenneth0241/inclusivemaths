type ChatTurn = { role: "user" | "assistant"; content: string };

export type TopicSignal = {
  label: string;
  score: number;
};

export type TopicDetectionResult = {
  topic: string | null;
  /** 0–100 index shown on screen (not a model probability). */
  confidence: number;
  ready: boolean;
  threshold: number;
  signals: TopicSignal[];
  matchReason: string | null;
  suggestedQuestion: string | null;
};

/** Suggestion card appears when the index reaches this value (after at least one reply). */
export const TOPIC_SUGGESTION_THRESHOLD = 50;

/** Follow-up question shown once a teaching topic is clear (edit wording here). */
export function buildTopicFollowUpQuestion(topic: string) {
  return `請就「${topic}」提供適合一年級、配合讀寫困難學生的教學重點與課堂建議。`;
}

function stripThinkTags(text: string) {
  return text
    .replace(/<\s*think\s*>[\s\S]*?<\s*\/\s*think\s*>/gi, "")
    .replace(
      /<\s*redacted_reasoning\s*>[\s\S]*?<\s*\/\s*redacted_reasoning\s*>/gi,
      "",
    )
    .trim();
}

function isNoiseTopic(topic: string) {
  return /目錄|所有單元|完整.*單元|列出.*單元|有哪些/.test(topic);
}

type TextMatch = {
  topic: string;
  baseScore: number;
  reason: string;
};

function matchTopicInText(text: string): TextMatch | null {
  const cleaned = stripThinkTags(text);
  if (!cleaned) {
    return null;
  }

  const candidates: TextMatch[] = [];

  const quoted =
    cleaned.match(/[「『《]([^」』》]{2,48})[」』》]/) ??
    cleaned.match(/"([^"]{2,48})"/);
  if (quoted?.[1]) {
    candidates.push({
      topic: quoted[1].trim(),
      baseScore: 88,
      reason: "引號內的文字",
    });
  }

  const labeled = cleaned.match(
    /(?:單元|单元|課題|课题|主題|主题|想教|會教|准备教|準備教|打算教)[：:\s]*([^\n。！？!?，,；;]{2,36})/,
  );
  if (labeled?.[1]) {
    candidates.push({
      topic: labeled[1].trim(),
      baseScore: 78,
      reason: "訊息中的「單元／主題」標籤",
    });
  }

  const unitHeading = cleaned.match(
    /第[一二三四五六七八九十\d]+[個个]?(?:單元|单元|课|課)(?:[：:\s][^\n。，,]{0,24})?/,
  );
  if (unitHeading?.[0]) {
    candidates.push({
      topic: unitHeading[0].trim(),
      baseScore: 76,
      reason: "第 N 單元／課",
    });
  }

  const choose = cleaned.match(
    /(?:選|选|就選|就选|用|想問|想问|想聊|想討論|想讨论)(?:這|这|那|关于|關於)?[「『"]?([^」』"\n。！？!?，,；;]{2,32})/,
  );
  if (choose?.[1]) {
    candidates.push({
      topic: choose[1].trim(),
      baseScore: 72,
      reason: "選擇／指定某一課題",
    });
  }

  const teach = cleaned.match(
    /(?:教|讲|講|上)(.{2,28}?)(?:的课|的課|這節|这节|嗎|吗|？|\?|。)/,
  );
  if (teach?.[1]) {
    candidates.push({
      topic: teach[1].trim(),
      baseScore: 68,
      reason: "「教／講 …」句式",
    });
  }

  const about = cleaned.match(
    /(?:关于|關於|讲讲|講講|介绍|介紹)(.{2,28}?)(?:吗|嗎|？|\?|$)/,
  );
  if (about?.[1]) {
    candidates.push({
      topic: about[1].trim(),
      baseScore: 62,
      reason: "「關於 …」句式",
    });
  }

  const howToTeach = cleaned.match(/(.{2,24}?)(?:怎麼教|怎么教|如何教)/);
  if (howToTeach?.[1]) {
    candidates.push({
      topic: howToTeach[1].trim(),
      baseScore: 65,
      reason: "「…怎麼教」句式",
    });
  }

  const listPick = cleaned.match(
    /(?:^|\n)\s*(?:\d+[.)、]|[-•])\s*([^\n。，,；;]{2,32})/,
  );
  if (listPick?.[1]) {
    candidates.push({
      topic: listPick[1].trim(),
      baseScore: 58,
      reason: "列表中選取的一行",
    });
  }

  const mathKeyword =
    /加法|減法|减法|加減|加减|數数|數數|数数|圖形|图形|形狀|形状|貨幣|货币|時間|时间|測量|测量|比較|比较|位值|分類|分类|規律|规律/;
  if (
    cleaned.length <= 28 &&
    mathKeyword.test(cleaned) &&
    !/目錄|目录|列出|所有/.test(cleaned)
  ) {
    candidates.push({
      topic: cleaned.replace(/[。！？!?]+$/g, "").trim(),
      baseScore: 56,
      reason: "短句中的數學課題關鍵字",
    });
  }

  const valid = candidates.filter(
    (item) => item.topic.length >= 2 && !isNoiseTopic(item.topic),
  );
  if (valid.length === 0) {
    return null;
  }

  return valid.sort((a, b) => b.baseScore - a.baseScore)[0];
}

export function analyzeTeachingTopic(messages: ChatTurn[]): TopicDetectionResult {
  const signals: TopicSignal[] = [];
  const userCount = messages.filter((message) => message.role === "user").length;
  const assistantCount = messages.filter(
    (message) => message.role === "assistant" && message.content.trim(),
  ).length;

  if (userCount === 0) {
    return {
      topic: null,
      confidence: 0,
      ready: false,
      threshold: TOPIC_SUGGESTION_THRESHOLD,
      signals: [{ label: "尚未開始對話", score: 0 }],
      matchReason: null,
      suggestedQuestion: null,
    };
  }

  signals.push({
    label: `已送出 ${userCount} 則訊息`,
    score: Math.min(userCount * 8, 24),
  });

  if (assistantCount > 0) {
    signals.push({ label: "助理已回覆", score: 18 });
  } else {
    signals.push({ label: "等待助理回覆", score: 0 });
  }

  const userMessages = messages
    .filter((message) => message.role === "user")
    .slice(-3);

  let best: (TextMatch & { fromLastUser: boolean }) | null = null;

  for (let index = userMessages.length - 1; index >= 0; index -= 1) {
    const hit = matchTopicInText(userMessages[index].content);
    if (!hit) {
      continue;
    }
    const fromLastUser = index === userMessages.length - 1;
    if (
      !best ||
      hit.baseScore + (fromLastUser ? 10 : 0) >
        best.baseScore + (best.fromLastUser ? 10 : 0)
    ) {
      best = { ...hit, fromLastUser };
    }
  }

  if (!best) {
    const total = Math.min(
      signals.reduce((sum, item) => sum + item.score, 0),
      42,
    );
    return {
      topic: null,
      confidence: total,
      ready: false,
      threshold: TOPIC_SUGGESTION_THRESHOLD,
      signals: [
        ...signals,
        {
          label: "未在您的訊息中辨識到課題（可試：「我想教第二單元加法」）",
          score: 0,
        },
      ],
      matchReason: null,
      suggestedQuestion: null,
    };
  }

  signals.push({
    label: best.reason,
    score: best.baseScore,
  });

  if (best.fromLastUser) {
    signals.push({ label: "來自您最新一則訊息", score: 12 });
  } else {
    signals.push({ label: "來自較早的訊息", score: 4 });
  }

  const rawConfidence = signals.reduce((sum, item) => sum + item.score, 0);
  const confidence = Math.min(100, rawConfidence);

  const ready =
    assistantCount >= 1 &&
    confidence >= TOPIC_SUGGESTION_THRESHOLD &&
    Boolean(best.topic);

  return {
    topic: best.topic,
    confidence,
    ready,
    threshold: TOPIC_SUGGESTION_THRESHOLD,
    signals,
    matchReason: best.reason,
    suggestedQuestion: buildTopicFollowUpQuestion(best.topic),
  };
}

/** @deprecated Use analyzeTeachingTopic */
export function inferTeachingTopic(messages: ChatTurn[]): string | null {
  return analyzeTeachingTopic(messages).topic;
}

/** @deprecated Use analyzeTeachingTopic */
export function isTeachingTopicReady(
  messages: ChatTurn[],
  topic: string | null,
): topic is string {
  const analysis = analyzeTeachingTopic(messages);
  return analysis.ready && analysis.topic === topic;
}
