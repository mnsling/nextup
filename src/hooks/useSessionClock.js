import { useEffect, useState } from "react";

export function getSessionStatus(
  session,
  now = Date.now()
) {
  const start = new Date(session.starts_at).getTime();
  const end = new Date(session.ends_at).getTime();

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end)
  ) {
    return session.status || "open";
  }

  if (now >= end) return "closed";
  if (now >= start) return "live";

  return "open";
}

export function sessionEnded(
  session,
  now = Date.now()
) {
  return getSessionStatus(session, now) === "closed";
}

export function useSessionClock() {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, 1000);

    window.addEventListener("focus", tick);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", tick);
    };
  }, []);

  return now;
}