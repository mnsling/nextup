import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { BrandSelect } from "./BrandSelect";

function dateString(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function BrandDatePicker({
  name,
  value: controlled,
  defaultValue = "",
  onChange,
  required,
  disabled,
  min,
  max,
  label = "Choose date",
}) {
  const [internal, setInternal] = useState(defaultValue);
  const value = controlled ?? internal;
  const [open, setOpen] = useState(false);

  const [month, setMonth] = useState(
    () =>
      new Date(
        `${value || dateString(new Date())}T12:00:00`
      )
  );

  const root = useRef(null);
  const trigger = useRef(null);

  useEffect(() => {
    function outside(event) {
      if (!root.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", outside);

    return () => {
      document.removeEventListener("pointerdown", outside);
    };
  }, []);

  const first = new Date(
    month.getFullYear(),
    month.getMonth(),
    1
  );

  const count = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0
  ).getDate();

  const today = dateString(new Date());

  function choose(next) {
    setInternal(next);
    onChange?.({ target: { name, value: next } });
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <div
      ref={root}
      className="relative min-w-0"
      onBlur={(event) => {
        if (
          !event.currentTarget.contains(event.relatedTarget)
        ) {
          setOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <input
        className="sr-only"
        type="date"
        name={name}
        value={value}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        tabIndex={-1}
        aria-label={label}
        onChange={(event) => choose(event.target.value)}
        onInvalid={(event) => {
          event.preventDefault();
          setOpen(true);
          trigger.current?.focus();
        }}
      />

      <button
        ref={trigger}
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-expanded={open}
        onClick={() => {
          if (!open && value) {
            setMonth(new Date(`${value}T12:00:00`));
          }
          setOpen(!open);
        }}
        className="
          flex min-h-12 w-full items-center
          justify-between gap-2 rounded-xl
          border border-[#d4dfcc] bg-white
          px-4 py-3 text-left text-sm
          font-semibold text-[#24412b]
          hover:border-[#78944b]
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-[#9bbc53]
          disabled:opacity-50
        "
      >
        <span>
          {value
            ? new Date(`${value}T12:00:00`).toLocaleDateString(
                "en-PH",
                {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }
              )
            : "Select date"}
        </span>

        <CalendarDays size={18} className="shrink-0" />
      </button>

      {open && (
        <div
          role="group"
          aria-label="Calendar"
          className="
            absolute left-0 top-full z-50
            mt-2 w-[min(280px,calc(100vw-4rem))]
            rounded-2xl border border-[#d4dfcc]
            bg-[#f8faf3] p-3 shadow-xl
          "
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Previous month"
              className="rounded-lg p-2 text-[#24412b] hover:bg-[#e7eedb]"
              onClick={() =>
                setMonth(
                  new Date(
                    month.getFullYear(),
                    month.getMonth() - 1,
                    1
                  )
                )
              }
            >
              <ChevronLeft size={18} />
            </button>

            <strong
              className="text-sm text-[#24412b]"
              aria-live="polite"
            >
              {month.toLocaleDateString("en-PH", {
                month: "long",
                year: "numeric",
              })}
            </strong>

            <button
              type="button"
              aria-label="Next month"
              className="rounded-lg p-2 text-[#24412b] hover:bg-[#e7eedb]"
              onClick={() =>
                setMonth(
                  new Date(
                    month.getFullYear(),
                    month.getMonth() + 1,
                    1
                  )
                )
              }
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(
              (day) => (
                <span
                  key={day}
                  className="py-1 text-center text-[10px] font-bold text-[#68795c]"
                >
                  {day}
                </span>
              )
            )}

            {Array.from(
              { length: first.getDay() },
              (_, index) => <span key={`blank-${index}`} />
            )}

            {Array.from({ length: count }, (_, index) => {
              const day = index + 1;
              const next = dateString(
                new Date(
                  month.getFullYear(),
                  month.getMonth(),
                  day
                )
              );

              const unavailable =
                (min && next < min) || (max && next > max);

              return (
                <button
                  key={day}
                  type="button"
                  disabled={unavailable}
                  aria-label={next}
                  aria-pressed={next === value}
                  onClick={() => choose(next)}
                  className={`
                    aspect-square rounded-lg text-xs
                    font-semibold focus-visible:outline
                    focus-visible:outline-2
                    focus-visible:outline-[#78944b]
                    disabled:opacity-30
                    ${
                      next === value
                        ? "bg-[#dcfa53] text-[#24412b]"
                        : "text-[#24412b] hover:bg-[#e7eedb]"
                    }
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={
              (min && today < min) || (max && today > max)
            }
            className="
              mt-3 w-full rounded-lg border
              border-[#d4dfcc] py-2 text-xs
              font-bold text-[#24412b]
              hover:bg-[#e7eedb] disabled:opacity-30
            "
            onClick={() => choose(today)}
          >
            Today
          </button>
        </div>
      )}
    </div>
  );
}

export function BrandDateTimePicker({
  name,
  defaultValue = "",
  required,
  disabled,
}) {
  const [date, setDate] = useState(
    defaultValue.slice(0, 10)
  );
  const [time, setTime] = useState(
    defaultValue.slice(11, 16)
  );

  const options = Array.from(
    { length: 24 },
    (_, hour) => ({
      value: `${String(hour).padStart(2, "0")}:00`,
      label: `${hour % 12 || 12} ${
        hour < 12 ? "AM" : "PM"
      }`,
    })
  );

  if (
    time &&
    !options.some((option) => option.value === time)
  ) {
    options.push({ value: time, label: time });
  }

  options.sort((a, b) => a.value.localeCompare(b.value));

  return (
    <div className="grid min-w-0 gap-2">
      <input
        type="hidden"
        name={name}
        value={date && time ? `${date}T${time}` : ""}
        disabled={disabled}
      />

      <BrandDatePicker
        value={date}
        onChange={(event) => setDate(event.target.value)}
        required={required}
        disabled={disabled}
        label={`${name} date`}
      />

      <BrandSelect
        value={time}
        onChange={(event) => setTime(event.target.value)}
        options={options}
        required={required}
        disabled={disabled}
        label={`${name} time`}
        placeholder="Select hour"
      />
    </div>
  );
}