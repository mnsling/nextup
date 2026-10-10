import { useEffect, useState } from "react";
import {
  Camera,
  Check,
  Image as ImageIcon,
  Pencil,
  Plus,
  Save,
  UserPlus,
  Users,
} from "lucide-react";
import {
  sessionEnded,
  useSessionClock,
} from "../hooks/useSessionClock";
import { supabase } from "../lib/supabase";
import { SessionCard } from "../components/SessionCard";
import { ClubMembers } from "../components/ClubMembers";

const bucket = "nextup-club-images";

function initials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function usePreview(file) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!file) {
      setUrl("");
      return;
    }

    const next = URL.createObjectURL(file);
    setUrl(next);

    return () => URL.revokeObjectURL(next);
  }, [file]);

  return url;
}

export function ClubPage({
  selectedClub,
  clubs,
  club,
  sessions,
  joinClub,
  fmt,
  setSession,
  nav,
  setClub,
  auth,
  flash,
  onClubUpdated,
  onHostGame,
}) {
  const now = useSessionClock();

  const clubSessions = sessions.filter(
    (session) => session.club_id === selectedClub.id,
  );

  const upcoming = clubSessions.filter(
    (session) => !sessionEnded(session, now),
  );

  const completed = clubSessions
    .filter((session) => sessionEnded(session, now))
    .sort(
      (a, b) => new Date(b.ends_at) - new Date(a.ends_at),
    );

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    city: "",
    description: "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [owners, setOwners] = useState([]);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerBusy, setOwnerBusy] = useState(false);
  const [membership, setMembership] = useState(null);
  const [membershipRetry, setMembershipRetry] = useState(0);
  const [joining, setJoining] = useState(false);

  const currentMembership =
    membership?.clubId === selectedClub.id &&
      membership?.userId === auth?.id
      ? membership
      : null;

  const checkingMembership = Boolean(
    auth?.id &&
    (!currentMembership || currentMembership.loading),
  );

  const isMember = Boolean(currentMembership?.joined);
  const avatarPreview = usePreview(avatarFile);
  const coverPreview = usePreview(coverFile);

  const isPrimaryOwner = Boolean(
    auth?.id && auth.id === selectedClub.owner_id,
  );

  const canEdit = Boolean(
    auth?.id &&
    (isPrimaryOwner ||
      owners.some((owner) => owner.user_id === auth.id)),
  );

  async function refreshOwners() {
    const { data, error } = await supabase.rpc(
      "get_club_owners",
      { p_club_id: selectedClub.id },
    );

    if (error) throw error;
    setOwners(data || []);
  }

  useEffect(() => {
    setEditing(false);
    setDraft({
      name: selectedClub.name,
      city: selectedClub.city || "",
      description: selectedClub.description || "",
    });
    setAvatarFile(null);
    setCoverFile(null);
  }, [selectedClub.id]);

  useEffect(() => {
    if (
      !supabase ||
      String(selectedClub.id).startsWith("demo-")
    ) {
      setOwners([]);
      return;
    }

    let active = true;

    supabase
      .rpc("get_club_owners", {
        p_club_id: selectedClub.id,
      })
      .then(({ data, error }) => {
        if (active) {
          setOwners(error ? [] : data || []);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedClub.id]);

  useEffect(() => {
    let active = true;

    const clubId = selectedClub.id;
    const userId = auth?.id;

    setJoining(false);

    if (!userId) {
      setMembership(null);
      return;
    }

    const base = { clubId, userId };

    if (!supabase || String(clubId).startsWith("demo-")) {
      setMembership({
        ...base,
        loading: false,
        joined: false,
        error: "",
      });
      return;
    }

    setMembership({
      ...base,
      loading: true,
      joined: false,
      error: "",
    });

    async function checkMembership() {
      try {
        const { data, error } = await supabase
          .from("club_members")
          .select("role")
          .eq("club_id", clubId)
          .eq("user_id", userId)
          .maybeSingle();

        if (error) throw error;

        if (active) {
          setMembership({
            ...base,
            loading: false,
            joined: Boolean(data),
            error: "",
          });
        }
      } catch (error) {
        if (active) {
          setMembership({
            ...base,
            loading: false,
            joined: false,
            error:
              error.message || "Could not check membership.",
          });
        }
      }
    }

    checkMembership();

    return () => {
      active = false;
    };
  }, [selectedClub.id, auth?.id, membershipRetry]);

  async function handleJoin() {
    if (joining || checkingMembership || isMember) return;

    const clubId = selectedClub.id;
    const userId = auth?.id;

    setJoining(true);

    try {
      const joined = await joinClub(selectedClub);

      if (joined && userId) {
        setMembership({
          clubId,
          userId,
          loading: false,
          joined: true,
          error: "",
        });
      }
    } catch (error) {
      flash(error.message || "Could not join club.");
    } finally {
      setJoining(false);
    }
  }

  async function manageOwner(action, userId = null) {
    if (!isPrimaryOwner || ownerBusy) return;

    setOwnerBusy(true);

    const { error } = await supabase.rpc("manage_club_owner", {
      p_club_id: selectedClub.id,
      p_email: action === "add" ? ownerEmail.trim() : "",
      p_action: action,
      p_user_id: userId,
    });

    if (error) {
      flash(error.message);
    } else {
      setOwnerEmail("");

      try {
        await refreshOwners();
        flash(
          action === "add"
            ? "Co-owner added."
            : "Co-owner removed.",
        );
      } catch (readError) {
        flash(readError.message);
      }
    }

    setOwnerBusy(false);
  }

  function pickFile(event, kind) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(
        file.type,
      ) ||
      file.size > 5 * 1024 * 1024
    ) {
      flash("Choose a JPG, PNG, or WebP image under 5 MB.");
      event.target.value = "";
      return;
    }

    if (kind === "avatar") {
      setAvatarFile(file);
    } else {
      setCoverFile(file);
    }
  }

  function cancel() {
    setDraft({
      name: selectedClub.name,
      city: selectedClub.city || "",
      description: selectedClub.description || "",
    });
    setAvatarFile(null);
    setCoverFile(null);
    setEditing(false);
  }

  async function upload(file, kind) {
    const extension =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "jpg";

    const path = `${auth.id}/${selectedClub.id}/${kind}-${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { contentType: file.type });

    if (error) throw error;

    return supabase.storage
      .from(bucket)
      .getPublicUrl(path).data.publicUrl;
  }

  async function save(event) {
    event.preventDefault();
    if (!canEdit || saving) return;

    const name = draft.name.trim();
    const city = draft.city.trim();

    if (name.length < 2 || name.length > 60 || !city) {
      flash("Enter a club name (2–60 characters) and city.");
      return;
    }

    if (!supabase) {
      flash("Connect Supabase to save club changes.");
      return;
    }

    setSaving(true);

    try {
      const changes = {
        name,
        city,
        description: draft.description.trim(),
      };

      if (avatarFile) {
        changes.avatar_url = await upload(
          avatarFile,
          "avatar",
        );
      }

      if (coverFile) {
        changes.cover_url = await upload(coverFile, "cover");
      }

      const { data, error } = await supabase
        .from("clubs")
        .update(changes)
        .eq("id", selectedClub.id)
        .select()
        .single();

      if (error) throw error;

      onClubUpdated(data);
      setAvatarFile(null);
      setCoverFile(null);
      setEditing(false);
      flash("Club profile saved.");
    } catch (error) {
      flash(error.message || "Could not save club profile.");
    } finally {
      setSaving(false);
    }
  }

  const cover =
    coverPreview ||
    selectedClub.cover_url ||
    `/assets/club-${(Math.max(
      0,
      clubs.findIndex((item) => item.id === club),
    ) %
      3) +
    1
    }.jpg`;

  const avatar = avatarPreview || selectedClub.avatar_url;

  return (
    <>
      <button
        className="back"
        onClick={() => setClub(null)}
      >
        ← All clubs
      </button>

      <div className="club-hero">
        <div
          className="club-hero-art"
          style={{ zIndex: 0 }}
        >
          <img
            key={cover}
            className="asset-photo"
            src={cover}
            alt=""
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />

          <ImageIcon size={30} />
          <span>CLUB COVER PHOTO</span>
        </div>

        <div
          className="club-info"
          style={{ position: "relative", zIndex: 1 }}
        >
          <div
            className="club-avatar"
            style={{ overflow: "hidden", zIndex: 2 }}
          >
            {avatar ? (
              <img
                key={avatar}
                src={avatar}
                alt={`${selectedClub.name} logo`}
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : (
              initials(selectedClub.name)
            )}
          </div>

          <div className="flex items-end justify-between gap-4">
            <span className="eyebrow min-w-0">
              PICKLEBALL CLUB /{" "}
              {selectedClub.city?.toUpperCase()}
            </span>

            <div className="shrink-0">
              {canEdit ? (
                editing ? (
                  <button
                    className="outline"
                    type="button"
                    disabled={saving}
                    onClick={cancel}
                  >
                    Cancel editing
                  </button>
                ) : (
                  <button
                    className="primary !h-10 !w-10 !shrink-0 !p-0 sm:!h-auto sm:!w-auto sm:!px-[17px] sm:!py-3"
                    type="button"
                    aria-label="Edit club"
                    title="Edit club"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil size={17} />
                    <span className="hidden sm:inline">
                      Edit club
                    </span>
                  </button>
                )
              ) : currentMembership?.error ? (
                <button
                  className="outline"
                  type="button"
                  onClick={() =>
                    setMembershipRetry((value) => value + 1)
                  }
                >
                  Retry check
                </button>
              ) : (
                <button
                  className="primary !px-3 !py-2 !text-xs sm:!px-[17px] sm:!py-3 sm:!text-sm"
                  type="button"
                  disabled={
                    checkingMembership || joining || isMember
                  }
                  onClick={handleJoin}
                >
                  {isMember ? (
                    <Check size={17} />
                  ) : (
                    <UserPlus size={17} />
                  )}

                  {checkingMembership
                    ? "Checking…"
                    : joining
                      ? "Joining…"
                      : isMember
                        ? "Joined club"
                        : "Join club"}
                </button>
              )}
            </div>
          </div>

          <h1>{selectedClub.name}</h1>
          <p>{selectedClub.description}</p>

          {currentMembership?.error && !canEdit && (
            <p
              role="alert"
              className="mt-3 text-sm text-red-600"
            >
              {currentMembership.error}
            </p>
          )}

          <div className="mt-6 flex flex-col items-start gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <Users size={17} />

              <strong>
                {owners.length > 1
                  ? "Club owners:"
                  : "Club owner:"}
              </strong>

              {owners.length ? (
                owners.map((owner) => (
                  <span
                    key={owner.user_id}
                    className="rounded-full bg-lime-100 px-3 py-1 text-slate-800"
                  >
                    {owner.full_name || "Club owner"}
                  </span>
                ))
              ) : (
                <span>
                  {canEdit ? "You" : "Club owner"}
                </span>
              )}
            </div>

            <ClubMembers
              key={`${selectedClub.id}-${auth?.id || "guest"}`}
              club={selectedClub}
              auth={auth}
            />
          </div>
        </div>
      </div>

      {canEdit && editing && (
        <form
          className="form my-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          onSubmit={save}
        >
          <h2 className="mb-1 text-2xl font-bold">
            Edit club profile
          </h2>

          <p className="mb-6 text-sm text-slate-500">
            Photos and details are published when you save changes.
          </p>

          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <label className="cursor-pointer rounded-xl border border-dashed border-slate-300 p-4 transition hover:border-lime-500 hover:bg-lime-50">
              <span className="flex items-center gap-2 font-semibold">
                <Camera size={18} /> Profile photo
              </span>

              <span className="mt-2 block text-sm text-slate-500">
                {avatarFile?.name ||
                  "Choose a square JPG, PNG, or WebP"}
              </span>

              <input
                className="hidden"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  pickFile(event, "avatar")
                }
              />
            </label>

            <label className="cursor-pointer rounded-xl border border-dashed border-slate-300 p-4 transition hover:border-lime-500 hover:bg-lime-50">
              <span className="flex items-center gap-2 font-semibold">
                <ImageIcon size={18} /> Cover photo
              </span>

              <span className="mt-2 block text-sm text-slate-500">
                {coverFile?.name ||
                  "Choose a wide JPG, PNG, or WebP"}
              </span>

              <input
                className="hidden"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  pickFile(event, "cover")
                }
              />
            </label>
          </div>

          <label>
            Club name
            <input
              required
              minLength={2}
              maxLength={60}
              value={draft.name}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  name: event.target.value,
                })
              }
            />
          </label>

          <label>
            City
            <input
              required
              value={draft.city}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  city: event.target.value,
                })
              }
            />
          </label>

          <label>
            Description
            <textarea
              rows={4}
              value={draft.description}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  description: event.target.value,
                })
              }
            />
          </label>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="primary"
              disabled={saving}
              type="submit"
            >
              <Save size={17} />
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>

          {isPrimaryOwner && (
            <div className="mt-7 border-t border-slate-200 pt-6">
              <h3 className="text-lg font-bold">
                Manage owners
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                A player must sign up and join this club before you promote them.
              </p>

              <label className="mt-4">
                Member email
                <input
                  type="email"
                  value={ownerEmail}
                  placeholder="member@example.com"
                  onChange={(event) =>
                    setOwnerEmail(event.target.value)
                  }
                />
              </label>

              <button
                className="outline mt-3"
                type="button"
                disabled={ownerBusy || !ownerEmail.trim()}
                onClick={() => manageOwner("add")}
              >
                {ownerBusy ? "Updating…" : "Add co-owner"}
              </button>

              <div className="mt-5 grid gap-2">
                {owners.map((owner) => (
                  <div
                    key={owner.user_id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <span className="text-sm font-semibold">
                      {owner.full_name || "Club owner"}
                      {owner.user_id === selectedClub.owner_id
                        ? " · Primary owner"
                        : ""}
                    </span>

                    {owner.user_id !==
                      selectedClub.owner_id && (
                        <button
                          className="text-sm font-semibold text-red-600 hover:text-red-800"
                          type="button"
                          disabled={ownerBusy}
                          onClick={() =>
                            manageOwner("remove", owner.user_id)
                          }
                        >
                          Remove owner
                        </button>
                      )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      )}

      {[
        ["Upcoming games", upcoming],
        ["Completed sessions", completed],
      ].map(([title, games]) => (
        <section key={title} className="mt-8">
          <div className="section-top mb-4">
            <div>
              <h2>{title}</h2>
            </div>

            {title === "Upcoming games" && canEdit && (
              <button
                type="button"
                className="text-link shrink-0"
                onClick={() => onHostGame?.(selectedClub.id)}
              >
                Host a Session
                <Plus size={18} aria-hidden="true" />
              </button>
            )}
          </div>

          {games.length ? (
            <div className="session-grid">
              {games.map((selectedSession) => (
                <SessionCard
                  key={selectedSession.id}
                  s={selectedSession}
                  club={selectedClub}
                  fmt={fmt}
                  open={() => {
                    setSession(selectedSession.id);
                    nav("/?session=" + selectedSession.id);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#d9e3d2] px-6 py-10 text-center text-sm text-[#687167]">
              {title === "Upcoming games"
                ? "No upcoming games yet."
                : "No completed sessions yet."}
            </div>
          )}
        </section>
      ))}
    </>
  );
}