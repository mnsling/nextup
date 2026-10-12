
import {
  ArrowUpRight,
  CalendarDays,
  CircleUserRound,
  Users,
  Plus,
  Search,
  Menu,
  Play,
} from "lucide-react";
import { avatarUrl } from "../lib/profilePhoto";
import { Notifications } from "./Notifications";

export function AppShell({
  children,
  go,
  page,
  auth,
  profile,
  setModal,
  setMenu,
  requireAuth,
  onOpenSession,
}) {
  const displayName = auth
    ? profile?.full_name?.trim() ||
    auth.user_metadata?.full_name?.trim() ||
    "Player"
    : "Guest player";

  const photo = avatarUrl(profile?.avatar_path);

  return (
    <div className="app">
      <aside className="sidebar">
        <div
          className="brand"
          onClick={() => go("discover")}
          role="button"
          tabIndex="0"
        >
          <span className="brand-icon">
          </span>

          <span>
            NEXTUP<span className="brand-dot">.</span>
          </span>
        </div>

        <div className="side-label">PLAY</div>

        <nav className="side-nav">
          <button
            className={page === "discover" ? "active" : ""}
            onClick={() => go("discover")}
          >
            <Search size={19} />
            Discover
          </button>

          <button
            className={page === "clubs" ? "active" : ""}
            onClick={() => go("clubs")}
          >
            <Users size={19} />
            Clubs
          </button>

          <button
            className={page === "my-games" ? "active" : ""}
            onClick={() => go("my-games")}
          >
            <CalendarDays size={19} />
            My games
          </button>

          <button
            className={page === "profile" ? "active" : ""}
            onClick={() => go("profile")}
          >
            <CircleUserRound size={19} />
            Profile
          </button>
        </nav>

        <div className="side-label lower">ORGANIZE</div>

        <nav className="side-nav">
          <button
            onClick={() => {
              if (requireAuth()) setModal("createClub");
            }}
          >
            <Plus size={19} />
            Create club
          </button>

          <button
            onClick={() => {
              if (requireAuth()) setModal("createSession");
            }}
          >
            <Play size={19} />
            Host a session
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="side-promo">
            <span className="tiny-label">
              FOR ORGANIZERS
            </span>

            <h3>
              More play.
              <br />
              Less admin.
            </h3>

            <button onClick={() => go("pricing")}>
              Explore plans
              <ArrowUpRight size={16} />
            </button>
          </div>

          <button
            className="account"
            onClick={() =>
              auth ? go("profile") : setModal("auth")
            }
          >
            <span className="avatar">
              {photo ? (
                <img src={photo} alt="" />
              ) : (
                displayName[0].toUpperCase()
              )}
            </span>

            <span>
              <strong>{displayName}</strong>
              <small>
                {auth
                  ? "View your profile"
                  : "Sign in to save games"}
              </small>
            </span>

            <ArrowUpRight size={16} />
          </button>
        </div>
      </aside>

      <div className="main-wrap">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setMenu(true)}
            aria-label="Open menu"
            type="button"
          >
            <Menu size={20} strokeWidth={2} />
          </button>

          <div className="top-actions">
            <Notifications
              auth={auth}
              onOpenSession={onOpenSession}
            />
          </div>
        </header>

        <main>{children}</main>

        <footer>
          <strong>
            NEXTUP<span className="brand-dot">.</span>
          </strong>

          <span>
            Davao City, Philippines.
          </span>
        </footer>
      </div>

      <style>{`
        /* Desktop top navigation */
        .topbar {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          width: 100%;
        }

        .top-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          margin-left: auto;
        }

        .top-actions > * {
          flex-shrink: 0;
        }

        /* Mobile menu button */
        .mobile-menu {
          display: none;
        }

        @media (max-width: 760px) {
          .topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }

          .mobile-menu {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;

            width: 40px;
            height: 40px;
            padding: 0;

            border: 1px solid #e0e5da;
            border-radius: 12px;

            background: #ffffff;
            color: #243126;

            cursor: pointer;
            transition:
              background 160ms ease,
              border-color 160ms ease,
              transform 160ms ease;
          }

          .mobile-menu:hover {
            background: #f5f7ef;
            border-color: #cbd5c1;
          }

          .mobile-menu:active {
            transform: scale(0.96);
          }

          .mobile-menu:focus-visible {
            outline: 2px solid #a8ca43;
            outline-offset: 3px;
          }

          .top-actions {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            flex-shrink: 0;
            margin-left: auto;
          }
        }
      `}</style>
    </div>
  );
}
