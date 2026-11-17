"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BilingualStack } from "./Bilingual";

const ITEMS = [
  { href: "/manage/students", zh: "學生名單", en: "Student roster" },
  {
    href: "/manage/game-templates",
    zh: "遊戲參數模板",
    en: "Game parameter templates",
  },
] as const;

export default function ManageSubNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-2"
      aria-label="Manage sections"
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