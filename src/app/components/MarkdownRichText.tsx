"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownRichTextProps = {
  content: string;
  className?: string;
};

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 last:mb-0 leading-7 text-zinc-800">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-zinc-900">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="text-zinc-800 italic">{children}</em>
  ),
  mark: ({ children }: { children?: React.ReactNode }) => (
    <mark className="rounded bg-yellow-200 px-0.5 text-zinc-900">{children}</mark>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mt-4 mb-2 text-base font-semibold text-zinc-900 first:mt-0">
      {children}
    </h3>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mt-4 mb-2 text-base font-semibold text-zinc-900 first:mt-0">
      {children}
    </h3>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="mt-3 mb-1.5 text-sm font-semibold text-zinc-900 first:mt-0">
      {children}
    </h4>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-3 list-disc space-y-1.5 pl-5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-3 list-decimal space-y-1.5 pl-5 last:mb-0">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-7 text-zinc-800">{children}</li>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="mb-3 border-l-4 border-teal-200 pl-4 text-zinc-700 last:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-zinc-200" />,
  a: ({
    href,
    children,
  }: {
    href?: string;
    children?: React.ReactNode;
  }) => (
    <a
      href={href}
      className="font-medium text-teal-800 underline decoration-teal-300 underline-offset-2 hover:text-teal-950"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[0.9em] text-zinc-800">
      {children}
    </code>
  ),
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="mb-3 overflow-x-auto rounded-lg bg-zinc-100 p-3 text-xs leading-relaxed text-zinc-800 last:mb-0">
      {children}
    </pre>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="mb-3 overflow-x-auto last:mb-0">
      <table className="w-full min-w-[14rem] border-collapse border border-zinc-200/80 text-left text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-zinc-50/90">{children}</thead>
  ),
  tbody: ({ children }: { children?: React.ReactNode }) => (
    <tbody>{children}</tbody>
  ),
  tr: ({ children }: { children?: React.ReactNode }) => (
    <tr className="border-b border-zinc-200/70 last:border-b-0">{children}</tr>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="border-r border-zinc-200/70 px-2.5 py-1.5 font-semibold text-zinc-900 last:border-r-0">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border-r border-zinc-200/60 px-2.5 py-1.5 text-zinc-800 last:border-r-0">
      {children}
    </td>
  ),
};

export default function MarkdownRichText({
  content,
  className = "",
}: MarkdownRichTextProps) {
  const trimmed = content.trim();
  if (!trimmed) {
    return null;
  }

  return (
    <div className={`text-sm ${className}`.trim()}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {trimmed}
      </ReactMarkdown>
    </div>
  );
}
