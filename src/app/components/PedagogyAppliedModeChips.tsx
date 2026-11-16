"use client";

import {
  appliedModeChipLabel,
  appliedModeIntensityChipClass,
  type PedagogyAppliedModeEntry,
} from "@/lib/pedagogy-applied-modes";

type PedagogyAppliedModeChipsProps = {
  modes: PedagogyAppliedModeEntry[];
  className?: string;
  size?: "sm" | "md";
};

export default function PedagogyAppliedModeChips({
  modes,
  className = "",
  size = "sm",
}: PedagogyAppliedModeChipsProps) {
  if (modes.length === 0) {
    return null;
  }

  const textClass = size === "md" ? "text-[11px]" : "text-[10px]";
  const padClass = size === "md" ? "px-2.5 py-0.5" : "px-2 py-0.5";

  return (
    <div
      className={`flex flex-nowrap items-center gap-1 overflow-x-auto ${className}`.trim()}
    >
      {modes.map((entry) => (
        <span
          key={`${entry.mode}-${entry.intensityLevel}`}
          className={`inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full font-medium ring-1 ${textClass} ${padClass} ${appliedModeIntensityChipClass(entry.intensityLevel)}`}
          title={`${entry.mode} — intensity ${entry.intensityLevel}`}
        >
          <span>{appliedModeChipLabel(entry.mode)}</span>
          <span className="font-semibold opacity-90" aria-label="Intensity">
            {entry.intensityLevel}
          </span>
        </span>
      ))}
    </div>
  );
}
