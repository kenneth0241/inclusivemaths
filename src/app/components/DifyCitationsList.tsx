import {
  sortRetrieverResources,
  type DifyRetrieverResource,
} from "@/lib/dify-citations";

type DifyCitationsListProps = {
  citations: DifyRetrieverResource[];
  className?: string;
};

export default function DifyCitationsList({
  citations,
  className = "",
}: DifyCitationsListProps) {
  if (citations.length === 0) {
    return null;
  }

  const sorted = sortRetrieverResources(citations);

  return (
    <div
      className={`border-t border-zinc-200 pt-3 text-xs leading-normal text-zinc-600 ${className}`}
    >
      <p className="font-semibold text-zinc-700">Citations</p>
      <ul className="mt-2 space-y-2">
        {sorted.map((citation, index) => (
          <li
            key={`${citation.segment_id ?? citation.document_id ?? "cite"}-${index}`}
            className="rounded-xl bg-zinc-50/90 px-3 py-2 ring-1 ring-zinc-100"
          >
            <p className="font-medium text-zinc-800">
              {citation.position != null ? (
                <span className="mr-1.5 text-zinc-500">[{citation.position}]</span>
              ) : null}
              {citation.document_name ?? "Document"}
              {citation.dataset_name ? (
                <span className="font-normal text-zinc-500">
                  {" "}
                  · {citation.dataset_name}
                </span>
              ) : null}
              {typeof citation.score === "number" ? (
                <span className="ml-1 font-normal text-zinc-400">
                  ({Math.round(citation.score * 100)}%)
                </span>
              ) : null}
            </p>
            {citation.content ? (
              <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-zinc-600">
                {citation.content}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
