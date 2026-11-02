"use client";

import { BilingualStack } from "./Bilingual";

type ChatFollowUpSuggestionsProps = {
  questions: string[];
  disabled?: boolean;
  onSelect: (question: string) => void;
  onCopyToInput: (question: string) => void;
};

function CopyToInputIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="size-4"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export default function ChatFollowUpSuggestions({
  questions,
  disabled = false,
  onSelect,
  onCopyToInput,
}: ChatFollowUpSuggestionsProps) {
  const visible = questions.filter(
    (question) => question.trim() && question !== "[object Object]",
  );

  if (visible.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 w-full max-w-[85%] space-y-2">
      <p className="text-xs font-medium text-zinc-500">
        <BilingualStack
          zh="建議追問：點文字送出，或按複製圖示到輸入框再編輯"
          en="Suggested follow-ups: tap to send, or copy to the input to edit"
          enClassName="font-normal text-zinc-400"
        />
      </p>
      <ul className="flex flex-col gap-2">
        {visible.map((question, index) => (
          <li
            key={`${index}-${question.slice(0, 24)}`}
            className="flex gap-2"
          >
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(question)}
              className="min-w-0 flex-1 rounded-2xl bg-emerald-50 px-4 py-2.5 text-left text-sm leading-normal text-emerald-950 ring-1 ring-emerald-100 hover:bg-emerald-100/80 disabled:opacity-50"
            >
              {question}
            </button>
            <button
              type="button"
              disabled={disabled}
              aria-label={`複製到輸入框：${question}`}
              title="複製到輸入框編輯"
              onClick={() => onCopyToInput(question)}
              className="flex shrink-0 items-center justify-center rounded-2xl bg-white px-3 py-2.5 text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-50"
            >
              <CopyToInputIcon />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
