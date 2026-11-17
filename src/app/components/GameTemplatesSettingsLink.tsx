"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function SettingsIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="size-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.77 1 1.36 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
      />
    </svg>
  );
}

type GameTemplatesSettingsLinkProps = {
  className?: string;
};

export default function GameTemplatesSettingsLink({
  className = "",
}: GameTemplatesSettingsLinkProps) {
  const pathname = usePathname();
  const onTemplatesPage = pathname.startsWith("/manage/game-templates");

  return (
    <Link
      href="/manage/game-templates"
      title="管理模板（系統設定）"
      aria-label="管理模板（系統設定）· Manage templates (system settings)"
      aria-current={onTemplatesPage ? "page" : undefined}
      className={`flex size-9 items-center justify-center rounded-full shadow-sm ring-1 transition ${
        onTemplatesPage
          ? "bg-teal-ink text-white ring-teal-900"
          : "bg-white text-teal-800 ring-teal-200/90 hover:bg-teal-50 hover:text-teal-900"
      } ${className}`}
    >
      <SettingsIcon />
    </Link>
  );
}

export function GameTemplatesSettingsCorner() {
  return (
    <div className="no-print pointer-events-none fixed top-4 right-4 z-40">
      <div className="pointer-events-auto">
        <GameTemplatesSettingsLink />
      </div>
    </div>
  );
}