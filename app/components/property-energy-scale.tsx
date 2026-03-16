const energyColor = (letter: string) => {
  switch (letter.toUpperCase()) {
    case "A":
      return "bg-[#2E7D32]";
    case "B":
      return "bg-[#43A047]";
    case "C":
      return "bg-[#7CB342]";
    case "D":
      return "bg-[#FDD835]";
    case "E":
      return "bg-[#FB8C00]";
    case "F":
      return "bg-[#F4511E]";
    case "G":
      return "bg-[#C62828]";
    default:
      return "bg-[#141446]";
  }
};

const letters = ["A", "B", "C", "D", "E", "F", "G"];

export function PropertyEnergyScale({
  title,
  value,
  label,
  unit,
  compact = false,
}: {
  title: string;
  value: number | null;
  label: string | null;
  unit: string;
  compact?: boolean;
}) {
  if (value === null && !label) return null;

  return (
    <div className="rounded-2xl border border-[rgba(20,20,70,0.16)] bg-white/72 p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#141446]/55">{title}</p>
      <div className="mt-2 flex items-center gap-3">
        {label ? (
          <span
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white ${energyColor(label)}`}
          >
            {label}
          </span>
        ) : null}
        <div>
          <p className="text-sm font-semibold text-[#141446]">
            {typeof value === "number" ? `${Math.round(value)} ${unit}` : label ?? "-"}
          </p>
          {!compact ? <p className="text-xs text-[#141446]/65">Valeur transmise par SweepBright</p> : null}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1">
        {letters.map((entry) => (
          <div
            key={entry}
            className={`flex h-6 items-center justify-center rounded text-[10px] font-semibold text-white ${energyColor(entry)} ${
              label?.toUpperCase() === entry ? "ring-2 ring-[#141446]" : ""
            }`}
          >
            {entry}
          </div>
        ))}
      </div>
    </div>
  );
}
