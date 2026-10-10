import { useState } from "react";
import {
  ArrowUpRight,
  MapPin,
  Users,
  Copy,
  CreditCard,
} from "lucide-react";

import {
  getSessionStatus,
  useSessionClock,
} from "../hooks/useSessionClock";

import { SessionPaymentPanel } from "../components/SessionPayments";
import { GameResults } from "../components/GameResults";
import { ConfirmedMembers } from "../components/ConfirmedMembers";
import { HostGameTools } from "../components/HostGameTools";
import { TournamentManager } from "../components/TournamentManager";
import { CourtMatchManager } from "../components/CourtMatchManager";

export function SessionPage({
  selected,
  auth,
  recordMatch,
  clubs,
  fmt,
  queue,
  demo,
  joins,
  busy,
  joinSession,
  flash,
  setSession,
  nav,
  onSessionUpdated,
  onPlayerRemoved,
  onPaymentApproved,
}) {
  const isTournament =
    selected.session_type === "tournament";

  const [tab, setTab] = useState(
    isTournament ? "tournaments" : "details",
  );

  const tabs = isTournament
    ? [
        ["details", "Details"],
        ["tournaments", "Bracket"],
      ]
    : [
        ["details", "Details"],
        ["matches", "Matches"],
        ["leaderboard", "Leaderboard"],
      ];

  const now = useSessionClock();
  const status = getSessionStatus(selected, now);

  return (
    <>
      <button
        className="back"
        onClick={() => {
          setSession(null);
          nav("/");
        }}
      >
        ← Back to sessions
      </button>

      <div className="detail-head">
        <div>
          <span className="eyebrow">
            {isTournament ? "TOURNAMENT" : "OPEN PLAY"} /{" "}
            {clubs.find(
              (club) => club.id === selected.club_id,
            )?.name || "FRIENDLY GAME"}
          </span>

          <h1>{selected.title}</h1>

          <p>
            {selected.match_format === "singles"
              ? "Singles"
              : "Doubles"}{" "}
            · {selected.skill_level} ·{" "}
            {selected.courts} courts
          </p>
        </div>

        <div className="detail-badge">
          {status === "open"
            ? "REGISTRATION OPEN"
            : status === "live"
              ? "LIVE"
              : "ENDED"}
        </div>
      </div>

      <nav
        className="mb-6 flex gap-2 overflow-x-auto border-b border-slate-200 pb-3"
        aria-label="Game sections"
      >
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-current={
              tab === id ? "page" : undefined
            }
            onClick={() => setTab(id)}
            className={`shrink-0 rounded-xl px-5 py-3 text-sm font-semibold transition ${
              tab === id
                ? "bg-[#dbf76a] text-slate-900"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "details" ? (
        <div className="detail-grid">
          <div>
            <div className="court-art hero-art">
              <img
                className="asset-photo"
                src="/assets/court-hero.jpg"
                alt="Pickleball court"
                onError={(event) => {
                  event.currentTarget.style.display =
                    "none";
                }}
              />

              <div className="court-grid" />

              <div className="art-copy">
                GOOD GAMES
                <br />
                START HERE
                <span>↗</span>
              </div>
            </div>

            <SessionPaymentPanel
              game={selected}
              auth={auth}
              flash={flash}
              onUpdated={onSessionUpdated}
              onApproved={onPaymentApproved}
            />

            {auth?.id === selected.host_id && (
              <HostGameTools
                key={selected.id}
                game={selected}
                queue={queue}
                onUpdated={onSessionUpdated}
                onRemoved={onPlayerRemoved}
                flash={flash}
                demo={demo}
              />
            )}
          </div>

          <aside className="detail-side">
            <div className="panel">
              <span className="eyebrow">
                YOUR NEXT GAME
              </span>

              <h2>{fmt(selected.starts_at)}</h2>

              <div className="detail-fact">
                <MapPin size={19} />

                <span>
                  {selected.location}

                  <a
                    href={
                      selected.maps_url ||
                      "https://maps.google.com"
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    Get directions ↗
                  </a>
                </span>
              </div>

              <div className="detail-fact">
                <Users size={19} />

                <span>
                  {demo
                    ? selected.joined || queue.length
                    : queue.length}{" "}
                  / {selected.capacity} spots filled
                </span>
              </div>

              <div className="detail-fact">
                <CreditCard size={19} />

                <span>
                  {selected.fee
                    ? `₱${selected.fee} venue fee`
                    : "Free entry"}

                  <small>
                    {selected.fee
                      ? "GCash · host verifies your receipt"
                      : "No payment required"}
                  </small>
                </span>
              </div>

              <button
                className="primary full"
                disabled={
                  busy ||
                  joins.includes(selected.id) ||
                  status !== "open"
                }
                onClick={() => joinSession(selected)}
              >
                {joins.includes(selected.id)
                  ? "You joined this session"
                  : status === "closed"
                    ? "Session ended"
                    : status === "live"
                      ? "Registration closed"
                      : "Join this session"}{" "}
                <ArrowUpRight size={18} />
              </button>

              <p className="fine">
                Session fees go directly to the host.
                NEXTUP plan payments are separate.
              </p>
            </div>

            <button
              className="share-button"
              onClick={() => {
                navigator.clipboard?.writeText(
                  location.href,
                );

                flash("Session link copied.");
              }}
            >
              <Copy size={17} />
              Copy session link
            </button>

            <ConfirmedMembers
              game={selected}
              auth={auth}
              queue={queue}
              demo={demo}
              joined={joins.includes(selected.id)}
              onRemoved={onPlayerRemoved}
              flash={flash}
            />
          </aside>
        </div>
      ) : tab === "tournaments" && isTournament ? (
        <TournamentManager
          key={selected.id}
          game={selected}
          auth={auth}
          flash={flash}
        />
      ) : (
        <div className="space-y-5">
          <GameResults
            key={`${selected.id}-${tab}`}
            gameId={selected.id}
            auth={auth}
            mode={tab}
          />

          {tab === "matches" && !isTournament && (
            <CourtMatchManager
              key={selected.id}
              game={selected}
              auth={auth}
              flash={flash}
            />
          )}
        </div>
      )}
    </>
  );
}