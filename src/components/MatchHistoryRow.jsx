import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { avatarUrl } from "../lib/profilePhoto";

function PlayerPhoto({ player, winner }) {
  const [failed, setFailed] = useState(false);

  const url = player.avatar_path
    ? avatarUrl(player.avatar_path)
    : null;

  useEffect(() => {
    setFailed(false);
  }, [url]);

  const name = player.full_name || "Player";

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <span
      tabIndex={0}
      title={`${name}${winner ? " · Winning team" : ""}`}
      aria-label={`${name}${winner ? ", winning team" : ""}`}
      className={`grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full text-[10px] font-bold outline-offset-2 ${
        winner
          ? "bg-[#dcfa53] text-[#24412b] ring-2 ring-[#8eaa22]"
          : "bg-[#eef2e8] text-[#465344] ring-1 ring-[#cbd5c4]"
      }`}
    >
      {url && !failed ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initials
      )}
    </span>
  );
}

export function MatchHistoryRow({
  match,
  playerName,
  playerId,
}) {
  const [players, setPlayers] = useState(null);
  const [photoError, setPhotoError] = useState(false);

  useEffect(() => {
    let active = true;
    let started = false;

    setPlayers(null);
    setPhotoError(false);

    const media = window.matchMedia("(max-width: 1399px)");

    async function load() {
      if (
        !media.matches ||
        started ||
        !supabase ||
        !playerId
      ) {
        return;
      }

      started = true;

      try {
        const { data, error } = await supabase.rpc(
          "get_match_history_players",
          {
            p_match_id: match.match_id,
            p_player_id: playerId,
          },
        );

        if (error) throw error;

        if (active) {
          setPlayers(data);
        }
      } catch {
        if (active) {
          setPhotoError(true);
        }
      }
    }

    load();
    media.addEventListener("change", load);

    return () => {
      active = false;
      media.removeEventListener("change", load);
    };
  }, [match.match_id, playerId]);

  const teammates = Array.isArray(match.teammates)
    ? match.teammates.filter(Boolean)
    : [];

  const opponents = Array.isArray(match.opponents)
    ? match.opponents.filter(Boolean)
    : [];

  const ownNames = [playerName || "Player", ...teammates];

  function fallback(values) {
    return values.map((full_name, index) => ({
      id: `${full_name}-${index}`,
      full_name,
    }));
  }

  const ownPlayers =
    players?.own_team || fallback(ownNames);

  const otherPlayers =
    players?.opponents ||
    fallback(opponents.length ? opponents : ["Player"]);

  const scored =
    match.own_score != null &&
    match.opponent_score != null;

  const ownWinner =
    scored &&
    Number(match.own_score) > Number(match.opponent_score);

  const otherWinner =
    scored &&
    Number(match.opponent_score) > Number(match.own_score);

  const date = new Date(match.played_at);
  const validDate = !Number.isNaN(date.getTime());

  const formatted = validDate
    ? new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        timeZone: "Asia/Manila",
      }).format(date)
    : "Date unavailable";

  const highlight =
    "rounded bg-[#dcfa53] px-1.5 py-0.5 font-bold text-[#24412b]";

  const resultStyle =
    match.result === "Win"
      ? "bg-[#dcfa53] text-[#24412b]"
      : match.result === "Loss"
        ? "bg-red-50 text-red-700"
        : "bg-slate-100 text-slate-700";

  return (
    <article className="min-w-0 border-b border-[#e1e7db] py-4 last:border-b-0">
      <div className="flex items-center gap-2 sm:items-start sm:gap-3">
        <span
          className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold ${resultStyle}`}
        >
          {match.result || "Recorded"}
        </span>

        {/* Below 1400px: avatars */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-3 min-[1400px]:hidden">
          <div
            role="group"
            aria-label={
              ownWinner ? "Winning team" : "Player's team"
            }
            className="flex flex-wrap gap-1.5"
          >
            {ownPlayers.map((player) => (
              <PlayerPhoto
                key={player.id}
                player={player}
                winner={ownWinner}
              />
            ))}
          </div>

          <span className="text-[10px] font-semibold text-[#596653]">
            vs
          </span>

          <div
            role="group"
            aria-label={
              otherWinner ? "Winning team" : "Opponents"
            }
            className="flex flex-wrap gap-1.5"
          >
            {otherPlayers.map((player) => (
              <PlayerPhoto
                key={player.id}
                player={player}
                winner={otherWinner}
              />
            ))}
          </div>
        </div>

        {/* 1400px and wider: names */}
        <p className="hidden min-w-0 flex-1 break-words text-sm leading-6 text-[#24412b] min-[1400px]:block">
          <span
            className={
              ownWinner ? highlight : "font-semibold"
            }
            title={ownWinner ? "Winning team" : undefined}
          >
            {ownNames.join(" & ")}
          </span>

          <span className="mx-2 text-xs text-[#596653]">
            vs
          </span>

          <span
            className={
              otherWinner ? highlight : "font-semibold"
            }
            title={otherWinner ? "Winning team" : undefined}
          >
            {opponents.join(" & ") || "Opponents"}
          </span>
        </p>

        <strong className="shrink-0 whitespace-nowrap text-xs tabular-nums text-[#24412b] sm:text-sm">
          {match.own_score ?? "—"} –{" "}
          {match.opponent_score ?? "—"}
        </strong>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-[#596653] sm:text-xs">
        <p
          className="min-w-0 truncate"
          title={match.session_title}
        >
          {match.session_title || "Pickleball session"}
        </p>

        <time
          className="shrink-0"
          dateTime={validDate ? match.played_at : undefined}
        >
          {formatted}
        </time>
      </div>

      {photoError && (
        <p className="mt-1 text-[10px] text-[#596653] min-[1400px]:hidden">
          Photos unavailable. Showing initials.
        </p>
      )}
    </article>
  );
}