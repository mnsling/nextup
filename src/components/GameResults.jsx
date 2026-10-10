import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { supabase } from "../lib/supabase";

const EMPTY_RESULTS = { matches: [], players: [] };

function hasScore(match) {
  return match.score_a != null && match.score_b != null;
}

export function GameResults({ gameId, auth, mode }) {
  const [data, setData] = useState(EMPTY_RESULTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [page, setPage] = useState(1);
  const [columns, setColumns] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(min-width: 1024px)").matches
      ? 2
      : 1,
  );

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");

    function updateColumns() {
      setColumns(media.matches ? 2 : 1);
      setPage(1);
    }

    media.addEventListener("change", updateColumns);

    return () => {
      media.removeEventListener("change", updateColumns);
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [gameId, mode]);

  useEffect(() => {
    let active = true;
    let requestNumber = 0;

    setData(EMPTY_RESULTS);
    setError("");

    if (!supabase) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }

    if (!auth?.id) {
      setError("Sign in to view game results.");
      setLoading(false);
      return;
    }

    if (!gameId) {
      setError("Select a game to view its results.");
      setLoading(false);
      return;
    }

    setLoading(true);

    async function load() {
      const request = ++requestNumber;

      try {
        const { data: result, error: resultError } = await supabase.rpc(
          "get_game_results",
          { p_session_id: gameId },
        );

        if (!active || request !== requestNumber) return;

        if (resultError) throw resultError;

        setData({
          matches: Array.isArray(result?.matches) ? result.matches : [],
          players: Array.isArray(result?.players) ? result.players : [],
        });

        setError("");
      } catch (loadError) {
        if (!active || request !== requestNumber) return;

        setError(loadError.message || "Unable to load game results.");
      } finally {
        if (active && request === requestNumber) {
          setLoading(false);
        }
      }
    }

    load();

    const timer = setInterval(load, 15000);

    const channel = supabase
      .channel(`results-${gameId}-${auth.id}-${mode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `session_id=eq.${gameId}`,
        },
        load,
      )
      .subscribe();

    return () => {
      active = false;
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [gameId, auth?.id, retry, mode]);

  if (loading) {
    return (
      <section className="panel">
        <p role="status">Loading results…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="panel">
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>

        <button
          type="button"
          className="outline mt-4"
          onClick={() => setRetry((value) => value + 1)}
        >
          Retry
        </button>
      </section>
    );
  }

  const names = new Map(
    data.players.map((player) => [player.id, player.name]),
  );

  const matches = [...data.matches].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );

  const scoredMatches = matches.filter(
    (match) => match.status === "finished" && hasScore(match),
  );

  const perPage = columns * 2;
  const pageCount = Math.max(1, Math.ceil(matches.length / perPage));
  const currentPage = Math.min(page, pageCount);
  const offset = (currentPage - 1) * perPage;
  const visibleMatches = matches.slice(offset, offset + perPage);

  if (mode === "matches") {
    return (
      <section className="panel">
        <h2>Match history</h2>

        {matches.length ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {visibleMatches.map((match, index) => {
              const scored = hasScore(match);
              const finished = match.status === "finished";
              const draw =
                finished &&
                scored &&
                Number(match.score_a) === Number(match.score_b);

              const teams = [
                {
                  label: "A",
                  players: match.team_a || [],
                  score: match.score_a,
                  opposingScore: match.score_b,
                },
                {
                  label: "B",
                  players: match.team_b || [],
                  score: match.score_b,
                  opposingScore: match.score_a,
                },
              ];

              return (
                <article
                  key={match.id}
                  className="rounded-2xl border border-[#e2e5da] bg-[#f5f6ee] p-5"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <strong>
                      Match {matches.length - offset - index} · Court{" "}
                      {match.court_number}
                    </strong>

                    <span className="text-xs font-semibold text-[#687167]">
                      {match.status === "live"
                        ? "Playing"
                        : !scored
                          ? "Ended without result"
                          : "Finished"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {teams.map((team) => {
                      const winner =
                        finished &&
                        scored &&
                        Number(team.score) > Number(team.opposingScore);

                      return (
                        <div
                          key={team.label}
                          className={`rounded-xl border p-4 ${
                            winner
                              ? "border-[#b8d336] bg-[#dcfa53]/30"
                              : "border-[#e2e5da] bg-white"
                          }`}
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-xs font-bold tracking-widest text-[#687167]">
                              TEAM {team.label}
                            </span>

                            <strong className="text-2xl">
                              {team.score ?? "–"}
                            </strong>
                          </div>

                          {team.players.map((id) => (
                            <p
                              key={id}
                              className="border-t border-[#e2e5da] py-2 text-sm font-semibold"
                            >
                              {names.get(id) || "Player"}
                            </p>
                          ))}

                          {winner && (
                            <span className="text-xs font-bold">
                              WINNER
                            </span>
                          )}

                          {draw && (
                            <span className="text-xs font-bold text-[#687167]">
                              DRAW
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="muted">
            Assign players to a court to start the first match.
          </p>
        )}

        {matches.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#e2e5da] pt-4">
            <p className="text-sm text-[#687167]">
              Showing {offset + 1}–
              {Math.min(offset + perPage, matches.length)} of{" "}
              {matches.length} matches
            </p>

            <nav
              aria-label="Match history pages"
              className="flex items-center gap-3"
            >
              <button
                type="button"
                className="outline"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous
              </button>

              <span className="text-sm" aria-live="polite">
                {currentPage} / {pageCount}
              </span>

              <button
                type="button"
                className="outline"
                disabled={currentPage === pageCount}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </section>
    );
  }

  const stats = new Map();

  scoredMatches.forEach((match) => {
    const teams = [
      [match.team_a || [], Number(match.score_a), Number(match.score_b)],
      [match.team_b || [], Number(match.score_b), Number(match.score_a)],
    ];

    teams.forEach(([team, pointsScored, pointsConceded]) => {
      [...new Set(team)].forEach((id) => {
        const row = stats.get(id) || {
          id,
          name: names.get(id) || "Player",
          played: 0,
          wins: 0,
          losses: 0,
          pd: 0,
        };

        row.played += 1;
        row.pd += pointsScored - pointsConceded;

        if (pointsScored > pointsConceded) {
          row.wins += 1;
        } else if (pointsScored < pointsConceded) {
          row.losses += 1;
        }

        stats.set(id, row);
      });
    });
  });

  const rows = [...stats.values()].sort(
    (a, b) =>
      b.wins - a.wins ||
      b.wins / b.played - a.wins / a.played ||
      b.played - a.played ||
      a.name.localeCompare(b.name),
  );

  let rank = 0;
  let previous = "";

  rows.forEach((row) => {
    const key = `${row.wins}-${row.wins / row.played}-${row.played}`;

    if (key !== previous) {
      rank += 1;
    }

    row.rank = rank;
    previous = key;
  });

  return (
    <section className="panel">
      <div className="flex items-center justify-between">
        <h2>Game leaderboard</h2>
        <Trophy size={24} className="text-lime-700" />
      </div>

      <p className="muted">
        This session only. Ranked by wins, win rate, then matches played.
        Tied players share a rank.
      </p>

      <p className="mt-2 text-xs text-[#687167]">
        PD = points scored minus points conceded across finished matches.
      </p>

      {rows.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#e2e5da] text-[#687167]">
                {[
                  "Rank",
                  "Player",
                  "Played",
                  "Wins",
                  "Losses",
                  "PD",
                  "Win rate",
                ].map((label) => (
                  <th
                    key={label}
                    scope="col"
                    className="whitespace-nowrap px-3 py-3"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-[#e2e5da] ${
                    row.rank === 1 ? "bg-[#dcfa53]/20" : ""
                  }`}
                >
                  <td className="px-3 py-4 font-bold">#{row.rank}</td>

                  <td className="px-3 py-4 font-semibold">
                    {row.name}
                  </td>

                  <td className="px-3 py-4">{row.played}</td>
                  <td className="px-3 py-4">{row.wins}</td>
                  <td className="px-3 py-4">{row.losses}</td>

                  <td
                    className={`px-3 py-4 font-semibold ${
                      row.pd > 0
                        ? "text-lime-700"
                        : row.pd < 0
                          ? "text-red-600"
                          : "text-[#687167]"
                    }`}
                  >
                    {row.pd > 0 ? `+${row.pd}` : row.pd}
                  </td>

                  <td className="px-3 py-4">
                    {Math.round((row.wins / row.played) * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-5 text-sm text-[#687167]">
          Rankings appear after the host saves a scored match.
        </p>
      )}
    </section>
  );
}