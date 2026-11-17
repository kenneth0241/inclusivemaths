import type { Metadata } from "next";
import Link from "next/link";
import AppNav from "../components/AppNav";

export const metadata: Metadata = {
  title: "Studio · Inclusive Maths",
  description:
    "Four-step Inclusive Maths studio for Primary Grade 1 lesson design.",
};

const STEPS = [
  {
    href: "/chat",
    title: "1. Chat with Textbook",
    zh: "課本對話",
    body: "Extract topic summary and scope from the textbook chat.",
  },
  {
    href: "/design/profile",
    title: "2. Learner profile",
    zh: "學習者檔案",
    body: "Select class 1A–1C, whole class or a student, then add class notes.",
  },
  {
    href: "/design/pedagogy",
    title: "3. Pedagogical strategy",
    zh: "教學策略",
    body: "Review locked context, develop strategy, then generate an editable lesson plan.",
  },
  {
    href: "/design/assets",
    title: "4. Worksheets & games",
    zh: "教材",
    body: "Preview a SpLD-friendly worksheet and an HTML5 practice game.",
  },
];

export default function DesignHubPage() {
  return (
    <div className="flex flex-1 flex-col bg-paper pb-20">
      <AppNav />
      <main className="mx-auto flex w-full max-w-layout-narrow flex-col items-center pt-10">
        <p className="text-sm font-semibold tracking-wide text-teal-ink uppercase">
          Design studio
        </p>
        <h1 className="mt-2 text-center text-4xl font-semibold tracking-tight text-zinc-900">
          Four steps to inclusive materials
        </h1>
        <p className="mt-3 mb-10 max-w-layout-prose text-center text-base leading-7 text-zinc-600">
          Start with the textbook, lock a learner profile, generate a plan, then
          produce worksheets and games. Later steps unlock as you complete each
          stage.
        </p>

        <ul className="w-full space-y-4">
          {STEPS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded-3xl bg-white p-6 ring-1 ring-teal-100 transition hover:ring-teal-300"
              >
                <h2 className="text-lg font-semibold text-zinc-900">
                  {item.title}
                </h2>
                <p className="mt-1 text-sm text-teal-ink">{item.zh}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{item.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
