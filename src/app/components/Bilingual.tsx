import type { ReactNode } from "react";

type BilingualStackProps = {
  zh: ReactNode;
  en: ReactNode;
  /** Primary line (Traditional Chinese) */
  zhClassName?: string;
  /** Secondary line (English) */
  enClassName?: string;
  className?: string;
  /**
   * `auto` — one line with · when wide enough; wraps to 繁中 then English when tight.
   * `stack` — always two lines.
   * `inline` — always one line (may wrap at word boundaries in narrow containers).
   */
  layout?: "auto" | "stack" | "inline";
};

/** Traditional Chinese first, English second. */
export function BilingualStack({
  zh,
  en,
  zhClassName = "",
  enClassName = "text-zinc-500",
  className = "",
  layout = "auto",
}: BilingualStackProps) {
  if (layout === "stack") {
    return (
      <span className={`block ${className}`.trim()}>
        <span className={zhClassName}>{zh}</span>
        <span className={`mt-0.5 block text-xs leading-snug ${enClassName}`}>
          {en}
        </span>
      </span>
    );
  }

  const enClasses =
    layout === "inline"
      ? `min-w-0 text-xs leading-snug sm:text-inherit ${enClassName}`
      : `min-w-0 basis-full text-xs leading-snug sm:basis-auto sm:text-inherit ${enClassName}`;

  return (
    <span
      className={`inline-flex max-w-full flex-wrap items-baseline gap-x-1.5 gap-y-0.5 ${className}`.trim()}
    >
      <span className={`min-w-0 ${zhClassName}`.trim()}>{zh}</span>
      <span
        className={
          layout === "inline"
            ? "shrink-0 text-zinc-400"
            : "hidden shrink-0 text-zinc-400 sm:inline"
        }
        aria-hidden
      >
        ·
      </span>
      <span className={enClasses.trim()}>{en}</span>
    </span>
  );
}

type BilingualTitleProps = {
  zh: string;
  en: string;
  as?: "h1" | "h2" | "p";
  className?: string;
};

export function BilingualTitle({
  zh,
  en,
  as: Tag = "h2",
  className = "",
}: BilingualTitleProps) {
  return (
    <Tag className={className}>
      <BilingualStack
        zh={zh}
        en={en}
        zhClassName=""
        enClassName="font-normal text-zinc-500 sm:text-sm"
        layout="auto"
      />
    </Tag>
  );
}

/** Map local topic-analysis signal labels to English subtitles. */
export function topicSignalEnglish(label: string): string | null {
  if (label === "尚未開始對話") {
    return "No conversation yet";
  }
  if (label === "助理已回覆") {
    return "Assistant has replied";
  }
  if (label === "等待助理回覆") {
    return "Waiting for assistant reply";
  }
  if (label === "來自您最新一則訊息") {
    return "From your latest message";
  }
  if (label === "來自較早的訊息") {
    return "From an earlier message";
  }
  if (label.startsWith("已送出 ") && label.endsWith(" 則訊息")) {
    const n = label.replace(/\D/g, "");
    return n ? `Sent ${n} message${n === "1" ? "" : "s"}` : "Messages sent";
  }
  if (label.startsWith("未在您的訊息中辨識到課題")) {
    return "No topic detected in your messages yet";
  }
  return null;
}
