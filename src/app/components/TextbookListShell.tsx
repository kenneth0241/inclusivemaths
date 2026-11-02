import type { ReactNode } from "react";

export function TextbookListShell({
  loading,
  empty,
  search,
  emptyMessage,
  children,
}: {
  loading: boolean;
  empty: boolean;
  search: string;
  emptyMessage?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-zinc-200">
      {loading ? (
        <ul className="divide-y divide-zinc-100">
          {[1, 2, 3].map((row) => (
            <li key={row} className="flex animate-pulse gap-4 px-5 py-4">
              <div className="size-10 rounded-xl bg-zinc-100" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded bg-zinc-100" />
                <div className="h-3 w-1/3 rounded bg-zinc-100" />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {!loading && empty ? (
        <p className="px-6 py-14 text-center text-sm leading-6 text-zinc-500">
          {search
            ? `No files match “${search}”.`
            : (emptyMessage ??
              "Nothing here yet. Add textbook content on the Upload tab.")}
        </p>
      ) : null}
      {!loading && !empty ? (
        <ul className="divide-y divide-zinc-100">{children}</ul>
      ) : null}
    </div>
  );
}
