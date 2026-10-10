import { useState } from "react";
import { Check, Clock3 } from "lucide-react";

function formatHour(hour) {
  const normalized = hour % 24;

  return `${normalized % 12 || 12} ${
    normalized < 12 ? "AM" : "PM"
  }`;
}

export function HourlySlotPicker() {
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState("");

  function toggle(hour) {
    const next = selected.includes(hour)
      ? selected.filter((item) => item !== hour)
      : [...selected, hour].sort((a, b) => a - b);

    const hasGap = next.some(
      (item, index) =>
        index > 0 && item !== next[index - 1] + 1
    );

    if (hasGap) {
      setError(
        "Choose consecutive slots. Add or remove slots at either end of your selection."
      );
      return;
    }

    setSelected(next);
    setError("");
  }

  function clear() {
    setSelected([]);
    setError("");
  }

  return (
    <fieldset className="w-full min-w-0 border-0 p-0">
      <legend className="mb-2 text-xs font-bold text-[#596653]">
        Hourly slots · Philippine time
      </legend>

      <p className="mb-3 text-xs text-[#68795c]">
        Choose your first slot, then select the hours
        beside it.
      </p>

      {selected.map((hour) => (
        <input
          key={hour}
          type="hidden"
          name="session_hours"
          value={hour}
        />
      ))}

      <div
        className="
          grid max-h-56 grid-cols-2 gap-2
          overflow-y-auto overscroll-contain
          rounded-2xl border border-[#d4dfcc]
          bg-[#f8faf3] p-3 sm:grid-cols-3
          [scrollbar-color:#9bbc53_#edf2e5]
          [scrollbar-width:thin]
        "
      >
        {Array.from({ length: 24 }, (_, hour) => {
          const isSelected = selected.includes(hour);

          return (
            <button
              key={hour}
              type="button"
              aria-pressed={isSelected}
              onClick={() => toggle(hour)}
              className={`
                flex min-h-12 items-center
                justify-center gap-1 rounded-xl
                border px-2 py-3 text-xs
                font-semibold transition
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-[#78944b]
                ${
                  isSelected
                    ? "border-[#9bbc53] bg-[#dcfa53] text-[#24412b]"
                    : "border-[#d4dfcc] bg-white text-[#52634c] hover:border-[#9bbc53] hover:bg-[#edf3e1]"
                }
              `}
            >
              {isSelected && (
                <Check size={13} className="shrink-0" />
              )}

              <span>
                {formatHour(hour)} –{" "}
                {formatHour(hour + 1)}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-2 text-xs text-red-600"
        >
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#d4dfcc] bg-[#f4f7ed] p-3">
        <div
          className="flex min-w-0 items-center gap-2 text-sm text-[#24412b]"
          role="status"
        >
          <Clock3 size={17} className="shrink-0" />

          <span>
            {selected.length ? (
              <>
                Selected schedule:{" "}
                <strong>
                  {formatHour(selected[0])} –{" "}
                  {formatHour(
                    selected[selected.length - 1] + 1
                  )}
                  {selected[selected.length - 1] === 23
                    ? " (next day)"
                    : ""}
                </strong>

                <span className="ml-2 text-xs text-[#68795c]">
                  {selected.length}{" "}
                  {selected.length === 1
                    ? "hour"
                    : "hours"}
                </span>
              </>
            ) : (
              "Select at least one hourly slot."
            )}
          </span>
        </div>

        {!!selected.length && (
          <button
            type="button"
            onClick={clear}
            className="text-xs font-semibold text-[#52634c] underline underline-offset-2"
          >
            Clear
          </button>
        )}
      </div>
    </fieldset>
  );
}