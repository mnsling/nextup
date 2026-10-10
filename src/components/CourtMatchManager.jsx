import { useEffect, useState } from "react";
import { Shuffle, Play, Save, Square } from "lucide-react";
import { BrandSelect } from "./BrandSelect";
import { useSessionClock } from "../hooks/useSessionClock";
import { supabase } from "../lib/supabase";

export function CourtMatchManager({ game, auth, flash }) {
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [finishing, setFinishing] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const now = useSessionClock();
  const startsAt = new Date(game.starts_at).getTime();
  const endsAt = new Date(game.ends_at).getTime();
  const host = auth?.id === game.host_id;

  const canStart =
    Number.isFinite(startsAt) &&
    Number.isFinite(endsAt) &&
    now >= startsAt &&
    now < endsAt;

  async function load() {
    if (!supabase || !auth?.id) return;

    const [p, m] = await Promise.all([
      supabase.rpc("get_court_players", {
        p_session_id: game.id,
      }),
      supabase
        .from("matches")
        .select("*")
        .eq("session_id", game.id)
        .eq("status", "live"),
    ]);

    if (p.error || m.error) throw p.error || m.error;

    setPlayers(p.data || []);
    setMatches(m.data || []);
  }

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        if (active) await load();
      } catch (error) {
        if (active) setError(error.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    refresh();

    if (!supabase) return;

    const channel = supabase
      .channel(`courts-${game.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `session_id=eq.${game.id}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_players",
        },
        refresh,
      )
      .subscribe();

    const timer = setInterval(refresh, 15000);

    return () => {
      active = false;
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [game.id, auth?.id]);

  const waiting = players.filter((player) => player.status === "waiting");
  const names = new Map(
    players.map((player) => [player.user_id, player.name]),
  );

  function randomize(court) {
    const reserved = Object.entries(drafts)
      .filter(([key]) => Number(key) !== court)
      .flatMap(([, ids]) => ids);

    const size = game.match_format === "singles" ? 2 : 4;

    const next = waiting
      .filter((player) => !reserved.includes(player.user_id))
      .slice(0, size);

    if (size === 2 && next.length === 2) {
      setDrafts((current) => ({
        ...current,
        [court]: next.map((player) => player.user_id),
      }));
      setError("");
      return;
    }

    if (next.length < size) {
      setError("Not enough unassigned waiting players for this format.");
      return;
    }

    const options = [
      [0, 1, 2, 3],
      [0, 2, 1, 3],
      [0, 3, 1, 2],
    ].map((order) => ({
      ids: order.map((index) => next[index].user_id),
      gap: Math.abs(
        Number(next[order[0]].rating) +
          Number(next[order[1]].rating) -
          Number(next[order[2]].rating) -
          Number(next[order[3]].rating),
      ),
    }));

    const smallestGap = Math.min(...options.map((option) => option.gap));
    const balanced = options.filter(
      (option) => option.gap === smallestGap,
    );

    setDrafts((current) => ({
      ...current,
      [court]: balanced[Math.floor(Math.random() * balanced.length)].ids,
    }));
    setError("");
  }

  async function run(action, message) {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const result = await action();

      if (result.error) throw result.error;

      await load();
      flash(message);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  if (!auth?.id) {
    return <section className="panel">Sign in to view courts.</section>;
  }

  return (
    <section className="panel">
      <span className="eyebrow">COURT ROTATION</span>
      <h2>Next on court.</h2>

      <p className="muted">
        Assign players first. Save the final score to return players to the end
        of the waiting list.
      </p>

      {!canStart && (
        <p
          role="status"
          className="mt-3 rounded-xl border border-[#d4dfcc] bg-[#edf4df] p-3 text-sm text-[#24412b]"
        >
          {now < startsAt
            ? "Matches unlock when the session starts."
            : "New matches are unavailable outside the session schedule."}
        </p>
      )}

      {loading && <p role="status">Loading courts…</p>}

      {error && (
        <p role="alert" className="my-4 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {Array.from({ length: game.courts }, (_, i) => i + 1).map((court) => {
          const match = matches.find(
            (item) => item.court_number === court,
          );

          const slots = match
            ? match.team_a.length
            : game.match_format === "singles"
              ? 1
              : 2;

          const ids = match
            ? [...match.team_a, ...match.team_b]
            : drafts[court] || Array(slots * 2).fill("");

          const isFinishing = match && finishing[match.id];

          return (
            <article
              key={court}
              className="rounded-2xl border border-[#e2e5da] bg-[#f5f6ee] p-5"
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="font-bold">Court {court}</h3>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    match
                      ? "bg-[#dcfa53] text-[#171e19]"
                      : "bg-white text-[#687167]"
                  }`}
                >
                  {match ? "PLAYING" : "AVAILABLE"}
                </span>
              </div>

              <p className="mb-4 text-sm font-semibold">
                {game.match_format === "singles"
                  ? "Singles · 1 vs 1"
                  : "Doubles · 2 vs 2"}
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                {[0, 1].map((team) => (
                  <div
                    key={team}
                    className="rounded-xl border border-[#e2e5da] bg-white p-4"
                  >
                    <p className="mb-3 text-xs font-bold tracking-widest text-[#687167]">
                      TEAM {team === 0 ? "A" : "B"}
                    </p>

                    {Array.from({ length: slots }, (_, slot) => slot).map(
                      (slot) => {
                        const index = team * slots + slot;

                        return match || !host ? (
                          <p key={slot} className="py-2 text-sm font-semibold">
                            {names.get(ids[index]) || "Awaiting players"}
                          </p>
                        ) : (
                          <BrandSelect
                            key={slot}
                            aria-label={`Court ${court} team ${team + 1} player ${slot + 1}`}
                            className="mb-2 w-full rounded-lg border border-[#e2e5da] bg-white p-2 text-sm"
                            disabled={busy || !canStart}
                            value={ids[index]}
                            onChange={(event) => {
                              const updated = [...ids];
                              updated[index] = event.target.value;

                              setDrafts((current) => ({
                                ...current,
                                [court]: updated,
                              }));
                            }}
                          >
                            <option value="">Choose player</option>

                            {waiting.map((player) => (
                              <option
                                key={player.user_id}
                                value={player.user_id}
                              >
                                {player.name} · {player.rating}
                              </option>
                            ))}
                          </BrandSelect>
                        );
                      },
                    )}
                  </div>
                ))}
              </div>

              {host &&
                (match ? (
                  isFinishing ? (
                    <form
                      className="mt-4"
                      onSubmit={(event) => {
                        event.preventDefault();

                        const values = new FormData(event.currentTarget);

                        run(
                          () =>
                            supabase.rpc("finish_court_match", {
                              p_match_id: match.id,
                              p_score_a: Number(values.get("a")),
                              p_score_b: Number(values.get("b")),
                            }),
                          "Result saved. Players returned to the waiting list.",
                        );
                      }}
                    >
                      <div className="mb-3 grid grid-cols-2 gap-3">
                        {["a", "b"].map((side) => (
                          <label key={side} className="text-xs font-semibold">
                            Team {side.toUpperCase()} score

                            <input
                              className="mt-2 w-full rounded-lg border border-[#e2e5da] bg-white p-3 text-base"
                              name={side}
                              type="number"
                              min="0"
                              max="99"
                              required
                              disabled={busy}
                            />
                          </label>
                        ))}
                      </div>

                      <button className="primary w-full" disabled={busy}>
                        <Save size={17} />
                        {busy ? "Saving…" : "Save record"}
                      </button>

                      <button
                        type="button"
                        className="outline mt-3 w-full"
                        disabled={busy}
                        onClick={() =>
                          setFinishing((current) => {
                            const next = { ...current };
                            delete next[match.id];
                            return next;
                          })
                        }
                      >
                        Resume match
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="primary mt-4 w-full"
                      disabled={busy}
                      onClick={() =>
                        setFinishing((current) => ({
                          ...current,
                          [match.id]: true,
                        }))
                      }
                    >
                      <Square size={17} />
                      Finish game
                    </button>
                  )
                ) : (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      className="outline"
                      disabled={
                        busy || !canStart || waiting.length < slots * 2
                      }
                      onClick={() => randomize(court)}
                    >
                      <Shuffle size={17} />
                      Pair next players
                    </button>

                    <button
                      className="primary"
                      disabled={
                        busy ||
                        ids.some((id) => !id) ||
                        new Set(ids).size !== slots * 2 ||
                        !canStart
                      }
                      onClick={() =>
                        run(async () => {
                          if (
                            Date.now() < startsAt ||
                            Date.now() >= endsAt ||
                            !Number.isFinite(startsAt) ||
                            !Number.isFinite(endsAt)
                          ) {
                            throw new Error(
                              "Matches are only allowed during the session schedule.",
                            );
                          }

                          const result = await supabase.rpc(
                            "start_court_match",
                            {
                              p_session_id: game.id,
                              p_court: court,
                              p_team_a: ids.slice(0, slots),
                              p_team_b: ids.slice(slots),
                            },
                          );

                          if (!result.error) {
                            setDrafts((current) => {
                              const next = { ...current };
                              delete next[court];
                              return next;
                            });
                          }

                          return result;
                        }, "Players assigned to court.")
                      }
                    >
                      <Play size={17} />
                      Start match
                    </button>
                  </div>
                ))}
            </article>
          );
        })}
      </div>

      <div className="mt-6">
        <h3 className="font-bold">Waiting list · {waiting.length}</h3>

        <p className="mt-2 text-xs text-[#687167]">
          Estimated ratings use profile skill level: beginner 2.0,
          intermediate 3.0, advanced 4.0, otherwise 2.5. These are not
          official ratings. Pairing keeps waiting order and balances team
          totals.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {waiting.map((player, index) => (
            <span
              key={player.user_id}
              className="rounded-xl border border-[#e2e5da] px-3 py-2 text-sm"
            >
              {index + 1}. {player.name}
              <strong className="ml-2">{player.rating}</strong>
            </span>
          ))}

          {!waiting.length && <p className="muted">No players waiting.</p>}
        </div>
      </div>
    </section>
  );
}