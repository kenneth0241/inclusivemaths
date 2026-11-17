"use client";

import { BilingualStack } from "./Bilingual";

export type GameLearnerTab = {
  studentId: string;
  name: string;
  hasHtml: boolean;
};

type GameLearnerTabBarProps = {
  tabs: GameLearnerTab[];
  activeStudentId: string;
  onChange: (studentId: string) => void;
  ariaLabel?: string;
};

export default function GameLearnerTabBar({
  tabs,
  activeStudentId,
  onChange,
  ariaLabel = "遊戲對象分頁 · Learner game tabs",
}: GameLearnerTabBarProps) {
  if (tabs.length === 0) {
    return (
      <p className="text-xs text-zinc-500">
        <BilingualStack
          zh="請先在「遊戲對象」勾選學習者。"
          en="Select learners under Game targets first."
          layout="inline"
        />
      </p>
    );
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex flex-wrap gap-1 rounded-2xl bg-zinc-50/90 p-1 ring-1 ring-zinc-200"
    >
      {tabs.map((tab) => {
        const isActive = tab.studentId === activeStudentId;
        return (
          <button
            key={tab.studentId}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.studentId)}
            className={`flex min-w-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition sm:text-sm ${
              isActive
                ? "bg-white text-teal-900 shadow-sm ring-1 ring-teal-200"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <span className="truncate">{tab.name}</span>
            {tab.hasHtml ? (
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
  );
}