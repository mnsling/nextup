import { useEffect, useState } from "react";
import { Trophy, Play, Save, Shuffle } from "lucide-react";
import { BrandSelect } from "./BrandSelect";
import { TournamentPlayerPicker } from "./TournamentPlayerPicker";
import { supabase } from "../lib/supabase";
import { useSessionClock } from "../hooks/useSessionClock";

export function TournamentManager({ game, auth, flash }) {
  const [data, setData] = useState({
    tournaments: [],
    fixtures: [],
    players: [],
  });

  const [entrants, setEntrants] = useState([]);
  const [courts, setCourts] = useState({});
  const [finishing, setFinishing] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const format = game.match_format || "doubles";
  const now = useSessionClock();
  const host = Boolean(auth?.id && auth.id === game.host_id);

  const active =
    now >= new Date(game.starts_at).getTime() &&
    now < new Date(game.ends_at).getTime();

  const ended = now >= new Date(game.ends_at).getTime();

  useEffect(() => {
    let alive = true;
    let request = 0;

    async function load() {
      if (!supabase || !auth?.id) {
        if (alive) setLoading(false);
        return;
      }

      const current = ++request;

      try {
        const [tournamentResult, playerResult] = await Promise.all([
          supabase
            .from("tournaments")
            .select("*")
            .eq("session_id", game.id)
            .order("created_at", { ascending: false }),
          supabase.rpc("get_court_players", {
            p_session_id: game.id,
          }),
        ]);

        if (tournamentResult.error || playerResult.error) {
          throw tournamentResult.error || playerResult.error;
        }

        const tournaments = tournamentResult.data || [];
        let fixtures = [];
        let players = playerResult.data || [];

        if (tournaments.length) {
          const fixtureResult = await supabase
            .from("tournament_fixtures")
            .select("*, matches:match_id(*)")
            .in(
              "tournament_id",
              tournaments.map((item) => item.id),
            )
            .order("round_number")
            .order("position");

          if (fixtureResult.error) throw fixtureResult.error;

          fixtures = fixtureResult.data || [];

          const ids = [
            ...new Set(
              fixtures.flatMap((item) => [
                ...(item.team_a || []),
                ...(item.team_b || []),
              ]),
            ),
          ];

          if (ids.length) {
            const profiles = await supabase
              .from("profiles")
              .select("id,full_name")
              .in("id", ids);

            if (profiles.error) throw profiles.error;

            const known = new Set(
              players.map((item) => item.user_id),
            );

            players = [
              ...players,
              ...(profiles.data || [])
                .filter((item) => !known.has(item.id))
                .map((item) => ({
                  user_id: item.id,
                  name: item.full_name || "Player",
                  status: "absent",
                })),
            ];
          }
        }

        if (alive && current === request) {
          setData({
            tournaments,
            fixtures,
            players,
          });
          setError("");
        }
      } catch (loadError) {
        if (alive && current === request) {
          setError(loadError.message);
        }
      } finally {
        if (alive && current === request) {
          setLoading(false);
        }
      }
    }

    load();

    const timer = setInterval(load, 5000);
    window.addEventListener("focus", load);

    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [game.id, auth?.id, version]);

  async function run(action, message) {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      if (!supabase) {
        throw new Error("Connect Supabase to manage tournaments.");
      }

      const result = await action();

      if (result.error) throw result.error;

      setVersion((value) => value + 1);
      flash(message);
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusy(false);
    }
  }

  const names = new Map(
    data.players.map((item) => [item.user_id, item.name]),
  );

  const teamName = (ids) =>
    ids?.length
      ? ids.map((id) => names.get(id) || "Player").join(" & ")
      : "Awaiting winner";

  const teamSize = format === "singles" ? 1 : 2;
  const teamCount = entrants.length / teamSize;
  const validEntrants = [2, 4, 8, 16].includes(teamCount);

  const eligible = data.players.filter(
    (item) => item.status !== "absent",
  );

  function create(event) {
    event.preventDefault();

    if (!validEntrants) {
      setError("Choose 2, 4, 8, or 16 entrants or teams.");
      return;
    }

    const teams = Array.from({ length: teamCount }, (_, index) =>
      entrants.slice(
        index * teamSize,
        (index + 1) * teamSize,
      ),
    );

    run(async () => {
      const result = await supabase.rpc(
        "create_session_tournament",
        {
          p_session_id: game.id,
          p_title: game.title.trim().slice(0, 100),
          p_format: format,
          p_teams: teams,
        },
      );

      if (!result.error) {
        setEntrants([]);
      }

      return result;
    }, "Tournament bracket created.");
  }

  function shuffle() {
    const next = [...entrants];

    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }

    setEntrants(next);
  }

  if (!auth?.id) {
    return (
      <section className="panel">
        Sign in to view the bracket.
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="panel">
        <span className="eyebrow">PLAY FOR THE TITLE</span>

        <div className="flex items-center justify-between gap-3">
          <h2>
            {data.tournaments.length
              ? "Bracket overview"
              : "Set up bracket"}
          </h2>

          <Trophy size={24} />
        </div>

        <p className="muted">
          Single elimination. Winners advance automatically.
          Saved results also appear in player match history.
        </p>

        {loading && (
          <p role="status" className="mt-3">
            Loading bracket…
          </p>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {!active && (
          <p className="mt-3 text-sm text-[#596653]">
            {ended
              ? "Session ended. Existing matches still allow score submission."
              : "Prepare your bracket now. Matches unlock at the session start time."}
          </p>
        )}

        {host &&
          !data.tournaments.length &&
          !ended &&
          !loading && (
            <form onSubmit={create} className="form mt-4">
              <p className="text-sm font-semibold">
                {format === "singles"
                  ? "Singles · 1 vs 1"
                  : "Doubles · 2 vs 2"}
              </p>

              <TournamentPlayerPicker
                players={eligible}
                selected={entrants}
                onChange={setEntrants}
                disabled={busy}
                format={format}
              />

              <p className="text-xs text-[#596653]">
                Choose 2, 4, 8, or 16{" "}
                {format === "singles"
                  ? "players"
                  : "teams (4, 8, 16, or 32 players)"}
                . Selection order sets the seeds.
                Doubles partners are grouped in pairs.
              </p>

              {!!entrants.length && (
                <div className="space-y-2">
                  <button
                    type="button"
                    className="outline"
                    disabled={busy}
                    onClick={shuffle}
                  >
                    <Shuffle size={16} />
                    Shuffle seeds and partners
                  </button>

                  {Array.from(
                    { length: Math.ceil(teamCount) },
                    (_, index) => (
                      <p key={index} className="text-sm">
                        Seed {index + 1}:{" "}
                        {teamName(
                          entrants.slice(
                            index * teamSize,
                            (index + 1) * teamSize,
                          ),
                        )}
                      </p>
                    ),
                  )}
                </div>
              )}

              <button
                className="primary"
                type="submit"
                disabled={busy || !validEntrants}
              >
                <Trophy size={17} />
                {busy ? "Creating…" : "Create bracket"}
              </button>
            </form>
          )}

        {!host && !loading && !data.tournaments.length && (
          <p className="mt-4 muted">
            The host has not created the bracket yet.
          </p>
        )}
      </section>

      {data.tournaments.map((tournament) => {
        const fixtures = data.fixtures.filter(
          (item) => item.tournament_id === tournament.id,
        );

        const rounds = [
          ...new Set(
            fixtures.map((item) => item.round_number),
          ),
        ];

        return (
          <section className="panel" key={tournament.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2>Elimination bracket</h2>

              <span className="rounded-full bg-[#edf4df] px-3 py-1 text-xs font-bold capitalize text-[#24412b]">
                {tournament.format} · {tournament.status}
              </span>
            </div>

            {tournament.champion && (
              <div className="mt-4 rounded-xl bg-[#dcfa53] p-4 font-bold text-[#24412b]">
                <Trophy size={20} className="mb-2" />
                Champion: {teamName(tournament.champion)}
              </div>
            )}

            <div
              className="mt-5 flex gap-5 overflow-x-auto pb-4"
              role="region"
              aria-label={`${game.title} bracket`}
              tabIndex={0}
            >
              {rounds.map((round) => (
                <div
                  className="w-72 shrink-0 space-y-3"
                  key={round}
                >
                  <h3 className="font-bold">
                    {round === rounds.length
                      ? "Final"
                      : round === rounds.length - 1
                        ? "Semifinals"
                        : `Round ${round}`}
                  </h3>

                  {fixtures
                    .filter(
                      (item) => item.round_number === round,
                    )
                    .map((fixture) => {
                      const match = fixture.matches;

                      const ready =
                        fixture.team_a?.length &&
                        fixture.team_b?.length &&
                        !fixture.match_id &&
                        !fixture.winner;

                      return (
                        <article
                          className="rounded-xl border border-[#d4dfcc] bg-[#f5f6ee] p-4"
                          key={fixture.id}
                        >
                          <p className="mb-3 text-xs font-semibold text-[#596653]">
                            Match {fixture.position} ·{" "}
                            {fixture.winner
                              ? "Finished"
                              : match
                                ? `Court ${match.court_number}`
                                : ready
                                  ? "Ready"
                                  : "Pending"}
                          </p>

                          {[
                            fixture.team_a,
                            fixture.team_b,
                          ].map((team, index) => {
                            const winner =
                              fixture.winner &&
                              JSON.stringify(team) ===
                                JSON.stringify(fixture.winner);

                            return (
                              <div
                                key={index}
                                className={`mb-2 flex items-center justify-between gap-2 rounded-lg p-3 text-sm ${
                                  winner
                                    ? "bg-[#dcfa53] font-bold text-[#24412b]"
                                    : "bg-white"
                                }`}
                              >
                                <span>{teamName(team)}</span>

                                <strong>
                                  {match
                                    ? ((index === 0
                                        ? match.score_a
                                        : match.score_b) ?? "–")
                                    : ""}
                                </strong>
                              </div>
                            );
                          })}

                          {host && ready && (
                            <div className="mt-3 space-y-2">
                              <BrandSelect
                                aria-label="Tournament court"
                                value={courts[fixture.id] || "1"}
                                disabled={busy || !active}
                                onChange={(event) =>
                                  setCourts((current) => ({
                                    ...current,
                                    [fixture.id]: event.target.value,
                                  }))
                                }
                              >
                                {Array.from(
                                  { length: game.courts },
                                  (_, index) => (
                                    <option
                                      key={index}
                                      value={String(index + 1)}
                                    >
                                      Court {index + 1}
                                    </option>
                                  ),
                                )}
                              </BrandSelect>

                              <button
                                type="button"
                                className="primary full"
                                disabled={busy || !active}
                                onClick={() =>
                                  run(
                                    () =>
                                      supabase.rpc(
                                        "start_tournament_fixture",
                                        {
                                          p_fixture_id: fixture.id,
                                          p_court: Number(
                                            courts[fixture.id] || 1,
                                          ),
                                        },
                                      ),
                                    "Tournament match started.",
                                  )
                                }
                              >
                                <Play size={16} />
                                Start match
                              </button>
                            </div>
                          )}

                          {host &&
                            match?.status === "live" &&
                            !fixture.winner &&
                            (finishing[fixture.id] ? (
                              <form
                                className="mt-3 space-y-3"
                                onSubmit={(event) => {
                                  event.preventDefault();

                                  const values = new FormData(
                                    event.currentTarget,
                                  );

                                  run(
                                    () =>
                                      supabase.rpc(
                                        "finish_court_match",
                                        {
                                          p_match_id: match.id,
                                          p_score_a: Number(
                                            values.get("a"),
                                          ),
                                          p_score_b: Number(
                                            values.get("b"),
                                          ),
                                        },
                                      ),
                                    "Result saved. Winner advanced.",
                                  );
                                }}
                              >
                                <div className="grid grid-cols-2 gap-2">
                                  {["a", "b"].map((side) => (
                                    <label
                                      className="text-xs"
                                      key={side}
                                    >
                                      Side {side.toUpperCase()} score

                                      <input
                                        name={side}
                                        type="number"
                                        min={0}
                                        max={99}
                                        step={1}
                                        required
                                        disabled={busy}
                                        className="mt-1 w-full rounded-lg border p-2"
                                      />
                                    </label>
                                  ))}
                                </div>

                                <button
                                  type="submit"
                                  className="primary full"
                                  disabled={busy}
                                >
                                  <Save size={16} />
                                  Save record
                                </button>

                                <button
                                  type="button"
                                  className="outline full"
                                  disabled={busy}
                                  onClick={() =>
                                    setFinishing((current) => ({
                                      ...current,
                                      [fixture.id]: false,
                                    }))
                                  }
                                >
                                  Back to match
                                </button>
                              </form>
                            ) : (
                              <button
                                type="button"
                                className="primary full mt-3"
                                disabled={busy}
                                onClick={() =>
                                  setFinishing((current) => ({
                                    ...current,
                                    [fixture.id]: true,
                                  }))
                                }
                              >
                                Finish game
                              </button>
                            ))}
                        </article>
                      );
                    })}
                </div>
              ))}
            </div>

            {host && tournament.status === "active" && (
              <form
                className="mt-4 grid gap-3 border-t border-[#d4dfcc] pt-4 sm:grid-cols-3"
                onSubmit={(event) => {
                  event.preventDefault();

                  const values = new FormData(
                    event.currentTarget,
                  );

                  run(
                    () =>
                      supabase.rpc(
                        "replace_tournament_player",
                        {
                          p_tournament_id: tournament.id,
                          p_old_id: values.get("old"),
                          p_new_id: values.get("new"),
                        },
                      ),
                    "Pending entrant replaced.",
                  );
                }}
              >
                <label className="text-xs">
                  Replace entrant

                  <BrandSelect
                    name="old"
                    required
                    disabled={busy}
                  >
                    <option value="">Choose entrant</option>

                    {[
                      ...new Set(
                        fixtures
                          .filter(
                            (fixture) => !fixture.winner,
                          )
                          .flatMap((fixture) => [
                            ...(fixture.team_a || []),
                            ...(fixture.team_b || []),
                          ]),
                      ),
                    ].map((id) => (
                      <option key={id} value={id}>
                        {names.get(id) || "Player"}
                      </option>
                    ))}
                  </BrandSelect>
                </label>

                <label className="text-xs">
                  Registered replacement

                  <BrandSelect
                    name="new"
                    required
                    disabled={busy}
                  >
                    <option value="">Choose player</option>

                    {eligible
                      .filter(
                        (player) => player.status === "waiting",
                      )
                      .map((player) => (
                        <option
                          key={player.user_id}
                          value={player.user_id}
                        >
                          {player.name}
                        </option>
                      ))}
                  </BrandSelect>
                </label>

                <button
                  className="outline self-end"
                  type="submit"
                  disabled={busy}
                >
                  Replace in pending fixtures
                </button>
              </form>
            )}
          </section>
        );
      })}
    </div>
  );
}