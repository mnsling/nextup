import { useState } from "react";
import { Search, X } from "lucide-react";
import { MatchHistoryRow } from "./MatchHistoryRow";
import { HistoryPagination } from "./HistoryPagination";

export function MatchHistoryList({
  history = [],
  playerName,
  playerId,
  showCount = true,
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const words = search
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  const filtered = history.filter((match) => {
    const text = [
      match.session_title,
      match.club_name,
      playerName,
      ...(Array.isArray(match.teammates) ? match.teammates : []),
      ...(Array.isArray(match.opponents) ? match.opponents : []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return words.every((word) => text.includes(word));
  });

  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / 4)),
  );

  const visible = filtered.slice(
    (currentPage - 1) * 4,
    currentPage * 4,
  );

  function updateSearch(value) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="min-w-0">
      <label className="my-4 flex min-w-0 items-center gap-3 rounded-xl border border-[#cbd5c4] bg-[#f5f7ef] px-3 py-2.5 focus-within:border-[#6f8d22] focus-within:ring-2 focus-within:ring-[#dcfa53]/50">
        <Search
          size={18}
          className="shrink-0 text-[#596653]"
          aria-hidden="true"
        />

        <span className="sr-only">Search match history</span>

        <input
          type="search"
          value={search}
          onChange={(event) => updateSearch(event.target.value)}
          placeholder="Search club, session, or player"
          className="!m-0 !w-full min-w-0 !border-0 !bg-transparent !p-0 text-sm text-[#24412b] !shadow-none !outline-none !ring-0 placeholder:text-[#687167]"
        />

        {search && (
          <button
            type="button"
            aria-label="Clear match history search"
            onClick={() => updateSearch("")}
            className="shrink-0 rounded-lg p-1 text-[#596653] hover:bg-[#e4ecd7]"
          >
            <X size={16} />
          </button>
        )}
      </label>

      {showCount && (
        <p role="status" className="mt-2 text-xs text-[#596653]">
          {filtered.length}{" "}
          {filtered.length === 1 ? "match" : "matches"}
          {search.trim() ? " found" : " recorded"}
        </p>
      )}

      {visible.length ? (
        <>
          <div className="flex min-w-0 flex-col">
            {visible.map((match) => (
              <MatchHistoryRow
                key={match.match_id}
                match={match}
                playerName={playerName}
                playerId={playerId}
              />
            ))}
          </div>

          <HistoryPagination
            total={filtered.length}
            page={currentPage}
            onPageChange={setPage}
          />
        </>
      ) : (
        <div className="py-8 text-center">
          <p className="text-sm font-semibold text-[#24412b]">
            No matches found.
          </p>

          <p className="mt-1 text-xs text-[#596653]">
            Try another club, session, or player name.
          </p>
        </div>
      )}
    </div>
  );
}