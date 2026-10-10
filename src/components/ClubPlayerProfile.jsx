import { useEffect, useState } from "react";
import { MapPin, Trophy, CalendarDays } from "lucide-react";
import { supabase } from "../lib/supabase";
import { avatarUrl } from "../lib/profilePhoto";
import { MatchHistoryRow } from "./MatchHistoryRow";
import { HistoryPagination } from "./HistoryPagination";
import { MatchHistoryList } from "./MatchHistoryList";

export function ClubPlayerProfile({ clubId, userId }) {
  const [historyPage, setHistoryPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setHistoryPage(1);
  }, [clubId, userId]);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");
    setData(null);

    async function load() {
      try {
        if (!supabase) {
          throw new Error("Database connection unavailable.");
        }

        const { data: result, error: requestError } =
          await supabase.rpc("get_club_player_profile", {
            p_club_id: clubId,
            p_user_id: userId,
          });

        if (requestError) throw requestError;

        if (active) {
          setData(result);
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError.message ||
            "Unable to load player profile.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [clubId, userId, retry]);

  if (loading) {
    return (
      <p
        role="status"
        className="py-12 text-center text-[#596653]"
      >
        Loading player profile…
      </p>
    );
  }

  if (error) {
    return (
      <div className="py-6">
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>

        <button
          type="button"
          className="outline mt-4"
          onClick={() => setRetry((value) => value + 1)}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data?.profile) return null;

  const profile = data.profile;
  const stats = data.stats || {};
  const history = data.history || [];

  const currentPage = Math.min(
    historyPage,
    Math.max(1, Math.ceil(history.length / 4)),
  );

  const visibleHistory = history.slice(
    (currentPage - 1) * 4,
    currentPage * 4,
  );

  const winRate = Number(stats.played)
    ? Math.round(
      (Number(stats.wins) / Number(stats.played)) * 100,
    )
    : 0;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-[#dce4d5] bg-white">
        <div className="bg-[#24412b] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#dcfa53] sm:px-6">
          NEXTUP · PLAYER OVERVIEW
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#eef4e6] text-2xl font-bold text-[#24412b] ring-1 ring-[#dce4d5]">
                {profile.avatar_path ? (
                  <img
                    src={avatarUrl(profile.avatar_path)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (profile.full_name || "P")[0].toUpperCase()
                )}
              </div>

              <div className="min-w-0">
                <h3 className="break-words text-xl font-bold tracking-tight text-[#24412b] sm:text-2xl">
                  {profile.full_name || "Player"}
                </h3>

                <p className="mt-2 flex items-start gap-1.5 text-sm text-[#596653]">
                  <MapPin
                    size={15}
                    className="mt-0.5 shrink-0"
                  />

                  <span className="break-words">
                    {profile.city || "Location not added"}
                  </span>
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#eef4e6] px-2.5 py-1 text-xs font-semibold text-[#24412b]">
                    {profile.skill_level || "Recreational"}
                  </span>

                  {profile.gender && (
                    <span className="rounded-full bg-[#f1f4ed] px-2.5 py-1 text-xs text-[#465344]">
                      {profile.gender}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3 rounded-xl bg-[#dcfa53] px-4 py-3 sm:block sm:text-right">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#24412b]">
                <Trophy size={14} />
                Community rank
              </p>

              <strong className="ml-auto block text-2xl font-bold tracking-tight text-[#24412b] sm:mt-1">
                {stats.community_rank
                  ? `#${stats.community_rank}`
                  : "Unranked"}
              </strong>
            </div>
          </div>

          {profile.bio && (
            <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#465344]">
              {profile.bio}
            </p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#e1e7db] pt-5 sm:grid-cols-4">
            {[
              ["Matches", stats.played ?? 0],
              ["Wins", stats.wins ?? 0],
              ["Losses", stats.losses ?? 0],
              ["Win rate", `${winRate}%`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl bg-[#f3f6ef] px-4 py-3"
              >
                <span className="block text-xs text-[#596653]">
                  {label}
                </span>

                <strong className="mt-1 block text-2xl font-bold tabular-nums text-[#24412b]">
                  {value}
                </strong>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[11px] text-[#596653]">
            Ranked by wins, win rate, then matches played.
          </p>
        </div>
      </section>

      <section>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <CalendarDays size={19} />
          Match history
        </h3>

        {history.length ? (
          <MatchHistoryList
            key={userId}
            history={history}
            playerName={profile.full_name}
            playerId={userId}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
            No recorded matches yet.
          </div>
        )}
      </section>
    </div>
  );
}