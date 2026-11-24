"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BilingualStack } from "./Bilingual";

const ITEMS = [
  {
    href: "/design/assets/games",
    zh: "Step 4.1 · 互動遊戲",
    en: "HTML games",
  },
  {
    href: "/design/assets/worksheets",
    zh: "Step 4.2 · 工作紙",
    en: "Worksheets",
  },
] as const;

export default function Step4MaterialsSubNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mx-auto flex w-full max-w-layout-wide flex-wrap justify-center gap-2"
      aria-label="Step 4 materials sections"
    >
      {ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-4 py-2 text-xs font-semibold ring-1 transition sm:text-sm ${
              active
                ? "bg-teal-ink text-white ring-teal-900"
                : "bg-white text-zinc-800 ring-zinc-200 hover:bg-zinc-50"
            }`}
            aria-current={active ? "page" : undefined}
          >
            <BilingualStack
              zh={item.zh}
              en={item.en}
              layout="inline"
              enClassName={active ? "text-white/85" : "text-zinc-500"}
            />
          </Link>
        );
      })}
    </nav>
  );
}