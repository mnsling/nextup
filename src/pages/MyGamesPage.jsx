import { CalendarDays } from "lucide-react";
import { SessionCard } from "../components/SessionCard";
import {
  sessionEnded,
  useSessionClock,
} from "../hooks/useSessionClock";

export function MyGamesPage({
  auth,
  sessions = [],
  joins = [],
  clubs = [],
  fmt,
  setSession,
  nav,
  setModal,
  go,
}) {
  const now = useSessionClock();

  const mine = sessions.filter(
    (session) =>
      auth?.id &&
      (joins.includes(session.id) || session.host_id === auth.id),
  );

  const groups = [
    [
      "Upcoming & live",
      mine.filter((session) => !sessionEnded(session, now)),
    ],
    [
      "Completed sessions",
      mine.filter((session) => sessionEnded(session, now)),
    ],
  ];

  return (
    <>
      <div className="page-title">
        <span className="eyebrow">YOUR PLAYING SCHEDULE</span>
        <h1>My games.</h1>
        <p>Sessions you joined or hosted live here.</p>
      </div>

      {!auth ? (
        <div className="empty-state">
          <CalendarDays size={38} />
          <h2>Keep your games in one place.</h2>
          <p>Sign in to join sessions and see your schedule.</p>

          <button
            type="button"
            className="primary"
            onClick={() => setModal("auth")}
          >
            Sign in to NEXTUP
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(
            ([label, games]) =>
              games.length > 0 && (
                <section key={label}>
                  <h2 className="mb-4 text-xl font-bold">
                    {label}
                  </h2>

                  <div className="session-grid">
                    {games.map((session) => (
                      <SessionCard
                        key={session.id}
                        s={session}
                        club={clubs.find(
                          (club) => club.id === session.club_id,
                        )}
                        fmt={fmt}
                        open={() => {
                          setSession(session.id);
                          nav("/?session=" + session.id);
                        }}
                      />
                    ))}
                  </div>
                </section>
              ),
          )}

          {!mine.length && (
            <div className="empty-state">
              <CalendarDays size={38} />
              <h2>No games on your calendar yet.</h2>
              <p>Explore open plays and join your first session.</p>

              <button
                type="button"
                className="primary"
                onClick={() => go("discover")}
              >
                Find a game
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}