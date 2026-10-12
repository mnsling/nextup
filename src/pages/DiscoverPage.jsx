
import {
  ArrowUpRight,
  Plus,
  Search,
} from "lucide-react";
import { SessionCard } from "../components/SessionCard";

export function DiscoverPage({
  filtered,
  totalSessions,
  clubs,
  search,
  setSearch,
  filter,
  setFilter,
  go,
  requireAuth,
  setModal,
  setPage,
  setClub,
  fmt,
  setSession,
  nav,
}) {
  const hostGame = () => {
    if (requireAuth()) {
      setModal("createSession");
    }
  };

  return (
    <>
      <div className="greeting">
        <span className="eyebrow">
          YOUR COURT IS CALLING
        </span>

        <div className="greeting-row">
          <div>
            <h1>
              Find your <em>next game.</em>
            </h1>

            <p>
              Discover open plays, meet your people,
              and know when you’re up.
            </p>
          </div>
        </div>
      </div>

      <div className="feature-card">
        <div className="feature-content">
          <span className="tag">
            PLAY MORE, PLAN LESS
          </span>

          <h2>
            {totalSessions ? (
              <>
                There’s always
                <br />
                room for <i>one more.</i>
              </>
            ) : (
              <>
                Your next game
                <br />
                <i>starts here.</i>
              </>
            )}
          </h2>

          <p>
            {totalSessions
              ? "Find an open play near you and step onto the court."
              : "Host a friendly game or start a club session."}
          </p>

          <button
            onClick={() =>
              document
                .getElementById("sessions")
                ?.scrollIntoView({
                  behavior: "smooth",
                })
            }
          >
            Explore games
            <ArrowUpRight size={18} />
          </button>
        </div>

        <div className="court-art feature-art">
          <img
            className="asset-photo"
            src="/assets/hero.jpg"
            alt="Pickleball players on court"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />

          <span className="art-scribble">
            NEXT
            <br />
            UP!
          </span>

          <span className="image-hint">
            REPLACE /assets/court-hero.jpg
          </span>
        </div>
      </div>

      <section id="sessions" className="listing">
        <div className="section-top">
          <div>
            <span className="eyebrow">
              GET OUT AND PLAY
            </span>

            <h2>Open plays near you</h2>
          </div>

          <button
            className="text-link desktop-create"
            onClick={hostGame}
          >
            Host a Session
            <Plus size={18} aria-hidden="true" />
          </button>
        </div>

        {totalSessions > 0 && (
          <div className="filters">
            <label className="searchbox">
              <Search size={19} />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search sessions, clubs, or places"
              />
            </label>

            <div className="filter-pills">
              {[
                "All",
                "Recreational",
                "Beginner friendly",
                "Intermediate",
                "Advanced",
              ].map((option) => (
                <button
                  className={
                    filter === option ? "selected" : ""
                  }
                  onClick={() => setFilter(option)}
                  key={option}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="session-grid">
          {filtered.map((item) => (
            <SessionCard
              key={item.id}
              s={item}
              club={clubs.find(
                (club) => club.id === item.club_id
              )}
              fmt={fmt}
              open={() => {
                setSession(item.id);
                nav("/?session=" + item.id);
              }}
            />
          ))}

          {!filtered.length && (
            <div className="empty-state">
              <p className="empty">
                {totalSessions
                  ? "No games match your search. Try another filter."
                  : "No open plays yet. Host a friendly game or club session to get started."}
              </p>

              {!totalSessions && (
                <button
                  className="mobile-empty-host"
                  onClick={hostGame}
                >
                  Host a game
                  <Plus size={18} />
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="club-strip">
        <div>
          <span className="eyebrow">
            FIND YOUR PEOPLE
          </span>

          <h2>Better together.</h2>

          <p className="mt-[4px]">
            Join a club to hear about their next game.
          </p>

          <button
            className="dark-button"
            onClick={() => go("clubs")}
          >
            Explore clubs
            <ArrowUpRight size={17} />
          </button>
        </div>

        <div className="club-mini-list">
          {clubs.slice(0, 2).map((club, index) => (
            <button
              key={club.id}
              onClick={() => {
                setPage("clubs");
                setClub(club.id);
              }}
            >
              <span
                className={"mini-avatar avatar-" + index}
              >
                {club.name
                  .split(" ")
                  .map((word) => word[0])
                  .slice(0, 2)
                  .join("")}
              </span>

              <span>
                <strong>{club.name}</strong>
                <small>{club.city}</small>
              </span>

              <ArrowUpRight size={19} />
            </button>
          ))}
        </div>
      </section>

      <style>{`
        .empty-state {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          flex-direction: column;
          gap: 0;
          margin-top: 14px;
        }

        .empty-state .empty {
          width: 100%;
          margin: 0;
        }

        .mobile-empty-host {
          display: none;
        }

        @media (max-width: 760px) {
          .desktop-create {
            display: none !important;
          }

          .mobile-empty-host {
            display: inline-flex;
            justify-content: center;
            align-items: center;
            gap: 9px;
            align-self: center;
            margin-top: 18px;
            padding: 13px 22px;
            border: 0;
            border-radius: 10px;
            background: #dcfa53;
            color: #171e19;
            font-size: 13px;
            font-weight: 800;
            box-shadow: 0 4px 12px #24312612;
          }

          .mobile-empty-host:hover {
            background: #c9ed37;
          }
        }
      `}</style>
    </>
  );
}
