import {
  ArrowUpRight,
  CalendarDays,
  CircleUserRound,
  MapPin,
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
            N<span>●</span>
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
            <Search size={19} /> Discover
          </button>

          <button
            className={page === "clubs" ? "active" : ""}
            onClick={() => go("clubs")}
          >
            <Users size={19} /> Clubs
          </button>

          <button
            className={page === "my-games" ? "active" : ""}
            onClick={() => go("my-games")}
          >
            <CalendarDays size={19} /> My games
          </button>

          <button
            className={page === "profile" ? "active" : ""}
            onClick={() => go("profile")}
          >
            <CircleUserRound size={19} /> Profile
          </button>
        </nav>

        <div className="side-label lower">ORGANIZE</div>

        <nav className="side-nav">
          <button
            onClick={() => {
              if (requireAuth()) setModal("createClub");
            }}
          >
            <Plus size={19} /> Create club
          </button>

          <button
            onClick={() => {
              if (requireAuth()) setModal("createSession");
            }}
          >
            <Play size={19} /> Host a session
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="side-promo">
            <span className="tiny-label">FOR ORGANIZERS</span>

            <h3>
              More play.
              <br />
              Less admin.
            </h3>

            <button onClick={() => go("pricing")}>
              Explore plans <ArrowUpRight size={16} />
            </button>
          </div>

          <button
            className="account"
            onClick={() => (auth ? go("profile") : setModal("auth"))}
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
                {auth ? "View your profile" : "Sign in to save games"}
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
          >
            <Menu />
          </button>

          <span className="top-location">
            <MapPin size={16} /> Davao City, Philippines
          </span>

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

          <span>Find your next game. Davao City, Philippines.</span>

          <button onClick={() => go("pricing")}>Plans</button>
        </footer>
      </div>
    </div>
  );
}