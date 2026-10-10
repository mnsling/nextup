import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Image as ImageIcon,
  MapPin,
  Plus,
  Search,
  X,
} from "lucide-react";
import { BrandSelect } from "../components/BrandSelect";
import { supabase } from "../lib/supabase";

function initials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function ClubCard({ club, index, setClub }) {
  const count = club.member_count ?? club.members ?? 0;

  return (
    <button
      type="button"
      className="club-card"
      onClick={() => setClub(club.id)}
    >
      <div
        className={`club-cover cover-${index % 3}`}
        style={{ zIndex: 0 }}
      >
        <img
          key={club.cover_url || club.id}
          className="asset-photo"
          src={
            club.cover_url ||
            `/assets/club-${(index % 3) + 1}.jpg`
          }
          alt=""
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />

        <ImageIcon size={25} />
        <span>CLUB COVER IMAGE</span>
      </div>

      <div
        className="club-card-body"
        style={{ position: "relative", zIndex: 1 }}
      >
        <span
          className="mini-avatar"
          style={{ overflow: "hidden", zIndex: 2 }}
        >
          {club.avatar_url ? (
            <img
              src={club.avatar_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            initials(club.name)
          )}
        </span>

        <h3>{club.name}</h3>
        <p>
          <MapPin size={15} />
          {club.city}
        </p>

        <span className="club-card-foot">
          {count} {count === 1 ? "member" : "members"}
          <ArrowUpRight size={17} />
        </span>
      </div>
    </button>
  );
}

export function ClubsPage({
  auth,
  clubs,
  requireAuth,
  setModal,
  setClub,
}) {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [retry, setRetry] = useState(0);

  const [membership, setMembership] = useState({
    userId: null,
    ids: [],
    loading: false,
    error: "",
  });

  useEffect(() => {
    let active = true;
    const userId = auth?.id || null;

    if (!userId || !supabase) {
      setMembership({
        userId,
        ids: [],
        loading: false,
        error: "",
      });
      return;
    }

    setMembership({
      userId,
      ids: [],
      loading: true,
      error: "",
    });

    async function load() {
      try {
        const { data, error } = await supabase
          .from("club_members")
          .select("club_id")
          .eq("user_id", userId);

        if (error) throw error;

        if (active) {
          setMembership({
            userId,
            ids: (data || []).map(
              (row) => row.club_id
            ),
            loading: false,
            error: "",
          });
        }
      } catch (error) {
        if (active) {
          setMembership({
            userId,
            ids: [],
            loading: false,
            error:
              error.message ||
              "Unable to load your clubs.",
          });
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [auth?.id, clubs, retry]);

  const current =
    membership.userId === (auth?.id || null)
      ? membership
      : {
          ids: [],
          loading: Boolean(auth),
          error: "",
        };

  const cities = [
    ...new Set(
      clubs
        .map((club) => club.city?.trim())
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b));

  const joinedIds = new Set(current.ids);

  const yours = (club) =>
    Boolean(
      auth?.id &&
        (club.owner_id === auth.id ||
          joinedIds.has(club.id))
    );

  const matches = (club) =>
    `${club.name} ${club.city || ""} ${
      club.description || ""
    }`
      .toLowerCase()
      .includes(search.trim().toLowerCase()) &&
    (!city || club.city?.trim() === city);

  const yourClubs = clubs.filter(yours);
  const available = clubs.filter(
    (club) => !yours(club)
  );

  const sections = [
    {
      title: "Your clubs",
      subtitle: "Clubs you own or have joined.",
      all: yourClubs,
      items: yourClubs.filter(matches),
    },
    {
      title: "Find clubs",
      subtitle: "Discover a new community to play with.",
      all: available,
      items: available.filter(matches),
    },
  ];

  function clear() {
    setSearch("");
    setCity("");
  }

  return (
    <>
      <div className="page-title">
        <span className="eyebrow">
          YOUR COMMUNITY STARTS HERE
        </span>

        <div className="greeting-row">
          <div className="min-w-0">
            <h1>Find your people.</h1>
            <p>
              Join a local crew, discover sessions, and
              keep playing together.
            </p>
          </div>

          <button
            type="button"
            aria-label="Create club"
            title="Create club"
            className="outline !h-10 !w-10 !shrink-0 !p-0 sm:!h-auto sm:!w-auto sm:!px-[17px] sm:!py-3"
            onClick={() => {
              if (requireAuth()) {
                setModal("createClub");
              }
            }}
          >
            <Plus size={18} aria-hidden="true" />
            <span className="hidden sm:inline">
              Create club
            </span>
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <label className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 focus-within:border-lime-500">
          <Search
            size={19}
            className="shrink-0 text-slate-500"
          />
          <span className="sr-only">Search clubs</span>
          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search clubs, cities, or interests"
            className="w-full min-w-0 border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
        </label>

        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 focus-within:border-lime-500">
          <MapPin
            size={18}
            className="shrink-0 text-slate-500"
          />
          <span className="sr-only">
            Filter clubs by city
          </span>

          <BrandSelect
            label="Filter clubs by city"
            value={city}
            onChange={(event) =>
              setCity(event.target.value)
            }
            className="min-w-0 flex-1 sm:min-w-40 sm:flex-none"
          >
            <option value="">All locations</option>

            {cities.map((place) => (
              <option key={place} value={place}>
                {place}
              </option>
            ))}
          </BrandSelect>
        </label>
      </div>

      {current.loading ? (
        <p
          role="status"
          className="py-10 text-center text-slate-600"
        >
          Loading your clubs…
        </p>
      ) : current.error ? (
        <div className="rounded-2xl border border-red-200 bg-white p-6">
          <p
            role="alert"
            className="text-sm text-red-700"
          >
            {current.error}
          </p>
          <button
            type="button"
            className="outline mt-4"
            onClick={() =>
              setRetry((value) => value + 1)
            }
          >
            Retry
          </button>
        </div>
      ) : (
        sections.map(
          ({ title, subtitle, all, items }) => (
            <section key={title} className="mb-10">
              <div className="section-top mb-5">
                <div>
                  <h2>
                    {title}{" "}
                    <span className="count">
                      {items.length
                        .toString()
                        .padStart(2, "0")}
                    </span>
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {subtitle}
                  </p>
                </div>
              </div>

              {items.length ? (
                <div className="grid grid-cols-1 gap-[15px] md:grid-cols-2 lg:grid-cols-3">
                  {items.map((club, index) => (
                    <ClubCard
                      key={club.id}
                      club={club}
                      index={index}
                      setClub={setClub}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#d9e3d2] bg-white px-6 py-10 text-center">
                  <p className="text-sm text-[#596653]">
                    {title === "Your clubs" && !auth
                      ? "Sign in to see the clubs you own or have joined."
                      : all.length
                        ? "No clubs match your search. Try another name or location."
                        : title === "Your clubs"
                          ? "You haven't joined a club yet. Explore the clubs below or create your own."
                          : clubs.length
                            ? "You're already part of every listed club."
                            : "No clubs yet. Create one to get started."}
                  </p>

                  {title === "Your clubs" && !auth ? (
                    <button
                      type="button"
                      className="outline mx-auto mt-4"
                      onClick={() => setModal("auth")}
                    >
                      Sign in
                    </button>
                  ) : (
                    (search || city) && (
                      <button
                        type="button"
                        className="outline mx-auto mt-4"
                        onClick={clear}
                      >
                        <X size={16} />
                        Clear filters
                      </button>
                    )
                  )}
                </div>
              )}
            </section>
          )
        )
      )}
    </>
  );
}