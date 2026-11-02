"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  {
    href: "/",
    en: "Home",
    zh: "首頁",
    match: (path: string) => path === "/",
  },
  {
    href: "/chat",
    en: "Generate Inclusive Lesson",
    zh: "生成共融教案",
    match: (path: string) =>
      path.startsWith("/chat") || path.startsWith("/design"),
  },
  {
    href: "/knowledge",
    en: "Textbook Assistant",
    zh: "課本對話助手",
    match: (path: string) => path.startsWith("/knowledge"),
  },
  {
    href: "/manage/students",
    en: "Learner Profiles",
    zh: "學習者檔案",
    match: (path: string) => path.startsWith("/manage"),
  },
] as const;

function NavLabel({
  en,
  zh,
  active,
}: {
  en: string;
  zh: string;
  active: boolean;
}) {
  const subClass = active ? "text-white/85" : "text-zinc-500";
  return (
    <span className="block text-center leading-snug">
      <span className="block text-xs font-semibold sm:text-sm">{en}</span>
      <span className={`block text-[11px] font-medium ${subClass}`}>{zh}</span>
    </span>
  );
}

export default function AppNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- defer active nav styling until after hydration
    setMounted(true);
  }, []);

  return (
    <nav className="no-print flex flex-wrap justify-center gap-2 px-[5vw] pt-6">
      {links.map((link) => {
        const active = mounted && link.match(pathname);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-full px-3 py-2 ring-1 transition sm:px-4 ${
              active
                ? "bg-zinc-900 text-white ring-zinc-900"
                : "bg-white text-zinc-800 ring-zinc-200 hover:bg-zinc-50 hover:text-zinc-900"
            }`}
          >
            <NavLabel en={link.en} zh={link.zh} active={active} />
          </Link>
        );
      })}
    </nav>
  );
}
