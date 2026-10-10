import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Search, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { avatarUrl } from "../lib/profilePhoto";
import { ClubPlayerProfile } from "./ClubPlayerProfile";

export function ClubMembers({ club, auth }) {
  const [selectedMember, setSelectedMember] = useState(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setOpen(false);
    setMembers([]);
    setSelectedMember(null);
    setSearch("");
  }, [club.id, auth?.id]);

  useEffect(() => {
    if (!open) return;

    let active = true;
    setLoading(true);
    setError("");

    async function load() {
      try {
        if (!supabase || !auth?.id) {
          throw new Error(
            "Sign in and join this club to view its members.",
          );
        }

        const { data, error: requestError } = await supabase.rpc(
          "get_club_members",
          { p_club_id: club.id },
        );

        if (requestError) throw requestError;
        if (active) setMembers(data || []);
      } catch (requestError) {
        if (active) {
          setError(
            requestError.message || "Unable to load members.",
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
  }, [open, club.id, auth?.id, retry]);

  useEffect(() => {
    if (!open) return;

    function handleKey(event) {
      if (event.key === "Escape") {
        setOpen(false);
        setSelectedMember(null);
        setSearch("");
      }
    }

    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const count = club.member_count ?? club.members ?? 0;

  const filtered = members.filter((member) =>
    (member.full_name || "Player")
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  function close() {
    setOpen(false);
    setSelectedMember(null);
    setSearch("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left text-sm font-bold text-slate-800 transition hover:text-lime-700"
        aria-haspopup="dialog"
        aria-label={`View ${count} club members`}
      >
        {count} {count === 1 ? "member" : "members"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="club-members-title"
            className={`flex w-full flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ${
              selectedMember
                ? "max-h-[80dvh] max-w-3xl"
                : "h-[466px] max-h-[80dvh] max-w-xl"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <div className="min-w-0">
                <p className="mb-1 truncate text-xs font-semibold uppercase tracking-wider text-lime-700">
                  {club.name}
                </p>

                <h2
                  id="club-members-title"
                  className="text-xl font-bold"
                >
                  {selectedMember
                    ? "Player profile"
                    : "Club members"}
                </h2>
              </div>

              <button
                type="button"
                autoFocus
                onClick={close}
                aria-label="Close members"
                className="shrink-0 rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
              >
                <X size={20} />
              </button>
            </header>

            <div
              className={`min-h-0 flex-1 p-6 ${
                selectedMember
                  ? "overflow-y-auto"
                  : "flex flex-col overflow-hidden"
              }`}
            >
              {selectedMember ? (
                <>
                  <button
                    type="button"
                    className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-lime-700"
                    onClick={() => setSelectedMember(null)}
                  >
                    <ArrowLeft size={16} />
                    All members
                  </button>

                  <ClubPlayerProfile
                    key={selectedMember.user_id}
                    clubId={club.id}
                    userId={selectedMember.user_id}
                  />
                </>
              ) : loading ? (
                <p
                  role="status"
                  className="py-10 text-center text-slate-500"
                >
                  Loading members…
                </p>
              ) : error ? (
                <div className="min-h-0 overflow-y-auto">
                  <p
                    role="alert"
                    className="text-sm text-red-600"
                  >
                    {error}
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
                <>
                  <label className="mb-4 flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 focus-within:border-lime-500">
                    <Search
                      size={17}
                      className="shrink-0 text-slate-400"
                    />

                    <span className="sr-only">
                      Search members
                    </span>

                    <input
                      type="search"
                      value={search}
                      onChange={(event) =>
                        setSearch(event.target.value)
                      }
                      placeholder="Search players"
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                    />
                  </label>

                  <p className="mb-3 shrink-0 text-xs text-slate-500">
                    {members.length}{" "}
                    {members.length === 1
                      ? "player"
                      : "players"}
                    {" · "}
                    Select a player to view their profile
                  </p>

                  <ul
                    tabIndex={0}
                    aria-label="Club members"
                    className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-2"
                  >
                    {filtered.map((member) => (
                      <li key={member.user_id}>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedMember(member)
                          }
                          className="group flex w-full items-center gap-3 rounded-2xl border border-slate-100 p-3 text-left transition hover:border-lime-300 hover:bg-lime-50"
                        >
                          <div className="flex h-12 w-12 shrink-0 items-center bg-[#dcfa53] justify-center overflow-hidden rounded-full bg-lime-100 font-bold">
                            {member.avatar_path ? (
                              <img
                                src={avatarUrl(
                                  member.avatar_path,
                                )}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              (member.full_name || "P")[0]
                                .toUpperCase()
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">
                              {member.full_name || "Player"}
                              {member.user_id === auth?.id
                                ? " (You)"
                                : ""}
                            </p>

                            <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600">
                              {member.user_id === club.owner_id
                                ? "Primary owner"
                                : member.role || "Member"}
                            </span>
                          </div>

                          <ArrowUpRight
                            size={18}
                            className="shrink-0 text-slate-400 group-hover:text-lime-700"
                          />
                        </button>
                      </li>
                    ))}

                    {!filtered.length && (
                      <li className="py-8 text-center text-sm text-slate-500">
                        No matching players.
                      </li>
                    )}
                  </ul>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}