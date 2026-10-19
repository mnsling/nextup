
import {
  ArrowUpRight,
  CalendarDays,
  CircleUserRound,
  Users,
  Plus,
  Search,
  Menu,
  Play,
  LogOut,
  X,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "../lib/supabase";
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

  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  async function confirmLogout() {
    if (loggingOut || !supabase) return;

    setLoggingOut(true);
    setLogoutError("");

    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      setLogoutOpen(false);
    } catch (error) {
      setLogoutError(
        error?.message ||
          "Unable to log out. Please try again."
      );
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div
          className="brand"
          onClick={() => go("discover")}
          role="button"
          tabIndex="0"
        >
          <span className="brand-icon" />
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

            {auth?.id && (
              <button
                type="button"
                className="notification-trigger logout-trigger"
                aria-label="Log out"
                title="Log out"
                onClick={() => {
                  setLogoutError("");
                  setLogoutOpen(true);
                }}
              >
                <LogOut size={19} />
              </button>
            )}
          </div>
        </header>

        <main>{children}</main>

        <footer>
          <strong>
            NEXTUP<span className="brand-dot">.</span>
          </strong>

          <span>Davao City, Philippines.</span>
        </footer>
      </div>

      {logoutOpen && (
        <div
          className="nextup-logout-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !loggingOut
            ) {
              setLogoutOpen(false);
            }
          }}
        >
          <section
            className="nextup-logout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="nextup-logout-title"
          >
            <button
              type="button"
              className="nextup-logout-close"
              aria-label="Close confirmation"
              disabled={loggingOut}
              onClick={() => setLogoutOpen(false)}
            >
              <X size={18} />
            </button>

            <span className="nextup-logout-icon">
              <LogOut size={22} />
            </span>

            <h2 id="nextup-logout-title">Log out?</h2>

            <p>
              Are you sure you want to log out of your
              NEXTUP account?
            </p>

            {logoutError && (
              <p
                className="nextup-logout-error"
                role="alert"
              >
                {logoutError}
              </p>
            )}

            <div className="nextup-logout-actions">
              <button
                type="button"
                className="nextup-logout-cancel"
                disabled={loggingOut}
                onClick={() => setLogoutOpen(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="nextup-logout-confirm"
                disabled={loggingOut}
                onClick={confirmLogout}
              >
                <LogOut size={16} />
                {loggingOut
                  ? "Logging out…"
                  : "Yes, log out"}
              </button>
            </div>
          </section>
        </div>
      )}

      <style>{`
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
          gap: 10px;
          margin-left: auto;
        }

        .top-actions > * {
          flex-shrink: 0;
        }

        .logout-trigger:hover > svg {
          transform: translateX(2px);
        }

        .nextup-logout-backdrop {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(15, 22, 16, 0.48);
          backdrop-filter: blur(4px);
          animation: nextup-logout-fade 180ms ease both;
        }

        .nextup-logout-modal {
          position: relative;
          width: min(100%, 410px);
          padding: 30px;
          border: 1px solid #e4e9dd;
          border-radius: 22px;
          background: #fff;
          color: #171e19;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.2);
          text-align: center;
          animation: nextup-logout-rise 220ms ease both;
        }

        .nextup-logout-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border: 1px solid #e0e5da;
          border-radius: 10px;
          background: #fff;
          color: #354034;
          cursor: pointer;
        }

        .nextup-logout-icon {
          display: inline-grid;
          place-items: center;
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: #eff6d9;
          color: #26351f;
          margin-bottom: 14px;
        }

        .nextup-logout-modal h2 {
          margin: 0 0 8px;
          font-size: 23px;
          letter-spacing: -0.6px;
        }

        .nextup-logout-modal > p {
          margin: 0;
          color: #697365;
          font-size: 14px;
          line-height: 1.6;
        }

        .nextup-logout-modal .nextup-logout-error {
          margin-top: 12px;
          color: #c62828;
          font-size: 13px;
        }

        .nextup-logout-actions {
          display: flex;
          gap: 10px;
          margin-top: 24px;
        }

        .nextup-logout-actions button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 44px;
          flex: 1;
          padding: 0 14px;
          border-radius: 12px;
          font: inherit;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition:
            transform 160ms ease,
            background 160ms ease;
        }

        .nextup-logout-actions button:active {
          transform: scale(0.97);
        }

        .nextup-logout-actions button:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .nextup-logout-cancel {
          border: 1px solid #dce3d5;
          background: #fff;
          color: #273226;
        }

        .nextup-logout-cancel:hover {
          background: #f5f7ef;
        }

        .nextup-logout-confirm {
          border: 1px solid #dcfa53;
          background: #dcfa53;
          color: #171e19;
        }

        .nextup-logout-confirm:hover {
          background: #cfee3e;
        }

        @keyframes nextup-logout-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes nextup-logout-rise {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

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
            background: #fff;
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
            gap: 8px;
            flex-shrink: 0;
            margin-left: auto;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .nextup-logout-backdrop,
          .nextup-logout-modal,
          .logout-trigger > svg {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}
