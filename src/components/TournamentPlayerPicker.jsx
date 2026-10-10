import { useState } from "react";
import { Check, Search, Users, X } from "lucide-react";

function initials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "P"
  );
}

export function TournamentPlayerPicker({
  players,
  selected,
  onChange,
  disabled,
  format,
}) {
  const [search, setSearch] = useState("");

  const visible = players.filter((player) =>
    (player.name || "Player")
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  function toggle(id) {
    onChange(
      selected.includes(id)
        ? selected.filter((value) => value !== id)
        : [...selected, id],
    );
  }

  return (
    <section
      aria-label="Tournament players"
      className="overflow-hidden rounded-2xl border border-[#dce3d5] bg-[#f8faf3]"
    >
      <div className="border-b border-[#e2e8db] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#171e19] text-[#dcfa53]">
              <Users size={19} aria-hidden="true" />
            </span>

            <div>
              <h3 className="text-base font-bold text-[#171e19]">
                Build your lineup
              </h3>

              <p className="mt-1 text-xs text-[#687167]">
                Select players for the bracket.
              </p>
            </div>
          </div>

          <span
            aria-live="polite"
            className="shrink-0 rounded-full bg-[#dcfa53] px-3 py-1.5 text-xs font-bold text-[#171e19]"
          >
            {selected.length} selected
          </span>
        </div>

        <div className="relative mt-4">
          <Search
            size={17}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#687167]"
          />

          <input
            aria-label="Search registered players"
            type="search"
            value={search}
            disabled={disabled}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search players…"
            className="!m-0 !w-full !rounded-xl !border-[#dce3d5] !bg-white !py-3 !pl-10 !pr-4 !text-sm !text-[#171e19] focus:!border-[#8fa747] focus:!outline-none focus:!ring-2 focus:!ring-[#dcfa53]/40"
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 text-xs">
          <span className="text-[#687167]">
            {players.length} registered players
          </span>

          <button
            type="button"
            disabled={disabled || !selected.length}
            onClick={() => onChange([])}
            className="flex items-center gap-1 font-semibold text-[#465344] transition hover:text-[#171e19] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={13} aria-hidden="true" />
            Clear selection
          </button>
        </div>
      </div>

      <div className="grid max-h-80 grid-cols-1 gap-2 overflow-y-auto overscroll-contain p-3 sm:grid-cols-2 sm:p-4">
        {visible.map((player) => {
          const index = selected.indexOf(player.user_id);
          const checked = index !== -1;

          return (
            <button
              type="button"
              key={player.user_id}
              aria-pressed={checked}
              disabled={disabled}
              onClick={() => toggle(player.user_id)}
              className={`group flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fa747] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                checked
                  ? "border-[#8fa747] bg-[#eff6d9] shadow-sm"
                  : "border-[#e2e8db] bg-white hover:border-[#a7b694] hover:bg-[#f3f7ec]"
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  checked
                    ? "bg-[#dcfa53] text-[#171e19]"
                    : "bg-[#edf1e7] text-[#52634c]"
                }`}
              >
                {initials(player.name)}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-[#171e19]">
                  {player.name || "Player"}
                </span>

                <span className="mt-1 block text-xs text-[#687167]">
                  {checked
                    ? format === "doubles"
                      ? `Team ${Math.floor(index / 2) + 1} · Player ${(index % 2) + 1}`
                      : `Seed ${index + 1}`
                    : "Tap to select"}
                </span>
              </span>

              <span
                aria-hidden="true"
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                  checked
                    ? "border-[#171e19] bg-[#171e19] text-[#dcfa53]"
                    : "border-[#cbd5c0] bg-transparent"
                }`}
              >
                {checked && <Check size={14} strokeWidth={3} />}
              </span>
            </button>
          );
        })}

        {!visible.length && (
          <div className="col-span-full px-4 py-8 text-center">
            <Search
              size={22}
              aria-hidden="true"
              className="mx-auto mb-2 text-[#8a967f]"
            />

            <p className="text-sm font-semibold text-[#465344]">
              {players.length
                ? "No players found"
                : "No registered players yet"}
            </p>

            <p className="mt-1 text-xs text-[#687167]">
              {players.length
                ? "Try another name."
                : "Players will appear after joining the session."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}