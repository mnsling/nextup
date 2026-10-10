import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  MapPin,
  Users,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import {
  getSessionStatus,
  useSessionClock,
} from "../hooks/useSessionClock";

export function SessionCard({
  s,
  club,
  fmt,
  open,
}) {
  const [playerCount, setPlayerCount] = useState(null);

  useEffect(() => {
    let active = true;
    let requestNumber = 0;

    setPlayerCount(null);

    if (
      !supabase ||
      String(s.id).startsWith("demo-")
    ) {
      return;
    }

    async function loadCount() {
      const request = ++requestNumber;

      const { data, error } = await supabase.rpc(
        "get_session_queue",
        { p_session_id: s.id }
      );

      if (
        active &&
        request === requestNumber &&
        !error
      ) {
        setPlayerCount((data || []).length);
      }
    }

    loadCount();

    const timer = setInterval(loadCount, 15000);

    const channel = supabase
      .channel(
        `card-players-${s.id}-${crypto.randomUUID()}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_players",
        },
        loadCount
      )
      .subscribe();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      setPlayerCount(null);
      loadCount();
    });

    return () => {
      active = false;
      clearInterval(timer);
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [s.id]);

  const count =
    playerCount ?? s.member_count ?? s.joined ?? "–";

  const now = useSessionClock();
  const status = getSessionStatus(s, now);

  return (
    <button
      type="button"
      className="session-card"
      onClick={open}
    >
      <div className="session-head">
        <span className="date-square">
          <strong>
            {new Date(s.starts_at).toLocaleDateString(
              "en-PH",
              {
                day: "2-digit",
                timeZone: "Asia/Manila",
              }
            )}
          </strong>

          <small>
            {new Date(s.starts_at)
              .toLocaleDateString("en-PH", {
                month: "short",
                timeZone: "Asia/Manila",
              })
              .toUpperCase()}
          </small>
        </span>

        <span className="session-state">
          <span />
          {status === "closed"
            ? "ENDED"
            : status === "live"
              ? "LIVE"
              : "REGISTRATION OPEN"}
        </span>
      </div>

      <div className="card-main">
        <span className="club-name">
          {club?.name || "Friendly game"}
        </span>

        <h3>{s.title}</h3>

        <p>
          <CalendarDays size={16} />
          {fmt(s.starts_at)}
        </p>

        <p>
          <MapPin size={16} />
          {s.location}
        </p>
      </div>

      <div className="card-bottom">
        <span>
          <Users size={16} />
          {count}/{s.capacity} players
        </span>

        <span>{s.skill_level}</span>

        <span className="round-arrow">
          <ArrowUpRight size={18} />
        </span>
      </div>
    </button>
  );
}