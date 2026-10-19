
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
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
  const PAGE_SIZE = 6;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleSessions = useMemo(() => {
    const safePage = Math.min(currentPage, pageCount);
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage, pageCount]);

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [currentPage, pageCount]);

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
              ? "Find an upcoming game and step onto the court."
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
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />

          <span className="art-scribble">
            NEXT
            <br />
            UP!
          </span>
        </div>
      </div>

      <section id="sessions" className="listing">
        <div className="section-top">
          <div className="sessions-heading-copy">
            <span className="eyebrow">
              GET OUT AND PLAY
            </span>

            <h2>Open plays available</h2>
            <p className="sessions-subtitle">
              Upcoming games, sorted by start time.
            </p>
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

        {filtered.length > 0 && (
          <div className="sessions-results-meta">
            <span>
              Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} games
            </span>
          </div>
        )}

        <div className="session-grid">
          {visibleSessions.map((item) => (
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
                  Host a session
                  <Plus size={18} />
                </button>
              )}
            </div>
          )}
        </div>

        {filtered.length > PAGE_SIZE && (
          <nav className="sessions-pagination" aria-label="Open plays pages">
            <button
              type="button"
              className="pagination-arrow"
              onClick={() => {
                setCurrentPage((page) => Math.max(1, page - 1));
                document.getElementById("sessions")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <ArrowLeft size={17} />
              <span>Previous</span>
            </button>

            <div className="pagination-pages">
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  className={currentPage === page ? "pagination-page active" : "pagination-page"}
                  onClick={() => {
                    setCurrentPage(page);
                    document.getElementById("sessions")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  aria-current={currentPage === page ? "page" : undefined}
                  aria-label={`Page ${page}`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="pagination-arrow"
              onClick={() => {
                setCurrentPage((page) => Math.min(pageCount, page + 1));
                document.getElementById("sessions")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              disabled={currentPage === pageCount}
              aria-label="Next page"
            >
              <span>Next</span>
              <ArrowRight size={17} />
            </button>
          </nav>
        )}
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
        .sessions-heading-copy h2 {
          margin-bottom: 0;
        }

        .sessions-subtitle {
          margin: 6px 0 0;
          color: #7a8377;
          font-size: 13px;
          line-height: 1.5;
        }

        .sessions-results-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin: 18px 0 12px;
          color: #778071;
          font-size: 12px;
        }

        .sessions-sort-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #35452e;
          font-weight: 700;
        }

        .sessions-sort-label::before {
          content: "";
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #9ecb36;
        }

        .sessions-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          margin: 28px 0 8px;
        }

        .pagination-arrow,
        .pagination-page {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e3e8dd;
          background: #fff;
          color: #273328;
          transition: background .18s ease, border-color .18s ease, opacity .18s ease;
        }

        .pagination-arrow {
          min-height: 42px;
          gap: 8px;
          padding: 0 13px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
        }

        .pagination-pages {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .pagination-page {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
        }

        .pagination-page.active {
          border-color: #dcfa53;
          background: #dcfa53;
          color: #171e19;
        }

        .pagination-arrow:hover:not(:disabled),
        .pagination-page:hover:not(.active) {
          border-color: #cbd6bd;
          background: #f5f8ef;
        }

        .pagination-arrow:disabled {
          cursor: not-allowed;
          opacity: .4;
        }

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
          .section-top {
            flex-wrap: wrap;
            align-items: flex-start;
            gap: 12px;
          }

          .sessions-heading-copy {
            width: 100%;
          }

          .desktop-create {
            display: inline-flex !important;
            align-items: center;
            justify-content: center;
            gap: 9px;
            width: 100%;
            min-height: 46px;
            margin-top: 4px;
            padding: 0 16px;
            border: 0;
            border-radius: 10px;
            background: #dcfa53;
            color: #171e19;
            font-size: 13px;
            font-weight: 800;
          }

          .desktop-create:hover {
            background: #c9ed37;
          }

          .sessions-subtitle {
            max-width: 260px;
            font-size: 12px;
          }

          .filters {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .searchbox {
            width: 100%;
            min-height: 46px;
            box-sizing: border-box;
          }

          .filter-pills {
            display: flex;
            flex-wrap: nowrap;
            max-width: calc(100vw - 36px);
            overflow-x: auto;
            gap: 8px;
            padding: 2px 1px 8px;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
          }

          .filter-pills::-webkit-scrollbar {
            display: none;
          }

          .filter-pills button {
            flex: 0 0 auto;
            min-height: 36px;
            white-space: nowrap;
          }

          .session-grid {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 14px;
          }

          .sessions-results-meta {
            margin: 14px 0 10px;
            font-size: 11px;
          }

          .sessions-pagination {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            gap: 8px;
            margin-top: 22px;
          }

          .pagination-arrow {
            min-height: 42px;
            padding: 0 10px;
          }

          .pagination-arrow:first-child {
            justify-self: start;
          }

          .pagination-arrow:last-child {
            justify-self: end;
          }

          .pagination-arrow span {
            font-size: 11px;
          }

          .pagination-pages {
            gap: 4px;
          }

          .pagination-page {
            width: 34px;
            height: 36px;
            border-radius: 9px;
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

        @media (max-width: 380px) {
          .sessions-pagination {
            gap: 5px;
          }

          .pagination-arrow {
            gap: 4px;
            padding: 0 7px;
          }

          .pagination-page {
            width: 30px;
          }
        }
      `}</style>
    </>
  );
}
