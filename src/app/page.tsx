import Link from "next/link";
import { BilingualStack } from "./components/Bilingual";

const STEPS = [
  {
    step: "1",
    title: "Chat with the textbook",
    zh: "課本對話",
    body: "Explore the MathsTextbook knowledge base. Lock in topic and scope.",
  },
  {
    step: "2",
    title: "Learner profile",
    zh: "學習者檔案",
    body: "Choose a class, then whole class or a student. Add notes on SpLD / AD/HD dynamics.",
  },
  {
    step: "3",
    title: "Pedagogical strategy",
    zh: "教學策略",
    body: "Review Steps 1–2, develop your strategy, then generate a CPA-informed lesson plan.",
  },
  {
    step: "4",
    title: "Worksheets & games",
    zh: "教材",
    body: "Turn the plan into a spaced worksheet and a previewable HTML5 practice game.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-paper pb-20">
      <main className="mx-auto flex w-full max-w-layout-medium flex-col items-center pt-16">
        <p className="text-sm font-semibold tracking-wide text-teal-ink uppercase">
          Inclusive Maths · Primary Grade 1
        </p>
        <h1 className="mt-3 text-center text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
          Targeted maths design for every learner
        </h1>
        <p className="mt-4 max-w-layout-prose text-center text-lg leading-8 text-zinc-600">
          Help Hong Kong primary teachers combine textbook content, learner
          profiles, and pedagogical frameworks into lesson plans, worksheets,
          and simple games.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href="/chat"
            className="rounded-full bg-teal-ink px-6 py-3 text-sm font-semibold text-white hover:bg-teal-700"
          >
            <BilingualStack
              zh="生成共融教案"
              en="Generate Inclusive Lesson"
              layout="stack"
              zhClassName=""
              enClassName="text-xs font-medium text-white/85"
            />
          </Link>
          <Link
            href="/knowledge"
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-zinc-900 ring-1 ring-zinc-200 hover:bg-zinc-50"
          >
            <BilingualStack
              zh="課本對話助手"
              en="Textbook Assistant"
              layout="stack"
              zhClassName="text-zinc-900"
              enClassName="text-xs font-medium text-zinc-500"
            />
          </Link>
          <Link
            href="/manage/students"
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-zinc-900 ring-1 ring-zinc-200 hover:bg-zinc-50"
          >
            <BilingualStack
              zh="學習者檔案"
              en="Learner Profiles"
              layout="stack"
              zhClassName="text-zinc-900"
              enClassName="text-xs font-medium text-zinc-500"
            />
          </Link>
        </div>

        <section className="mt-16 w-full">
          <h2 className="text-center text-2xl font-semibold text-zinc-900">
            How it works
          </h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2">
            {STEPS.map((item) => (
              <li
                key={item.step}
                className="rounded-3xl bg-white p-5 ring-1 ring-teal-100"
              >
                <p className="text-sm font-semibold text-teal-ink">
                  Step {item.step} · {item.zh}
                </p>
                <h3 className="mt-2 font-semibold text-zinc-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <p className="mt-16 max-w-layout-prose text-center text-sm leading-6 text-zinc-500">
          Pilot workspace for Hong Kong Primary Grade 1 maths, with a focus on
          SpLD and AD/HD. Answers are grounded in your uploaded textbook
          Markdown via Dify.
        </p>
      </main>
    </div>
  );
}
