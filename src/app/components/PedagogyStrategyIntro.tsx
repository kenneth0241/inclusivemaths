import { BilingualStack } from "./Bilingual";

export default function PedagogyStrategyIntro() {
  return (
    <section className="rounded-3xl bg-white p-5 ring-1 ring-teal-100 sm:p-6">
      <h2 className="text-lg font-semibold text-zinc-900">
        <BilingualStack
          zh="教學策略分析"
          en="Pedagogical Strategy Analysis"
          layout="inline"
          enClassName="font-medium text-zinc-500"
        />
      </h2>
      <p className="mt-3 text-sm leading-7 text-zinc-700">
        透過分析你匯入的「學生學習概覽」及「教學主題」，系統將為本班學生精準對齊特殊教育需求
        (SEN)，並生成專屬的教學路徑：
      </p>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        By analyzing your inputted Learner Profiles and the defined Lesson Topic,
        the system will align with your students&apos; specific Special Educational
        Needs (SEN) to generate a customized teaching pathway:
      </p>

      <ul className="mt-5 space-y-4 text-sm leading-7 text-zinc-700">
        <li>
          <p className="font-semibold text-zinc-900">
            教育理論 (Educational Theory — The &quot;Why&quot;)
          </p>
          <p className="mt-1">
            提供宏觀的教學框架。例如，系統會建議是否採用「通用設計學習 (UDL)」，解釋如何從根本上移除不必要的學習障礙。
          </p>
          <p className="mt-1 text-zinc-500">
            Provides the broad, overarching framework. For example, it may recommend
            Universal Design for Learning (UDL) and explain the rationale for removing
            specific barriers to learning.
          </p>
        </li>
        <li>
          <p className="font-semibold text-zinc-900">
            支援策略 (Learning Strategies — The &quot;How&quot;)
          </p>
          <p className="mt-1">
            將理論轉化為具體、可執行的行動步驟。系統會建議適合的調適功能（如：簡化模式、拆解模式或視覺模式），讓你直接應用於教材生成中。
          </p>
          <p className="mt-1 text-zinc-500">
            Translates the theory into concrete, actionable steps. The system will
            recommend specific scaffolding modes (e.g., Simplify Mode, Chunking, or
            Visual Mode) that you can immediately apply when generating learning
            materials.
          </p>
        </li>
      </ul>
    </section>
  );
}
