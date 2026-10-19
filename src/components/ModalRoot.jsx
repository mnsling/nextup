
import React, { useEffect, useState } from "react";
import { ArrowUpRight, X, LogOut } from "lucide-react";
import { HourlySlotPicker } from "./HourlySlotPicker";
import { AuthForm } from "./AuthForm";
import { BrandSelect } from "./BrandSelect";
import { BrandDatePicker } from "./BrandDatePicker";
import { supabase } from "../lib/supabase";

export function ModalRoot({
  modal,
  setModal,
  flash,
  demo,
  auth,
  createClub,
  createSession,
  clubs,
  hostClubId = "",
}) {
  const [hostClubIds, setHostClubIds] = useState([]);
  const [selectedHostClub, setSelectedHostClub] = useState("");

  useEffect(() => {
    setSelectedHostClub(modal === "createSession" ? hostClubId : "");
  }, [modal, hostClubId]);

  useEffect(() => {
    if (modal !== "createSession" || !supabase || !auth) {
      setHostClubIds([]);
      return;
    }

    let active = true;

    supabase
      .from("club_members")
      .select("club_id")
      .eq("user_id", auth.id)
      .in("role", ["owner", "organizer"])
      .then(({ data }) => {
        if (active) {
          setHostClubIds((data || []).map((item) => item.club_id));
        }
      });

    return () => {
      active = false;
    };
  }, [modal, auth?.id]);

  const hostClubs = clubs.filter(
    (club) => club.owner_id === auth?.id || hostClubIds.includes(club.id),
  );

  if (!modal) return null;

  return (
    <div
      className="modal-back"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setModal("");
      }}
    >
      <div className="modal" role="dialog" aria-modal="true">
        <button
          className="modal-close"
          aria-label="Close"
          onClick={() => setModal("")}
        >
          <X size={20} />
        </button>

        {modal === "auth" && (
          <AuthForm done={() => setModal("")} flash={flash} demo={demo} />
        )}

        {modal === "account" && (
          <>
            <span className="eyebrow">YOUR ACCOUNT</span>
            <h2>Hey, {auth?.email?.split("@")[0]}.</h2>
            <p className="muted">{auth?.email}</p>

            <button
              className="outline full"
              onClick={async () => {
                await supabase?.auth.signOut();
                setModal("");
              }}
            >
              Sign out <LogOut size={17} />
            </button>
          </>
        )}

        {modal === "createClub" && (
          <>
            <span className="eyebrow">BUILD YOUR COMMUNITY</span>
            <h2>Create a club.</h2>
            <p className="muted">Give players a place to find your games.</p>

            <form onSubmit={createClub} className="form">
              <label>
                Club name
                <input
                  name="name"
                  placeholder="e.g. Davao Rally Club"
                  required
                  maxLength="60"
                />
              </label>

              <label>
                City or area
                <input
                  name="city"
                  placeholder="Davao City"
                  required
                  maxLength="80"
                />
              </label>

              <label>
                About your club
                <textarea
                  name="description"
                  placeholder="Tell players what your club is about"
                  maxLength="300"
                />
              </label>

              <button className="primary full">
                Create club <ArrowUpRight size={17} />
              </button>
            </form>
          </>
        )}

        {modal === "createSession" && (
          <>
            <span className="eyebrow">HOST A GAME</span>
            <h2>New game.</h2>

            <p className="muted">
              Invite friends to a casual game or host for your club.
            </p>

            <form className="form" onSubmit={createSession}>
              <label>
                Session name
                <input
                  name="title"
                  placeholder="Friday doubles social"
                  required
                />
              </label>

              <div className="form-row">
                <label>
                  Session type
                  <BrandSelect name="session_type" defaultValue="open_play">
                    <option value="open_play">Open play</option>
                    <option value="tournament">Tournament</option>
                  </BrandSelect>
                </label>

                <label>
                  Match format
                  <BrandSelect name="match_format" defaultValue="doubles">
                    <option value="doubles">Doubles · 2 vs 2</option>
                    <option value="singles">Singles · 1 vs 1</option>
                  </BrandSelect>
                </label>
              </div>

              <p className="fine">
                Session type and match format are fixed after publishing.
              </p>

              <label>
                Host as
                <BrandSelect
                  name="club_id"
                  value={selectedHostClub}
                  onChange={(event) =>
                    setSelectedHostClub(event.target.value)
                  }
                >
                  <option value="">Friendly game · no club</option>

                  {hostClubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name} · club game
                    </option>
                  ))}
                </BrandSelect>
              </label>

              <div className="flex w-full min-w-0 flex-col gap-2">
                <span className="text-xs font-bold text-[#596653]">
                  Session date
                </span>

                <BrandDatePicker
                  name="session_date"
                  required
                  label="Session date"
                />
              </div>

              <div className="w-full min-w-0">
                <HourlySlotPicker />
              </div>

              <label>
                Skill level
                <BrandSelect name="skill_level">
                  <option>All levels</option>
                  <option>Recreational</option>
                  <option>Beginner friendly</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </BrandSelect>
              </label>

              <label>
                Venue
                <input
                  name="location"
                  placeholder="Court name and address"
                  required
                />
              </label>

              <label>
                Google Maps link
                <input
                  type="url"
                  name="maps_url"
                  placeholder="https://maps.google.com/..."
                />
              </label>

              <div className="form-row">
                <label>
                  Player limit
                  <input
                    type="number"
                    name="capacity"
                    min="2"
                    max="256"
                    defaultValue="24"
                    required
                  />
                </label>

                <label>
                  Courts
                  <input
                    type="number"
                    name="courts"
                    min="1"
                    max="32"
                    defaultValue="1"
                    required
                  />
                </label>

                <label>
                  Required session fee (₱)
                  <input
                    type="number"
                    name="fee"
                    min="1"
                    step="1"
                    defaultValue=""
                    required
                  />
                </label>
              </div>

              <button className="primary full">
                Publish game <ArrowUpRight size={17} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
