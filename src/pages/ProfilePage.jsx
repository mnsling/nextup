import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Camera,
  CalendarDays,
  CircleUserRound,
  LogOut,
  Save,
  Trophy,
} from "lucide-react";
import { BrandSelect } from "../components/BrandSelect";
import { MatchHistoryList } from "../components/MatchHistoryList";
import { supabase } from "../lib/supabase";
import { avatarUrl } from "../lib/profilePhoto";

const initialForm = {
  full_name: "",
  city: "",
  skill_level: "Recreational",
  bio: "",
  gender: "",
  avatar_path: null,
};

const PROFILE_CITIES = [
  "Davao City",
  "Mati City",
  "Tagum City",
  "Panabo City",
  "Samal Island",
  "Digos City",
  "Kidapawan City",
  "General Santos City",
  "Cagayan de Oro City",
  "Cebu City",
  "Iloilo City",
  "Metro Manila",
  "Other",
];

const emptyStats = {
  played: 0,
  wins: 0,
  losses: 0,
  community_rank: null,
};

export function ProfilePage({
  auth,
  go,
  setModal,
  flash,
  onProfileSaved,
}) {
  const photoInput = useRef(null);

  const [form, setForm] = useState(initialForm);
  const [savedName, setSavedName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [profileError, setProfileError] = useState("");
  const [resultsError, setResultsError] = useState("");
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(emptyStats);
  const [customCity, setCustomCity] = useState("");
  const [useCustomCity, setUseCustomCity] = useState(false);

  useEffect(() => {
    if (!pendingPhoto) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(pendingPhoto);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [pendingPhoto]);

  useEffect(() => {
    let active = true;

    setForm(initialForm);
    setSavedName("");
    setPendingPhoto(null);
    setHistory([]);
    setStats(emptyStats);
    setProfileError("");
    setResultsError("");

    if (!auth?.id || !supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);

    async function load() {
      try {
        const [profile, matches, summary] = await Promise.all([
          supabase
            .from("profiles")
            .select(
              "full_name,city,skill_level,bio,gender,avatar_path",
            )
            .eq("id", auth.id)
            .maybeSingle(),

          supabase.rpc("get_my_match_history_v2"),

          supabase.rpc("get_my_match_stats"),
        ]);

        if (!active) return;

        if (profile.error || !profile.data) {
          setProfileError(
            profile.error?.message || "Your profile was not found.",
          );

        } else {
          const loadedCity = profile.data.city || "";
          const isKnownCity = PROFILE_CITIES.includes(loadedCity);

          setForm({
            ...initialForm,
            ...profile.data,
          });

          setUseCustomCity(Boolean(loadedCity) && !isKnownCity);
          setCustomCity(isKnownCity ? "" : loadedCity);

          setSavedName(profile.data.full_name || "Player");
        }


        if (matches.error || summary.error) {
          setResultsError(
            "Unable to load match history and ranking. Check your match results setup.",
          );
        } else {
          setHistory(matches.data || []);
          setStats(summary.data?.[0] || emptyStats);
        }
      } catch (error) {
        if (active) {
          setProfileError(
            error.message || "Unable to load your profile.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [auth?.id]);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function choosePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const supportedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !supportedTypes.includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      flash("Choose a JPG, PNG, or WebP photo under 2 MB.");
      return;
    }

    setPendingPhoto(file);
  }

  async function saveProfile(event) {
    event.preventDefault();

    if (!auth || !supabase || saving) return;

    setSaving(true);

    try {
      let path = form.avatar_path;

      if (pendingPhoto) {
        const extension = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
        }[pendingPhoto.type];

        path = `${auth.id}/${crypto.randomUUID()}.${extension}`;

        const { error } = await supabase.storage
          .from("nextup-avatars")
          .upload(path, pendingPhoto, {
            contentType: pendingPhoto.type,
          });

        if (error) throw error;
      }

      const saved = {
        ...form,
        full_name: form.full_name.trim(),
        city: form.city.trim(),
        bio: form.bio.trim(),
        avatar_path: path,
      };

      const { error } = await supabase
        .from("profiles")
        .update({
          ...saved,
          updated_at: new Date().toISOString(),
        })
        .eq("id", auth.id);

      if (error) throw error;

      setForm(saved);
      setSavedName(saved.full_name);
      setPendingPhoto(null);
      onProfileSaved?.(saved);
      flash("Profile saved.");
    } catch (error) {
      flash(error.message || "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function logOut() {
    if (!supabase || loggingOut) return;

    setLoggingOut(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      go("discover");
      flash("You have signed out.");
    } catch (error) {
      flash(error.message || "Unable to sign out.");
    } finally {
      setLoggingOut(false);
    }
  }

  if (!auth) {
    return (
      <div className="empty-state">
        <CircleUserRound size={38} />
        <h2>Your profile is waiting.</h2>
        <p>Sign in to edit your details and see your results.</p>

        <button
          type="button"
          className="primary"
          onClick={() => setModal("auth")}
        >
          Sign in
        </button>
      </div>
    );
  }

  const disabled = loading || saving || !!profileError;

  const winRate = Number(stats.played)
    ? Math.round(
      (Number(stats.wins) / Number(stats.played)) * 100,
    )
    : 0;

  const photo = previewUrl || avatarUrl(form.avatar_path);

  return (
    <>
      <div className="page-title mb-6">
        <span className="eyebrow">YOUR PLAYER SPACE</span>
        <h1>My profile.</h1>
        <p>
          Keep your details current and follow your recorded games.
        </p>
      </div>

      <div className="grid min-w-0 items-start gap-[18px] min-[1100px]:grid-cols-[320px_minmax(0,1fr)]">
        <section className="panel profile-card min-w-0 !p-4 sm:!p-6">
          <div className="flex items-center gap-4 border-b border-[#e7ede2] pb-6">
            <button
              type="button"
              className="profile-avatar-trigger shrink-0"
              aria-label="Edit profile photo"
              disabled={disabled}
              onClick={() => photoInput.current?.click()}
            >
              <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-[#dbf76a] text-3xl font-bold">
                {photo ? (
                  <img
                    src={photo}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (form.full_name || "P")[0].toUpperCase()
                )}
              </span>

              <span
                className="profile-avatar-camera"
                aria-hidden="true"
              >
                <Camera size={16} />
              </span>
            </button>

            <div className="min-w-0">
              <h2 className="!m-0 break-words !text-xl font-bold sm:!text-2xl">
                {form.full_name || "New player"}
              </h2>

              <p className="mt-1 break-words text-sm text-[#596653]">
                {form.city || "Pickleball player"}
              </p>

              {pendingPhoto && (
                <p className="mt-2 text-xs font-semibold text-[#446825]">
                  Photo preview · Save to apply
                </p>
              )}
            </div>
          </div>

          <input
            ref={photoInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={choosePhoto}
            tabIndex={-1}
            aria-label="Select a profile photo"
          />

          <h3 className="mt-6 text-lg font-bold">
            Edit profile
          </h3>

          {profileError && (
            <p
              role="alert"
              className="profile-notice break-words"
            >
              {profileError}
            </p>
          )}

          <form
            className="form !mt-4 min-w-0"
            onSubmit={saveProfile}
          >
            <label>
              Full name
              <input
                name="full_name"
                value={form.full_name}
                onChange={updateField}
                required
                maxLength={80}
                disabled={disabled}
                className="!w-full min-w-0"
              />
            </label>


            <label>
              City or area

              <BrandSelect
                name="city"
                value={useCustomCity ? "Other" : form.city}
                onChange={(event) => {
                  const value = event.target.value;

                  if (value === "Other") {
                    setUseCustomCity(true);
                    setForm((previous) => ({
                      ...previous,
                      city: customCity,
                    }));
                  } else {
                    setUseCustomCity(false);
                    setCustomCity("");
                    setForm((previous) => ({
                      ...previous,
                      city: value,
                    }));
                  }
                }}
                disabled={disabled}
                className="!w-full min-w-0"
              >
                <option value="">Select your city or area</option>

                {PROFILE_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </BrandSelect>

              {useCustomCity && (
                <input
                  type="text"
                  value={customCity}
                  placeholder="Enter your city or area"
                  maxLength={80}
                  disabled={disabled}
                  required
                  className="!mt-2 !w-full min-w-0"
                  onChange={(event) => {
                    const value = event.target.value;
                    setCustomCity(value);
                    setForm((previous) => ({
                      ...previous,
                      city: value,
                    }));
                  }}
                />
              )}
            </label>

            <label>
              Gender
              <BrandSelect
                name="gender"
                value={form.gender}
                onChange={updateField}
                disabled={disabled}
                className="!w-full min-w-0"
              >
                <option value="">Select gender</option>
                <option>Female</option>
                <option>Male</option>
                <option>Non-binary</option>
                <option>Prefer not to say</option>
              </BrandSelect>
            </label>

            <label>
              Playing level
              <BrandSelect
                name="skill_level"
                value={form.skill_level}
                onChange={updateField}
                disabled={disabled}
                className="!w-full min-w-0"
              >
                <option>Recreational</option>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </BrandSelect>
            </label>

            <label>
              About you
              <textarea
                name="bio"
                value={form.bio}
                onChange={updateField}
                placeholder="What do you enjoy about pickleball?"
                maxLength={300}
                disabled={disabled}
                className="!w-full min-w-0"
              />
            </label>

            <button
              type="submit"
              className="primary w-full justify-center"
              disabled={disabled}
            >
              <Save size={17} />
              {saving ? "Saving…" : "Save profile"}
            </button>
          </form>

          <button
            type="button"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#c62828] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#a91f1f] disabled:opacity-50"
            disabled={saving || loggingOut}
            onClick={logOut}
          >
            <LogOut size={17} />
            {loggingOut ? "Signing out…" : "Log out"}
          </button>
        </section>

        <div className="grid min-w-0 gap-[18px]">
          <section className="panel profile-stats min-w-0 !p-4 sm:!p-6">
            <div className="profile-section-heading">
              <span className="eyebrow">YOUR RESULTS</span>
              <Trophy size={23} />
            </div>

            <h2>
              {stats.community_rank
                ? `#${stats.community_rank}`
                : "Unranked"}
              <small>Community rank</small>
            </h2>

            <p className="muted">
              Ranked by wins, win rate, then matches played.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["Matches", stats.played],
                ["Wins", stats.wins],
                ["Losses", stats.losses],
                ["Win rate", `${winRate}%`],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-0 rounded-lg bg-[#eff5e4] p-3"
                >
                  <strong className="block text-2xl font-bold">
                    {value}
                  </strong>

                  <span className="text-xs text-[#596653]">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {resultsError && (
              <p
                role="alert"
                className="profile-notice break-words"
              >
                {resultsError}
              </p>
            )}
          </section>

          <section className="panel profile-history min-w-0 !p-4 sm:!p-6">
            <div className="profile-section-heading">
              <div className="min-w-0">
                <span className="eyebrow">ON THE COURT</span>
                <h2>Match history</h2>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-5">
                <BarChart3 size={22} />

                <span className="text-xs font-medium text-[#596653]">
                  {history.length}{" "}
                  {history.length === 1 ? "match" : "matches"}{" "}
                  recorded
                </span>
              </div>
            </div>

            {history.length ? (
              <MatchHistoryList
                key={auth.id}
                history={history}
                playerName={savedName}
                playerId={auth.id}
                showCount={false}
              />
            ) : (
              <div className="history-empty">
                <CalendarDays size={27} />
                <strong>No recorded matches yet.</strong>

                <p>
                  Results appear here once a host records a
                  finished match.
                </p>

                <button
                  type="button"
                  className="text-link"
                  onClick={() => go("discover")}
                >
                  Explore games <ArrowUpRight size={16} />
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}