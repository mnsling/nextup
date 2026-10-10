import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getSessionStatus,
  sessionEnded,
  useSessionClock,
} from "./hooks/useSessionClock";
import { configured, supabase } from "./lib/supabase";
import { demoClubs, demoSessions } from "./data/demo";
import { plans } from "./data/plans";
import { AppShell } from "./components/AppShell";
import { MobileMenu } from "./components/MobileMenu";
import { Toast } from "./components/Toast";
import { ModalRoot } from "./components/ModalRoot";
import { SessionPaymentModal } from "./components/SessionPayments";
import { DiscoverPage } from "./pages/DiscoverPage";
import { ClubsPage } from "./pages/ClubsPage";
import { MyGamesPage } from "./pages/MyGamesPage";
import { PricingPage } from "./pages/PricingPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SessionPage } from "./pages/SessionPage";
import { ClubPage } from "./pages/ClubPage";
import "./styles/index.css";

export default function App() {
  const now = useSessionClock();
  const refreshQueue = useRef(async () => false);
  const nav = useNavigate();
  const loc = useLocation();

  const [page, setPage] = useState("discover");
  const [menu, setMenu] = useState(false);
  const [session, setSession] = useState(null);
  const [club, setClub] = useState(null);
  const [auth, setAuth] = useState(null);
  const [navbarProfile, setNavbarProfile] = useState(null);
  const [modal, setModal] = useState("");
  const [hostClubId, setHostClubId] = useState("");
  const [message, setMessage] = useState("");
  const [clubs, setClubs] = useState(configured ? [] : demoClubs);
  const [sessions, setSessions] = useState(configured ? [] : demoSessions);
  const [joins, setJoins] = useState([]);
  const [queue, setQueue] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [busy, setBusy] = useState(false);
  const [qrReady, setQrReady] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(plans[1]);
  const [paymentGame, setPaymentGame] = useState(null);

  const demo = !configured;

  const flash = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 5000);
  };

  useEffect(() => {
    if (modal !== "createSession") setHostClubId("");
  }, [modal]);

  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel("session-list-status")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
        },
        ({ new: updated }) => {
          setSessions((current) =>
            current.map((item) =>
              item.id === updated.id ? { ...item, ...updated } : item,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => setAuth(data.user));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setAuth(currentSession?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !auth) {
      setNavbarProfile(null);
      return;
    }

    let active = true;
    setNavbarProfile(null);

    supabase
      .from("profiles")
      .select("full_name,avatar_path")
      .eq("id", auth.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setNavbarProfile(data);
      });

    return () => {
      active = false;
    };
  }, [auth?.id]);

  useEffect(() => {
    if (!supabase) return;

    let active = true;

    (async () => {
      let [clubResult, sessionResult, counts] = await Promise.all([
        supabase
          .from("clubs")
          .select("id,owner_id,name,city,description,cover_url,avatar_url"),

        supabase
          .from("sessions")
          .select(
            "id,title,club_id,host_id,location,maps_url,starts_at,ends_at,capacity,courts,skill_level,fee,status,session_type,match_format,gcash_qr_path",
          )
          .order("starts_at"),

        supabase.rpc("get_club_member_counts"),
      ]);

      if (
        clubResult.error &&
        /avatar_url/.test(clubResult.error.message || "")
      ) {
        clubResult = await supabase
          .from("clubs")
          .select("id,owner_id,name,city,description,cover_url");
      }

      if (!active) return;

      if (!clubResult.error) {
        const countByClub = new Map(
          (counts.data || []).map((item) => [
            item.club_id,
            Number(item.member_count),
          ]),
        );

        setClubs(
          (clubResult.data || []).map((item) => ({
            ...item,
            member_count: countByClub.get(item.id) ?? 0,
          })),
        );
      }

      setSessions(sessionResult.error ? [] : sessionResult.data || []);

      if (clubResult.error) {
        flash("Failed to load clubs: " + clubResult.error.message);
      } else if (sessionResult.error) {
        flash("Failed to load sessions: " + sessionResult.error.message);
      } else if (counts.error) {
        flash(
          "Member counts need setup. Run supabase/club-member-counts.sql in Supabase.",
        );
      }
    })();

    return () => {
      active = false;
    };
  }, [auth]);

  useEffect(() => {
    const params = new URLSearchParams(loc.search);
    const id = params.get("session");

    if (id) {
      setSession(id);
      setPage("discover");
    }
  }, [loc.search, sessions]);

  useEffect(() => {
    let active = true;

    if (!supabase || !auth) {
      setJoins([]);
      return;
    }

    supabase
      .from("session_players")
      .select("session_id")
      .eq("user_id", auth.id)
      .then(({ data, error }) => {
        if (active && !error) {
          setJoins((data || []).map((item) => item.session_id));
        }
      });

    return () => {
      active = false;
    };
  }, [auth?.id]);

  useEffect(() => {
    setQueue([]);
    refreshQueue.current = async () => false;

    if (!session || !supabase) return;

    let active = true;
    let requestNumber = 0;

    const fetchQueue = async () => {
      const request = ++requestNumber;

      const { data: players, error } = await supabase.rpc(
        "get_session_queue",
        { p_session_id: session },
      );

      if (!active || request !== requestNumber || error) return false;

      setQueue(players || []);

      if (auth?.id) {
        const joined = (players || []).some(
          (player) => player.user_id === auth.id,
        );

        setJoins((current) =>
          joined
            ? [...new Set([...current, session])]
            : current.filter((id) => id !== session),
        );
      }

      return true;
    };

    refreshQueue.current = fetchQueue;
    fetchQueue();

    const timer = setInterval(fetchQueue, 10000);
    window.addEventListener("focus", fetchQueue);

    const channel = supabase
      .channel("queue-" + session)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_players",
        },
        fetchQueue,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${session}`,
        },
        ({ new: updated }) => {
          setSessions((current) =>
            current.map((item) =>
              item.id === updated.id ? { ...item, ...updated } : item,
            ),
          );
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") fetchQueue();
      });

    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", fetchQueue);
      supabase.removeChannel(channel);
    };
  }, [session, auth?.id]);

  const go = (destination) => {
    setPage(destination);
    setClub(null);
    setSession(null);
    setMenu(false);
    nav("/");
  };

  const requireAuth = () => {
    if (auth) return true;

    setModal("auth");
    flash("Sign in to continue.");
    return false;
  };

  const openNotificationSession = async (id) => {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    setSessions((current) => [
      ...current.filter((item) => item.id !== id),
      data,
    ]);

    setClub(null);
    setSession(id);
    setPage("discover");
    setMenu(false);

    nav(`/?session=${id}`);
  };

  const joinSession = async (game) => {
    if (!requireAuth()) return;

    if (getSessionStatus(game) !== "open") {
      flash("Registration is closed for this session.");
      return;
    }

    if (
      !demo &&
      Number(game.fee) > 0 &&
      auth.id !== game.host_id
    ) {
      setPaymentGame(game);
      return;
    }

    if (demo) {
      setJoins((current) => [...new Set([...current, game.id])]);
      flash(
        "Preview join saved for this visit. Connect Supabase to make it permanent.",
      );
      return;
    }

    setBusy(true);
    const reloadPlayers = refreshQueue.current;

    try {
      const { error } = await supabase.rpc("join_session", {
        p_session_id: game.id,
      });

      if (error) throw error;

      setJoins((current) => [...new Set([...current, game.id])]);

      const refreshed = await reloadPlayers();

      flash(
        refreshed
          ? "You joined the session. See you on court!"
          : "You joined. The player list will refresh automatically.",
      );
    } catch (error) {
      flash(error.message || "Joining failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const joinClub = async (selectedClub) => {
    if (!requireAuth()) return false;

    if (demo) {
      flash("Preview club joined. Connect Supabase to save membership.");
      return true;
    }

    const { error } = await supabase.from("club_members").insert({
      club_id: selectedClub.id,
      user_id: auth.id,
      role: "member",
    });

    if (error) {
      if (error.code === "23505") {
        flash("You already belong to this club.");
        return true;
      }

      flash(error.message);
      return false;
    }

    setClubs((current) =>
      current.map((item) =>
        item.id === selectedClub.id
          ? { ...item, member_count: (item.member_count ?? 0) + 1 }
          : item,
      ),
    );

    flash("You joined the club.");
    return true;
  };

  const createClub = async (event) => {
    event.preventDefault();

    if (!requireAuth()) return;

    const form = new FormData(event.currentTarget);

    const row = {
      name: String(form.get("name")).trim(),
      city: String(form.get("city")).trim(),
      description: String(form.get("description")).trim(),
      owner_id: auth.id,
    };

    if (demo) {
      setClubs([
        { ...row, id: "demo-" + Date.now(), members: 1 },
        ...clubs,
      ]);
      setModal("");
      flash("Preview club created.");
      return;
    }

    const { data, error } = await supabase
      .from("clubs")
      .insert(row)
      .select()
      .single();

    if (error) {
      flash(error.message);
    } else {
      setClubs([{ ...data, member_count: 1 }, ...clubs]);
      setModal("");
      flash("Club created.");
    }
  };

  const createSession = async (event) => {
    event.preventDefault();

    if (!requireAuth()) return;

    const form = new FormData(event.currentTarget);

    const hours = form
      .getAll("session_hours")
      .map(Number)
      .sort((a, b) => a - b);

    if (
      !hours.length ||
      new Set(hours).size !== hours.length ||
      hours.some(
        (hour, index) =>
          !Number.isInteger(hour) ||
          hour < 0 ||
          hour > 23 ||
          (index > 0 && hour !== hours[index - 1] + 1),
      )
    ) {
      flash("Select one or more consecutive hourly slots.");
      return;
    }

    const midnight = new Date(
      `${form.get("session_date")}T00:00:00+08:00`,
    );

    const start = new Date(midnight.getTime() + hours[0] * 3600000);

    const end = new Date(
      midnight.getTime() + (hours[hours.length - 1] + 1) * 3600000,
    );

    if (Number.isNaN(start.getTime()) || start <= new Date()) {
      flash("Choose a future date and time.");
      return;
    }

    const selectedClubId = String(form.get("club_id") || "") || null;

    if (!selectedClubId && Number(form.get("courts")) > 2) {
      flash("Friendly games support up to 2 courts.");
      return;
    }

    const sessionType = String(form.get("session_type") || "open_play");
    const matchFormat = String(form.get("match_format") || "doubles");

    if (
      !["open_play", "tournament"].includes(sessionType) ||
      !["singles", "doubles"].includes(matchFormat)
    ) {
      flash("Choose a session type and match format.");
      return;
    }

    if (
      Number(form.get("capacity")) <
      (matchFormat === "singles" ? 2 : 4)
    ) {
      flash("Player limit must cover at least one match.");
      return;
    }

    const row = {
      session_type: sessionType,
      match_format: matchFormat,
      title: String(form.get("title")),
      club_id: selectedClubId,
      location: String(form.get("location")),
      maps_url: String(form.get("maps_url")),
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      capacity: Number(form.get("capacity")),
      courts: Number(form.get("courts")),
      skill_level: String(form.get("skill_level")),
      fee: Number(form.get("fee")),
      host_id: auth.id,
      status: "open",
    };

    if (demo) {
      setSessions([
        { ...row, id: "demo-" + Date.now(), joined: 0 },
        ...sessions,
      ]);
      setModal("");
      flash("Preview session created.");
      return;
    }

    const { data, error } = await supabase
      .from("sessions")
      .insert(row)
      .select()
      .single();

    if (error) {
      flash(error.message);
    } else {
      setSessions([data, ...sessions]);
      setModal("");
      flash("Session created. Registration is open.");
    }
  };

  const pay = async (event) => {
    event.preventDefault();

    if (!requireAuth()) return;

    if (demo) {
      flash(
        "Preview request created. Add Supabase and your real GCash QR to accept payments.",
      );
      setModal("");
      return;
    }

    const form = new FormData(event.currentTarget);
    const file = form.get("receipt");

    if (!(file instanceof File) || !file.size) {
      return flash("Upload your GCash payment receipt.");
    }

    if (file.size > 5 * 1024 * 1024) {
      return flash("Receipt must be under 5 MB.");
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return flash("Upload a JPG, PNG, or WebP receipt.");
    }

    setBusy(true);

    const path = `${auth.id}/${crypto.randomUUID()}.${file.type.split("/")[1]}`;

    const uploaded = await supabase.storage
      .from("payment-receipts")
      .upload(path, file, { contentType: file.type });

    if (uploaded.error) {
      flash(uploaded.error.message);
      setBusy(false);
      return;
    }

    const result = await supabase.from("payment_requests").insert({
      user_id: auth.id,
      club_id: form.get("club_id"),
      plan_id: selectedPlan.id,
      amount: selectedPlan.id === "club" ? 399 : 999,
      reference: String(form.get("reference")).trim(),
      receipt_path: path,
      status: "pending",
    });

    setBusy(false);

    if (result.error) {
      flash(result.error.message);
    } else {
      flash(
        "Payment submitted for review. Access stays on Starter until verified.",
      );
      setModal("");
    }
  };

  const recordMatch = async (details) => {
    if (!auth || !session || demo) return false;

    setBusy(true);

    const { error } = await supabase.from("matches").insert({
      session_id: session,
      status: "finished",
      ...details,
    });

    setBusy(false);

    flash(
      error
        ? error.message
        : "Result saved. Player profiles will show the match.",
    );

    return !error;
  };

  const selectedRow = sessions.find((item) => item.id === session);

  const selected = selectedRow
    ? { ...selectedRow, status: getSessionStatus(selectedRow, now) }
    : null;

  const selectedClub = clubs.find((item) => item.id === club);

  const filtered = sessions.filter(
    (item) =>
      !sessionEnded(item, now) &&
      getSessionStatus(item, now) === "open" &&
      (filter === "All" || item.skill_level === filter) &&
      `${item.title} ${item.location} ${
        clubs.find((c) => c.id === item.club_id)?.name || ""
      }`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  const fmt = (date) =>
    new Intl.DateTimeFormat("en-PH", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Asia/Manila",
    }).format(new Date(date));

  return (
    <>
      <AppShell
        go={go}
        page={page}
        auth={auth}
        profile={navbarProfile}
        setModal={setModal}
        setMenu={setMenu}
        requireAuth={requireAuth}
        onOpenSession={openNotificationSession}
      >
        {selected ? (
          <SessionPage
            key={selected.id}
            selected={selected}
            auth={auth}
            onSessionUpdated={(updated) =>
              setSessions((current) =>
                current.map((item) =>
                  item.id === updated.id ? { ...item, ...updated } : item,
                ),
              )
            }
            onPlayerRemoved={(userId) => {
              setQueue((current) =>
                current.filter((player) => player.user_id !== userId),
              );

              if (userId === auth?.id) {
                setJoins((current) =>
                  current.filter((id) => id !== selected.id),
                );
              }

              refreshQueue.current();
            }}
            onPaymentApproved={() => refreshQueue.current()}
            recordMatch={recordMatch}
            clubs={clubs}
            fmt={fmt}
            queue={queue}
            demo={demo}
            joins={joins}
            busy={busy}
            joinSession={joinSession}
            flash={flash}
            setSession={setSession}
            nav={nav}
          />
        ) : selectedClub ? (
          <ClubPage
            selectedClub={selectedClub}
            clubs={clubs}
            club={club}
            sessions={sessions}
            joinClub={joinClub}
            fmt={fmt}
            setSession={setSession}
            nav={nav}
            setClub={setClub}
            auth={auth}
            flash={flash}
            onHostGame={(clubId) => {
              if (!requireAuth()) return;

              setHostClubId(clubId);
              setModal("createSession");
            }}
            onClubUpdated={(updated) =>
              setClubs((current) =>
                current.map((item) =>
                  item.id === updated.id ? { ...item, ...updated } : item,
                ),
              )
            }
          />
        ) : page === "discover" ? (
          <DiscoverPage
            filtered={filtered}
            totalSessions={
              sessions.filter(
                (item) =>
                  !sessionEnded(item, now) &&
                  getSessionStatus(item, now) === "open",
              ).length
            }
            clubs={clubs}
            search={search}
            setSearch={setSearch}
            filter={filter}
            setFilter={setFilter}
            go={go}
            requireAuth={requireAuth}
            setModal={setModal}
            setPage={setPage}
            setClub={setClub}
            fmt={fmt}
            setSession={setSession}
            nav={nav}
          />
        ) : page === "clubs" ? (
          <ClubsPage
            auth={auth}
            clubs={clubs}
            requireAuth={requireAuth}
            setModal={setModal}
            setClub={setClub}
          />
        ) : page === "my-games" ? (
          <MyGamesPage
            auth={auth}
            sessions={sessions}
            joins={joins}
            clubs={clubs}
            fmt={fmt}
            setSession={setSession}
            nav={nav}
            setModal={setModal}
            go={go}
          />
        ) : page === "profile" ? (
          <ProfilePage
            auth={auth}
            go={go}
            setModal={setModal}
            flash={flash}
            onProfileSaved={setNavbarProfile}
          />
        ) : (
          <PricingPage
            plans={plans}
            go={go}
            setSelectedPlan={setSelectedPlan}
            setModal={setModal}
          />
        )}
      </AppShell>

      {paymentGame && auth && (
        <SessionPaymentModal
          game={paymentGame}
          auth={auth}
          flash={flash}
          onClose={() => setPaymentGame(null)}
        />
      )}

      <MobileMenu menu={menu} setMenu={setMenu} go={go} />
      <Toast message={message} setMessage={setMessage} />

      <ModalRoot
        modal={modal}
        setModal={setModal}
        flash={flash}
        demo={demo}
        auth={auth}
        createClub={createClub}
        createSession={createSession}
        hostClubId={hostClubId}
        pay={pay}
        busy={busy}
        qrReady={qrReady}
        setQrReady={setQrReady}
        selectedPlan={selectedPlan}
        clubs={clubs}
      />
    </>
  );
}